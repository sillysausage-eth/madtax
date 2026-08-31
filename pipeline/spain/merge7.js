const fs=require('fs');
const prev=JSON.parse(fs.readFileSync('bundle6.json','utf8'));
const cd  =JSON.parse(fs.readFileSync('cofog_detail.json','utf8'));

const ES={
GF0101:'Órganos ejecutivos y legislativos, hacienda, exteriores',GF0102:'Ayuda económica exterior',
GF0103:'Servicios generales',GF0104:'Investigación básica',GF0105:'I+D en servicios generales',
GF0106:'Otros servicios públicos generales',GF0107:'Intereses de la deuda pública',
GF0108:'Transferencias entre niveles de gobierno',
GF0201:'Defensa militar',GF0202:'Protección civil',GF0203:'Ayuda militar exterior',
GF0204:'I+D en defensa',GF0205:'Otros gastos de defensa',
GF0301:'Policía',GF0302:'Bomberos',GF0303:'Juzgados y tribunales',GF0304:'Prisiones',
GF0305:'I+D en seguridad',GF0306:'Otros de orden público',
GF0401:'Asuntos económicos, comerciales y laborales',GF0402:'Agricultura, pesca y silvicultura',
GF0403:'Energía y combustibles',GF0404:'Minería, industria y construcción',GF0405:'Transporte',
GF0406:'Comunicaciones',GF0407:'Otros sectores',GF0408:'I+D en asuntos económicos',
GF0409:'Otros asuntos económicos',
GF0501:'Gestión de residuos',GF0502:'Aguas residuales',GF0503:'Reducción de la contaminación',
GF0504:'Biodiversidad y paisaje',GF0505:'I+D medioambiental',GF0506:'Otros medioambientales',
GF0601:'Promoción de vivienda',GF0602:'Desarrollo comunitario',GF0603:'Abastecimiento de agua',
GF0604:'Alumbrado público',GF0605:'I+D en vivienda',GF0606:'Otros de vivienda y urbanismo',
GF0701:'Medicamentos y material sanitario',GF0702:'Atención ambulatoria',GF0703:'Atención hospitalaria',
GF0704:'Salud pública',GF0705:'I+D sanitaria',GF0706:'Otros gastos sanitarios',
GF0801:'Deporte y ocio',GF0802:'Cultura',GF0803:'Radiodifusión y publicaciones',
GF0804:'Servicios religiosos y comunitarios',GF0805:'I+D en cultura',GF0806:'Otros de ocio y cultura',
GF0901:'Educación infantil y primaria',GF0902:'Educación secundaria',
GF0903:'Educación postsecundaria no superior',GF0904:'Educación universitaria',
GF0905:'Educación no definible por nivel',GF0906:'Servicios auxiliares de educación',
GF0907:'I+D en educación',GF0908:'Otros gastos educativos',
GF1001:'Enfermedad e incapacidad',GF1002:'Pensiones de jubilación',GF1003:'Pensiones de viudedad y orfandad',
GF1004:'Familia e infancia',GF1005:'Desempleo',GF1006:'Vivienda social',
GF1007:'Exclusión social',GF1008:'I+D en protección social',GF1009:'Otros de protección social'
};
// what each sub-group actually covers, for the citizen-facing explainer
const NOTE_ES={
GF1002:'Pensiones contributivas y no contributivas de jubilación',
GF1001:'Bajas por enfermedad, incapacidad permanente y dependencia',
GF1003:'Prestaciones a cónyuges e hijos supervivientes',
GF1005:'Prestaciones y subsidios por desempleo',
GF0107:'Lo que cuesta pagar los intereses de la deuda del Estado',
GF0703:'Hospitales públicos y concertados',
GF0702:'Centros de salud, especialistas y atención primaria',
GF0405:'Carreteras, ferrocarril, puertos y aeropuertos',
GF0201:'Personal, equipamiento y operaciones de las Fuerzas Armadas'
};
const NOTE_EN={
GF1002:'Contributory and non-contributory retirement pensions',
GF1001:'Sick leave, permanent disability and long-term care',
GF1003:'Benefits to surviving spouses and children',
GF1005:'Unemployment benefit and subsidies',
GF0107:'What it costs to service interest on government debt',
GF0703:'Public and publicly-funded hospitals',
GF0702:'Health centres, specialists and primary care',
GF0405:'Roads, rail, ports and airports',
GF0201:'Armed forces personnel, equipment and operations'
};

const years=Object.keys(cd.sub).sort();
// off-map composition per division per year
const spendAgg={};
years.forEach(y=>{
  spendAgg[y]={};
  const bs=cd.bysec[y]||{};
  ['TOTAL','GF01','GF02','GF03','GF04','GF05','GF06','GF07','GF08','GF09','GF10'].forEach(code=>{
    const div=code==='TOTAL'?0:+code.slice(2);
    const mapped=prev.regions.reduce((a,r)=>{
      const s=r.spend[y]; if(!s) return a;
      return a + (code==='TOTAL'? s[0] : s[div]);
    },0);
    const nat     = (bs.S13   ||{})[code] ?? null;
    const central = (bs.S1311 ||{})[code] ?? 0;
    const local   = (bs.S1313 ||{})[code] ?? 0;
    const socsec  = (bs.S1314 ||{})[code] ?? 0;
    if(nat==null) return;
    spendAgg[y][code]={ nat, mapped, central, local, socsec,
      // transfers between tiers, eliminated on consolidation. Large and negative for
      // GF01 because that is where central government books money handed to the regions.
      adj: nat - mapped - central - local - socsec };
  });
});
const out={...prev,
  spendSub:cd.sub, spendSubEN:cd.labels, spendSubES:ES,
  spendNoteES:NOTE_ES, spendNoteEN:NOTE_EN, spendAgg};
fs.writeFileSync('bundle7.json',JSON.stringify(out));
console.log('bundle7:',(fs.statSync('bundle7.json').size/1024).toFixed(1)+'KB');
const y='2024';
console.log(`\n${y} off-map composition per division (€bn):`);
console.log('  code   national  onMap  central  local  socsec    adj');
Object.entries(spendAgg[y]).forEach(([k,a])=>{
  const f=v=>(v/1000).toFixed(1).padStart(7);
  console.log(`  ${k.padEnd(6)}${f(a.nat)}${f(a.mapped)}${f(a.central)}${f(a.local)}${f(a.socsec)}${f(a.adj)}`);
});
