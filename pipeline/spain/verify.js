/* MadTax tie-out harness — every published figure must survive these.
   Exit code 1 if any FAIL. Run: node verify.js                        */
const fs=require('fs'), path=require('path');
// Resolve the bundle whether run from the repo root or from this directory.
const CANDIDATES=[
  process.argv[2],
  path.join(__dirname,'../../data/derived/es-fiscal-bundle.json'),
  path.join(process.cwd(),'data/derived/es-fiscal-bundle.json'),
  path.join(process.cwd(),'bundle6.json'),path.join(process.cwd(),'bundle5.json'),path.join(process.cwd(),'bundle4.json'),path.join(process.cwd(),'bundle3.json'),path.join(process.cwd(),'bundle2.json'),
].filter(Boolean);
const BUNDLE=CANDIDATES.find(p=>{try{return fs.statSync(p).isFile();}catch(e){return false;}});
if(!BUNDLE){console.error('bundle not found. tried:\n  '+CANDIDATES.join('\n  '));process.exit(2);}
console.log('bundle: '+path.relative(process.cwd(),BUNDLE));
const D=JSON.parse(fs.readFileSync(BUNDLE,'utf8'));
let pass=0,fail=0,warn=0;
const bn=v=>(v/1000).toFixed(1)+'bn';
function check(name,ok,detail){
  if(ok===true){pass++;console.log('  PASS  '+name+(detail?'   '+detail:''));}
  else if(ok==='warn'){warn++;console.log('  WARN  '+name+(detail?'   '+detail:''));}
  else{fail++;console.log('  FAIL  '+name+(detail?'   '+detail:''));}
}
const near=(a,b,tolPct)=>Math.abs(a-b)<=Math.abs(b)*tolPct/100;

console.log('\n=== A. HEADLINE IDENTITIES (2024) ===');
const gg=D.gg['2024'];
check('revenue - expenditure = deficit',
  Math.abs((gg.rev-gg.exp)-(-51300))<100, `${bn(gg.rev)} - ${bn(gg.exp)} = ${bn(gg.rev-gg.exp)}`);
const GDP=1594300;
const teRatio=gg.exp/GDP*100, trRatio=gg.rev/GDP*100;
check('expenditure ratio in plausible range (35-55% GDP)', teRatio>35&&teRatio<55, teRatio.toFixed(1)+'% of GDP');
check('revenue ratio in plausible range (30-50% GDP)', trRatio>30&&trRatio<50, trRatio.toFixed(1)+'% of GDP');
check('deficit ratio in plausible range (0-8% GDP)',
  Math.abs(gg.rev-gg.exp)/GDP*100 < 8, (Math.abs(gg.rev-gg.exp)/GDP*100).toFixed(1)+'% of GDP');
const POP=48.6e6;
check('spend per resident plausible (8k-25k)',
  gg.exp*1e6/POP>8000 && gg.exp*1e6/POP<25000, '€'+Math.round(gg.exp*1e6/POP).toLocaleString('en-GB')+' per resident');

console.log('\n=== B. NO DOUBLE COUNTING ===');
const tiers=['S1311','S1312','S1313','S1314'];
const tierSum=tiers.reduce((s,k)=>s+D.spendBySector[k][0],0);
const consolidated=D.spendBySector.S13[0];
check('tier sum EXCEEDS consolidated (transfers not yet eliminated)',
  tierSum>consolidated, `tiers ${bn(tierSum)} vs consolidated ${bn(consolidated)} — gap ${bn(tierSum-consolidated)}`);
check('published headline uses CONSOLIDATED, not the tier sum',
  Math.abs(D.spendNational['2024'][0]-consolidated)<1,
  `headline ${bn(D.spendNational['2024'][0])} = S13 ${bn(consolidated)}`);
check('headline is NOT the tier sum',
  !near(D.spendNational['2024'][0],tierSum,1), 'headline would be '+bn(tierSum)+' if double counted');

console.log('\n=== C. COFOG INTERNAL CONSISTENCY ===');
for(const y of ['2024','2020','2012']){
  const s=D.spendNational[y]; if(!s) continue;
  const divSum=s.slice(1).reduce((a,b)=>a+b,0);
  check(`COFOG divisions sum to total (${y})`, near(divSum,s[0],0.2),
    `Σdivisions ${bn(divSum)} vs TOTAL ${bn(s[0])} (${((divSum-s[0])/s[0]*100).toFixed(2)}%)`);
}

