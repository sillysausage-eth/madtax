const fs=require('fs');
const rl=require('readline').createInterface({input:fs.createReadStream('aeat_reg.csv')});
function split(line){
  const o=[];let c='',q=false;
  for(let i=0;i<line.length;i++){const ch=line[i];
    if(ch==='"'){q=!q;continue;}
    if(ch===','&&!q){o.push(c);c='';continue;}
    c+=ch;}
  o.push(c);return o;
}
const WANT=new Set(['INGRESOS_OPERACIONES_CORRIENTES_S1','I_1','I_100','I_101','I_102','I_1_O','I_2','I_21','I_22','I_23','I_2_O','I_3']);
const MEAS='TRIBUTOS_RECAUDACION_LIQUIDA_ACUM';
const out={};   // territory -> year -> partida -> value(€m)
const names={};
let n=0,kept=0;
rl.on('line',l=>{
  if(n++===0)return;
  const f=split(l);
  const [tName,tCode,,tPer,,part,,meas,val]=f;
  if(meas!==MEAS)return;
  if(!/^\d{4}$/.test(tPer))return;          // annual rows only
  if(!WANT.has(part))return;
  if(!/^ES(\d{2,3})?$/.test(tCode))return;
  const v=parseFloat(val);
  if(!isFinite(v))return;
  names[tCode]=tName;
  ((out[tCode] ??= {})[tPer] ??= {})[part]=Math.round(v/1000*10)/10;  // thousands € -> € million
  kept++;
});
rl.on('close',()=>{
  fs.writeFileSync('aeat_regional.json',JSON.stringify({names,data:out}));
  const yrs=[...new Set(Object.values(out).flatMap(o=>Object.keys(o)))].sort();
  console.log(`kept ${kept} rows · ${Object.keys(out).length} territories · years ${yrs[0]}–${yrs[yrs.length-1]}`);
  const y='2024';
  console.log(`\nSPAIN ${y} state tax collection (€bn, net):`);
  const s=out['ES'][y];
  [['INGRESOS_OPERACIONES_CORRIENTES_S1','TOTAL'],['I_100','IRPF'],['I_101','Sociedades'],['I_21','IVA'],['I_22','Especiales'],['I_3','Tasas']]
    .forEach(([k,lab])=>console.log('  ',lab.padEnd(12),((s[k]||0)/1000).toFixed(1)));
  console.log(`\nBy region ${y} (€bn total):`);
  Object.entries(out).filter(([k])=>/^ES\d{2}$/.test(k))
    .map(([k,o])=>[k,names[k],(o[y]?.INGRESOS_OPERACIONES_CORRIENTES_S1||0)/1000])
    .sort((a,b)=>b[2]-a[2])
    .forEach(([k,nm,v])=>console.log('  ',k.padEnd(6),nm.padEnd(28),v.toFixed(1)));
});
