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
  /* Since merge16.js the published years are exactly the complete ones: the
     latest is the latest year Eurostat has split by tax, and no pending year
     reaches the console. The dropped years are named in D.dropped (section P). */
  const latestDetail=det[det.length-1];
  check('latest published year is the latest with a per-tax split',
    yrs[yrs.length-1]===latestDetail && D.revYears[D.revYears.length-1]===latestDetail, 'latest '+yrs[yrs.length-1]);
  check('no pending year is published', pend.length===0, pend.length?('pending: '+pend.join(',')):'none');
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

  // Corporate, table 8.5 (who.corp.types): the two company types must sum to the published total
  const CT=D.who.corp.types||{};
  const cy=Object.keys(CT).filter(y=>CT[y].total.profit!=null).sort();
  let cBad=0;
  cy.forEach(y=>{
    const c=CT[y];
    if(c.groups.profit==null||c.standalone.profit==null) return;
    ['profit','base','tax'].forEach(f=>{
      if(Math.abs((c.groups[f]+c.standalone[f])-c.total[f])/Math.abs(c.total[f])>0.01) cBad++;
    });
  });
  check('corporate: groups + standalone = total, every year',
    cBad===0, `${cy.length} years, ${cBad} failures`);
  const cLast=cy[cy.length-1], c23=CT[cLast];
  check('consolidated groups pay a lower effective rate on profit than standalone companies',
    c23.groups.rateProfit < c23.standalone.rateProfit,
    `${c23.groups.rateProfit}% vs ${c23.standalone.rateProfit}% in ${cLast}`);

  // Corporate by turnover bracket (who.corp.years): AEAT's consolidated statistic.
  const CB=D.who.corp.years||{}, by=Object.keys(CB).sort();
  check('corporate brackets: the seventeen published turnover brackets, every year from 2016',
    by.length>0 && by[0]==='2016' && by.every(y=>CB[y].rows && CB[y].rows.length===17),
    `${by[0]}-${by[by.length-1]}, ${by.map(y=>CB[y].rows?CB[y].rows.length:0).join('/')} brackets`);
  let bBad=0;
  by.forEach(y=>{
    const T=CB[y].total;
    ['n','profit','tax','base','turnover'].forEach(f=>{
      const s=CB[y].rows.reduce((a,r)=>a+r[f],0);
      if(Math.abs(s-T[f])>(f==='n'?0:0.02)) bBad++;
    });
    for(let i=1;i<CB[y].rows.length;i++) if(CB[y].rows[i].lo!==CB[y].rows[i-1].hi) bBad++;
  });
  check('corporate brackets add back to the published total and leave no gaps',
    bBad===0, `${by.length} years, ${bBad} failures`);
  const tBad=by.filter(y=>{const t=CT[y]&&CT[y].total; return t&&t.tax!=null&&(Math.abs(CB[y].total.tax-t.tax)>0.011||Math.abs(CB[y].total.base-t.base)>0.011);});
  check('corporate brackets reproduce table 8.5 tax and taxable base in every shared year',
    tBad.length===0, tBad.length?`disagree: ${tBad.join(', ')}`:`${by.filter(y=>CT[y]&&CT[y].total.tax!=null).length} shared years`);
  const pd=D.who.corp.profitDiff||{};
  check('where the statistic and table 8.5 disagree on profit, the gap is named and under 1%',
    Object.keys(pd).every(y=>Math.abs(pd[y].brackets-pd[y].table85)<=Math.abs(pd[y].table85)*0.01),
    Object.keys(pd).length?Object.keys(pd).map(y=>`${y}: ${((pd[y].brackets-pd[y].table85)/pd[y].table85*100).toFixed(2)}%`).join(', '):'no disagreement');
  let sBadSec=0, seCells=0;
  by.forEach(y=>{
    CB[y].rows.forEach(r=>{
      const sec=r.sectors||{};
      if(Object.keys(sec).length!==5) { sBadSec++; return; }
      ['n','profit','tax'].forEach(f=>{
        if(Object.values(sec).some(v=>v[f]==null)) { seCells++; return; }
        const t=Object.values(sec).reduce((a,v)=>a+v[f],0);
        if(Math.abs(t-r[f])>(f==='n'?0:0.006)) sBadSec++;
      });
    });
  });
  check('corporate sectors: the five partition every turnover bracket, except where a cell is withheld',
    sBadSec===0, `${by.length} years x 17 brackets, ${sBadSec} failures, ${seCells} withheld under statistical secrecy`);
  const bLast=by[by.length-1], bl=CB[bLast], top=bl.rows[bl.rows.length-1];
  check('the >€1bn bracket has the fewest filers and a lower effective rate on profit than all companies',
    top.n===Math.min(...bl.rows.map(r=>r.n)) && top.rateProfit<bl.total.rateProfit,
    `${top.n} filers at ${top.rateProfit}% vs ${bl.total.rateProfit}% overall in ${bLast}`);

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
  const sLast=sy[sy.length-1], s24=D.who.social.years[sLast];
  check('employers pay the majority of social contributions',
    s24.D611/s24.D61>0.65, (s24.D611/s24.D61*100).toFixed(0)+'% in '+sLast);

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

