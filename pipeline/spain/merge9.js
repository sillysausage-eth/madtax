/* Adds the per-bucket detail to the derived bundle:
     natSub  — official ESA sub-codes of each revenue bucket (Eurostat, exact partition)
     subLab  — curated ES/EN labels for those codes (Eurostat's own strings are raw)
     who.excise / who.vat — AEAT administrative detail with its own totals

   Reads and rewrites data/derived/es-fiscal-bundle.json in place.
   Run after extract_natsub.js and extract_aeat_detail.py. */
const fs=require('fs');
const BUNDLE='../../data/derived/es-fiscal-bundle.json';
const b=JSON.parse(fs.readFileSync(BUNDLE,'utf8'));
const ns=JSON.parse(fs.readFileSync('nat_sub.json','utf8'));
const ad=JSON.parse(fs.readFileSync('aeat_detail.json','utf8'));

/* `social` is dropped: who.social already IS this breakdown (same Eurostat codes),
   so rendering both would print the same six numbers twice. The extractor still
   reconciles it, which is how we know that table adds up. */
const natSub={};
for(const [y,rec] of Object.entries(ns.sub)){
  const keep={};
  for(const [k,rows] of Object.entries(rec)) if(k!=='social') keep[k]=rows;
  if(Object.keys(keep).length) natSub[y]=keep;
}

/* Editorial labels. The ESA code is the anchor; these say what the code means in
   Spain. Eurostat's raw label is kept in subSrc for provenance. */
const ES={
  D214C:'ITP y AJD · transmisiones y actos jurídicos',
  D214G:'Primas de seguros',
  D214L:'Otros impuestos sobre productos',
  D214F:'Juego, loterías y apuestas',
  D214D:'Matriculación de vehículos',
  D214I:'Impuestos generales sobre ventas',
  D214H:'Otros impuestos sobre servicios concretos',
  D214B:'Impuesto del timbre',
  D29F:'Impuestos sobre la contaminación',
  D29E:'Licencias de actividad · IAE',
  D29H:'Otros impuestos sobre la producción',
  D29B:'Uso de activos fijos',
  D91A:'Sucesiones y donaciones',
  D91B:'Gravámenes sobre el capital',
  D91C:'Otros impuestos sobre el capital',
  D59A:'Impuesto sobre el patrimonio',
  D59D:'Circulación de vehículos y licencias de los hogares',
  D59F:'Otros impuestos corrientes',
  D2121:'Aranceles aduaneros',
  D2122C:'Impuestos especiales sobre importaciones',
  P11_P12:'Producción de mercado y para uso propio',
  P131:'Pagos por producción no de mercado',
  D41REC:'Intereses',
  D42_TO_D45REC:'Dividendos, rentas de la tierra y otras rentas',
  D7REC_S212:'Transferencias corrientes de la UE',
  D9REC_S212:'Transferencias de capital de la UE',
  'D7REC-D7REC_S212':'Otras transferencias corrientes (no UE)',
  'D9REC-D91REC-D9REC_S212':'Otras transferencias de capital (no UE)',
  D611C:'Cotizaciones obligatorias de los empleadores',
  D613CE:'Cotizaciones obligatorias de los asalariados',
  D613CS:'Cotizaciones de los autónomos',
  D613CN:'Cotizaciones de los no ocupados',
  D612:'Cotizaciones imputadas',
  D613V:'Cotizaciones voluntarias'
};
const EN={
  D214C:'Transfer tax and stamp duty (ITP/AJD)',
  D214G:'Insurance premium tax',
  D214L:'Other taxes on products',
  D214F:'Gambling, lotteries and betting',
  D214D:'Vehicle registration tax',
  D214I:'General sales and turnover taxes',
  D214H:'Other taxes on specific services',
  D214B:'Stamp taxes',
  D29F:'Taxes on pollution',
  D29E:'Business and professional licences (IAE)',
  D29H:'Other taxes on production',
  D29B:'Taxes on the use of fixed assets',
  D91A:'Inheritance and gift tax',
  D91B:'Capital levies',
  D91C:'Other capital taxes',
  D59A:'Wealth tax',
  D59D:'Vehicle circulation tax and household licences',
  D59F:'Other current taxes',
  D2121:'Customs import duties',
  D2122C:'Excise duties on imports',
  P11_P12:'Market output and output for own final use',
  P131:'Payments for non-market output',
  D41REC:'Interest received',
  D42_TO_D45REC:'Dividends, rent and other property income',
  D7REC_S212:'Current transfers from the EU',
  D9REC_S212:'Capital transfers from the EU',
  'D7REC-D7REC_S212':'Other current transfers (non-EU)',
  'D9REC-D91REC-D9REC_S212':'Other capital transfers (non-EU)',
  D611C:'Compulsory employer contributions',
  D613CE:'Compulsory employee contributions',
  D613CS:'Self-employed contributions',
  D613CN:'Contributions by the non-employed',
  D612:'Imputed contributions',
  D613V:'Voluntary contributions'
};
const EXC_ES={fuel:'Hidrocarburos',tobacco:'Labores del tabaco',electricity:'Electricidad',
  alcohol:'Alcohol y bebidas derivadas',plastic:'Envases de plástico no reutilizables',
  beer:'Cerveza',intermediate:'Productos intermedios',coal:'Carbón'};
