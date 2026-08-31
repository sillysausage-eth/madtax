const fs=require('fs');
const prev=JSON.parse(fs.readFileSync('bundle2.json','utf8'));
const own =JSON.parse(fs.readFileSync('ccaa_owntax.json','utf8'));   // regional own-managed taxes
const loc =JSON.parse(fs.readFileSync('local_owntax.json','utf8'));  // local own taxes + fees
const eur =JSON.parse(fs.readFileSync('eu_es.json','utf8'));         // EU payments by NUTS2

const NUTS2ID={ES61:'01',ES24:'02',ES12:'03',ES53:'04',ES70:'05',ES13:'06',ES41:'07',ES42:'08',
ES51:'09',ES52:'10',ES43:'11',ES11:'12',ES30:'13',ES62:'14',ES22:'15',ES21:'16',ES23:'17',
ES63:'18',ES64:'19'};
// EU payments: aggregate to region-year, and keep national/extra-regio separately
const eu={}, euUnassigned={};
eur.forEach(r=>{
  const id=NUTS2ID[r.nuts2_id]; const y=r.year, v=+r.pay/1e6;   // euros -> € millions
  if(!id){ euUnassigned[y]=(euUnassigned[y]||0)+v; return; }
  (eu[id] ??= {})[y]=(eu[id][y]||0)+v;
});

const years=[]; for(let y=2007;y<=2025;y++) years.push(String(y));

const regions=prev.regions.map(r=>{
  const rev2={};
  years.forEach(y=>{
    const st = r.rev[y] || null;                       // [tot,irpf,is,iva,iiee,otros,tasas]
    const rg = own[y]?.[r.id]?.OWN ?? null;            // regional own-managed taxes
    const L  = loc[y]?.[r.id] ?? null;
    const lt = L ? L.ownTax : null;
    const ib = L ? L.ibi    : null;
    const lf = L ? L.fees   : null;
    const eu_= eu[r.id]?.[y] ?? null;
    const have = st!==null && rg!==null && lt!==null && lf!==null;
    rev2[y]={
      st, rg, lt, ibi:ib, lf, eu:eu_==null?null:Math.round(eu_),
      // Money RAISED in this territory. EU funds are excluded — they are inbound
      // transfers, not tax raised here, and are shown as their own layer.
      total: have ? st[0]+rg+lt+lf : null,
      partial: !have,
      missing: [st===null&&'state', rg===null&&'regional',
                lt===null&&'local', lf===null&&'fees'].filter(Boolean)
    };
  });
  return {...r, rev2};
});

// national roll-ups
const national2={};
years.forEach(y=>{
  const sum=k=>regions.reduce((a,r)=>a+((r.rev2[y][k]??0)),0);
  const stTot=regions.reduce((a,r)=>a+(r.rev2[y].st?r.rev2[y].st[0]:0),0);
  const complete=regions.every(r=>!r.rev2[y].partial || ['18','19'].includes(r.id));
  national2[y]={ st:stTot, rg:sum('rg'), lt:sum('lt'), ibi:sum('ibi'), lf:sum('lf'),
                 eu:sum('eu'), euUnassigned:Math.round(euUnassigned[y]||0),
                 total:stTot+sum('rg')+sum('lt')+sum('lf'), complete };
});
const coverage={
  state:{from:'2007',to:'2025'}, regional:{from:'2012',to:'2024'},
  local:{from:'2019',to:'2023'}, eu:{from:'2012',to:'2022'},
  full:{from:'2019',to:'2022'},
  social:null   // not published territorially by TGSS — see docs/06
};
const out={...prev, regions, national2, coverage, revYears:years};
fs.writeFileSync('bundle3.json',JSON.stringify(out));
console.log('bundle3:',(fs.statSync('bundle3.json').size/1024).toFixed(1)+'KB');
console.log('\nUnified revenue raised per territory, national roll-up (€bn):');
['2019','2020','2021','2022','2023'].forEach(y=>{
  const n=national2[y];
  console.log(`  ${y}  state ${(n.st/1000).toFixed(1).padStart(6)}  regional ${(n.rg/1000).toFixed(1).padStart(5)}  `+
    `local ${(n.lt/1000).toFixed(1).padStart(5)}  fees/fines ${(n.lf/1000).toFixed(1).padStart(5)}  `+
    `= ${(n.total/1000).toFixed(1).padStart(6)}   EU in ${(n.eu/1000).toFixed(1)}`);
});
const y='2022';
console.log(`\n${y} top territories by TOTAL raised (€bn):`);
regions.filter(r=>r.rev2[y].total!=null).sort((a,b)=>b.rev2[y].total-a.rev2[y].total).slice(0,6)
 .forEach(r=>{const v=r.rev2[y];
   console.log(`  ${r.nuts} ${r.es.padEnd(22)} ${(v.total/1000).toFixed(1).padStart(6)}   `+
   `(state ${(v.st[0]/1000).toFixed(1)}, reg ${(v.rg/1000).toFixed(1)}, local ${(v.lt/1000).toFixed(1)}, fees ${(v.lf/1000).toFixed(1)})  EU ${(v.eu/1000).toFixed(2)}`);});