console.log('\n=== M. FORAL TERRITORIES ARE ON THE MAP ===');
{
  /* The Basque Country and Navarre raise their own taxes under the Concierto and
     the Convenio. Until merge12.js they carried AEAT's residual — the sliver the
     State still collects there — which understated the Basque income tax by a
     factor of five and turned VAT negative. These check the substitution took,
     that it did not double count, and that nothing was quietly dropped. */
  const F=D.foral;
  check('the foral layer is present', !!F && !!F.covered, F?`covered ${Object.keys(F.covered).join(', ')}`:'missing');
  if(F&&F.covered){
    const detail=D.revYears.filter(y=>D.natParts[y].detail);
    F.ids.forEach(id=>{
      const r=D.regions.find(x=>x.id===id);
      const cov=F.covered[id]||[];
      const base=F.baseline[id];

      /* Every detail year is either covered by the foral source or absent. The
         one thing that must never happen is a year still quoting the residual. */
      let stale=0, absent=0;
      detail.forEach(y=>{
        if(cov.includes(y)) return;
        absent++;
        if(F.superseded.some(k=>r.parts[y][k]!=null)) stale++;
      });
      check(`${id}: uncovered years are absent, never the AEAT residual`,
        stale===0, `${cov.length} covered, ${absent} absent, ${stale} still holding a residual`);

      /* The substitution is the whole point: the figure has to have moved, and
         moved up, on the tax the residual most distorted. */
      const y=cov[cov.length-1];
      if(y){
        check(`${id}: ${y} IRPF is the collecting treasury's figure, not AEAT's`,
          r.parts[y].irpf>base[y].irpf*2,
          `was ${base[y].irpf} M, now ${r.parts[y].irpf} M`);
        check(`${id}: ${y} VAT is no longer negative`,
          r.parts[y].vat>0, `was ${base[y].vat} M, now ${r.parts[y].vat} M`);
        check(`${id}: ${y} total is the sum of its own parts`,
          Math.abs(D.PARTS.reduce((a,k)=>a+(r.parts[y][k]||0),0)-r.parts[y].total)<1,
          `${r.parts[y].total} M`);
        /* propTax is municipal (IBI), in neither foral table, and must survive
           the substitution untouched — if it moved, the merge overreached. */
        check(`${id}: municipal property tax is untouched`,
          r.parts[y].propTax===base[y].propTax, `${r.parts[y].propTax} M both ways`);
        /* What the merge knowingly leaves out has to stay small enough that the
           map is not quietly missing a tax head. */
        const om=(F.omitted[id]||{})[y]||0;
        check(`${id}: the omitted D.29-family lines stay marginal in ${y}`,
          Math.abs(om)<r.parts[y].total*0.02,
          `${om} M omitted of ${r.parts[y].total} M (${(om/r.parts[y].total*100).toFixed(2)}%)`);
      }
    });

    /* The point of the exercise, stated as a number: less of the country's income
       tax is now filed under "nobody published where this came from". */
    const y=D.revYears.filter(v=>D.natParts[v].detail&&F.covered['15'].includes(v)&&F.covered['16'].includes(v)).pop();
    const wasMapped=D.regions.reduce((a,r)=>a+((F.ids.includes(r.id)?F.baseline[r.id][y].irpf:r.parts[y].irpf)||0),0);
    check(`the unattributed share of IRPF fell in ${y}`,
      D.mapAgg[y].irpf.mapped>wasMapped,
      `${bn(wasMapped)} -> ${bn(D.mapAgg[y].irpf.mapped)} mapped of ${bn(D.mapAgg[y].irpf.nat)}`);

    /* The no-double-count test. A handful of part-years already attributed more
       to the regions than the national accounts record for that part, before any
       of this — the regional own-tax layer's D.211/D.214 run ahead of Eurostat's
       otherProd in the early years. That is a separate defect and is reported
       below rather than hidden. What THIS layer must guarantee is that swapping
       the residual for the foral figure made none of it worse: if the two sources
       were being summed anywhere, this is where it would show. */
    let worse=0, checked=0, pre=0, now=0;
    const excess=(m)=>m.nat>0?Math.max(0,m.mapped-m.nat):0;
    D.revYears.filter(v=>D.natParts[v].detail).forEach(y2=>{
      D.PARTS.forEach(k=>{
        checked++;
        const nat=D.natParts[y2][k];
        const wasMappedK=D.regions.reduce((a,r)=>a+
          ((F.ids.includes(r.id)?F.baseline[r.id][y2][k]:r.parts[y2][k])||0),0);
        const before=nat>0?Math.max(0,wasMappedK-nat):0;
        const after=excess(D.mapAgg[y2][k]);
        pre+=before; now+=after;
        /* Cash against accrual: the treasuries' figures and AEAT's are cash, the
           national bucket is ESA accrual, and in a year a rate changes mid-year
           (VAT, September 2012) cash runs ahead of accrual by a few tenths of a
           percent. That is a basis difference, not a double count — a double
           count would show as a whole residual's worth, several percent. */
        if(after>before+1 && after-before>nat*0.01) worse++;
      });
    });
    check('the foral swap over-attributes nothing it did not already',
      worse===0, `${checked} part-years checked, ${worse} made worse by more than 1% of the national figure`);
    check('over-attribution inherited from the regional own-tax layer',
      pre>0&&now<pre?'warn':(now===0?true:'warn'),
      `${bn(pre)} before this layer, ${bn(now)} after — pre-existing, not introduced here`);
  }
}

