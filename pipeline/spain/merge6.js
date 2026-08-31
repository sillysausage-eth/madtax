const fs=require('fs');
const prev=JSON.parse(fs.readFileSync('bundle5.json','utf8'));
const tax =JSON.parse(fs.readFileSync('tax_dec_clean.json','utf8'));   // detailed split, ends 2024
const nt  =JSON.parse(fs.readFileSync('nontax_clean.json','utf8'));    // aggregates, to 2025
const own =JSON.parse(fs.readFileSync('ccaa_owntax.json','utf8'));     // regional, to 2025
const loc =JSON.parse(fs.readFileSync('local_owntax.json','utf8'));    // local, to 2024

/* 17 exhaustive parts. The two 'Pending' parts exist only for years where Eurostat has
   published the headline aggregates but not yet the detailed tax split (gov_10a_taxag
   lags gov_10a_main by about a year). In those years the fine tax parts are zero and the
   aggregate sits in the pending block, so the total still reconciles exactly. */
const PARTS=[
 'social','irpf','vat','corp','sales','excise','eu','otherProd','propInc',
 'propTax','otherProdTax','otherTransfer','inherit','otherCurr','customs',
 'taxProdPending','taxIncPending'
];
const years=Object.keys(nt).sort();
const natParts={};
years.forEach(y=>{
  const o=nt[y], t=tax[y]||null, h=k=>o[k]??0, g=k=>t?(t[k]??0):0;
  const detail=!!t;
  const eu=h('D7REC_S212')+h('D9REC_S212');
  const p={
    social:       h('D61REC'),
    sales:        h('P11_P12_P131'),
    propInc:      h('D4REC'),
    eu,
    otherTransfer:(h('D7REC')+(h('D9REC')-h('D91REC')))-eu,
    inherit:      h('D91REC'),
    irpf:         detail?g('D51A_C1'):0,
    vat:          detail?g('D211'):0,
    corp:         detail?g('D51B_C2'):0,
    excise:       detail?g('D214A'):0,
    otherProd:    detail?g('D214')-g('D214A'):0,
    propTax:      detail?g('D29A'):0,
    otherProdTax: detail?g('D29')-g('D29A'):0,
    otherCurr:    detail?g('D59')+(g('D51')-g('D51A_C1')-g('D51B_C2')):0,
    customs:      detail?g('D212'):0,
    taxProdPending: detail?0:h('D2REC'),
    taxIncPending:  detail?0:h('D5REC')
  };
  p.detail=detail;
  p.total=PARTS.reduce((a,k)=>a+p[k],0);
  p.published=h('TR');
  p.residual=p.published-p.total;
  p.expenditure=h('TE'); p.deficit=h('B9');
  natParts[y]=p;
});

function territorial(r,y){
  const st=r.rev[y]||null, c=own[y]?.[r.id]||null, l=loc[y]?.[r.id]||null;
  const detail=natParts[y].detail;
  /* Sum whatever components exist rather than demanding all of them. A missing source
     leaves its share in the off-map remainder, so the totals still reconcile — but a
     partially-sourced part is not silently reported as zero. */
  const add=(...xs)=>{ const v=xs.filter(x=>x!=null&&!Number.isNaN(x));
                       return v.length? v.reduce((a,b)=>a+b,0) : null; };
  const C=k=>c?(c[k]??0):null;
  return {
    social:null, eu:null, propInc:null, otherTransfer:null, customs:null,
    taxProdPending: detail?null:add(st?st[3]+st[4]:null, l?l.ownTax:null,
                                    c?((C('D.214')||0)+(C('D.211')||0)+(C('D.212')||0)+(C('D.29')||0)):null),
    taxIncPending:  detail?null:add(st?st[1]+st[2]:null, C('D.59')),
    irpf:   detail&&st?st[1]:null,
    vat:    detail&&st?st[3]:null,
    corp:   detail&&st?st[2]:null,
    excise: detail&&st?st[4]:null,
    propTax:      detail?(l?l.ibi:null):null,
    inherit:      C('D.91'),
    otherProd:    detail?add(C('D.214'),C('D.211'),C('D.212')):null,
    otherProdTax: detail?add(C('D.29'), l?l.ownTax-l.ibi:null):null,
    otherCurr:    detail?C('D.59'):null,
    sales:        add(l?l.fees:null, st?st[6]:null)
  };
}
const regions=prev.regions.map(r=>{
  const parts={};
  years.forEach(y=>{ const t=territorial(r,y);
    t.total=PARTS.reduce((a,k)=>a+(t[k]||0),0); parts[y]=t; });
  return {...r, parts};
});
const mapAgg={};
years.forEach(y=>{ mapAgg[y]={};
  [...PARTS,'total'].forEach(k=>{
    const m=regions.reduce((a,r)=>a+(r.parts[y][k]||0),0);
    const nat=k==='total'?natParts[y].total:natParts[y][k];
    mapAgg[y][k]={mapped:m, offmap:nat-m, nat};
  });});
const coverage={state:'2007-2025',regional:'2012-2025',local:'2019-2024',
  nationalHeadline:'2012-2025',nationalTaxDetail:'2012-2024',
  euByRegion:'not used — EU pays the member state', social:null};
const out={...prev, PARTS, natParts, mapAgg, regions, revYears:years, coverage};
fs.writeFileSync('bundle6.json',JSON.stringify(out));
console.log('bundle6:',(fs.statSync('bundle6.json').size/1024).toFixed(1)+'KB  years',years[0],'-',years[years.length-1]);
console.log('\nidentity Σparts vs published TR:');
years.forEach(y=>{const p=natParts[y];
  console.log(`  ${y}  Σ ${(p.total/1000).toFixed(1).padStart(6)}  TR ${(p.published/1000).toFixed(1).padStart(6)}  residual ${p.residual}  ${p.detail?'full detail':'DETAIL PENDING'}`);});
const y='2025', p=natParts[y], m=mapAgg[y];
console.log(`\n${y} parts (€bn):`);
PARTS.map(k=>[k,p[k]]).filter(x=>x[1]>0).sort((a,b)=>b[1]-a[1])
 .forEach(([k,v])=>console.log(`  ${k.padEnd(16)}${(v/1000).toFixed(1).padStart(7)}   on map ${(m[k].mapped/1000).toFixed(1).padStart(6)}`));
