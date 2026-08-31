/* Restructures who.irpf so the bracket table can no longer gate the display year.

   Before:  who.irpf = {kind:'brackets', years: <AEAT fixed brackets, 2023 only>,
                                         deciles: <AEAT decile series, 2003-2023>}
   After:   who.irpf = {kind:'brackets', deciles: <the multi-year series>,
                                         brackets: <the single-year bracket table>}

   `years` was a lie: for every other who.* bucket it is the multi-year series the UI
   indexes by year, but for irpf it held the one-off bracket snapshot. The console read
   who.irpf.years to pick the display year, so every selected year clamped to 2023 and
   the 2003-2022 decile data in the bundle was unreachable. Naming the two datasets for
   what they are removes the trap; the UI then takes its year from `deciles`.

   Reads and rewrites data/derived/es-fiscal-bundle.json in place. Idempotent — running
   it twice is a no-op. Run after merge9.js, before verify.js.

   Optional decile refresh (AEAT publishes on its own clock):
     node merge10.js --deciles=irpf_deciles.json
   folds a fresh extract_who.py run in, REPLACING who.irpf.deciles wholesale. Every year
   present in both the fresh file and the shipped bundle must agree within rounding or
   the script refuses to write. Nothing is ever interpolated or back-filled: years the
   fresh extraction does not carry simply do not appear. */
const fs=require('fs'), path=require('path');
const BUNDLE=path.join(__dirname,'../../data/derived/es-fiscal-bundle.json');
const b=JSON.parse(fs.readFileSync(BUNDLE,'utf8'));

const W=b.who&&b.who.irpf;
if(!W){ console.error('who.irpf missing from the bundle — run merge8/merge9 first'); process.exit(1); }

/* ---- 1. restructure: years -> brackets -------------------------------------- */
let brackets=W.brackets, deciles=W.deciles, moved=false;
/* merge8.js predates the two-dataset split: it writes {kind:'deciles', years:<deciles>}
   and never reads irpf_brackets.json at all. Say so plainly rather than moving the
   decile series into the bracket slot and failing on its shape further down. */
if(W.kind==='deciles' && W.years && !deciles){
  console.error('who.irpf is still merge8.js output {kind:\'deciles\', years:<deciles>}.');
  console.error('That shape has no bracket table: run extract_brackets.py and fold');
  console.error('irpf_brackets.json in as who.irpf.brackets before running merge10.js.');
  process.exit(1);
}
if(W.years){
  if(brackets && JSON.stringify(brackets)!==JSON.stringify(W.years)){
    console.error('who.irpf has BOTH years and a different brackets — refusing to guess which is current');
    process.exit(1);
  }
  brackets=W.years; moved=true;
}
if(!deciles){ console.error('who.irpf.deciles missing — nothing to drive the year selector'); process.exit(1); }
if(!brackets){ console.error('who.irpf has neither years nor brackets — bracket tie-outs would go untested'); process.exit(1); }

/* the bracket table must look like a bracket table, not a year-keyed series */
for(const [y,v] of Object.entries(brackets)){
  if(!v||!Array.isArray(v.rows)||!v.total){
    console.error(`who.irpf.brackets[${y}] is not {rows,total} — wrong dataset moved`); process.exit(1);
  }
}

/* ---- 2. optional decile refresh --------------------------------------------- */
const arg=process.argv.slice(2).find(a=>a.startsWith('--deciles='));
if(arg){
  const src=path.resolve(process.cwd(), arg.slice('--deciles='.length));
  const fresh=JSON.parse(fs.readFileSync(src,'utf8'));
  const BANDS=[...Array(10)].map((_,i)=>'D'+String(i+1).padStart(2,'0')).concat('TOT');
  const fy=Object.keys(fresh).sort();
  if(!fy.length){ console.error(`${src} carries no years`); process.exit(1); }
  for(const y of fy){
    const miss=BANDS.filter(k=>!fresh[y][k]);
    if(miss.length){ console.error(`fresh ${y} is missing ${miss.join(',')} — incomplete extraction`); process.exit(1); }
  }
  /* overlapping years must match the shipped bundle within rounding: this is the
     guard that catches a changed source layout silently shifting a column. */
  let bad=[];
  for(const y of fy){
    const old=deciles[y]; if(!old) continue;
    for(const k of Object.keys(old)){
      const a=old[k], c=fresh[y][k];
      if(!c){ bad.push(`${y}/${k} vanished`); continue; }
      for(const f of ['n','income','tax']){
        if(a[f]==null||c[f]==null) continue;
        const tol=Math.max(Math.abs(a[f])*1e-4, 1);
        if(Math.abs(a[f]-c[f])>tol) bad.push(`${y}/${k}.${f} ${a[f]} -> ${c[f]}`);
      }
    }
  }
  if(bad.length){
    console.error(`refusing the refresh: ${bad.length} overlapping values disagree with the shipped bundle`);
    bad.slice(0,10).forEach(x=>console.error('  '+x));
    process.exit(1);
  }
  const added=fy.filter(y=>!deciles[y]), dropped=Object.keys(deciles).filter(y=>!fresh[y]);
  if(dropped.length) console.log(`note: the refresh does not carry ${dropped.join(', ')} — those years are dropped, not back-filled`);
  deciles=fresh;
  console.log(`deciles refreshed from ${path.relative(process.cwd(),src)}: `
    +`${fy[0]}-${fy[fy.length-1]}${added.length?`, new year(s) ${added.join(', ')}`:', no new year'}`);
}

/* ---- 3. write --------------------------------------------------------------- */
const irpf={kind:'brackets', deciles, brackets};
for(const k of Object.keys(W)) if(!['kind','years','deciles','brackets'].includes(k)) irpf[k]=W[k];
b.who={...b.who, irpf};
fs.writeFileSync(BUNDLE, JSON.stringify(b));

const dy=Object.keys(deciles).sort(), by=Object.keys(brackets).sort();
console.log(moved? 'who.irpf.years -> who.irpf.brackets (restructured)'
                 : 'who.irpf already restructured (no-op)');
console.log(`  deciles  ${dy[0]}-${dy[dy.length-1]}  (${dy.length} years, drives the UI year selector)`);
console.log(`  brackets ${by.join(', ')}  (AEAT tramos de rendimiento, tie-outs only)`);
console.log('bundle:',(fs.statSync(BUNDLE).size/1024).toFixed(1)+'KB');
