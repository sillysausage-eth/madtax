// Ported verbatim from prototype/console.tpl.html — the `const T` table.
// Faithful extraction, not a paraphrase: every key and every string is the
// prototype's. The prototype remains the reference implementation; if a string
// changes there it must be re-ported here, never edited in one place only.

export const es = {
  ctrl:'CONTROL',metric:'MÉTRICA',lo:'BAJO',hi:'ALTO',dos:'EXPEDIENTE',
  modeRev:'Ingresos',modeExp:'Gasto',modeDebt:'Deuda',
  footRev1:'Fuente: AEAT vía ISTAC · IGAE · CONPREL · OCTE · Hacienda Foral de Navarra · Ministerio de Hacienda (DGT) · Eurostat',
  footExp1:'Fuente: IGAE · Eurostat · INE',
  footExp2:'Gasto consolidado del conjunto de las administraciones (SEC 2010)',
  foot3:'MadTax',
  dbt:{
    foot1:'Fuente: Eurostat — Procedimiento de Déficit Excesivo (gov_10dd_edpt1, gov_10a_main)',
    foot2:'Deuda bruta consolidada a valor nominal · saldo vivo, no un flujo anual',
    heroK:'Deuda pública total',
    ofGdp:'del PIB',
    asOf:'Todas las AAPP · cierre de {Y}',
    sInt:'Intereses pagados',        sIntN:'ejercicio {Y}',
    sLife:'Vida media',              sLifeN:'deuda del Estado',
    // The two axes the trend chart is read off, named once each on the chart.
    unitBn:'€ MM',                    unitPc:'% PIB',
    sYears:'años',
    noPub:'Sin dato publicado',
    trendK:'La deuda en el tiempo',
    trendSrc:'Eurostat',
    // Said to a screen reader, and to anyone who tabs to the chart.
    trendNav:'Usa las flechas izquierda y derecha para leer un año.',
    secShape:'Desglose',
    // The three questions the block answers, one at a time. Short, because they
    // are tab labels: the strip is the heading, so no view repeats its own title.
    tForm:'En qué forma',
    tHold:'Quién la tiene',
    tMat:'Cuándo vence',
    qFormS:'Por tipo de instrumento, según emisión',
    qHoldS:'Tenedores del saldo vivo',
    qMat:'Importe que vence cada año, por valor nominal',
    instr:{GD_F32:'Valores a largo plazo',GD_F31:'Valores a corto plazo',
           GD_F42:'Préstamos a largo plazo',GD_F41:'Préstamos a corto plazo',
           GD_F2:'Efectivo y depósitos'},
    matNote:'Solo deuda del Estado en valores: no incluye la deuda de comunidades autónomas, '+
      'corporaciones locales ni Seguridad Social, ni los préstamos y la deuda en divisas del '+
      'propio Estado. El primer año es parcial: recoge solo lo que queda por vencer desde '+
      'la fecha de referencia.',
    scopeState:'Deuda del Estado',
    scopeGG:'Todas las AAPP',
    gapTag:'Dato no publicado',
    // A question the bundle cannot answer is still asked, and the gap named in
    // place of the chart. Nothing here is estimated or interpolated.
    gapHold:'El reparto por tenedores no está en este bundle todavía. No se estima: '+
      'cuando se incorpore la fuente oficial, aparecerá aquí con su fecha y su perímetro.',
    gapMat:'El calendario de vencimientos no está en este bundle todavía. No se interpola.'
  },
  taxLbl:'FIGURA TRIBUTARIA',fnLbl:'FUNCIÓN DEL GASTO',
  mapRev:'MAPA TÁCTICO · RECAUDACIÓN',mapExp:'MAPA TÁCTICO · GASTO',
  roRev:'AEAT · RECAUDACIÓN LÍQUIDA',roExp:'IGAE + EUROSTAT · SEC 2010',
  unal:(v: string) =>'SIN ASIGNAR '+v,noreg:'◇ NO ES COMUNIDAD AUTÓNOMA',
  m:{total:'Total absoluto',pc:'Por habitante',gdp:'% del PIB de la comunidad autónoma'},
  tx:{TOTAL:'Todas las figuras',IRPF:'IRPF · Renta',IS:'Sociedades',IVA:'IVA',IIEE:'Impuestos especiales',OTROS:'Otros impuestos',TASAS:'Tasas'},
  fnAll:'Todas las funciones',
  fam:{social:'Cotizaciones sociales',income:'Impuestos sobre la renta',
       consume:'Impuestos sobre consumo, producción y propiedad',
       nontax:'Ingresos no tributarios',capital:'Impuestos sobre el capital'},
  expSub:'gasto consolidado de todas las AAPP · COFOG',
  fOfTotal:'% del total',fRank:'Puesto',fPerCap:'Por habitante',
  fOnMap:'En el mapa {P}',fOffMap:'Sin reparto por comunidades autónomas',fYear:'Ejercicio',fClose:'Cerrar',
  rvTotal:'TODOS los ingresos', rvTotalK:'INGRESOS PÚBLICOS TOTALES', rvTotalSub:'todas las AAPP · SEC 2010', rvPending:'detalle por figura aún no publicado',
  compTtl:'DE DÓNDE SALE CADA EURO',
  compNote:'Las partidas suman exactamente el total y ninguna se solapa con otra. Pulsa cualquiera para saber qué es — no filtra el mapa. Fuente: contabilidad nacional (SEC 2010), Eurostat; reparto por comunidades autónomas de AEAT, IGAE, CONPREL y las haciendas forales.',
  regWhat:'IMPUESTOS RECAUDADOS AQUÍ ·',
  regNone:'Sin dato por comunidad autónoma para:',
  restWhat:'QUÉ HAY EXACTAMENTE AQUÍ DENTRO',
  pendProd:['Impuestos sobre el consumo y la producción','Desglose 2025 pendiente: Eurostat publica el detalle por figura un año después del agregado'],
  pendInc:['Impuestos sobre la renta','Desglose 2025 pendiente: Eurostat publica el detalle por figura un año después del agregado'],
  whoH:'¿QUIÉN GENERA ESTE INGRESO?',
  whoPendingH:'AÚN NO PUBLICADO',whoPendingBeforeH:'NO PUBLICADO PARA ESTE AÑO',
  whoPendingDue:'La AEAT no ha publicado este desglose para {Y}. La última edición cubre {L}; la siguiente está prevista para {D}, y este bloque la mostrará en cuanto salga.',
  whoPendingNoDate:'La AEAT no ha publicado este desglose para {Y}. La última edición cubre {L}; este bloque mostrará la siguiente en cuanto salga.',
  whoPendingBefore:'Este desglose se publica desde {F}. No existe para {Y}.',
  wScaleIntro:'<b>La escala del IRPF en 2023.</b> Estos son los tramos por los que realmente se calcula el impuesto. Se aplican a la <b>base liquidable</b> —lo que queda de la renta tras el mínimo personal y familiar y las reducciones—, no al sueldo bruto.',
  wScaleGeneral:'Escala general · rentas del trabajo y actividades',
  wScaleSavings:'Escala del ahorro · intereses, dividendos, plusvalías',
  wStateHalf:'estatal',
  wScaleWhy:'Sólo se muestra la mitad estatal. Cada comunidad autónoma aprueba su propia escala, que se suma a ésta, así que el tipo marginal real depende de dónde vivas. Y son tipos <b>marginales</b>: nadie paga el 24,5% sobre toda su renta, sólo sobre la parte que supera los 300.000 €. Por eso AEAT no publica —ni podría— un recuento de personas «dentro» de cada tramo: todo el mundo atraviesa los tramos inferiores.',
  wDistH:'Cuánta gente hay y cuánto paga.',
  wDistIntro:'AEAT sí publica el reparto de contribuyentes por renta anual, pero usando sus propios intervalos, que no coinciden con la escala legal. Es lo más cercano que existe a «quién paga el IRPF».',
  tabTop:'Top 10%',
  wGroupCol:'Grupo',
  wTop10_1:'10% → 1%',wTop1_01:'1% → 0,1%',
  wTop01_001:'0,1% → 0,01%',wTop001:'Top 0,01%',
  tabDec:'Deciles',tabQui:'Quintiles',
  wPosLow:'el {P}% que menos gana',wPosHigh:'el {P}% que más gana',wPosMid:'posición {A}–{B}%',
  wMadIntro:'<b>La escala real que se aplica en Madrid.</b> El Estado fija una mitad y la Comunidad de Madrid la otra; el tipo marginal que pagas es la suma. Madrid tiene la escala autonómica más baja de España.',
  wMadBand:'Base liquidable',wMadState:'Estatal',wMadRegion:'Madrid',wMadTotal:'Marginal total',
  wMadPeople:'Personas que llegan',wMadPct:'% que llega',
  wMadCaveat:'<b>Las dos últimas columnas son una estimación</b>, la única de todo MadTax. AEAT no publica cuántos contribuyentes hay en cada tramo de la escala, así que se interpola a partir de la distribución por deciles. Además la escala se aplica a la <b>base liquidable</b> y la distribución es de <b>renta bruta</b>: son magnitudes distintas, así que léelo como un orden de magnitud, no como un dato oficial. Los tipos sí son exactos.',
  wPeoplePct:'% personas',wAvgTax:'Media por persona',wNegZero:'Renta negativa o cero',
  wTotalRow:'Total',
  wGap:'Los tramos son de renta anual (rendimientos e imputaciones) y suman <b>{R}</b>, la cuota de las declaraciones de IRPF presentadas. La cifra de cabecera es <b>{H}</b> porque la contabilidad nacional incluye además el IRPF de País Vasco y Navarra, que tienen su propio impuesto, y las retenciones de quienes no están obligados a declarar. Diferencia: <b>{G}</b>.',
  wPeople:'Personas',wIncome:'Renta',wTax:'Impuesto',
  wRate:'Tipo medio',wShare:'% del impuesto',wAll:'Total',
  wBandRange:'Renta anual',wUpToV:'Hasta {V}',wOverV:'Más de {V}',wThreshold:'A partir de',
  tabCoBr:'Tramos',tabCoTop:'Las mayores',
  wTurnover:'Cifra de negocios anual',wCompanies:'Empresas',wProfit:'Beneficio',wRateProfit:'Tipo s/ beneficio',
  wGapCorp:'Los tramos son la cifra de negocios anual de la empresa o del grupo fiscal, y el impuesto es la cuota líquida de las declaraciones del Impuesto sobre Sociedades del ejercicio: <b>{R}</b>. La cifra de cabecera es <b>{H}</b> porque la contabilidad nacional registra el impuesto devengado en el año para toda España, País Vasco y Navarra incluidos, y no la cuota liquidada en las declaraciones presentadas. Diferencia: <b>{G}</b>.',
  wSec:{ind:'Industria, energía y agricultura',con:'Construcción e inmobiliario',
    com:'Comercio y comunicaciones',fin:'Finanzas y servicios a empresas',
    srv:'Servicios sociales, personales y de ocio'},
  wCorpTurn:'La cifra de negocios es el importe neto de la facturación: lo que la empresa o el grupo facturó por ventas y servicios en el año, antes de descontar ningún coste. No es el beneficio — la columna de al lado es la suma de los resultados contables positivos.',
  wCorpPub:'La AEAT publica este reparto sólo por tramos de cifra de negocios: no hay ranking por beneficio ni nombres de empresas. Un grupo que declara en consolidado cuenta una vez, como grupo; una empresa fuera de grupo cuenta una vez. El tramo superior son las {N} empresas y grupos con una cifra de negocios superior a 1.000 millones de euros.',
  wCorpPubTop:'Cada tramo por encima de 100 M€ se abre por los cinco sectores con los que la AEAT lo cruza — el detalle más fino que publica dentro de un tramo, y lo más cerca que se puede estar de poner nombre a las {N} empresas y grupos que facturan más de 1.000 M€. La AEAT no publica ranking por beneficio ni nombres de empresas.',
  wCorpSE:'Un guion es una cifra que la AEAT no publica por secreto estadístico: hay tan pocas empresas en ese sector y tramo que publicarla las identificaría. Se deja en blanco en lugar de rellenarla.',
  wPayer:'Quién paga',wAmount:'Importe',
  wEmployer:'Empresas (cuota patronal)',wEmployee:'Trabajadores por cuenta ajena',
  wSelf:'Autónomos',wNonEmp:'No ocupados (convenios especiales)',wVoluntary:'Aportaciones voluntarias',wImputed:'Imputadas (sector público)',
  /* The fees, prices and sales bucket: why most of it is not on the map. */
  sales:{
    offmap:'De esta partida, el mapa sólo reparte por comunidad lo que cobran los ayuntamientos y la línea de tasas que la AEAT recauda en cada territorio. El resto —sobre todo lo que cobran los gobiernos autonómicos y los organismos del Estado— se publica sin ese reparto y queda aquí.'
  },
  // The first column of the standard breakdown table: a component's ESA children,
  // or a spending function's COFOG groups.
  bdCol:'Concepto',bdColExp:'Subfunción',
  wProduct:'Figura',wVatRate:'Tipo de IVA',
  wAeatTot:'TOTAL DEVENGADO · AEAT',
  provB:'(p)',
  provAeat:'Provisional — la última edición de AEAT marca este ejercicio como (p); las cifras se revisan en el informe siguiente.',
  provEu:'Provisional — Eurostat marca este ejercicio como provisional (estado p); las cifras se revisan en la edición siguiente.',
  wGapExcise:'Cifras de AEAT en devengo del Estado: <b>{A}</b>. La cabecera dice <b>{H}</b> porque la contabilidad nacional cuenta también los impuestos especiales de País Vasco y Navarra, que los recaudan sus haciendas forales, y otros impuestos sobre el consumo. Diferencia: <b>{G}</b>.',
  wGapVat:'El reparto por tipos sólo se publica del <b>régimen general</b> ({A}). Fuera quedan los regímenes especiales ({SP}), el ajuste con las comunidades autónomas forales ({F}) y otros ajustes ({O}), que llevan el IVA devengado total a <b>{T}</b>. La cabecera dice <b>{H}</b>, en contabilidad nacional.',
  osSoc:'Seguridad Social · pensiones y prestaciones',
  osCentral:'Gobierno central · defensa, deuda, exteriores',
  osLocal:'Ayuntamientos y diputaciones',
  osAdj:'Transferencias entre niveles (se eliminan)',
  osSocD:'Lo que gasta directamente la Seguridad Social: pensiones de jubilación, viudedad, incapacidad y desempleo. No se publica repartido por comunidad autónoma.',
  osCentralD:'Gasto del Estado y sus organismos. Incluye lo que por naturaleza no tiene reparto por comunidades autónomas: defensa, intereses de la deuda, acción exterior y la administración central.',
  osLocalD:'Gasto de ayuntamientos, diputaciones y cabildos. Tiene lugar en el mapa, pero se contabiliza en el subsector local, no en el autonómico que muestra el mapa.',
  osAdjD:'Dinero que un nivel de gobierno transfiere a otro. Aparece dos veces si se suman los niveles, así que la contabilidad nacional lo elimina. Casi todo es Estado → comunidades autónomas.',
  omNoTerr:'sólo publicado como cifra nacional',
  omNat:'Total nacional',
  omWhy:'¿POR QUÉ NO ESTÁ EN EL MAPA?',
  noFigWhy:'SIN CIFRA PUBLICADA',
  omSocD:'Las cotizaciones las recauda la Tesorería General de la Seguridad Social, que solo publica cifras nacionales. No existe un dato oficial por comunidad autónoma.',
  omEuD:'La Comisión Europea paga al Estado miembro, no a las comunidades autónomas. El dinero entra en el presupuesto español y luego se reparte a los organismos gestores, algunos autonómicos. Existe un dato de en qué comunidad autónoma se gastó, pero eso no es lo mismo que a quién se pagó.',
  omRestD:'Incluye rentas de la propiedad del Estado, transferencias no europeas, aranceles, y la diferencia entre criterio de caja (datos administrativos) y devengo (contabilidad nacional). La recaudación de las haciendas forales del País Vasco y Navarra ya no está aquí: está en el mapa, en sus propias comunidades autónomas.',
  omSoc:'Seguridad Social · sin reparto por comunidades autónomas',
  omEu:'Unión Europea · se paga al Estado',
  omRest:'Resto sin reparto por comunidades autónomas',
  // Short forms for the coins beside the map. The map has room for a name, not
  // for a sentence; the sentence is in the dossier the coin opens.
  coinSoc:'Seguridad Social',
  coinEu:'Fondos UE',
  coinRest:'Otros ingresos',
  // ---- M5: the component filter and the Spanish-state coin ----------------
  // Added for the unified revenue interaction; not in the prototype, which has
  // neither a filter control nor a single off-map coin.
  fltOn:'FILTRO',
  // The coin is named for the tier that keeps the money, as the spending rail
  // names its coins. What sits inside it is still disclosed in the dossier.
  shieldTitle:'Gobierno central',
  shieldName:'Gobierno central',
  shieldH:'QUÉ HAY DENTRO DE ESTA CIFRA',
  shieldMix:'Esta cifra agrupa dinero que recaudan o reciben organismos distintos: las cotizaciones que ingresa la Tesorería General de la Seguridad Social, los fondos que la Comisión Europea paga al Estado y la recaudación que la AEAT y otras administraciones sólo publican como cifra nacional. Aparecen juntos porque ninguno se publica por comunidad autónoma, no porque compartan recaudador.',
  shieldShort:'La parte de {N} que ninguna fuente publicada asigna a una comunidad autónoma: se recauda o se recibe de forma centralizada y sólo se publica como cifra nacional.',
  noSplitShort:'Ninguna fuente publica {N} por comunidad autónoma, así que la cifra entera queda sin reparto y cada comunidad autónoma se dibuja como sin dato, no como cero.',
  // The two tiers the figure is split between. Not a statement about the map:
  // it is the published split between the communities and the centre.
  tierAut:'Comunidades Autónomas',
  // Used only where a region is selected, so the national split underneath a
  // regional headline cannot be read as that region's own.
  regNoFig:'No hay cifra publicada para esta comunidad autónoma en esta partida.',
  // The same, for spending's four coins.
  coinOsSoc:'Seguridad Social',
  coinOsCentral:'Gobierno central',
  coinOsLocal:'Ayuntamientos',
  coinOsAdj:'Entre niveles',
  // ---- M6: the COFOG filter and its panel ---------------------------------
  // The spending console now works exactly as the revenue one does: the legend
  // beside the ring is a grid of pressable coins, and pressing one filters the
  // map and fills the panel. The prototype has neither control, so none of these
  // strings is ported — they are new, and stated in both locales.
  expNoSplit:'Ninguna comunidad autónoma gasta en esta función: entera se contabiliza fuera del subsector '+
    'autonómico que dibuja el mapa. Cada comunidad autónoma se muestra como sin dato y no como cero, porque un cero '+
    'aquí no mediría el gasto de esa comunidad autónoma — es la ausencia de la función en su nivel de gobierno.',
  expRegNoFig:'No hay cifra publicada para esta comunidad autónoma en esta función.',
  expSubsSrc:'Desglose oficial por códigos COFOG · Eurostat (gov_10a_exp). Las partes suman exactamente la cifra de arriba.',
  // ---- M7: the map of territories -----------------------------------------
  tierReg:'Gobierno autonómico',
  locNetNote:'Ayuntamientos, diputaciones, cabildos y consejos gastaron aquí {N} (criterio presupuestario, obligaciones reconocidas, CONPREL). '+
    'El mapa lleva {M}: esa cifra menos {G} transferidos a otros niveles de gobierno y {C} recibidos del gobierno autonómico, '+
    'ambos ya incluidos en la cifra autonómica de arriba y que de otro modo contarían dos veces.',
  fnCol:'Función',
  areaCol:'Área de gasto',
  econCol:'Tipo de gasto',
  srcRegFn:'Gobierno autonómico · IGAE, clasificación funcional COFOG. Las filas suman exactamente la cifra autonómica.',
  srcLocArea:'Ayuntamientos, diputaciones, cabildos y consejos · liquidación definitiva CONPREL, obligaciones reconocidas, por área de gasto (Orden EHA/3565/2008), sin capítulos financieros.',
  srcRegEcon:'Gobierno autonómico · IGAE, por operación económica SEC.',
  locNetWhy:'¿POR QUÉ EL MAPA LLEVA MENOS?',
  expFnTiers:'De los {N} gastados en esta función, {A} los gastan los gobiernos autonómicos y están en el mapa. Los {S} restantes están en la moneda del Estado: '+
    'gobierno central {C}, ayuntamientos {L} y Seguridad Social {SS}, menos {E} de transferencias entre niveles que la contabilidad nacional elimina. '+
    'Las entidades locales clasifican su gasto por áreas de gasto, no por función COFOG, así que su parte no tiene reparto publicado por comunidad autónoma.',
  coinLocRest:'Ayuntamientos · fuera del mapa',
  locRestD:'El subsector local en contabilidad nacional ({T}) menos lo que el mapa lleva de los ayuntamientos ({M}). Es la diferencia de criterio y '+
    'perímetro entre la contabilidad nacional y las liquidaciones de las propias entidades locales, más las transferencias descontadas de la capa local '+
    'para que ningún euro esté dos veces en el mapa.',
  stateMixExp:'Esta cifra agrupa dinero que gastan organismos distintos: lo que gastan el Estado y sus organismos, lo que la Seguridad Social paga en '+
    'pensiones y prestaciones, la parte del gasto local a la que no llega la capa territorial, menos las transferencias entre niveles que la '+
    'contabilidad nacional elimina. Aparecen juntos porque ninguno se publica por comunidad autónoma, no porque compartan quién lo gasta.',
  expFnLocal:'Para una función el mapa dibuja sólo el nivel autonómico. Las entidades locales clasifican su gasto por áreas de gasto, no por función '+
    'COFOG, así que su parte de esta función no tiene reparto publicado por comunidad autónoma y queda en la moneda del Estado, dicha en las barras de arriba.',
  advNoLocal:'AYUNTAMIENTOS · SIN CIFRA PUBLICADA',
  advNoLocalt:'CONPREL publica para las entidades locales de este territorio, este ejercicio, una tabla con cero en todas las líneas. Es una cifra '+
    'ausente, no unos ayuntamientos que no gastaron nada: la parte local se lleva como ausente y queda en el resto de la moneda del Estado, y la '+
    'cifra de aquí es sólo la del gobierno autonómico.',
  pt:{
    social:['Cotizaciones sociales','Cuotas de empresas y trabajadores a la Seguridad Social'],
    irpf:['IRPF · Renta de las personas','Nóminas, pensiones, rendimientos de autónomos y del ahorro'],
    vat:['IVA','Impuesto sobre el valor añadido en el consumo'],
    corp:['Impuesto de Sociedades','Beneficio de las empresas'],
    sales:['Tasas, precios públicos y ventas','No es un impuesto: se paga a cambio de un servicio o permiso concreto —matrículas, copagos, basuras, agua, licencias, entradas—. Incluye también las ventas a precio de mercado de los organismos públicos y su producción para uso propio, que no es dinero cobrado.'],
    excise:['Impuestos especiales','Hidrocarburos, tabaco, alcohol, electricidad y carbón'],
    eu:['Fondos europeos','Transferencias recibidas: cohesión, PAC y Next Generation'],
    otherProd:['ITP/AJD, seguros, juego y matriculación','Transmisiones patrimoniales y actos jurídicos documentados'],
    propInc:['Rentas de la propiedad','Intereses, dividendos de empresas públicas y alquileres'],
    propTax:['IBI · Impuesto sobre inmuebles','Municipal, sobre el valor de terrenos y edificios'],
    otherProdTax:['IAE y otros sobre la actividad','Actividades económicas, tasas medioambientales y otros gravámenes sobre la producción'],
    otherTransfer:['Otras transferencias recibidas','Corrientes y de capital, de origen distinto a la UE'],
    inherit:['Sucesiones y donaciones','Herencias, donaciones y otros gravámenes sobre el capital'],
    otherCurr:['Patrimonio, vehículos y otros','Patrimonio de las personas, circulación de vehículos de los hogares y otros corrientes'],
    customs:['Aranceles de importación','Derechos de aduana en frontera'],
    taxProdPending:['Consumo y producción · pendiente','IVA, especiales, IBI, ITP y resto — Eurostat aún no ha publicado el desglose de 2025'],
    taxIncPending:['Impuestos sobre la renta · pendiente','IRPF, Sociedades y resto — Eurostat aún no ha publicado el desglose de 2025']
  },
  sRev:{nat:'INGRESOS PÚBLICOS TOTALES',natSub:'todas las AAPP · SEC 2010',
        tax:'Impuestos',soc:'Cotizaciones sociales',other:'Tasas, ventas y otros',
        eu:'Recibido de la UE',euSub:'llega al Estado, no a las CCAA',
        map:'Atribuible a una comunidad autónoma',mapSub:'del total',mapNone:'sin datos locales aún',
        est:'Estado (AEAT)',aut:'Comunidades Autónomas',loc:'Local',tas:'Tasas y multas'},
  rv:{total:'TODO lo recaudado',st:'Total Estado (AEAT)',irpf:'IRPF · Renta',is:'Sociedades',
      iva:'IVA',iiee:'Impuestos especiales',otrosE:'Otros estatales',tasasE:'Tasas estatales',
      rg:'ITP, sucesiones, patrimonio, juego',lt:'Impuestos municipales',
      ibi:'IBI · Bienes inmuebles',lf:'Tasas y multas locales',eu:'Fondos europeos recibidos'},
  grp:{TOTAL:'CONJUNTO','ESTADO · AEAT':'ESTADO · AEAT','AUTONÓMICO':'COMUNIDADES AUTÓNOMAS',
       LOCAL:'LOCAL','UNIÓN EUROPEA':'UNIÓN EUROPEA'},
  ssGap:'FALTA · COTIZACIONES SOCIALES',
  ssGapT:'Las cotizaciones a la Seguridad Social (unos 210.000 M€ al año, la mayor fuente de ingresos públicos) NO se publican por comunidad autónoma. La TGSS solo da cifras nacionales. Por eso no están en este total. Añadirlas exigiría estimarlas a partir de afiliación y bases medias, y eso sería un cálculo nuestro, no un dato oficial.',
  partial:'DATOS PARCIALES',
  partialT:'Para este ejercicio falta algún componente. Cobertura: Estado 2007-2025, comunidades autónomas 2012-2024, local 2019-2023, fondos UE 2012-2022. El total solo está completo entre 2019 y 2022.',
  euLbl:'Fondos europeos',
  euWhoT:'¿A quién paga la UE?',
  euWho:'La Comisión Europea paga al <b>Estado miembro</b>, no a las comunidades autónomas. El dinero entra en el circuito presupuestario español y después se reparte a los organismos gestores, que a veces son autonómicos. Por eso los fondos europeos son una cifra nacional aquí y no una capa del mapa.',
  sExp:{tot:'Gasto total AAPP',soc:'Protección social',hea:'Sanidad',edu:'Educación',reg:'Gasto autonómico',def:'Déficit'},
  lensNat:'Los ingresos públicos totales son {T}. De esa cifra, {M} se puede atribuir a una comunidad autónoma concreta — es lo único que muestra el mapa. El resto (cotizaciones sociales, fondos europeos, ingresos del Estado) no se publica por comunidad autónoma.',
  lensRev:'Estás viendo <b>la recaudación del Estado vía AEAT</b> — no el total de ingresos públicos.',
  lensExp:'Estás viendo <b>el gasto total de las AAPP</b> a nivel nacional; el mapa muestra lo que <b>el gobierno autonómico y los ayuntamientos</b> gastan en cada comunidad autónoma.',
  why:'¿Por qué no cuadra?',close:'Cerrar',
  bridgeRevT:'De dónde sale cada euro público',
  bridgeRevL:'Desglose completo de los ingresos públicos del ejercicio, y qué parte se puede repartir por comunidad autónoma. Fuente: Eurostat (contabilidad nacional, SEC 2010) para el total; AEAT, IGAE, CONPREL y las haciendas forales del País Vasco y Navarra para el reparto por comunidades autónomas.',
  brn:{taxes:['Impuestos','IRPF, IVA, Sociedades, especiales, ITP, IBI y todos los demás'],
       social:['Cotizaciones sociales','Seguridad Social — la mayor fuente individual. No se publica por comunidad autónoma'],
       sales:['Tasas, precios y ventas','lo que cobran las administraciones por servicios'],
       property:['Rentas de la propiedad','intereses, dividendos y alquileres públicos'],
       transfers:['Transferencias recibidas','incluye los fondos europeos'],
       total:['INGRESOS PÚBLICOS TOTALES',''],
       mapped:['Atribuible a una comunidad autónoma','impuestos estatales, autonómicos y locales — lo que ves en el mapa'],
       unmapped:['No atribuible a una comunidad autónoma','cotizaciones sociales, fondos UE e ingresos del Estado sin reparto por comunidades autónomas']},
  bridgeExpT:'De 725,0 MM€ a lo que ves en el mapa',
  bridgeExpL:'El gasto público se reparte entre cuatro niveles de administración. El mapa muestra únicamente el nivel autonómico, que es quien gestiona la sanidad y la educación. Datos de 2024, sin consolidar entre niveles.',
  br:{aeat:['Recaudación estatal AEAT','caja, comunidades de régimen común — lo que muestra el mapa'],
      notaeat:['Impuestos que no recauda la AEAT','forales (País Vasco, Navarra) + autonómicos (ITP, sucesiones) + locales (IBI, vehículos)'],
      alltax:['Todos los ingresos tributarios',''],
      socsec:['Cotizaciones sociales','las recauda la Seguridad Social, no la AEAT'],
      taxsoc:['Impuestos + cotizaciones',''],
      nontax:['Ingresos no tributarios','tasas, ventas, multas, rentas de la propiedad, fondos europeos'],
      ggtotal:['INGRESOS TOTALES DE LAS AAPP','']},
  tiers:{S1311:['Administración central','Estado, ministerios, organismos'],
         S1312:['Comunidades Autónomas','sanidad y educación — lo que muestra el mapa'],
         S1313:['Administración local','ayuntamientos y diputaciones'],
         S1314:['Seguridad Social','pensiones y prestaciones'],
         TSUM:['Suma de los cuatro niveles','⚠ NO es el gasto público — cuenta dos veces las transferencias'],
         ELIM:['Transferencias entre niveles','dinero que el Estado da a las CCAA y estas vuelven a gastar'],
         S13:['GASTO PÚBLICO TOTAL (CONSOLIDADO)','la cifra correcta — Eurostat S13']},
  popY:'Población · 1 ene {Y}',gdpY:'PIB de la comunidad autónoma · {Y}',
  perCap:'per cápita',pop:'Población',gdpL:'PIB de la comunidad autónoma',shr:'Cuota nacional',
  rank:'Puesto',compo:'Composición',compoEcon:'¿En qué se gasta?',hint:'Selecciona una comunidad autónoma en el mapa',
  advF:'RÉGIMEN FORAL',
  advFt:'Esta comunidad autónoma recauda sus propios impuestos bajo el Concierto o el Convenio Económico. Las cifras son las que publica su propia hacienda — las Diputaciones Forales y la Hacienda Foral de Navarra —, no el residuo que la AEAT recauda allí.',
  advFn:'Esta comunidad autónoma recauda sus propios impuestos bajo el Concierto o el Convenio Económico, y su hacienda foral no publica el desglose de este año. Sin esa cifra no hay dato: se deja en blanco en lugar de poner en su lugar el residuo que recauda la AEAT.',
  advFd:'Esta comunidad autónoma recauda sus propios impuestos bajo el Concierto o el Convenio Económico. La memoria de su hacienda para este año no está publicada en línea, así que las cifras se toman de la serie del Ministerio de Hacienda que recopila esa misma recaudación (Recaudación y Estadísticas del Sistema Tributario Español), que coincide con la memoria de la Hacienda Foral de Navarra con un margen de 2 M€ en cada línea en todos los años que ambas publican.',
  advN:'ADVERTENCIA · VALOR NEGATIVO',
  advNt:'Las devoluciones superaron la recaudación bruta del Estado en esta comunidad autónoma durante el ejercicio.',
  advNoReg:'CIUDAD AUTÓNOMA · SIN GOBIERNO AUTONÓMICO',
  advNoRegt:'Ceuta y Melilla son ciudades autónomas, no comunidades autónomas. La cifra es el presupuesto de la propia ciudad, contabilizado en la administración local; un filtro por función no muestra nada para ellas porque el nivel autonómico que dibuja no existe aquí.',
  advScope:'ÁMBITO · GOBIERNO AUTONÓMICO Y ENTIDADES LOCALES',
  advScopet:'Esta cifra es lo que gastan en este territorio el gobierno autonómico y las entidades locales. No incluye lo que el Estado y la Seguridad Social gastan aquí — las pensiones, por ejemplo, no aparecen — porque ninguno de los dos se publica por comunidad autónoma.'
};

/** The shape every locale dictionary must have, derived from the es table. */
export type Dict = typeof es;
