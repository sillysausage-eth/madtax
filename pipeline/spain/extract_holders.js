/* Who holds the debt — Banco de España table 11.13, EDP debt by counterpart sector.

   The point of using BdE rather than the Tesoro holder table is the PERIMETER. This is
   the same EDP debt as the Eurostat headline in debt_edp.json: consolidated general
   government, face value, same quarter. It therefore closes at 100% against the number
   the page already shows, and this file ASSERTS that rather than hoping. Tesoro's own
   holder table is book-entry State debt only (~€1.48tn against €1.70tn) and a donut
   built from it could not honestly be labelled as a split of the headline.

   THE NESTING TRAP. The published series are not siblings. Banco de España is inside
   "instituciones financieras", so adding the six series as if they were a partition
   double-counts the BdE's €347bn. The four mutually exclusive slices are:

     Banco de España            P00040
     other financial            P00020 - P00040
     other resident sectors     P00050
     rest of the world          P00060

   Both identities the file checks — those four against the total, and residents plus
   rest-of-world against the total — hold to the euro in the source, so any drift means
   the series have been re-cut upstream and the split must be re-derived, not patched.

   Units in the CSV are THOUSANDS of euros; the bundle is millions.

   Usage: node extract_holders.js            (writes debt_holders.json)
          node extract_holders.js --offline  (reuse the bde/ snapshot) */
const fs=require('fs');
const URL='https://www.bde.es/webbe/es/estadisticas/compartido/datos/csv/be1113.csv';
const CACHE='bde/be1113.csv';

/* code -> [key, ES, EN]. `finoth` is derived, not published, so it is not in here. */
const SLICE={
  P00040:['bde',   'Banco de España',            'Bank of Spain'],
  P00050:['othres','Otros sectores residentes',  'Other resident sectors'],
  P00060:['row',   'Resto del mundo',            'Rest of the world']
};
const FINOTH=['finoth','Otras instituciones financieras residentes','Other resident financial institutions'];
const S=c=>`DTNPDE2010_${c}_PS_APU`;
const MES=['ENE','FEB','MAR','ABR','MAY','JUN','JUL','AGO','SEP','OCT','NOV','DIC'];

const die=m=>{ console.error('FAIL '+m); process.exit(1); };
/* One row of RFC-4180-ish CSV. The header rows quote their labels, the data rows do not,
   and a description field can contain a comma — position-based splitting corrupts it. */
const cells=l=>{ const o=[]; let c='',q=false;
  for(let i=0;i<l.length;i++){ const ch=l[i];
    if(ch==='"'){ if(q&&l[i+1]==='"'){c+='"';i++;} else q=!q; }
    else if(ch===','&&!q){ o.push(c.trim()); c=''; }
    else c+=ch; }
  o.push(c.trim()); return o; };

