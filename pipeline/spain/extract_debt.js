/* Public debt: the EDP (Maastricht) spine, from Eurostat gov_10dd_edpt1 plus the
   interest series in gov_10a_main.

   Everything here is consolidated general government (S13) at FACE value, the same
   definition the Excessive Deficit Procedure uses and the one every headline
   "Spain owes X% of GDP" figure refers to. Three things this file is careful about:

     - the instrument split is a true partition of the total, and is asserted to be
     - the four government tiers do NOT sum to the total: one tier holding another
       tier's paper is netted out of S13. That elimination is carried as its own
       named figure, never hidden by scaling the tiers
     - the same is true of interest: tiers sum above the consolidated S13 figure
       because regions pay the State interest on FLA/FFCA loans

   Usage: node extract_debt.js            (writes debt_edp.json)
          node extract_debt.js --offline  (reuse cached eurostat_debt_*.json) */
const fs=require('fs');
const API='https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data/';
const SINCE=1995;
const TIERS=['S1311','S1312','S1313','S1314'];   // central, regional, local, social security

/* Instruments. F3 (securities) and F4 (loans) are the parents of the short/long pairs;
   we carry the leaves so the ring shows maturity-at-issue, and assert the leaves sum
   to the published total. */
const INSTR=['GD_F2','GD_F31','GD_F32','GD_F41','GD_F42'];

async function grab(ds,q,tag){
  const cache=`eurostat_debt_${tag}.json`;
  if(process.argv.includes('--offline')) return JSON.parse(fs.readFileSync(cache,'utf8'));
  const r=await fetch(API+ds+q);
  if(!r.ok) throw new Error(`${ds} [${tag}]: HTTP ${r.status}`);
  const j=await r.json();
  fs.writeFileSync(cache,JSON.stringify(j));
  return j;
}
/* JSON-stat: `value` is a flat array indexed row-major over the declared dimensions.
   Build a stride per dimension so the lookup does not depend on their order. */
function reader(j){
  const dims=j.id, sizes=j.size;
  const stride=sizes.map((_,i)=>sizes.slice(i+1).reduce((a,b)=>a*b,1));
  const iNa=dims.indexOf('na_item'), iT=dims.indexOf('time');
  const na=j.dimension.na_item.category, tm=j.dimension.time.category;
  return {
    years:Object.keys(tm.index).sort(), label:c=>na.label[c],
    get:(c,y)=>{
      if(na.index[c]==null||tm.index[y]==null) return null;
      const v=j.value[na.index[c]*stride[iNa] + tm.index[y]*stride[iT]];
      return v==null?null:v;
    }
  };
}
const r1=v=>v==null?null:Math.round(v*10)/10;

(async()=>{
  const Q=s=>`?format=JSON&geo=ES&unit=MIO_EUR&sector=${s}&sinceTimePeriod=${SINCE}&lang=EN`;

  const [edp,gdpPc]=await Promise.all([
    grab('gov_10dd_edpt1',Q('S13'),'edp_s13'),
    grab('gov_10dd_edpt1',`?format=JSON&geo=ES&unit=PC_GDP&sector=S13&sinceTimePeriod=${SINCE}&lang=EN`,'edp_pcgdp')
  ]);
  const E=reader(edp), P=reader(gdpPc);

  const tierDebt={}, tierInt={};
  for(const s of TIERS){
    tierDebt[s]=reader(await grab('gov_10dd_edpt1',Q(s),'edp_'+s));
    tierInt[s] =reader(await grab('gov_10a_main',Q(s)+'&na_item=D41PAY','int_'+s));
  }
  const I13=reader(await grab('gov_10a_main',Q('S13')+'&na_item=D41PAY','int_S13'));
  /* interest as a share of GDP is published directly — we do not divide it ourselves */
  const IP=reader(await grab('gov_10a_main',
    `?format=JSON&geo=ES&unit=PC_GDP&sector=S13&na_item=D41PAY&sinceTimePeriod=${SINCE}&lang=EN`,'int_pcgdp'));

  const years=E.years.filter(y=>E.get('GD',y)!=null);
  const out={total:{},pcGdp:{},instr:{},tier:{},interest:{},intPcGdp:{}};
  let bad=0;

  for(const y of years){
    const gd=E.get('GD',y);
    out.total[y]=r1(gd);
    out.pcGdp[y]=r1(P.get('GD',y));

    /* instrument partition — must reconcile to the published total */
    const rows=INSTR.map(c=>[c,E.get(c,y)]).filter(([,v])=>v!=null&&v!==0)
      .map(([c,v])=>[c,r1(v)]);
    const isum=rows.reduce((a,r)=>a+r[1],0);
    if(Math.abs(isum-gd)>1){ console.log(`  MISMATCH ${y} instruments: ${isum.toFixed(1)} vs GD ${gd}`); bad++; }
    out.instr[y]=rows.sort((a,b)=>b[1]-a[1]);

    /* tiers: carried gross, with the consolidation elimination as its own figure.
       Never scaled to close — the gap IS the fact. */
    const t={};
    for(const s of TIERS){ const v=tierDebt[s].get('GD',y); if(v!=null) t[s]=r1(v); }
    if(Object.keys(t).length===TIERS.length){
      const gross=TIERS.reduce((a,s)=>a+t[s],0);
      out.tier[y]={...t, gross:r1(gross), consolidated:r1(gd), elim:r1(gross-gd)};
    }

    /* interest, same treatment */
    const ipg=IP.get('D41PAY',y);
    if(ipg!=null) out.intPcGdp[y]=r1(ipg);
    const it13=I13.get('D41PAY',y);
    if(it13!=null){
      const ti={};
      for(const s of TIERS){ const v=tierInt[s].get('D41PAY',y); if(v!=null) ti[s]=r1(v); }
      const rec={total:r1(it13)};
      if(Object.keys(ti).length===TIERS.length){
        const gross=TIERS.reduce((a,s)=>a+ti[s],0);
        Object.assign(rec,ti,{gross:r1(gross),elim:r1(gross-it13)});
      }
      out.interest[y]=rec;
    }
  }

  const labels={};
  for(const c of ['GD',...INSTR]) labels[c]=E.label(c);

  fs.writeFileSync('debt_edp.json',JSON.stringify({
    years, ...out, codeLabels:labels,
    src:{dataset:'gov_10dd_edpt1 + gov_10a_main', unit:'MIO_EUR',
         basis:'EDP consolidated gross debt at face value, ESA 2010 S13'}
  }));

  const last=years[years.length-1];
  console.log(`debt ${years[0]}-${last} · ${bad} reconciliation failures`);
  console.log(`\n${last}: total ${(out.total[last]/1000).toFixed(1)}bn · ${out.pcGdp[last]}% of GDP`);
  console.log('  instruments:',out.instr[last].map(r=>`${r[0]}=${(r[1]/1000).toFixed(1)}bn`).join(' '));
  const T=out.tier[last];
  if(T) console.log(`  tiers: central ${(T.S1311/1000).toFixed(1)} regional ${(T.S1312/1000).toFixed(1)} `
    +`local ${(T.S1313/1000).toFixed(1)} socsec ${(T.S1314/1000).toFixed(1)} `
    +`= ${(T.gross/1000).toFixed(1)}bn gross, ${(T.elim/1000).toFixed(1)}bn netted out`);
  const N=out.interest[last];
  if(N) console.log(`  interest: ${(N.total/1000).toFixed(1)}bn consolidated `
    +`(${(N.gross/1000).toFixed(1)}bn gross, ${(N.elim/1000).toFixed(1)}bn intra-government)`);
})();