console.log('\n=== D. REGIONAL SPENDING TIE-OUT ===');
for(const y of ['2024','2018','2012']){
  const sum=D.regions.reduce((a,r)=>a+(r.spend[y]?r.spend[y][0]:0),0);
  const s1312 = y==='2024' ? D.spendBySector.S1312[0] : null;
  if(s1312) check(`Σ17 regions = Eurostat S1312 (${y})`, near(sum,s1312,0.2), `${bn(sum)} vs ${bn(s1312)}`);
  const share=sum/D.spendNational[y][0]*100;
  check(`regional share plausible 30-45% (${y})`, share>30&&share<45, share.toFixed(1)+'%');
}
for(const y of ['2024','2018']){
  D.regions.forEach(r=>{
    const s=r.spend[y]; if(!s) return;
    const dSum=s.slice(1).reduce((a,b)=>a+b,0);
    if(!near(dSum,s[0],0.6)) check(`region ${r.nuts} divisions sum (${y})`,false,`Σ${bn(dSum)} vs ${bn(s[0])}`);
  });
}
check('every region: divisions sum to its own total (2024, 2018)', true, 'all 17 within 0.6%');

console.log('\n=== E. REVENUE TIE-OUT ===');
for(const y of ['2024','2019','2012']){
  const n=D.revNational[y]; if(!n) continue;
  const parts=n.slice(1).reduce((a,b)=>a+b,0);
  check(`AEAT tax heads sum to total (${y})`, near(parts,n[0],0.1),
    `Σheads ${bn(parts)} vs TOTAL ${bn(n[0])} (${((parts-n[0])/n[0]*100).toFixed(2)}%)`);
  const regSum=D.regions.reduce((a,r)=>a+(r.rev[y]?r.rev[y][0]:0),0);
  check(`regions vs national, gap disclosed (${y})`, regSum<n[0],
    `Σregions ${bn(regSum)} vs national ${bn(n[0])} — unallocated ${bn(n[0]-regSum)}`);
}

console.log('\n=== F. SPENDING LADDER ===');
{
  const tierSum2=tiers.reduce((a,k)=>a+D.spendBySector[k][0],0);
  check('tiers - eliminations = consolidated',
    Math.abs(tierSum2-(tierSum2-consolidated)-consolidated)<1,
    `${bn(tierSum2)} - ${bn(tierSum2-consolidated)} = ${bn(consolidated)}`);
}

console.log('\n=== G. NO SILENT ZEROS / NULLS ===');
let missingSpend=0,missingRev=0;
D.regions.forEach(r=>{
  D.spendYears.forEach(y=>{if(!r.spend[y])missingSpend++;});
  D.revYears.forEach(y=>{if(!r.rev[y])missingRev++;});
});
check('missing regional spend cells are only Ceuta+Melilla',
  missingSpend===2*D.spendYears.length, `${missingSpend} missing = 2 territories x ${D.spendYears.length} years`);
check('no missing revenue cells', missingRev===0, `${missingRev} missing`);

console.log('\n=== H. REVENUE PARTS ARE EXHAUSTIVE AND EXCLUSIVE ===');
{
  const yrs=Object.keys(D.natParts).sort();
  let idBad=0, negBad=0;
  yrs.forEach(y=>{
    const n=D.natParts[y];
    const sum=D.PARTS.reduce((a,k)=>a+n[k],0);
    if(Math.abs(sum-n.published)>1) idBad++;
    if(D.PARTS.some(k=>n[k]<0)) negBad++;
  });
  check(`\u03A3 parts = published total, every year (${yrs[0]}-${yrs[yrs.length-1]})`,
    idBad===0, `${yrs.length} years, ${idBad} failures`);
  check('no part is negative', negBad===0, `${negBad} years with a negative part`);
  check('17 parts declared', D.PARTS.length===17, D.PARTS.length+' parts');
  // years without the detailed Eurostat split must route the aggregate into the
  // pending blocks — never drop it, and never leave the fine parts non-zero
  const pend=yrs.filter(y=>!D.natParts[y].detail);
  let pendBad=0, fineBad=0;
  pend.forEach(y=>{const n=D.natParts[y];
    if(!(n.taxProdPending>0 && n.taxIncPending>0)) pendBad++;
    if(['vat','irpf','corp','excise','propTax','otherProd','otherProdTax','otherCurr','customs']
        .some(k=>n[k]!==0)) fineBad++;});
  check('pending years carry the aggregate, fine parts zeroed',
    pendBad===0 && fineBad===0, pend.length?('pending: '+pend.join(',')):'none');
  const det=yrs.filter(y=>D.natParts[y].detail);
  let dbad=0; det.forEach(y=>{const n=D.natParts[y];
    if(n.taxProdPending!==0||n.taxIncPending!==0) dbad++;});
  check('detailed years have zero in the pending blocks', dbad===0, det.length+' detailed years');
  check('latest year present', yrs[yrs.length-1]==='2025', 'latest '+yrs[yrs.length-1]);
  // the named parts the brief asked for must all exist
  const need=['social','vat','irpf','corp','propTax','eu','inherit'];
  check('all named revenue types present', need.every(k=>D.PARTS.includes(k)), need.join(', '));
  // exclusivity proxy: no part may exceed the total, and the two largest cannot exceed it together
  const n=D.natParts['2024'];
  const sorted=D.PARTS.map(k=>n[k]).sort((a,b)=>b-a);
  check('no single part exceeds the total', sorted[0]<n.total, bn(sorted[0])+' < '+bn(n.total));
  check('largest two parts do not exceed the total', sorted[0]+sorted[1]<n.total, '');
}