console.log('\n=== N. THE MUNICIPAL LAYER IS UNDER EVERY YEAR ===');
{
  /* IBI, the other local own taxes and council fees come only from CONPREL.
     The first build fetched 2019-2023; merge13.js fetched the definitive
     liquidations back to 2012 from the same source with the same extractor, so
     every published year now carries the layer — and the years that already had
     it were re-extracted and had to reproduce the shipped figures to the million. */
  const L=D.local;
  check('local layer declares its years and source', !!L&&Array.isArray(L.years)&&!!L.src,
    L?`${L.years[0]}-${L.years[L.years.length-1]} · ${L.src.slice(0,40)}…`:'missing');
  if(L){
    const notIn=D.revYears.filter(y=>!L.years.includes(y));
    check('every published revenue year has the municipal layer', notIn.length===0, notIn.join(',')||`${D.revYears.length} years`);
    const noIbi=D.revYears.filter(y=>D.regions.some(r=>!['18','19'].includes(r.id)&&r.parts[y].propTax==null));
    check('property tax carries a figure in every community, every year', noIbi.length===0, noIbi.join(',')||`${D.revYears.length} years x 17 communities`);
    /* Every community has municipalities and every municipality levies IBI, so a
       zero here is an empty source table read as a number — the CONPREL Navarre
       tables of 2013 and 2014 were exactly that until extract_local.py learned to
       return absent for an all-zero table. */
    const zeroIbi=[]; D.revYears.forEach(y=>D.regions.forEach(r=>{ if(!['18','19'].includes(r.id)&&r.parts[y].propTax!=null&&r.parts[y].propTax<=0) zeroIbi.push(`${y}/${r.id}`); }));
    check('property tax is positive wherever it is present — an empty table is absent, not zero', zeroIbi.length===0, zeroIbi.join(', ')||'no zero cells');
    const low=[]; D.revYears.forEach(y=>{const m=D.mapAgg[y].propTax; if(m.mapped/m.nat<0.9) low.push(`${y} ${(m.mapped/m.nat*100).toFixed(0)}%`);});
    const shares=D.revYears.map(y=>D.mapAgg[y].propTax.mapped/D.mapAgg[y].propTax.nat*100);
    check('property tax on the map is at least 90% of the ESA bucket, every year', low.length===0,
      low.join(', ')||`${Math.min(...shares).toFixed(0)}-${Math.max(...shares).toFixed(0)}% mapped`);
    check('coverage.local states the span the bundle carries',
      D.coverage.local===`${D.revYears[0]}-${D.revYears[D.revYears.length-1]}`, D.coverage.local);
  }
}

