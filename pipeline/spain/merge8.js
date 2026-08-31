const fs=require('fs');
const prev=JSON.parse(fs.readFileSync('bundle7.json','utf8'));
const dec =JSON.parse(fs.readFileSync('irpf_deciles.json','utf8'));
const corp=JSON.parse(fs.readFileSync('corp_types.json','utf8'));
const soc =JSON.parse(fs.readFileSync('social_split_clean.json','utf8'));

/* "Who generates this revenue" — real published distributions only.
   Anything not published by an official body is described, not estimated. */
const who = {
  irpf:   { kind:'deciles',  years:dec  },
  corp:   { kind:'company',  years:corp },
  social: { kind:'payer',    years:soc  }
};
// short institutional notes for parts with no published payer distribution
const NOTE_ES={
  vat:['Lo recaudan las empresas y lo soporta quien consume. Tres tipos: general 21%, reducido 10% (alimentos, transporte, hostelería) y superreducido 4% (pan, leche, libros, medicamentos).',
       'No existe estadística oficial de IVA pagado por nivel de renta. Al gravar el consumo y no la renta, pesa relativamente más sobre las rentas bajas, que consumen una parte mayor de lo que ingresan.'],
  excise:['Hidrocarburos, tabaco, alcohol, electricidad y carbón. Los ingresa el fabricante o distribuidor y se repercuten en el precio final.',
       'Hidrocarburos y tabaco aportan la mayor parte. Como el IVA, no se publica repartido por nivel de renta.'],
  propTax:['IBI. Lo pagan los propietarios de inmuebles al ayuntamiento, sobre el valor catastral, no sobre el precio de mercado ni sobre la renta del propietario.',
       'El tipo lo fija cada ayuntamiento dentro de una horquilla legal, así que dos viviendas idénticas en municipios distintos pagan cifras muy distintas.'],
  inherit:['Sucesiones y donaciones. Es un impuesto cedido: cada comunidad autónoma fija bonificaciones, y algunas lo dejan prácticamente a cero.',
       'Por eso lo que se paga depende mucho más de dónde residía el fallecido que de cuánto se hereda.'],
  otherProd:['ITP y AJD (compraventa de vivienda usada e hipotecas), primas de seguros, juego y matriculación de vehículos.',
       'ITP/AJD es el más grande y también está cedido a las comunidades autónomas.'],
  sales:['Matrículas universitarias, copagos sanitarios, entradas a museos, licencias, tasas administrativas y venta de servicios públicos.',
       'Lo cobran las tres administraciones; la parte local es la más visible para el ciudadano.'],
  propInc:['Intereses, dividendos de empresas públicas y alquileres de patrimonio público.',
       'No es un impuesto: es lo que el Estado gana como propietario.'],
  eu:['Fondos de cohesión, política agraria común y Next Generation EU.',
      'La Comisión paga al Estado miembro, no a las comunidades autónomas.'],
  otherProdTax:['IAE sobre la actividad empresarial, tasas medioambientales y otros gravámenes sobre la producción.',''],
  otherCurr:['Impuesto sobre el patrimonio (cedido y muy desigual entre comunidades) e impuesto de circulación de vehículos de los hogares.',''],
  otherTransfer:['Transferencias corrientes y de capital recibidas que no proceden de la UE.',''],
  customs:['Aranceles sobre mercancías importadas. Se recaudan en frontera y una parte se remite a la UE como recurso propio.',''],
  taxProdPending:['Agregado provisional: IVA, impuestos especiales, IBI, ITP y el resto de gravámenes sobre el consumo y la producción.',
     'Eurostat publica el detalle por figura aproximadamente un año después del agregado. Cuando salga, este bloque se repartirá entre sus partidas.'],
  taxIncPending:['Agregado provisional: IRPF, Impuesto de Sociedades y el resto de impuestos sobre la renta.',
     'Eurostat publica el detalle por figura aproximadamente un año después del agregado. Cuando salga, este bloque se repartirá entre sus partidas.']
};
const NOTE_EN={
  vat:['Collected by businesses and borne by whoever consumes. Three rates: standard 21%, reduced 10% (food, transport, hospitality) and super-reduced 4% (bread, milk, books, medicines).',
       'There is no official statistic of VAT paid by income level. Because it taxes consumption rather than income, it weighs relatively more on lower incomes, who spend a larger share of what they earn.'],
  excise:['Fuel, tobacco, alcohol, electricity and coal. Paid by the manufacturer or distributor and passed into the final price.',
       'Fuel and tobacco contribute most. Like VAT, it is not published split by income level.'],
  propTax:['Property tax. Paid by owners to the town council on the cadastral value — not the market price, and not the owner’s income.',
       'Each council sets the rate within a legal band, so two identical homes in different municipalities pay very different amounts.'],
  inherit:['Inheritance and gift tax. A ceded tax: each autonomous community sets its own reliefs, and some have cut it to almost nothing.',
       'What you pay therefore depends far more on where the deceased lived than on how much you inherit.'],
  otherProd:['Property transfer and stamp duty (second-hand homes and mortgages), insurance premiums, gambling and vehicle registration.',
       'Transfer and stamp duty is the largest, and is also ceded to the autonomous communities.'],
  sales:['University tuition, health co-payments, museum admissions, licences, administrative fees and sales of public services.',
       'All three tiers charge them; the local share is the most visible to citizens.'],
  propInc:['Interest, dividends from state-owned companies and rents on public property.',
       'Not a tax: this is what the state earns as an owner.'],
  eu:['Cohesion funds, the common agricultural policy and Next Generation EU.',
      'The Commission pays the Member State, not the autonomous communities.'],
  otherProdTax:['Business activity tax, environmental levies and other charges on production.',''],
  otherCurr:['Wealth tax (ceded, and wildly uneven between communities) and household vehicle tax.',''],
  otherTransfer:['Current and capital transfers received that do not come from the EU.',''],
  customs:['Duties on imported goods. Collected at the border, with a share remitted to the EU as an own resource.',''],
  taxProdPending:['Provisional aggregate: VAT, excise, property tax, transfer duty and the rest of the charges on consumption and production.',
     'Eurostat publishes the per-tax detail roughly a year after the aggregate. Once it lands, this block splits into its parts.'],
  taxIncPending:['Provisional aggregate: personal income tax, corporate income tax and the rest of the taxes on income.',
     'Eurostat publishes the per-tax detail roughly a year after the aggregate. Once it lands, this block splits into its parts.']
};
const out={...prev, who, whoNoteES:NOTE_ES, whoNoteEN:NOTE_EN};
fs.writeFileSync('bundle8.json',JSON.stringify(out));
console.log('bundle8:',(fs.statSync('bundle8.json').size/1024).toFixed(1)+'KB');
console.log('irpf decile years:',Object.keys(dec).length,' corp years:',Object.keys(corp).length,
            ' social years:',Object.keys(soc).length);
