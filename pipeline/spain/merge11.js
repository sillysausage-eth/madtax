/* Folds the debt layer into the derived bundle.

   Required:  debt_edp.json        (node extract_debt.js)      — the EDP spine
   Optional:  debt_tesoro.json     (Treasury: maturity ladder, average life, average cost)
              debt_holders.json    (holder / investor split)

   The optional files are optional ON PURPOSE. The EDP spine covers all four levels of
   government; the Treasury and holder sources cover a narrower perimeter and are
   published on their own clocks. If a file is absent the screen says so in place —
   it never interpolates, and it never presents a State-only split as if it covered
   general government.

   Reads and rewrites data/derived/es-fiscal-bundle.json in place. Idempotent. */
const fs=require('fs');
const BUNDLE='../../data/derived/es-fiscal-bundle.json';
const b=JSON.parse(fs.readFileSync(BUNDLE,'utf8'));
const edp=JSON.parse(fs.readFileSync('debt_edp.json','utf8'));

const opt=f=>{ try{ return JSON.parse(fs.readFileSync(f,'utf8')); }catch{ return null; } };
const tesoro=opt('debt_tesoro.json');
const holders=opt('debt_holders.json');

/* The headline year is the latest with BOTH a debt total and an interest figure, so the
   hero and the cost section can never quote different years at each other. */
const ref=edp.years.filter(y=>edp.total[y]!=null&&edp.interest[y]!=null).pop();
if(!ref) throw new Error('no year has both a debt total and an interest figure');

/* Re-assert the partition here rather than trusting the extractor: this file is what
   the UI actually reads, so this is the last place the check is worth anything. */
const isum=edp.instr[ref].reduce((a,r)=>a+r[1],0);
if(Math.abs(isum-edp.total[ref])>1)
  throw new Error(`instruments ${isum} do not sum to total ${edp.total[ref]} in ${ref}`);

const debt={
  ref,
  years:edp.years,
  total:edp.total,
  pcGdp:edp.pcGdp,
  intPcGdp:edp.intPcGdp,
  instr:edp.instr,
  tier:edp.tier,
  interest:edp.interest,
  srcEDP:edp.src
};

/* Treasury detail. Scope is State debt, which is smaller than general government —
   carried on the object so the UI can label it rather than let the reader assume. */
if(tesoro){
  if(tesoro.maturity) debt.maturity={...tesoro.maturity, scope:'state'};
  if(tesoro.cost)     debt.cost    ={...tesoro.cost,     scope:'state'};
}
if(holders) debt.holders=holders;

const out={...b, debt};
fs.writeFileSync(BUNDLE,JSON.stringify(out));

console.log(`debt folded in · reference year ${ref}`);
console.log(`  total ${(debt.total[ref]/1000).toFixed(1)}bn · ${debt.pcGdp[ref]}% of GDP · `
  +`interest ${(debt.interest[ref].total/1000).toFixed(1)}bn`);
console.log(`  series ${edp.years[0]}-${edp.years[edp.years.length-1]} · `
  +`${edp.instr[ref].length} instruments · ${debt.tier[ref]?'4 tiers':'no tier split'}`);
console.log(`  maturity: ${debt.maturity?debt.maturity.rows.length+' years, avg life '+debt.maturity.avgLife:'ABSENT — screen states the gap'}`);
console.log(`  cost:     ${debt.cost?debt.cost.avgCost+'%':'ABSENT — screen states the gap'}`);
console.log(`  holders:  ${debt.holders?debt.holders.rows.length+' groups':'ABSENT — screen states the gap'}`);
console.log('bundle:',(fs.statSync(BUNDLE).size/1024).toFixed(1)+'KB');
