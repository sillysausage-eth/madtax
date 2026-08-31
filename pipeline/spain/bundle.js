const fs=require('fs');
const map=JSON.parse(fs.readFileSync('map_paths.json','utf8'));
const aeat=JSON.parse(fs.readFileSync('aeat_regional.json','utf8'));
const gdp=JSON.parse(fs.readFileSync('gdp_clean.json','utf8'));
const pop=JSON.parse(fs.readFileSync('pop_clean.json','utf8'));

const NUTS={'01':'ES61','02':'ES24','03':'ES12','04':'ES53','05':'ES70','06':'ES13','07':'ES41',
'08':'ES42','09':'ES51','10':'ES52','11':'ES43','12':'ES11','13':'ES30','14':'ES62','15':'ES22',
'16':'ES21','17':'ES23','18':'ES63','19':'ES64'};
const ES={'01':'Andalucía','02':'Aragón','03':'Asturias','04':'Illes Balears','05':'Canarias',
'06':'Cantabria','07':'Castilla y León','08':'Castilla-La Mancha','09':'Cataluña',
'10':'Comunitat Valenciana','11':'Extremadura','12':'Galicia','13':'Comunidad de Madrid',
'14':'Región de Murcia','15':'Navarra','16':'País Vasco','17':'La Rioja','18':'Ceuta','19':'Melilla'};
const EN={'01':'Andalusia','02':'Aragon','03':'Asturias','04':'Balearic Islands','05':'Canary Islands',
'06':'Cantabria','07':'Castile and León','08':'Castile-La Mancha','09':'Catalonia',
'10':'Valencia','11':'Extremadura','12':'Galicia','13':'Madrid','14':'Murcia','15':'Navarre',
'16':'Basque Country','17':'La Rioja','18':'Ceuta','19':'Melilla'};
const FORAL=new Set(['15','16']);
// Order: TOTAL, IRPF, IS, IVA, IIEE, OTROS, TASAS.
// OTROS is built from the four real source lines that were previously dropped
// (non-resident income, other direct, customs duties, other indirect) — NOT plugged
// as a residual. verify.js asserts the heads sum back to TOTAL.
const TAXES=['INGRESOS_OPERACIONES_CORRIENTES_S1','I_100','I_101','I_21','I_22','I_3'];
const OTHER=['I_102','I_1_O','I_23','I_2_O'];
const pick=(s)=>{
  const v=TAXES.map(t=>Math.round(s[t]??0));
  const other=OTHER.reduce((a,k)=>a+(s[k]??0),0);
  return [v[0],v[1],v[2],v[3],v[4],Math.round(other),v[5]];   // TASAS moves to index 6
};

const years=[];
for(let y=2007;y<=2025;y++) if(aeat.data['ES']?.[y]) years.push(String(y));

const regions=map.regions.map(r=>{
  const nuts=NUTS[r.code];
  const src=aeat.data[nuts]||{};
  const series={};
  years.forEach(y=>{
    const s=src[y];
    series[y]=s?pick(s):null;
  });
  return {
    id:r.code, nuts, es:ES[r.code], en:EN[r.code],
    d:r.d, cx:r.cx, cy:r.cy, bbox:r.bbox, inset:!!r.inset,
    foral:FORAL.has(r.code),
    gdp: gdp[nuts]? Math.round(gdp[nuts].v) : null,
    pop: pop[nuts]? pop[nuts].v : null,
    series
  };
});

const national={};
years.forEach(y=>{const s=aeat.data['ES'][y]; national[y]=pick(s);});

const bundle={W:map.W,H:map.H,CB:map.CB,years,taxes:['TOTAL','IRPF','IS','IVA','IIEE','OTROS','TASAS'],national,regions};
fs.writeFileSync('bundle.json',JSON.stringify(bundle));
const kb=(fs.statSync('bundle.json').size/1024).toFixed(1);
console.log(`bundle: ${kb}KB · ${regions.length} regions · years ${years[0]}-${years[years.length-1]}`);
const miss=regions.filter(r=>!r.gdp||!r.pop||!r.series[years[years.length-1]]);
console.log('incomplete:', miss.length? miss.map(m=>m.id+':'+m.es).join(', ') : 'none');
// sanity
const y='2024';
const sum=regions.reduce((s,r)=>s+(r.series[y]?r.series[y][0]:0),0);
console.log(`sum(regions) ${(sum/1000).toFixed(1)}bn  vs  national ${(national[y][0]/1000).toFixed(1)}bn  diff ${((sum-national[y][0])/1000).toFixed(1)}bn`);