const EXC_EN={fuel:'Fuel and hydrocarbons',tobacco:'Tobacco',electricity:'Electricity',
  alcohol:'Spirits and derived drinks',plastic:'Non-reusable plastic packaging',
  beer:'Beer',intermediate:'Intermediate products',coal:'Coal'};
const VAT_ES={rgeneral:'Tipo general · 21%',rreduced:'Tipo reducido · 10%',
  rsuper:'Tipo superreducido · 4%',r5:'Tipo temporal 5%',r25:'Tipo temporal 2,5%',
  r75:'Tipo temporal 7,5%',r0:'Tipo 0%'};
const VAT_EN={rgeneral:'Standard rate · 21%',rreduced:'Reduced rate · 10%',
  rsuper:'Super-reduced rate · 4%',r5:'Temporary 5% rate',r25:'Temporary 2.5% rate',
  r75:'Temporary 7.5% rate',r0:'Zero rate'};

/* every code that actually appears must have a label — fail loudly, not silently */
const used=new Set();
for(const rec of Object.values(natSub)) for(const rows of Object.values(rec)) for(const [c] of rows) used.add(c);
const missing=[...used].filter(c=>!ES[c]||!EN[c]);
if(missing.length){ console.error('missing labels:',missing.join(', ')); process.exit(1); }

/* whoNoteES/EN (the institutional "what is this" prose) is dropped, not carried
   forward: the console no longer renders it — the ESA/AEAT tables now speak for
   themselves — so shipping the text would just be dead weight in the bundle. */
const {whoNoteES, whoNoteEN, ...bRest} = b;

const out={...bRest,
  natSub,
  subLab:{es:ES,en:EN},
  subSrc:ns.codeLabels,
  who:{...b.who,
    excise:{kind:'product',years:ad.excise,labES:EXC_ES,labEN:EXC_EN},
    vat:{kind:'rate',years:ad.vat,labES:VAT_ES,labEN:VAT_EN}}
};
fs.writeFileSync(BUNDLE,JSON.stringify(out));
const yrs=Object.keys(natSub).sort();
console.log(`natSub ${yrs[0]}-${yrs[yrs.length-1]} · ${used.size} ESA codes labelled`);
console.log('who:',Object.entries(out.who).map(([k,v])=>`${k}(${v.kind})`).join(' '));
const last='2023';
console.log(`\nbuckets with detail in ${last}:`);
for(const p of b.PARTS){
  const esa=(natSub[last]||{})[p], who=out.who[p];
  if(!esa&&!who) continue;
  console.log(`  ${p.padEnd(14)} ${esa?String(esa.length).padStart(2)+' ESA parts':'          '}  ${who?'who:'+who.kind:''}`);
}
console.log('\nno further split published:',
  b.PARTS.filter(p=>!(natSub[last]||{})[p]&&!out.who[p]).join(', '));
console.log('bundle:',(fs.statSync(BUNDLE).size/1024).toFixed(1)+'KB');
