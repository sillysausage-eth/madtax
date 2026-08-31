/* Sub-breakdown of every national revenue bucket, from the same Eurostat feed that
   produced the buckets themselves (gov_10a_taxag for the taxes, gov_10a_main for the
   non-tax parts). Same sector, same unit, same accrual basis — so a bucket's children
   sum to the bucket, and nothing here is estimated.

   Usage: node extract_natsub.js            (writes nat_sub.json)
          node extract_natsub.js --offline  (reuse cached eurostat_*.json) */
const fs=require('fs');
const API='https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data/';
const Q='?format=JSON&geo=ES&unit=MIO_EUR&sector=S13&sinceTimePeriod=2012&lang=EN';

/* Each bucket lists the child codes that partition it. `neg` codes are subtracted —
   that is how a "rest of the parent" child is expressed (e.g. non-EU transfers are
   all transfers received minus the ones from the EU). */
const TAXAG={
  social:       [['D611C'],['D613CE'],['D613CS'],['D613CN'],['D612'],['D613V'],['D61SC'],['D614']],
  otherProd:    [['D214C'],['D214G'],['D214L'],['D214F'],['D214D'],['D214I'],['D214H'],['D214B'],['D214E'],['D214J'],['D214K']],
  otherProdTax: [['D29F'],['D29E'],['D29H'],['D29B'],['D29C'],['D29D'],['D29G']],
  inherit:      [['D91A'],['D91B'],['D91C']],
  otherCurr:    [['D59A'],['D59D'],['D59F'],['D59B'],['D59C'],['D59E']],
  customs:      [['D2121'],['D2122C'],['D2122A'],['D2122B'],['D2122D'],['D2122E'],['D2122F']]
};
const MAIN={
  sales:         [['P11_P12'],['P131']],
  propInc:       [['D41REC'],['D42_TO_D45REC']],
  eu:            [['D7REC_S212'],['D9REC_S212']],
  otherTransfer: [['D7REC','D7REC_S212'],['D9REC','D91REC','D9REC_S212']]
};

async function grab(ds){
  const cache=`eurostat_${ds}.json`;
  if(process.argv.includes('--offline')) return JSON.parse(fs.readFileSync(cache,'utf8'));
  const r=await fetch(API+ds+Q);
  if(!r.ok) throw new Error(`${ds}: HTTP ${r.status}`);
  const j=await r.json();
  fs.writeFileSync(cache,JSON.stringify(j));
  return j;
}
/* JSON-stat: `value` is a flat array indexed row-major over the declared dimensions.
   Build a stride per dimension so the lookup does not depend on their order. */
function reader(j){
  const dims=j.id, sizes=j.size;
  const stride=sizes.map((_,i)=>sizes.slice(i+1).reduce((a,b)=>a*b,1));
  const iNa=dims.indexOf('na_item'), iT=dims.indexOf('time');
  const na=j.dimension.na_item.category, tm=j.dimension.time.category;
  return {
    years:Object.keys(tm.index).sort(), label:c=>na.label[c],
    get:(c,y)=>{
      if(na.index[c]==null||tm.index[y]==null) return null;
      const v=j.value[na.index[c]*stride[iNa] + tm.index[y]*stride[iT]];
      return v==null?null:v;
    }
  };
}
(async()=>{
  const [tx,mn]=await Promise.all([grab('gov_10a_taxag'),grab('gov_10a_main')]);
  const T=reader(tx), M=reader(mn);
  const bundle=JSON.parse(fs.readFileSync('../../data/derived/es-fiscal-bundle.json','utf8'));
  const years=T.years.filter(y=>bundle.natParts[y]);

  const labels={}, out={};
  let bad=0;
  for(const y of years){
    const rec={};
    for(const [src,spec] of [[T,TAXAG],[M,MAIN]]){
      for(const [bucket,children] of Object.entries(spec)){
        const rows=[];
        for(const terms of children){
          const [head,...subtract]=terms;
          let v=src.get(head,y);
          if(v==null) continue;
          for(const s of subtract){ const sv=src.get(s,y); if(sv!=null) v-=sv; }
          v=Math.round(v);
          labels[terms.join('-')] = terms.length===1 ? src.label(head)
            : src.label(head)+' excluding '+subtract.map(s=>src.label(s)).join(' and ');
          if(v!==0) rows.push([terms.join('-'), v]);
        }
        if(!rows.length) continue;
        const sum=rows.reduce((a,r)=>a+r[1],0), parent=bundle.natParts[y][bucket];
        if(Math.abs(sum-parent)>1){ console.log(`  MISMATCH ${y} ${bucket}: children ${sum} vs bucket ${parent} (${sum-parent})`); bad++; }
        rec[bucket]=rows.sort((a,b)=>b[1]-a[1]);
      }
    }
    out[y]=rec;
  }
  fs.writeFileSync('nat_sub.json',JSON.stringify({sub:out,codeLabels:labels}));
  const last=years[years.length-1];
  console.log(`years ${years[0]}-${last} · ${bad} reconciliation failures`);
  console.log(`\nbuckets with a published sub-breakdown in ${last}:`);
  for(const [b,rows] of Object.entries(out[last]))
    console.log(`  ${b.padEnd(14)} ${String(rows.length).padStart(2)} parts  ` +
      rows.map(r=>`${r[0]}=${(r[1]/1000).toFixed(1)}bn`).join(' '));
  const covered=new Set(Object.keys(out[last]));
  console.log('\nno published split from this source:',
    bundle.PARTS.filter(p=>!covered.has(p)).join(', '));
})();