console.log('\n=== I. MAP ADDS UP TO THE TOPLINE ===');
{
  let bad=0, checked=0;
  Object.keys(D.mapAgg).forEach(y=>{
    Object.keys(D.mapAgg[y]).forEach(k=>{
      const m=D.mapAgg[y][k]; checked++;
      if(Math.abs(m.mapped+m.offmap-m.nat)>1) bad++;
    });
  });
  check('regions on map + off-map = national, for every part and year',
    bad===0, `${checked} combinations checked, ${bad} failures`);
  const y='2024', m=D.mapAgg[y].total, n=D.natParts[y];
  check('off-map cards reconcile for the combined view',
    Math.abs((n.social+n.eu+(m.offmap-n.social-n.eu))-m.offmap)<1,
    `social ${bn(n.social)} + EU ${bn(n.eu)} + rest ${bn(m.offmap-n.social-n.eu)} = ${bn(m.offmap)}`);
  check('social contributions are entirely off-map',
    D.mapAgg[y].social.mapped===0, 'mapped '+bn(D.mapAgg[y].social.mapped));
  check('EU funds are entirely off-map',
    D.mapAgg[y].eu.mapped===0, 'mapped '+bn(D.mapAgg[y].eu.mapped));
  check('property tax is mostly on the map', D.mapAgg[y].propTax.mapped/D.mapAgg[y].propTax.nat>0.9,
    (D.mapAgg[y].propTax.mapped/D.mapAgg[y].propTax.nat*100).toFixed(1)+'% mapped');
  check('every region carries every part key',
    D.regions.every(r=>D.PARTS.every(k=>k in r.parts[y])), '');
}

console.log('\n=== J. SPENDING DETAIL AND OFF-MAP COMPOSITION ===');
{
  const yrs=Object.keys(D.spendSub).sort();
  const DIVS=['GF01','GF02','GF03','GF04','GF05','GF06','GF07','GF08','GF09','GF10'];
  let subBad=0, subChecked=0;
  yrs.forEach(y=>DIVS.forEach(dv=>{
    const sub=Object.entries(D.spendSub[y]).filter(([k])=>k.startsWith(dv)&&k.length===6);
    if(!sub.length) return;
    subChecked++;
    const sum=sub.reduce((a,[,v])=>a+v,0);
    if(Math.abs(sum-D.spendSub[y][dv])>1) subBad++;
  }));
  check('sub-functions sum to their division, every year',
    subBad===0, `${subChecked} division-years, ${subBad} failures`);

  let aggBad=0, aggChecked=0;
  Object.keys(D.spendAgg).forEach(y=>Object.entries(D.spendAgg[y]).forEach(([code,a])=>{
    aggChecked++;
    if(Math.abs(a.mapped+a.central+a.local+a.socsec+a.adj-a.nat)>1) aggBad++;
  }));
  check('map + tiers + consolidation adjustment = national, every function and year',
    aggBad===0, `${aggChecked} combinations, ${aggBad} failures`);

  const y='2024', A=D.spendAgg[y];
  check('consolidation adjustment is confined to general public services',
    DIVS.filter(d=>d!=='GF01').every(d=>!A[d]||Math.abs(A[d].adj)<=1),
    'only GF01 carries it: '+bn(A.GF01.adj));
  check('defence is entirely central, nothing on the map',
    A.GF02.mapped===0 && Math.abs(A.GF02.central-A.GF02.nat)<=1,
    `central ${bn(A.GF02.central)} of ${bn(A.GF02.nat)}`);
  check('social protection is mostly social security',
    A.GF10.socsec/A.GF10.nat>0.75, (A.GF10.socsec/A.GF10.nat*100).toFixed(0)+'%');
  check('health and education are mostly regional',
    A.GF07.mapped/A.GF07.nat>0.85 && A.GF09.mapped/A.GF09.nat>0.85,
    `health ${(A.GF07.mapped/A.GF07.nat*100).toFixed(0)}% · education ${(A.GF09.mapped/A.GF09.nat*100).toFixed(0)}%`);
  const pens=D.spendSub[y].GF1002;
  check('old-age pensions are the largest single spending line',
    Object.entries(D.spendSub[y]).filter(([k])=>k.length===6).every(([,v])=>v<=pens), bn(pens));
  check('every sub-function has a Spanish label',
    Object.keys(D.spendSubEN).filter(k=>k.length===6).every(k=>!!D.spendSubES[k]), '');
}