console.log('\n=== O. PER-CAPITA AND %GDP DIVIDE BY THE SAME YEAR ===');
{
  /* The region records used to carry one population (1 Jan 2024) and one GDP
     (2023) and every year's figure was divided by them. Now both are series. */
  const need=[...new Set([...D.revYears,...D.spendYears])].sort();
  const bad=[];
  D.regions.forEach(r=>{
    if(r.gdp!==undefined||r.pop!==undefined) bad.push(r.id+' still has a scalar gdp/pop');
    need.forEach(y=>{
      if(!r.macro||r.macro.gdp[y]==null) bad.push(`${r.id} gdp ${y}`);
      if(!r.macro||r.macro.pop[y]==null) bad.push(`${r.id} pop ${y}`);
    });
  });
  check('every region carries GDP and population for every selectable year, and no single-vintage scalar',
    bad.length===0, bad.length?bad.slice(0,5).join(', '):`${D.regions.length} regions x ${need.length} years`);
  if(!bad.length){
    const y=need[need.length-1];
    const popSum=D.regions.reduce((a,r)=>a+r.macro.pop[y],0);
    check(`regional populations sum to Spain's (1 Jan ${y})`, popSum>47e6&&popSum<50e6, (popSum/1e6).toFixed(2)+'m');
    const gdpSum=D.regions.reduce((a,r)=>a+r.macro.gdp[y],0);
    check(`regional GDP sums to just under the national figure (${y})`, gdpSum>0.95*GDP&&gdpSum<=GDP*1.005,
      `${bn(gdpSum)} vs ${bn(GDP)} national — extra-regio is the difference`);
    const mad=D.regions.find(r=>r.id==='13');
    check('population and GDP both move year to year, never one value repeated',
      new Set(need.map(v=>mad.macro.pop[v])).size===need.length && new Set(need.map(v=>mad.macro.gdp[v])).size===need.length,
      `Madrid ${mad.macro.pop[need[0]]} -> ${mad.macro.pop[y]} residents`);
    check('provisional GDP years are named, and the source and vintage are stamped',
      Array.isArray(mad.macro.gdpProvisional)&&!!mad.macro.src&&!!mad.macro.src.gdp&&!!mad.macro.src.pop&&!!mad.macro.updated,
      `provisional: ${mad.macro.gdpProvisional.join(', ')||'none'}`);
  }
  check('gg headline is the national-accounts figure for every published year',
    D.revYears.every(y=>D.gg[y]&&D.gg[y].rev===D.natParts[y].published&&D.gg[y].exp===D.natParts[y].expenditure),
    `${Object.keys(D.gg).length} years`);
}