(async()=>{
  let buf;
  if(process.argv.includes('--offline')) buf=fs.readFileSync(CACHE);
  else{
    const r=await fetch(URL);
    if(!r.ok) die(`${URL}: HTTP ${r.status}`);
    buf=Buffer.from(await r.arrayBuffer());
    fs.mkdirSync('bde',{recursive:true});
    fs.writeFileSync(CACHE,buf);
  }

  /* BdE serves ISO-8859-1, but some files in this catalogue mix latin-1 and UTF-8 inside
     one line. Try strict UTF-8 first and fall back; then check a sentinel actually reads
     as Spanish, because latin-1 decodes any byte at all and would happily emit mojibake
     into the labels rather than throw. */
  let txt;
  try{ txt=new TextDecoder('utf-8',{fatal:true}).decode(buf); }
  catch{ txt=new TextDecoder('iso-8859-1').decode(buf); }
  if(!txt.includes('CÓDIGO DE LA SERIE')||!txt.includes('Banco de España'))
    die('be1113.csv decoded to mojibake — neither UTF-8 nor latin-1 reads the accents');

  const lines=txt.split(/\r?\n/).filter(l=>l.trim());
  const codes=cells(lines[0]), units=cells(lines[4]);
  if(codes[0]!=='CÓDIGO DE LA SERIE') die(`row 1 is "${codes[0]}", not the series-code row`);
  const col={}; codes.forEach((c,i)=>{ if(i) col[c]=i; });

  /* Trailer, asserted rather than assumed: dropping "the last two rows" blind would eat
     a data row the day BdE stops emitting one of them. */
  const tail=lines.slice(-2).map(l=>cells(l)[0]);
  if(tail[0]!=='FUENTE'||tail[1]!=='NOTAS') die(`trailer is ${JSON.stringify(tail)}, expected FUENTE + NOTAS`);
  const data=lines.slice(6,-2);

  const need=['P00000','P00090','P00020','P00040','P00050','P00060'];
  for(const c of need){
    if(col[S(c)]==null) die(`series ${S(c)} is not in the file`);
    if(units[col[S(c)]]!=='Miles de euros')
      die(`${S(c)} is in "${units[col[S(c)]]}", not thousands of euros — the ÷1000 below is wrong`);
  }

  /* Reference quarter: whatever year the headline already quotes, so the donut and the
     hero can never be a year apart. Q4 of that year is the stock at 31 December. */
  const edp=JSON.parse(fs.readFileSync('debt_edp.json','utf8'));
  const year=edp.years.filter(y=>edp.total[y]!=null&&edp.interest[y]!=null).pop();
  const row=data.find(l=>cells(l)[0]===`DIC ${year}`);
  if(!row) die(`no DIC ${year} quarter in be1113.csv (latest is ${cells(data[data.length-1])[0]})`);

  const r=cells(row);
  const v=c=>{ const x=r[col[S(c)]];                       // "_" is the missing marker
    if(x==='_'||x===''||x==null) die(`${S(c)} has no value for DIC ${year}`);
    const n=Number(x); if(!isFinite(n)) die(`${S(c)} = "${x}" is not a number`); return n; };

  const k=Object.fromEntries(need.map(c=>[c,v(c)]));
  const tot=k.P00000;

  if(k.P00090+k.P00060!==tot)
    die(`residents ${k.P00090} + rest of world ${k.P00060} = ${k.P00090+k.P00060}, not the total ${tot}`);
  const finoth=k.P00020-k.P00040;
  if(finoth<=0) die(`other financial institutions = ${finoth}: Banco de España is not inside P00020 any more`);
  const parts=[[...FINOTH,finoth],[...SLICE.P00040,k.P00040],
               [...SLICE.P00050,k.P00050],[...SLICE.P00060,k.P00060]];
  const psum=parts.reduce((a,p)=>a+p[3],0);
  if(psum!==tot) die(`the four slices sum to ${psum}, not the published total ${tot}`);

  /* Same debt, same date, same valuation as the spine — so it must be the same number. */
  const m=n=>Math.round(n/1000*10)/10;
  if(Math.abs(m(tot)-edp.total[year])>1)
    die(`BdE total ${m(tot)} does not match the Eurostat headline ${edp.total[year]} for ${year} — `
       +`these are supposed to be the identical aggregate`);

  const rows=parts.map(p=>[p[0],m(p[3])]).sort((a,b)=>b[1]-a[1]);
  const lab=(i)=>Object.fromEntries(parts.map(p=>[p[0],p[i]]));

  const out={
    asOf:`${year}-12`, scope:'gg',
    basis:'EDP face value, consolidated — same perimeter as the headline total',
    total:m(tot),
    rows,
    labES:lab(1), labEN:lab(2),
    note:true,
    noteES:'Reparto por sector tenedor de la misma deuda PDE que la cifra principal: mismo '
      +'perímetro (administraciones públicas consolidadas), misma valoración a valor nominal '
      +'y misma fecha, de modo que suma el 100%. La cartera del Banco de España procede de las '
      +'compras de activos del Eurosistema; los bonos en poder del propio BCE se registran en '
      +'resto del mundo, no como tenencia del banco central.',
    noteEN:'A holder-sector split of the same EDP debt as the headline figure: same perimeter '
      +'(consolidated general government), same face-value basis and same date, so it closes at '
      +'100%. The Banco de España holding arises from Eurosystem asset purchases; bonds held by '
      +'the ECB itself are recorded under rest of the world, not as central-bank holdings.',
    src:{table:'Banco de España 11.13 (be1113)', unit:'thousands of EUR at source',
         basis:'EDP debt (SEC 2010), consolidated general government, face value'}
  };
  fs.writeFileSync('debt_holders.json',JSON.stringify(out));

  console.log(`holders ${out.asOf} · scope ${out.scope} · €${(out.total/1000).toFixed(1)}bn`);
  console.log(`  ties to the Eurostat headline for ${year}: ${edp.total[year]} = ${out.total} M€`);
  for(const [key,val] of rows)
    console.log(`  ${key.padEnd(7)}${(val/1000).toFixed(1).padStart(8)}bn ${(val/out.total*100).toFixed(2).padStart(6)}%  ${out.labEN[key]}`);
  console.log(`  residents ${(m(k.P00090)/1000).toFixed(1)}bn + rest of world `
    +`${(m(k.P00060)/1000).toFixed(1)}bn = ${(out.total/1000).toFixed(1)}bn (checked to the euro)`);
})();