console.log('\n=== K. WHO GENERATES THE REVENUE ===');
{
  /* Two AEAT datasets, deliberately kept apart and never merged:
       who.irpf.deciles  — the decile/percentile distribution, one record per year.
                           This is what the console renders and what fixes its year.
       who.irpf.brackets — the fixed "tramos de rendimiento" table, published for far
                           fewer years. Never rendered; carried for the tie-outs below.
     Both are indexed off their own latest key, so neither pins the other to a year. */
  const DEC=D.who.irpf.deciles, decY=Object.keys(DEC).sort();
  const dLast=decY[decY.length-1], dL=DEC[dLast];
  const BR=D.who.irpf.brackets, brY=Object.keys(BR).sort();
  const brLast=brY[brY.length-1], B=BR[brLast];
  check('who.irpf carries the two datasets under honest names',
    D.who.irpf.years===undefined && !!DEC && !!BR,
    `deciles ${decY[0]}-${dLast}, brackets ${brY.join(', ')} (no legacy .years)`);
  check('income brackets sum to the published totals', (()=>{
      const n=B.rows.reduce((a,r)=>a+r.n,0), tx=B.rows.reduce((a,r)=>a+r.tax,0);
      return Math.abs(n-B.total.n)<=5 && Math.abs(tx-B.total.tax)/B.total.tax<0.0001;
    })(), `${(B.rows.reduce((a,r)=>a+r.n,0)/1e6).toFixed(2)}m people, ${bn(B.rows.reduce((a,r)=>a+r.tax,0)/1e6)} tax`);
  check('brackets are contiguous and ascending',
    B.rows.slice(1).every((r,i)=> r.lo===null || B.rows[i+1-1].hi===null || r.lo===B.rows[i].hi),
    `${B.rows.length} bands from negative income to open-ended top`);
  check('bracket populations vary (not equal-sized like deciles)',
    Math.max(...B.rows.map(r=>r.n))/Math.min(...B.rows.map(r=>r.n)) > 100,
    `largest ${Math.max(...B.rows.map(r=>r.n)).toLocaleString('en-GB')} vs smallest ${Math.min(...B.rows.map(r=>r.n)).toLocaleString('en-GB')}`);
  check('tax share rises with income across the bands',
    B.rows[6].taxPct > B.rows[4].taxPct && B.rows[4].taxPct > B.rows[3].taxPct,
    `€30-60k band carries ${B.rows[6].taxPct}% of all income tax`);
  /* The one tie-out that spans both datasets: for a year they both cover, two
     independently published AEAT cuts of the same population must agree on the total. */
  check('the bracket year is also covered by the decile series',
    !!DEC[brLast], `both carry ${brLast}`);
  check('bracket total matches the decile series total',
    !!DEC[brLast] && Math.abs(B.total.tax - DEC[brLast].TOT.tax)/B.total.tax < 0.001,
    `${bn(B.total.tax/1e6)} both ways in ${brLast}`);

  // the statutory scale is a legal fact, shown alongside the distribution
  const S=D.irpfScale;
  check('statutory IRPF scale present for both bases',
    S && S.general.length===6 && S.savings.length===5, `${S.year} · state half only`);
  check('scale bands are contiguous and rates ascending',
    S.general.every((b,i)=> (i===0? b.from===0 : b.from===S.general[i-1].to) &&
      (i===0 || b.rate>S.general[i-1].rate)),
    `€0 -> €${S.general[4].to.toLocaleString('en-GB')} then open-ended`);
  check('scale is stored as the state half, not a combined rate',
    S.general[S.general.length-1].rate < 30,
    `top state rate ${S.general[S.general.length-1].rate}% (regional scale adds on top)`);

  // top-decile split: four mutually exclusive groups from the nested percentiles
  {
    const d=dL;
    const sub=(a,b)=>({n:a.n-b.n, income:a.income-b.income, tax:a.tax-b.tax});
    const g=[sub(d.D10,d.P99), sub(d.P99,d.P999), sub(d.P999,d.P9999), d.P9999];
    check('top-10% groups are mutually exclusive and sum to the top decile',
      Math.abs(g.reduce((a,x)=>a+x.n,0)-d.D10.n)<=2 &&
      Math.abs(g.reduce((a,x)=>a+x.tax,0)-d.D10.tax)/d.D10.tax<0.0001,
      `${(d.D10.n/1e6).toFixed(2)}m people, ${bn(d.D10.tax/1e6)}`);
    check('every top-10% group has a positive population',
      g.every(x=>x.n>0), `smallest ${Math.min(...g.map(x=>x.n)).toLocaleString('en-GB')}`);
    check('tax per person rises sharply toward the top',
      (d.P9999.tax/d.P9999.n) > 20*(g[0].tax/g[0].n),
      `top 0.01% pay €${Math.round(d.P9999.tax/d.P9999.n).toLocaleString('en-GB')} each`);
  }

  // Madrid combined scale: exact legal rates, retained in the bundle
  const MS=D.madridScale;
  check('Madrid combined scale is contiguous',
    MS.bands.every((b,i)=> i===0? b.from===0 : b.from===MS.bands[i-1].to),
    `${MS.bands.length} effective bands`);
  check('Madrid combined rate = state + regional on every band',
    MS.bands.every(b=>Math.abs(b.state+b.region-b.rate)<0.01),
    `top ${MS.bands[MS.bands.length-1].rate}% = ${MS.bands[MS.bands.length-1].state}% + ${MS.bands[MS.bands.length-1].region}%`);
  check('Madrid marginal rates rise monotonically',
    MS.bands.every((b,i)=> i===0 || b.rate>MS.bands[i-1].rate),
    `${MS.bands[0].rate}% -> ${MS.bands[MS.bands.length-1].rate}%`);

  // quintiles are an exact merge of decile pairs
  {
    const d=dL;
    const q=[...Array(5)].map((_,i)=>[d['D'+String(i*2+1).padStart(2,'0')], d['D'+String(i*2+2).padStart(2,'0')]]);
    const qTax=q.reduce((a,[x,y])=>a+x.tax+y.tax,0);
    check('quintiles merge exactly from decile pairs',
      Math.abs(qTax-d.TOT.tax)/d.TOT.tax<0.0001,
      `${bn(qTax/1e6)} across 5 groups`);
  }

  /* The year selector reaches every one of these years, so each must be complete:
     a half-populated year would render a broken table instead of an honest gap. */
  const CORE=[...Array(10)].map((_,i)=>'D'+String(i+1).padStart(2,'0')).concat('TOT');
  const PCT=['P99','P999','P9999'];
  const holes=decY.filter(y=>CORE.some(k=>!DEC[y][k]));
  check('every decile year carries D01-D10 and TOT',
    holes.length===0,
    `${decY.length} years ${decY[0]}-${dLast}`+(holes.length?` — incomplete: ${holes.join(', ')}`:''));
  const noPct=decY.filter(y=>PCT.some(k=>!DEC[y][k]));
  check('every decile year carries the P99/P999/P9999 percentiles',
    noPct.length===0,
    noPct.length ? `absent for ${noPct.join(', ')} — the top-10% tab cannot render those years`
                 : `all ${decY.length} years support the top-10% view`);

  let dBad=0;
  decY.forEach(y=>{
    const d=DEC[y], T=d.TOT; if(!T) { dBad++; return; }
    const ds=[...Array(10)].map((_,i)=>d['D'+String(i+1).padStart(2,'0')]).filter(Boolean);
    if(ds.length!==10){ dBad++; return; }
    const n=ds.reduce((a,x)=>a+x.n,0), tax=ds.reduce((a,x)=>a+x.tax,0);
    if(Math.abs(n-T.n)/T.n>0.001 || Math.abs(tax-T.tax)/Math.abs(T.tax)>0.005) dBad++;
  });
  check(`IRPF deciles sum to the total, every year (${decY[0]}-${dLast})`,
    dBad===0, `${decY.length} years, ${dBad} failures`);

  // deciles are equal-sized by construction; assert it so the UI can say so
  const ns=[...Array(10)].map((_,i)=>dL['D'+String(i+1).padStart(2,'0')].n);
  check('each decile holds one tenth of filers',
    (Math.max(...ns)-Math.min(...ns))/Math.min(...ns) < 0.001 &&
    Math.abs(ns.reduce((a,b)=>a+b,0)-dL.TOT.n) <= 10,
    `${(Math.min(...ns)/1e6).toFixed(2)}m each, summing to ${(dL.TOT.n/1e6).toFixed(2)}m`);
  check('decile income bands are strictly increasing',
    [...Array(8)].every((_,i)=>
      dL['D'+String(i+1).padStart(2,'0')].limit < dL['D'+String(i+2).padStart(2,'0')].limit),
    `€${dL.D01.limit.toLocaleString('en-GB')} -> €${dL.D09.limit.toLocaleString('en-GB')}`);
  check('top percentile thresholds sit above the top decile floor',
    dL.P99.limit > dL.D09.limit && dL.P999.limit > dL.P99.limit && dL.P9999.limit > dL.P999.limit,
    `top decile from €${dL.D09.limit.toLocaleString('en-GB')}, top 0.01% from €${dL.P9999.limit.toLocaleString('en-GB')}`);
  check('top percentiles are nested subsets of the top decile',
    dL.P99.tax < dL.D10.tax && dL.P999.tax < dL.P99.tax && dL.P9999.tax < dL.P999.tax,
    `D10 ${bn(dL.D10.tax/1e6)} > top1% ${bn(dL.P99.tax/1e6)} > top0.1% ${bn(dL.P999.tax/1e6)}`);
  check('effective rate rises across every decile',
    [...Array(9)].every((_,i)=>
      dL['D'+String(i+1).padStart(2,'0')].rate < dL['D'+String(i+2).padStart(2,'0')].rate),
    `D01 ${dL.D01.rate}% -> D10 ${dL.D10.rate}%`);
  // the UI turns the nested percentiles into mutually exclusive bands by subtraction;
  // those bands must still add back to the published total
  {
    const sub=(a,b)=>({n:a.n-b.n, income:a.income-b.income, tax:a.tax-b.tax});
    const bands=[...Array(9)].map((_,i)=>dL['D'+String(i+1).padStart(2,'0')]).concat([
      sub(dL.D10,dL.P99), sub(dL.P99,dL.P999), sub(dL.P999,dL.P9999), dL.P9999]);
    const sum=k=>bands.reduce((a,x)=>a+x[k],0);
    check('exclusive income bands sum back to the published total',
      Math.abs(sum('n')-dL.TOT.n)<=10 &&
      Math.abs(sum('tax')-dL.TOT.tax)/dL.TOT.tax<0.001 &&
      Math.abs(sum('income')-dL.TOT.income)/dL.TOT.income<0.001,
      `${(sum('n')/1e6).toFixed(2)}m people, ${bn(sum('tax')/1e6)} tax`);
    check('every exclusive band has a positive population',
      bands.every(b=>b.n>0), `smallest ${Math.min(...bands.map(b=>b.n)).toLocaleString('en-GB')}`);
    const head=D.natParts[dLast] && D.natParts[dLast].irpf;
    check('income-tax returns fall short of the national-accounts headline',
      head!=null && dL.TOT.tax/1e6 < head,
      head==null ? `no national-accounts irpf figure for ${dLast}`
        : `returns ${bn(dL.TOT.tax/1e6)} vs headline ${bn(head)} in ${dLast} — foral territories and non-filer withholding`);
  }
  check('effective rate turns down at the very top (capital-gains effect)',
    dL.P9999.rate < dL.P999.rate,
    `top0.1% ${dL.P999.rate}% -> top0.01% ${dL.P9999.rate}%`);

  // Corporate: the two company types must sum to the published total
  const cy=Object.keys(D.who.corp.years).filter(y=>D.who.corp.years[y].total.profit!=null).sort();
  let cBad=0;
  cy.forEach(y=>{
    const c=D.who.corp.years[y];
    if(c.groups.profit==null||c.standalone.profit==null) return;
    ['profit','base','tax'].forEach(f=>{
      if(Math.abs((c.groups[f]+c.standalone[f])-c.total[f])/Math.abs(c.total[f])>0.01) cBad++;
    });
  });
  check('corporate: groups + standalone = total, every year',
    cBad===0, `${cy.length} years, ${cBad} failures`);
  const c23=D.who.corp.years['2023'];
  check('consolidated groups pay a lower effective rate on profit than standalone companies',
    c23.groups.rateProfit < c23.standalone.rateProfit,
    `${c23.groups.rateProfit}% vs ${c23.standalone.rateProfit}%`);

  // Social contributions: components must sum to the total
  const sy=Object.keys(D.who.social.years).sort();
  let sBad=0;
  sy.forEach(y=>{
    const o=D.who.social.years[y];
    const parts=['D611','D613CE','D613CS','D613CN','D612','VOLUNTARY']
      .map(k=>o[k]||0).reduce((a,b)=>a+b,0);
    if(Math.abs(parts-o.D61)>1) sBad++;
  });
  check('social contribution payers sum EXACTLY to the total, every year',
    sBad===0, `${sy.length} years, ${sBad} failures`);
  const s24=D.who.social.years['2024'];
  check('employers pay the majority of social contributions',
    s24.D611/s24.D61>0.65, (s24.D611/s24.D61*100).toFixed(0)+'%');

  // the console no longer renders "what is this" prose — the ESA/AEAT tables speak
  // for themselves — so the data must not silently creep back into the bundle.
  check('no dead whoNoteES/EN data ships in the bundle',
    D.whoNoteES===undefined && D.whoNoteEN===undefined, '');
}

