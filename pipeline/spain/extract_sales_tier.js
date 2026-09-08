/* Who charges the "fees, public prices and sales" bucket: the same two Eurostat items
   that partition it nationally (P11_P12 and P131 in gov_10a_main), read per government
   subsector — the State (S1311), the autonomous communities (S1312), local government
   (S1313) and Social Security (S1314).

   Same dataset, same unit, same accrual basis as the bucket itself. Neither item is
   consolidated between tiers in the S13 total, so the four subsectors sum to S13
   exactly — asserted here for every item and every year, or the run fails.

   Usage: node extract_sales_tier.js            (writes sales_tier.json)
          node extract_sales_tier.js --offline  (reuse cached eurostat_gov_10a_main_tiers.json) */
const fs=require('fs');
const API='https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data/gov_10a_main';
const SECTORS=['S13','S1311','S1312','S1313','S1314'];
const TIERS=SECTORS.slice(1);
const ITEMS=['P11_P12','P131'];
const Q='?format=JSON&geo=ES&unit=MIO_EUR&sinceTimePeriod=2012&lang=EN'
  +SECTORS.map(s=>'&sector='+s).join('')+ITEMS.map(i=>'&na_item='+i).join('');
const CACHE='eurostat_gov_10a_main_tiers.json';

async function grab(){
  if(process.argv.includes('--offline')) return JSON.parse(fs.readFileSync(CACHE,'utf8'));
  const r=await fetch(API+Q);
  if(!r.ok) throw new Error(`gov_10a_main by sector: HTTP ${r.status}`);
  const j=await r.json();
  fs.writeFileSync(CACHE,JSON.stringify(j));
  return j;
}
/* JSON-stat: `value` is a flat array indexed row-major over the declared dimensions.
   Build a stride per dimension so the lookup does not depend on their order. */
function reader(j){
  const dims=j.id, sizes=j.size;
  const stride=sizes.map((_,i)=>sizes.slice(i+1).reduce((a,b)=>a*b,1));
  const idx=(d,c)=>j.dimension[d].category.index[c];
  return {
    years:Object.keys(j.dimension.time.category.index).sort(),
    get:(sector,item,y)=>{
      const parts=[['sector',sector],['na_item',item],['time',y]];
      if(parts.some(([d,c])=>idx(d,c)==null)) return null;
      const v=j.value[parts.reduce((a,[d,c])=>a+idx(d,c)*stride[dims.indexOf(d)],0)];
      return v==null?null:Math.round(v);
    }
  };
}
(async()=>{
  const j=await grab();
  const R=reader(j);
  const out={updated:j.updated, years:{}};
  let bad=0;
  for(const y of R.years){
    const rec={};
    for(const s of SECTORS){
      const row={};
      for(const it of ITEMS){ const v=R.get(s,it,y); if(v!=null) row[it]=v; }
      if(Object.keys(row).length===ITEMS.length) rec[s]=row;
    }
    if(Object.keys(rec).length!==SECTORS.length){ console.log(`  ${y}: incomplete, skipped`); continue; }
    for(const it of ITEMS){
      const sum=TIERS.reduce((a,s)=>a+rec[s][it],0);
      if(sum!==rec.S13[it]){ console.log(`  MISMATCH ${y} ${it}: tiers ${sum} vs S13 ${rec.S13[it]}`); bad++; }
    }
    out.years[y]=rec;
  }
  if(bad) throw new Error(`${bad} tier sums do not reproduce S13 — a consolidated item, or a changed dataset`);
  fs.writeFileSync('sales_tier.json',JSON.stringify(out));
  const ys=Object.keys(out.years).sort(), last=ys[ys.length-1], L=out.years[last];
  console.log(`years ${ys[0]}-${last} · every tier sum reproduces S13 exactly · dataset ${out.updated}`);
  console.log(`\n${last} who charges it (€bn, P11_P12 + P131):`);
  for(const s of TIERS) console.log(`  ${s}  ${((L[s].P11_P12+L[s].P131)/1000).toFixed(1).padStart(6)}   sales ${(L[s].P11_P12/1000).toFixed(1)}  part-payments ${(L[s].P131/1000).toFixed(1)}`);
})();