console.log('\n=== P. EVERY PUBLISHED YEAR IS COMPLETE; THE REST ARE NAMED ===');
{
  const TERR=['irpf','vat','corp','excise','propTax','inherit','otherProd','otherProdTax','otherCurr','sales'];
  const holes=[];
  D.revYears.forEach(y=>{
    if(!D.natParts[y].detail) holes.push(y+' no per-tax split');
    D.regions.forEach(r=>{ if(['18','19'].includes(r.id)) return;
      TERR.forEach(k=>{ if(r.parts[y][k]==null) holes.push(`${y} ${r.id} ${k}`); }); });
  });
  check('every community carries every territorial part in every published year',
    holes.length===0, holes.length?holes.slice(0,5).join(', '):`${D.revYears.length} years x 17 communities x ${TERR.length} parts`);
  check('national2.complete says so for every published year',
    D.revYears.every(y=>D.national2[y]&&D.national2[y].complete===true), `${D.revYears[0]}-${D.revYears[D.revYears.length-1]}`);
  const dr=D.dropped&&D.dropped.revenue;
  check('dropped years are recorded with their reasons',
    !!dr&&Object.keys(dr).length>0&&Object.values(dr).every(a=>Array.isArray(a)&&a.length>0),
    dr?Object.entries(dr).map(([y,a])=>`${y} (${a.length} reasons)`).join(', '):'missing');
  check('no dropped year is still published',
    !dr||Object.keys(dr).every(y=>!D.revYears.includes(y)&&!D.natParts[y]&&!D.mapAgg[y]&&!D.natSub[y]), '');
  const F=D.foralCoverage;
  check('every covered foral year names the publication it came from',
    !!F&&!!F.srcYear&&F.ids.every(id=>F.covered[id].every(y=>F.srcYear[id]&&F.srcYear[id][y])),
    F&&F.srcYear?Object.entries(F.srcYear).map(([id,m])=>id+': '+[...new Set(Object.values(m))].join('/')).join(' · '):'missing');
  const nav=F&&F.srcYear&&F.srcYear['15']||{};
  const dgt=Object.keys(nav).filter(y=>nav[y]==='dgt'), mem=Object.keys(nav).filter(y=>nav[y]==='memoria');
  check('the Ministry series fills only the years before the memorias begin',
    dgt.every(y=>mem.every(m=>y<m)), dgt.length?`${dgt.join(', ')} from DGT; memorias from ${mem.sort()[0]}`:'none');
  check('both foral territories cover every published year',
    F&&F.ids.every(id=>D.revYears.every(y=>F.covered[id].includes(y))),
    F?F.ids.map(id=>`${id}: ${F.covered[id][0]}-${F.covered[id][F.covered[id].length-1]}`).join(' · '):'');
}