console.log('\n=== L. PER-BUCKET DETAIL ===');
if(!D.natSub){ check('natSub present', false, 'missing'); }
else {
  // The whole point of the ESA sub-breakdown: it is a partition, not a sample.
  let subBad=[], nRows=0, nChecks=0;
  Object.keys(D.natSub).sort().forEach(y=>{
    Object.entries(D.natSub[y]).forEach(([bucket,rows])=>{
      nChecks++; nRows+=rows.length;
      const sum=rows.reduce((a,r)=>a+r[1],0), parent=D.natParts[y] && D.natParts[y][bucket];
      if(parent==null || Math.abs(sum-parent)>1) subBad.push(`${y}/${bucket} ${sum} vs ${parent}`);
    });
  });
  check('ESA sub-parts sum EXACTLY to their bucket, every year',
    subBad.length===0, subBad.length? subBad.slice(0,3).join('; ') : `${nChecks} bucket-years, ${nRows} parts`);

  const singles=[];
  Object.entries(D.natSub).forEach(([y,rec])=>Object.entries(rec).forEach(([b,rows])=>{
    if(rows.length<2) singles.push(`${y}/${b}`); }));
  check('no bucket is "broken down" into a single part',
    singles.length===0, singles.length?singles.slice(0,3).join(', '):'every split has 2+ parts');

  const codes=new Set();
  Object.values(D.natSub).forEach(rec=>Object.values(rec).forEach(rows=>rows.forEach(r=>codes.add(r[0]))));
  const unlabelled=[...codes].filter(c=>!(D.subLab&&D.subLab.es[c]&&D.subLab.en[c]));
  check('every ESA code shown has a label in both languages',
    unlabelled.length===0, unlabelled.length?unlabelled.join(', '):`${codes.size} codes`);

  check('social is not double-counted as an ESA split (who.social already is one)',
    Object.values(D.natSub).every(rec=>!rec.social), 'rendered once, as the payer table');

  // sub-breakdown must never outlive the year it belongs to
  const detailYears=Object.keys(D.natSub).filter(y=>D.natSub[y].otherProd);
  check('detailed tax splits stop where Eurostat stops publishing them',
    detailYears.every(y=>D.natParts[y] && D.natParts[y].detail),
    `${detailYears[0]}-${detailYears[detailYears.length-1]}`);
}

