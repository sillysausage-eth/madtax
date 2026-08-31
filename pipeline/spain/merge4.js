const fs=require('fs');
const prev=JSON.parse(fs.readFileSync('bundle3.json','utf8'));
const nat =JSON.parse(fs.readFileSync('nat_full_clean.json','utf8'));

const years=Object.keys(nat).sort();           // 2012-2024, national always complete
const natRev={};
years.forEach(y=>{
  const o=nat[y];
  const taxes=(o.D2REC||0)+(o.D5REC||0)+(o.D91REC||0);
  const social=o.D61REC||0;
  const sales=o.P11_P12_P131||0;
  const property=o.D4REC||0;
  const transfers=(o.D7REC||0)+(o.D9REC||0)-(o.D91REC||0); // D9 includes capital taxes; strip them
  const euIn=o.D9REC_S212||0;
  // territorial attribution from the merged per-region layer
  const t=prev.national2[y];
  const mapped = t && t.complete ? t.total : null;
  natRev[y]={
    total:o.TR, expenditure:o.TE, deficit:o.B9,
    taxes, social, sales, property, transfers, euIn,
    mapped,
    unmapped: mapped==null ? null : o.TR-mapped
  };
});
// keep the per-region EU allocation in the bundle but it is no longer a map layer:
// EU money is paid to Spain, not to the communities.
const out={...prev, natRev, revYears:years,
  euNote:'paid_to_member_state'};
fs.writeFileSync('bundle4.json',JSON.stringify(out));
console.log('bundle4:',(fs.statSync('bundle4.json').size/1024).toFixed(1)+'KB');
console.log('\nNATIONAL topline (€bn) — always complete:');
console.log('  year   TOTAL   taxes  social   sales  prop  transf   EU-in  | mapped  unmapped');
['2019','2021','2022','2023','2024'].forEach(y=>{
  const n=natRev[y];
  const f=v=>v==null?'   n/a':(v/1000).toFixed(1).padStart(6);
  console.log(`  ${y} ${f(n.total)} ${f(n.taxes)} ${f(n.social)} ${f(n.sales)} ${f(n.property)} ${f(n.transfers)} ${f(n.euIn)} |${f(n.mapped)} ${f(n.unmapped)}`);
});
const y='2022', n=natRev[y];
const chk=n.taxes+n.social+n.sales+n.property+n.transfers;
console.log(`\nidentity ${y}: taxes+social+sales+property+transfers = ${(chk/1000).toFixed(1)} vs TR ${(n.total/1000).toFixed(1)}  diff ${((chk-n.total)/1000).toFixed(2)}`);