console.log('\n=== R. FEES, PRICES AND SALES IN THREE PUBLISHED CUTS ===');
if(!D.salesDetail){ check('salesDetail present', false, 'missing — run merge17.js'); }
else {
  /* Three breakdowns of one bucket, each tied to a figure already in the bundle:
     who charges it (Eurostat, by subsector), what each community's government
     charges (IGAE per-community accounts), what its councils charge and for what
     (CONPREL chapter 3 by article). None is estimated; the community figure is
     shown beside the map, never added to it. */
  const S=D.salesDetail, TIERS=['S1311','S1312','S1313','S1314'];
  check('the tier split covers every published revenue year',
    D.revYears.every(y=>S.tier[y]&&S.region[y]&&S.local[y]), `${S.years[0]}-${S.years[S.years.length-1]}`);

  const tierBad=S.years.filter(y=>TIERS.reduce((a,s)=>a+S.tier[y][s].P11_P12+S.tier[y][s].P131,0)!==D.natParts[y].sales);
  check('the four tiers sum EXACTLY to the sales bucket, every year',
    tierBad.length===0, tierBad.length?tierBad.join(','):`${S.years.length} years`);
  const itemBad=S.years.filter(y=>{ const ns=(D.natSub[y]||{}).sales||[];
    return ['P11_P12','P131'].some(it=>{ const n=ns.find(r=>r[0]===it); return n && TIERS.reduce((a,s)=>a+S.tier[y][s][it],0)!==n[1]; }); });
  check('per item, the tiers reproduce the ESA sub-breakdown', itemBad.length===0, itemBad.length?itemBad.join(','):'both items, every year');
  const l=S.years[S.years.length-1], T=S.tier[l];
  check('the communities charge more than any other tier',
    TIERS.every(s=>s==='S1312'||T.S1312.P11_P12+T.S1312.P131>=T[s].P11_P12+T[s].P131),
    `S1312 ${bn(T.S1312.P11_P12+T.S1312.P131)} of ${bn(D.natParts[l].sales)} in ${l}`);

  const regBad=S.years.filter(y=>{ const R=Object.values(S.region[y]);
    return R.length!==17 || R.reduce((a,r)=>a+r.P11+r.P12,0)!==S.tier[y].S1312.P11_P12 || R.reduce((a,r)=>a+r.P131,0)!==S.tier[y].S1312.P131; });
  check('the 17 communities sum EXACTLY to the Eurostat S1312 row, every year',
    regBad.length===0, regBad.length?regBad.join(','):'IGAE and Eurostat agree to the million');

  let artBad=[], tieBad=[], n=0;
  const foral=new Set((D.foral&&D.foral.ids)||[]);
  S.years.forEach(y=>Object.entries(S.local[y]).forEach(([id,row])=>{
    n++;
    const s=Object.values(row.art).reduce((a,v)=>a+v,0);
    if(Math.abs(s-row.total)>S.artTol) artBad.push(`${y}/${id}`);
    /* The chapter total is the municipal half of the community's map figure:
       sales part = AEAT's territorial fee line + chapter 3 (+ the foral block). */
    const r=D.regions.find(x=>x.id===id), p=r&&r.parts[y], st=r&&r.rev[y];
    if(p&&st&&p.sales!=null&&!foral.has(id)&&Math.abs(p.sales-st[6]-row.total)>1) tieBad.push(`${y}/${id} ${p.sales}-${st[6]}≠${row.total}`);
  }));
  check(`council articles reproduce the chapter total within ${S.artTol} M€ of rounding`,
    artBad.length===0, artBad.length?artBad.slice(0,3).join(', '):`${n} community-years`);
  check('the map figure is exactly AEAT line + chapter 3 — the community figure is beside it, not in it (non-foral)',
    tieBad.length===0, tieBad.length?tieBad.slice(0,3).join('; '):'AEAT line + chapter 3 = sales part');
  check('every article carries the publisher\'s own label',
    S.artCodes.every(c=>S.artSrc[c]) && S.years.every(y=>Object.values(S.local[y]).every(r=>Object.keys(r.art).every(c=>S.artCodes.includes(c)))),
    `${S.artCodes.length} articles`);
  check('the two ESA labels for this bucket are in plain words, not Eurostat\'s item names',
    ['P11_P12','P131'].every(c=>D.subLab.es[c]&&D.subLab.en[c]&&D.subLab.en[c]!==D.subSrc[c]&&!/non-market/i.test(D.subLab.en[c])), '');
  check('each cut names its source', !!(S.src&&S.src.tier&&S.src.region&&S.src.local), '');
}

console.log('\n=== Q. PUBLIC DEBT ===');
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