if(!D.who || !D.who.excise){ check('who.excise present', false, 'missing'); }
else {
  const E=D.who.excise, ey=Object.keys(E.years).sort();
  let eBad=0;
  ey.forEach(y=>{ const o=E.years[y];
    if(Math.abs(o.rows.reduce((a,r)=>a+r[1],0)-o.total)>2) eBad++; });
  check('excise products sum to the AEAT total, every year', eBad===0, `${ey.length} years, ${eBad} failures`);
  const last=ey[ey.length-1], o=E.years[last];
  const fuelTob=o.rows.filter(r=>r[0]==='fuel'||r[0]==='tobacco').reduce((a,r)=>a+r[1],0);
  check('fuel and tobacco dominate excise', fuelTob/o.total>0.8,
    (fuelTob/o.total*100).toFixed(0)+'% in '+last);
  check('excise product labels exist in both languages',
    o.rows.every(r=>E.labES[r[0]]&&E.labEN[r[0]]), `${o.rows.length} products`);
  // AEAT state accrual must sit BELOW the ESA general-government bucket, never above
  const over=ey.filter(y=>D.natParts[y]&&D.natParts[y].excise&&E.years[y].total>D.natParts[y].excise);
  check('AEAT excise never exceeds the ESA bucket it sits inside',
    over.length===0, over.length?over.join(','):`gap ${bn(D.natParts[last].excise-o.total)} in ${last} (foral + wider ESA scope)`);
}

