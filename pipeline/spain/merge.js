const fs=require('fs');
const rev=JSON.parse(fs.readFileSync('bundle.json','utf8'));
const cof=JSON.parse(fs.readFileSync('cofog_regional.json','utf8'));
const nat=JSON.parse(fs.readFileSync('cofog_national.json','utf8'));

const DIV=['01','02','03','04','05','06','07','08','09','10'];
const DIV_ES={'01':'Servicios públicos generales','02':'Defensa','03':'Orden público y seguridad',
'04':'Asuntos económicos','05':'Medio ambiente','06':'Vivienda y urbanismo','07':'Sanidad',
'08':'Ocio, cultura y religión','09':'Educación','10':'Protección social'};
const DIV_EN={'01':'General public services','02':'Defence','03':'Public order & safety',
'04':'Economic affairs','05':'Environment','06':'Housing & communities','07':'Health',
'08':'Recreation & culture','09':'Education','10':'Social protection'};
const ECON=['D.1','P.2','D.3','D.4','D.62','D.632','D.7','P.5','D.9'];
const ECON_ES={'D.1':'Salarios públicos','P.2':'Bienes y servicios','D.3':'Subvenciones',
'D.4':'Intereses de deuda','D.62':'Prestaciones en efectivo','D.632':'Prestaciones en especie',
'D.7':'Otras transferencias','P.5':'Inversión','D.9':'Transferencias de capital'};
const ECON_EN={'D.1':'Public salaries','P.2':'Goods & services','D.3':'Subsidies',
'D.4':'Debt interest','D.62':'Cash benefits','D.632':'In-kind benefits',
'D.7':'Other transfers','P.5':'Investment','D.9':'Capital transfers'};

const years=Object.keys(cof.regions).sort();
// regional spend series: region -> year -> [TOT, d01..d10]
const spendReg={};
rev.regions.forEach(r=>{
  spendReg[r.id]={};
  years.forEach(y=>{
    const rec=cof.regions[y]&&cof.regions[y][r.id];
    if(!rec){spendReg[r.id][y]=null;return;}
    spendReg[r.id][y]=[rec.div.TOT??0, ...DIV.map(d=>rec.div[d]??0)];
  });
});
// econ composition (latest available per year)
const econReg={};
rev.regions.forEach(r=>{
  econReg[r.id]={};
  years.forEach(y=>{
    const rec=cof.regions[y]&&cof.regions[y][r.id];
    econReg[r.id][y]= rec? ECON.map(k=>rec.econ[k]??0) : null;
  });
});
// national general government expenditure by division
const spendNat={};
Object.entries(nat.series).forEach(([y,o])=>{
  spendNat[y]=[o.TOTAL??0, ...DIV.map(d=>o['GF'+d]??0)];
});
// who spends what (2024, UNCONSOLIDATED — includes transfers between tiers)
const bySector={};
Object.entries(nat.bySector).forEach(([s,o])=>{
  bySector[s]=[o.TOTAL??0, ...DIV.map(d=>o['GF'+d]??0)];
});

const out={
  W:rev.W,H:rev.H,CB:rev.CB,
  revYears:rev.years, revTaxes:rev.taxes, revNational:rev.national,
  spendYears:years, spendNational:spendNat, spendBySector:bySector,
  divisions:DIV, divES:DIV_ES, divEN:DIV_EN,
  econKeys:ECON, econES:ECON_ES, econEN:ECON_EN,
  // headline general-government revenue/expenditure (Eurostat S13, consolidated)
  gg:{ '2024':{rev:673700,exp:725000}, '2023':{rev:630200,exp:680200},
       '2022':{rev:574000,exp:637100}, '2021':{rev:529000,exp:611100},
       '2020':{rev:468300,exp:580200}, '2019':{rev:488300,exp:526800} },
  bridge2024:[
    ['aeat',294700],['notaeat',86600],['alltax',381300],
    ['socsec',210300],['taxsoc',591700],['nontax',82000],['ggtotal',673700]
  ],
  regions: rev.regions.map(r=>({
    id:r.id,nuts:r.nuts,es:r.es,en:r.en,d:r.d,cx:r.cx,cy:r.cy,bbox:r.bbox,inset:r.inset,
    foral:r.foral,gdp:r.gdp,pop:r.pop,
    rev:r.series, spend:spendReg[r.id], econ:econReg[r.id]
  }))
};
fs.writeFileSync('bundle2.json',JSON.stringify(out));
console.log('bundle2:',(fs.statSync('bundle2.json').size/1024).toFixed(1)+'KB');
console.log('spend years:',years[0],'-',years[years.length-1]);
const y='2024';
const sum=out.regions.reduce((s,r)=>s+(r.spend[y]?r.spend[y][0]:0),0);
console.log(`regional spend sum ${(sum/1000).toFixed(1)}bn · GG total ${(out.spendNational[y][0]/1000).toFixed(1)}bn · regional share ${(sum/out.spendNational[y][0]*100).toFixed(1)}%`);
const noSpend=out.regions.filter(r=>!r.spend[y]).map(r=>r.es);
console.log('no regional-government data:',noSpend.join(', ')||'none');