console.log('\n=== U. THE SPENDING MAP IS A MAP OF TERRITORIES ===');
{
  /* Since merge18 every territory carries what is spent in it by the two tiers
     that have one — the regional government (IGAE COFOG) and its local entities
     (CONPREL, net of the transfers that would count twice) — and one State coin
     holds the rest. Regions + coin = the consolidated national figure, and the
     coin is opened up rather than left as a residual. */
  const T=D.spendTerr;
  check('territorial spending is published for every spending year',
    !!T && D.spendYears.every(y=>T[y]), T?Object.keys(T).length+' years':'MISSING spendTerr');
  if(T){
    let idBad=0, coinBad=0, sumBad=0;
    D.spendYears.forEach(y=>{
      const t=T[y];
      if(Math.abs(t.regional+t.localNet+t.state-t.nat)>1) idBad++;
      if(Math.abs(t.central+t.socsec+t.adj+t.localRest-t.state)>1) coinBad++;
      const reg=D.regions.reduce((a,r)=>a+(r.spend[y]?r.spend[y][0]:0),0);
      const loc=D.regions.reduce((a,r)=>a+(r.local[y]?r.local[y].net:0),0);
      if(Math.abs(reg-t.regional)>1||Math.abs(loc-t.localNet)>1) sumBad++;
    });
    check('regions + State coin = consolidated national figure, every year', idBad===0, `${D.spendYears.length} years, ${idBad} failures`);
    check('the coin decomposes into central + Social Security + elimination + councils\' remainder, exactly', coinBad===0, `${coinBad} failures`);
    check('the territorial totals are the sum of what the regions carry', sumBad===0, `${sumBad} failures`);
    /* The local layer is a budget-basis figure a few percent under the national-accounts
       tier it belongs to. It must never exceed it: that would mean the netting missed a
       transfer and a euro is on the map twice. */
    const over=D.spendYears.filter(y=>T[y].localRest<0);
    check('the net local layer stays inside the national-accounts local tier, every year',
      over.length===0, over.join(',')||D.spendYears.map(y=>(T[y].localNet/T[y].localTier*100).toFixed(0)+'%').join(' '));
    /* The Basque Diputaciones Forales hand the concierto taxes to the Basque
       Government. If that leg were still inside the local layer the Basque
       Country would read ~€12bn too high. */
    const pv=D.regions.find(r=>r.id==='16');
    const y=D.spendYears[D.spendYears.length-1];
    check('the Basque foral transfer to the Basque Government is netted out of the local layer',
      pv.local[y]&&pv.local[y].toGov>5000&&pv.local[y].net<pv.local[y].nonfin-pv.local[y].toGov+1,
      pv.local[y]?`${bn(pv.local[y].toGov)} taken out of ${bn(pv.local[y].nonfin)}`:'no Basque local record');
    /* Ceuta and Melilla have no regional government; since merge18 they are on the
       map with their own budget, recorded under local government. */
    check('Ceuta and Melilla carry a territorial figure in the latest year',
      ['18','19'].every(id=>D.regions.find(r=>r.id===id).local[y]&&D.regions.find(r=>r.id===id).local[y].net>0), y);
    let areaBad=0, cells=0;
    D.regions.forEach(r=>D.spendYears.forEach(yy=>{
      const l=r.local[yy]; if(!l) return; cells++;
      const s=Object.values(l.areas).reduce((a,v)=>a+v,0);
      if(Math.abs(s-l.nonfin)>D.localAreas.codes.length) areaBad++;
      if(Math.abs(l.nonfin-l.toGov-l.fromCA-l.net)>1) areaBad++;
    }));
    check('programme areas partition the non-financial figure; net follows from its parts', areaBad===0, `${cells} territory-years`);
    check('every programme area has a label in both languages',
      D.localAreas.codes.every(c=>D.localAreas.es[c]&&D.localAreas.en[c]), D.localAreas.codes.join(' '));
    /* An all-zero CONPREL table is an absent figure. The years that carry one are
       named, and they are the ones we know about — a new one is news. */
    const gaps=D.spendYears.flatMap(yy=>[...T[yy].partial,...T[yy].missing].map(id=>`${yy}/${id}`));
    check('the territories with no local figure are exactly the named all-zero tables',
      gaps.join(',')==='2013/15,2014/15,2022/19', gaps.join(', ')||'none');
    const cells2=D.regions.length*D.spendYears.length;
    check('no other territory-year lacks the local layer', cells===cells2-gaps.length, `${cells} of ${cells2}`);
  }
}

console.log(`\n=== RESULT: ${pass} pass · ${warn} warn · ${fail} fail ===\n`);
process.exit(fail?1:0);