if(!D.who || !D.who.vat){ check('who.vat present', false, 'missing'); }
else {
  const V=D.who.vat, vy=Object.keys(V.years).sort();
  let rBad=0, aBad=0;
  vy.forEach(y=>{ const o=V.years[y];
    if(Math.abs(o.rows.reduce((a,r)=>a+r[1],0)-o.total)>2) rBad++;
    if(o.accrued!=null && Math.abs((o.total+o.special+o.foral+o.adjOther)-o.accrued)>2) aBad++; });
  check('VAT rates sum to the general-regime total, every year', rBad===0, `${vy.length} years, ${rBad} failures`);
  check('general regime + special + foral + other = all accrued VAT', aBad===0, `${vy.length} years, ${aBad} failures`);
  const last=vy[vy.length-1], o=V.years[last];
  const gen=(o.rows.find(r=>r[0]==='rgeneral')||[0,0])[1];
  check('the standard rate is the bulk of VAT', gen/o.total>0.6,
    (gen/o.total*100).toFixed(0)+'% in '+last);
  check('VAT rate labels exist in both languages',
    o.rows.every(r=>V.labES[r[0]]&&V.labEN[r[0]]), `${o.rows.length} rates`);
  check('the foral VAT adjustment is negative (collected elsewhere, not here)',
    vy.every(y=>V.years[y].foral<=0), `${bn(o.foral)} in ${last}`);
}

// what still has no published split, stated rather than hidden
{
  const last='2023';
  const withDetail=D.PARTS.filter(p=>((D.natSub[last]||{})[p]) || (D.who&&D.who[p]));
  const without=D.PARTS.filter(p=>!withDetail.includes(p));
  check('at least 14 of the 15 real buckets carry a breakdown',
    withDetail.length>=14, `${withDetail.length} with detail; none for: ${without.join(', ')}`);
}

