const fs=require('fs');
const prev=JSON.parse(fs.readFileSync('bundle4.json','utf8'));
const tax =JSON.parse(fs.readFileSync('tax_dec_clean.json','utf8'));
const nt  =JSON.parse(fs.readFileSync('nontax_clean.json','utf8'));
const own =JSON.parse(fs.readFileSync('ccaa_owntax.json','utf8'));
const loc =JSON.parse(fs.readFileSync('local_owntax.json','utf8'));

/* Exhaustive, mutually exclusive decomposition of total public revenue.
   Every euro lands in exactly one part; the parts sum to TR by construction and
   verify.js asserts it to €1m in every year. */
const PARTS=[
 'social','irpf','vat','corp','sales','excise','eu','otherProd','propInc',
 'propTax','otherProdTax','otherTransfer','inherit','otherCurr','customs'
];
const years=Object.keys(tax).sort();
const natParts={};
years.forEach(y=>{
  const t=tax[y], o=nt[y];
  const g=k=>t[k]??0, h=k=>o[k]??0;
  const p={
    social:       g('D61'),
    irpf:         g('D51A_C1'),
    vat:          g('D211'),
    corp:         g('D51B_C2'),
    sales:        h('P11_P12_P131'),
    excise:       g('D214A'),
    eu:           h('D7REC_S212')+h('D9REC_S212'),
    otherProd:    g('D214')-g('D214A'),
    propInc:      h('D4REC'),
    propTax:      g('D29A'),
    otherProdTax: g('D29')-g('D29A'),
    otherTransfer:(h('D7REC')+ (h('D9REC')-g('D91')) ) - (h('D7REC_S212')+h('D9REC_S212')),
    inherit:      g('D91'),
    otherCurr:    g('D59') + (g('D51')-g('D51A_C1')-g('D51B_C2')),
    customs:      g('D212')
  };
  p.total=PARTS.reduce((a,k)=>a+p[k],0);
  p.published=h('TR');
  p.residual=p.published-p.total;      // must be ~0
  natParts[y]=p;
});

/* Territorial series per part. Where a part has no regional source it maps to null,
   and the whole national figure shows as an off-map card. */
function territorial(r,y){
  const st=r.rev[y]||null;                       // AEAT: [tot,irpf,is,iva,iiee,otros,tasas]
  const c=own[y]?.[r.id]||null;                  // regional own-managed, by ESA code
  const l=loc[y]?.[r.id]||null;                  // local
  const q=(v)=>v==null?null:v;
  return {
    social:null, eu:null, propInc:null, otherTransfer:null, customs:null,
    irpf:  st?st[1]:null,
    vat:   st?st[3]:null,
    corp:  st?st[2]:null,
    excise:st?st[4]:null,
    propTax: l?l.ibi:null,
    inherit: c?(c['D.91']??0):null,
    otherProd: c?((c['D.214']??0)+(c['D.211']??0)+(c['D.212']??0)):null,
    otherProdTax: (c&&l)?((c['D.29']??0)+(l.ownTax-l.ibi)):null,
    otherCurr: c?(c['D.59']??0):null,
    sales: (l&&st)?(l.fees+st[6]):null
  };
}
const regions=prev.regions.map(r=>{
  const parts={};
  years.forEach(y=>{
    const t=territorial(r,y);
    t.total=PARTS.reduce((a,k)=>a+(t[k]||0),0);
    parts[y]=t;
  });
  return {...r, parts};
});
// per-part national mapped totals and the off-map remainder
const mapAgg={};
years.forEach(y=>{
  mapAgg[y]={};
  [...PARTS,'total'].forEach(k=>{
    const m=regions.reduce((a,r)=>a+(r.parts[y][k]||0),0);
    const nat=k==='total'?natParts[y].total:natParts[y][k];
    mapAgg[y][k]={mapped:m, offmap:nat-m, nat};
  });
});
const out={...prev, PARTS, natParts, mapAgg, regions, revYears:years};
delete out.bridge2024;
fs.writeFileSync('bundle5.json',JSON.stringify(out));
console.log('bundle5:',(fs.statSync('bundle5.json').size/1024).toFixed(1)+'KB');
console.log('\nidentity: Σparts vs published TR');
years.forEach(y=>{const p=natParts[y];
  console.log(`  ${y}  Σ ${(p.total/1000).toFixed(1).padStart(6)}  TR ${(p.published/1000).toFixed(1).padStart(6)}  residual ${(p.residual/1000).toFixed(3)}`);});
const y='2023', p=natParts[y];
console.log(`\n${y} parts (€bn), largest first — these sum to €${(p.total/1000).toFixed(1)}bn:`);
PARTS.map(k=>[k,p[k]]).sort((a,b)=>b[1]-a[1]).forEach(([k,v])=>{
  const m=mapAgg[y][k];
  console.log(`  ${k.padEnd(14)}${(v/1000).toFixed(1).padStart(7)}   on map ${(m.mapped/1000).toFixed(1).padStart(6)}   off map ${(m.offmap/1000).toFixed(1).padStart(6)}`);});