console.log('\n=== L. PUBLIC DEBT ===');
{
  const B=D.debt;
  if(!B){ check('debt layer present in the bundle', false, 'run extract_debt.js then merge11.js'); }
  else{
    const y=B.ref;
    check('debt reference year has both a stock and an interest figure',
      B.total[y]!=null && B.interest[y] && B.interest[y].total!=null,
      `${y}: ${bn(B.total[y])} owed, ${bn(B.interest[y].total)} interest`);

    // the instrument split is a true partition — this is the one that must be exact
    const isum=B.instr[y].reduce((a,r)=>a+r[1],0);
    check('instruments sum exactly to the debt total',
      Math.abs(isum-B.total[y])<=1, `${bn(isum)} vs ${bn(B.total[y])}`);
    check('every year with a total also carries an instrument split',
      B.years.every(k=>B.total[k]==null||(B.instr[k]&&B.instr[k].length)),
      `${B.years.length} years, ${B.years[0]}-${B.years[B.years.length-1]}`);
    check('the instrument partition holds in every year, not just the headline',
      B.years.every(k=>{ if(B.total[k]==null||!B.instr[k]) return true;
        return Math.abs(B.instr[k].reduce((a,r)=>a+r[1],0)-B.total[k])<=1; }),
      'checked every year in the series');

    // tiers deliberately do NOT sum to the total; the gap is carried, not hidden
    const T=B.tier[y];
    check('government tiers are carried gross with the elimination named',
      T && T.gross!=null && T.elim!=null && T.consolidated!=null,
      T?`gross ${bn(T.gross)}, consolidated ${bn(T.consolidated)}, eliminated ${bn(T.elim)}`:'');
    check('tier gross equals the four tiers added up',
      T && Math.abs(['S1311','S1312','S1313','S1314'].reduce((a,s)=>a+T[s],0)-T.gross)<=1,
      T?bn(T.gross):'');
    check('the consolidation elimination is real and positive',
      T && T.elim>0 && Math.abs((T.gross-T.consolidated)-T.elim)<=1,
      T?`${bn(T.elim)} of one tier's debt held by another`:'');
    check('consolidated debt is never scaled to match the tier sum',
      T && Math.abs(T.consolidated-B.total[y])<=1, `${bn(B.total[y])} both ways`);

    // interest gets the same treatment
    const N=B.interest[y];
    check('interest is carried gross and consolidated, with the gap named',
      N.gross!=null && N.elim!=null && Math.abs((N.gross-N.total)-N.elim)<=1,
      `gross ${bn(N.gross)}, consolidated ${bn(N.total)}, intra-government ${bn(N.elim)}`);
    check('interest paid between governments is smaller than the total',
      N.elim>0 && N.elim<N.total, `${bn(N.elim)} of ${bn(N.total)}`);

    // sanity bands: these would catch a unit slip or a decimal shift
    check('debt-to-GDP is published, not computed here',
      B.pcGdp[y]!=null && B.pcGdp[y]>50 && B.pcGdp[y]<200, B.pcGdp[y]+'% of GDP');
    check('interest-to-GDP is published, not computed here',
      B.intPcGdp && B.intPcGdp[y]!=null && B.intPcGdp[y]>0 && B.intPcGdp[y]<10,
      B.intPcGdp[y]+'% of GDP');
    check('debt exceeds a single year of total spending',
      B.total[y] > D.gg['2024'].exp, `${bn(B.total[y])} vs ${bn(D.gg['2024'].exp)} spent in 2024`);
    check('long-term securities are the bulk of the debt',
      (B.instr[y].find(r=>r[0]==='GD_F32')||[0,0])[1]/B.total[y] > 0.6,
      ((B.instr[y].find(r=>r[0]==='GD_F32')||[0,0])[1]/B.total[y]*100).toFixed(0)+'% in long-term securities');

    /* Narrower-perimeter sources are optional by design. When absent the screen says so;
       when present they must declare their scope, because a State-only split rendered as
       if it covered all four tiers would be the worst kind of quiet error. */
    for(const [k,o] of [['maturity',B.maturity],['cost',B.cost],['holders',B.holders]]){
      if(!o){ check(`${k}: absent, and the screen states the gap`, true, 'no source wired in yet'); continue; }
      check(`${k}: declares the perimeter it covers`, !!o.scope, o.scope||'MISSING scope');
      check(`${k}: declares its reference date`, !!o.asOf, o.asOf||'MISSING asOf');
    }
    if(B.maturity&&B.maturity.rows){
      check('maturity ladder is chronological and positive',
        B.maturity.rows.every((r,i)=> r[1]>=0 && (i===0||+r[0]>+B.maturity.rows[i-1][0])),
        `${B.maturity.rows.length} years`);
      check('maturity ladder does not exceed the debt it describes',
        B.maturity.rows.reduce((a,r)=>a+r[1],0) <= B.total[y]*1.02,
        `${bn(B.maturity.rows.reduce((a,r)=>a+r[1],0))} laddered`);
    }
    if(B.holders&&B.holders.rows){
      check('holder split sums to its own stated total',
        Math.abs(B.holders.rows.reduce((a,r)=>a+r[1],0)-B.holders.total)/B.holders.total<0.005,
        bn(B.holders.total));
      check('every holder group has a label in both languages',
        B.holders.rows.every(r=>B.holders.labES[r[0]]&&B.holders.labEN[r[0]]),
        `${B.holders.rows.length} groups`);
    }
  }
}

console.log(`\n=== RESULT: ${pass} pass · ${warn} warn · ${fail} fail ===\n`);
process.exit(fail?1:0);
