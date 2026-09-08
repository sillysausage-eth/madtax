// Ported verbatim from prototype/console.tpl.html — the `const T` table.
// Faithful extraction, not a paraphrase: every key and every string is the
// prototype's. The prototype remains the reference implementation; if a string
// changes there it must be re-ported here, never edited in one place only.

import type { Dict } from "./es";

export const en = {
  ctrl:'CONTROL',metric:'METRIC',lo:'LOW',hi:'HIGH',dos:'DOSSIER',
  modeRev:'Revenue',modeExp:'Spending',modeDebt:'Debt',
  footRev1:'Source: AEAT via ISTAC · IGAE · CONPREL · OCTE · Hacienda Foral de Navarra · Ministerio de Hacienda (DGT) · Eurostat',
  footExp1:'Source: IGAE · Eurostat · INE',
  footExp2:'Consolidated general government expenditure (ESA 2010)',
  foot3:'MadTax',
  dbt:{
    foot1:'Source: Eurostat — Excessive Deficit Procedure (gov_10dd_edpt1, gov_10a_main)',
    foot2:'Consolidated gross debt at face value · a stock outstanding, not an annual flow',
    heroK:'Total public debt',
    ofGdp:'of GDP',
    asOf:'All government · end of {Y}',
    sInt:'Interest paid',            sIntN:'in {Y}',
    sLife:'Average life',            sLifeN:'State debt',
    // The two axes the trend chart is read off, named once each on the chart.
    unitBn:'€bn',                     unitPc:'% GDP',
    sYears:'years',
    noPub:'No published figure',
    trendK:'Debt over time',
    trendSrc:'Eurostat',
    // Said to a screen reader, and to anyone who tabs to the chart.
    trendNav:'Use the left and right arrow keys to read a year.',
    secShape:'Breakdown',
    // The three questions the block answers, one at a time. Short, because they
    // are tab labels: the strip is the heading, so no view repeats its own title.
    tForm:'What form',
    tHold:'Who holds it',
    tMat:'When it’s due',
    qFormS:'By type of instrument, as issued',
    qHoldS:'Holders of the outstanding stock',
    qMat:'Amount falling due each year, at face value',
    instr:{GD_F32:'Long-term securities',GD_F31:'Short-term securities',
           GD_F42:'Long-term loans',GD_F41:'Short-term loans',
           GD_F2:'Currency and deposits'},
    matNote:'State debt securities only: it excludes the debt of the Autonomous Regions, '+
      'local councils and social security, and the State’s own loans and foreign-currency '+
      'debt. The first year is partial — it holds only what is left to mature from the '+
      'reference date.',
    scopeState:'State debt',
    scopeGG:'All government',
    gapTag:'Not published',
    // A question the bundle cannot answer is still asked, and the gap named in
    // place of the chart. Nothing here is estimated or interpolated.
    gapHold:'The holder split is not in this bundle yet. It is not estimated: once the official '+
      'source is wired in it will appear here with its own reference date and perimeter.',
    gapMat:'The redemption calendar is not in this bundle yet. It is not interpolated.'
  },
  taxLbl:'TAX HEAD',fnLbl:'SPENDING FUNCTION',
  mapRev:'TACTICAL MAP · COLLECTION',mapExp:'TACTICAL MAP · SPENDING',
  roRev:'AEAT · NET COLLECTION',roExp:'IGAE + EUROSTAT · ESA 2010',
  unal:(v: string) =>'UNALLOCATED '+v,noreg:'◇ NOT AN AUTONOMOUS REGION',
  m:{total:'Absolute total',pc:'Per resident',gdp:'% of Autonomous Region GDP'},
  tx:{TOTAL:'All tax heads',IRPF:'Personal income',IS:'Corporate income',IVA:'VAT',IIEE:'Excise duties',OTROS:'Other taxes',TASAS:'Fees'},
  fnAll:'All functions',
  fam:{social:'Social contributions',income:'Taxes on income',
       consume:'Taxes on consumption, production and property',
       nontax:'Non-tax revenue',capital:'Taxes on capital'},
  expSub:'consolidated general government spending · COFOG',
  fOfTotal:'% of total',fRank:'Rank',fPerCap:'Per resident',
  fOnMap:'On the map {P}',fOffMap:'Not split by Autonomous Region',fYear:'Year',fClose:'Close',
  rvTotal:'ALL revenue', rvTotalK:'TOTAL PUBLIC REVENUE', rvTotalSub:'all government · ESA 2010', rvPending:'per-tax detail not yet published',
  compTtl:'WHERE EVERY EURO COMES FROM',
  compNote:'The parts sum exactly to the total and none overlaps another. Click any one to see what it is — it does not filter the map. Source: national accounts (ESA 2010), Eurostat; split by Autonomous Region from AEAT, IGAE, CONPREL and the foral treasuries.',
  regWhat:'TAXES COLLECTED HERE ·',
  regNone:'No Autonomous Region figure for:',
  restWhat:'WHAT IS ACTUALLY IN HERE',
  pendProd:['Consumption and production taxes','2025 detail pending: Eurostat publishes the per-tax split about a year after the aggregate'],
  pendInc:['Income taxes','2025 detail pending: Eurostat publishes the per-tax split about a year after the aggregate'],
  whoH:'WHO GENERATES THIS REVENUE?',
  whoPendingH:'NOT YET PUBLISHED',whoPendingBeforeH:'NOT PUBLISHED FOR THIS YEAR',
  whoPendingDue:'AEAT has not published this breakdown for {Y}. The latest edition covers {L}; the next is due in {D}, and this block will show it as soon as it is out.',
  whoPendingNoDate:'AEAT has not published this breakdown for {Y}. The latest edition covers {L}; this block will show the next one as soon as it is out.',
  whoPendingBefore:'This breakdown is published from {F} onwards. There is none for {Y}.',
  wScaleIntro:'<b>The 2023 IRPF scale.</b> These are the bands the tax is actually calculated on. They apply to the <b>taxable base</b> — what is left of income after the personal allowance and reductions — not to gross salary.',
  wScaleGeneral:'General scale · earned income and business',
  wScaleSavings:'Savings scale · interest, dividends, capital gains',
  wStateHalf:'state',
  wScaleWhy:'Only the state half is shown. Each Autonomous Region approves its own scale on top of this one, so the real marginal rate depends on where you live. And these are <b>marginal</b> rates: nobody pays 24.5% on all their income, only on the part above €300,000. That is why AEAT does not — and could not — publish a headcount "inside" each band: everyone passes through the lower ones.',
  wDistH:'How many people, and how much they pay.',
  wDistIntro:'AEAT does publish the distribution of taxpayers by annual income, but using its own intervals, which do not match the legal scale. It is the closest thing that exists to "who pays income tax".',
  tabTop:'Top 10%',
  wGroupCol:'Group',
  wTop10_1:'10% → 1%',wTop1_01:'1% → 0.1%',
  wTop01_001:'0.1% → 0.01%',wTop001:'Top 0.01%',
  tabDec:'Deciles',tabQui:'Quintiles',
  wPosLow:'the lowest-earning {P}%',wPosHigh:'the highest-earning {P}%',wPosMid:'position {A}–{B}%',
  wMadIntro:'<b>The scale actually applied in Madrid.</b> The state sets one half and the Comunidad de Madrid the other; the marginal rate you pay is the sum. Madrid has the lowest Autonomous Region scale in Spain.',
  wMadBand:'Taxable base',wMadState:'State',wMadRegion:'Madrid',wMadTotal:'Total marginal',
  wMadPeople:'People reaching it',wMadPct:'% reaching it',
  wMadCaveat:'<b>The last two columns are an estimate</b> — the only one in MadTax. AEAT does not publish how many taxpayers sit in each band of the scale, so it is interpolated from the decile distribution. The scale also applies to <b>taxable base</b> while the distribution is <b>gross income</b>: different measures, so read it as an order of magnitude, not an official figure. The rates themselves are exact.',
  wPeoplePct:'% of people',wAvgTax:'Average per person',wNegZero:'Negative or zero income',
  wTotalRow:'Total',
  wGap:'Bands are annual income (earnings and imputations) and add up to <b>{R}</b>, the tax settled on filed income tax returns. The headline figure is <b>{H}</b> because national accounts also include income tax in the Basque Country and Navarre, which run their own, and tax withheld from people not required to file. Difference: <b>{G}</b>.',
  wPeople:'People',wIncome:'Income',wTax:'Tax',
  wRate:'Average rate',wShare:'% of the tax',wAll:'Total',
  wBandRange:'Annual income',wUpToV:'Up to {V}',wOverV:'Over {V}',wThreshold:'From',
  tabCoBr:'Brackets',tabCoTop:'Largest',
  wTurnover:'Annual turnover',wCompanies:'Companies',wProfit:'Profit',wRateProfit:'Rate on profit',
  wGapCorp:'Brackets are the annual turnover of the company or tax group, and the tax is the net liability settled on the year\'s corporate tax returns: <b>{R}</b>. The headline figure is <b>{H}</b> because national accounts record the tax accrued in the year for the whole of Spain, the Basque Country and Navarre included, rather than the liability settled on filed returns. Difference: <b>{G}</b>.',
  wSec:{ind:'Industry, energy and agriculture',con:'Construction and real estate',
    com:'Trade and communications',fin:'Finance and business services',
    srv:'Social, personal and leisure services'},
  wCorpTurn:'Turnover is net revenue: what the company or group billed for goods and services in the year, before any costs are taken off. It is not profit — the profit column beside it is the sum of positive accounting results.',
  wCorpPub:'AEAT publishes this distribution by turnover bracket only: no ranking by profit and no company names. A group filing a consolidated return counts once, as a group; a company outside a group counts once. The top bracket is the {N} companies and groups with turnover above €1bn.',
  wCorpPubTop:'Each bracket above €100m is opened up by the five sectors AEAT crosses it with — the finest cut it publishes inside a bracket, and the closest there is to naming the {N} filers above €1bn. AEAT publishes no ranking by profit and no company names.',
  wCorpSE:'A dash is a figure AEAT withholds under statistical secrecy: too few filers in that sector and bracket to publish it without identifying them. It is left blank rather than filled in.',
  wPayer:'Who pays',wAmount:'Amount',
  wEmployer:'Employers',wEmployee:'Employees',
  wSelf:'Self-employed',wNonEmp:'Non-employed (special agreements)',wVoluntary:'Voluntary contributions',wImputed:'Imputed (public sector)',
  sales:{
    offmap:'Of this component, the map splits by Autonomous Region only what councils charge and the fee line AEAT collects in each territory. The rest — mostly what regional governments and State agencies charge — is published without that split and sits here.'
  },
  bdCol:'Item',bdColExp:'Sub-function',
  wProduct:'Product',wVatRate:'VAT rate',
  wAeatTot:'TOTAL ACCRUED · AEAT',
  provB:'(p)',
  provAeat:'Provisional — AEAT\'s latest edition marks this year (p); the figures are revised in the following report.',
  provEu:'Provisional — Eurostat flags this year provisional (status p); the figures are revised in the following edition.',
  wGapExcise:'AEAT figures, accrued state basis: <b>{A}</b>. The headline says <b>{H}</b> because national accounts also count the excise collected by the Basque and Navarrese foral treasuries, plus other consumption taxes. Difference: <b>{G}</b>.',
  wGapVat:'The split by rate is published for the <b>general regime</b> only ({A}). Outside it sit the special regimes ({SP}), the adjustment for the foral Autonomous Regions ({F}) and other adjustments ({O}), which bring total accrued VAT to <b>{T}</b>. The headline says <b>{H}</b>, on a national-accounts basis.',
  osSoc:'Social Security · pensions and benefits',
  osCentral:'Central government · defence, debt, foreign affairs',
  osLocal:'Councils and provincial authorities',
  osAdj:'Transfers between tiers (eliminated)',
  osSocD:'What Social Security spends directly: retirement, survivor, disability and unemployment payments. Not published split by Autonomous Region.',
  osCentralD:'Spending by the State and its agencies. Includes what has no Autonomous Region split by nature: defence, debt interest, foreign affairs and central administration.',
  osLocalD:'Spending by town councils and provincial authorities. It can be placed on the map, but it is recorded in the local subsector rather than the Autonomous Region subsector the map shows.',
  osAdjD:'Money one tier of government transfers to another. It appears twice if you add the tiers up, so national accounts eliminate it. Almost all of it is State to Autonomous Regions.',
  omNoTerr:'published only as a national figure',
  omNat:'National total',
  omWhy:'WHY IS THIS NOT ON THE MAP?',
  noFigWhy:'NO PUBLISHED FIGURE',
  omSocD:'Contributions are collected by the Social Security Treasury, which publishes national figures only. There is no official figure per Autonomous Region.',
  omEuD:'The European Commission pays the Member State, not the Autonomous Regions. Money enters the Spanish budget and is then distributed to managing authorities, some of them Autonomous Region bodies. Data exists on which Autonomous Region the money was spent in, but that is not the same as who was paid.',
  omRestD:'Includes central government property income, non-EU transfers, customs duties, and the difference between cash basis (administrative data) and accrual (national accounts). Collection by the Basque and Navarrese foral treasuries is no longer in here: it is on the map, in their own Autonomous Regions.',
  omSoc:'Social Security · not split by Autonomous Region',
  omEu:'European Union · paid to the State',
  omRest:'Rest not split by Autonomous Region',
  // Short forms for the coins beside the map. The map has room for a name, not
  // for a sentence; the sentence is in the dossier the coin opens.
  coinSoc:'Social Security',
  coinEu:'EU Funding',
  coinRest:'Other revenues',
  // ---- M5: the component filter and the Spanish-state coin ----------------
  // Added for the unified revenue interaction; not in the prototype, which has
  // neither a filter control nor a single off-map coin.
  fltOn:'FILTER',
  // The coin is named for the tier that keeps the money, as the spending rail
  // names its coins. What sits inside it is still disclosed in the dossier.
  shieldTitle:'Central government',
  shieldName:'Central government',
  shieldH:'WHAT IS INSIDE THIS FIGURE',
  shieldMix:'This figure groups money collected or received by different bodies: the contributions taken in by the Social Security Treasury, the funds the European Commission pays to the State, and collection that AEAT and other administrations publish only as a national figure. They appear together because none of them is published by Autonomous Region, not because they share a collector.',
  shieldShort:'The part of {N} that no published source assigns to an Autonomous Region: it is collected or received centrally and published only as a national figure.',
  noSplitShort:'No source publishes {N} by Autonomous Region, so the whole figure is unattributed and each Autonomous Region is drawn as no data, not as zero.',
  // The two tiers the figure is split between. Not a statement about the map:
  // it is the published split between the communities and the centre.
  tierAut:'Autonomous Regions',
  // Used only where a region is selected, so the national split underneath a
  // regional headline cannot be read as that region's own.
  regNoFig:'No figure is published for this Autonomous Region for this component.',
  // The same, for spending's four coins.
  coinOsSoc:'Social Security',
  coinOsCentral:'Central government',
  coinOsLocal:'Councils',
  coinOsAdj:'Between tiers',
  // ---- M6: the COFOG filter and its panel ---------------------------------
  // The spending console now works exactly as the revenue one does: the legend
  // beside the ring is a grid of pressable coins, and pressing one filters the
  // map and fills the panel. The prototype has neither control, so none of these
  // strings is ported — they are new, and stated in both locales.
  expNoSplit:'No Autonomous Region spends on this function: all of it is recorded outside the Autonomous Region '+
    'subsector the map draws. Each Autonomous Region is shown as no data rather than as zero, because a zero here '+
    'would not measure that Autonomous Region\'s spending — it is the absence of the function from its tier of government.',
  expRegNoFig:'No figure is published for this Autonomous Region for this function.',
  expSubsSrc:'Official COFOG code breakdown · Eurostat (gov_10a_exp). The parts sum exactly to the figure above.',
  // ---- M7: the map of territories -----------------------------------------
  // The map carries what is spent in each Autonomous Region by the two tiers
  // that have a territory; one State coin holds the rest. New strings, both
  // locales; nothing here is in the prototype.
  tierReg:'Regional government',
  locNetNote:'Councils, provincial and island authorities spent {N} here (budget basis, obligations recognised, CONPREL). '+
    'The map carries {M}: the same figure less {G} transferred to other tiers of government and {C} received from the regional government, '+
    'both of which are already inside the regional figure above and would otherwise count twice.',
  fnCol:'Function',
  areaCol:'Programme area',
  econCol:'Kind of spending',
  srcRegFn:'Regional government · IGAE, COFOG functional classification. The rows sum exactly to the regional figure.',
  srcLocArea:'Councils, provincial and island authorities · CONPREL definitive liquidation, obligations recognised, by programme area (Orden EHA/3565/2008), financial chapters excluded.',
  srcRegEcon:'Regional government · IGAE, by ESA economic transaction.',
  locNetWhy:'WHY DOES THE MAP CARRY LESS?',
  expFnTiers:'Of the {N} spent on this function, {A} is spent by the regional governments and is on the map. The remaining {S} is in the State coin: '+
    'central government {C}, councils {L} and Social Security {SS}, less {E} of transfers between tiers that national accounts eliminate. '+
    'Councils classify their spending by programme area, not by COFOG function, so their part has no published split by Autonomous Region.',
  coinLocRest:'Councils · not on the map',
  locRestD:'The national-accounts local tier ({T}) less what the map carries for councils ({M}). It is the difference of basis and perimeter '+
    'between national accounts and the councils\' own liquidations, plus the transfers netted out of the local layer so that no euro is on the map twice.',
  stateMixExp:'This figure groups money spent by different bodies: what the State and its agencies spend, what Social Security pays out in pensions '+
    'and benefits, the part of local government spending the territorial layer does not reach, less the transfers between tiers that national '+
    'accounts eliminate. They appear together because none of them is published by Autonomous Region, not because they share a spender.',
  expFnLocal:'For one function the map draws the regional government tier only. Councils classify their spending by programme area, not by COFOG '+
    'function, so their part of this function has no published split by Autonomous Region and sits in the State coin, stated in the tier bars above.',
  advNoLocal:'COUNCILS · NO PUBLISHED FIGURE',
  advNoLocalt:'CONPREL publishes a table for this territory\'s local entities this year that is zero on every line. That is an absent figure, not '+
    'councils that spent nothing: the councils\' part is carried as absent and sits in the State coin\'s remainder, and the figure here is the '+
    'regional government only.',
  pt:{
    social:['Social contributions','Employer and employee payments into Social Security'],
    irpf:['Personal income tax','Wages, pensions, self-employment and savings income'],
    vat:['VAT','Value added tax on consumption'],
    corp:['Corporate income tax','Company profits'],
    sales:['Fees, charges and sales','Not a tax: it is paid in exchange for a specific service or permit — tuition, co-payments, refuse, water, licences, admissions. It also covers what public bodies sell at market prices and their output for their own use, which is not cash collected.'],
    excise:['Excise duties','Fuel, tobacco, alcohol, electricity and coal'],
    eu:['European funds','Transfers received: cohesion, farm support and Next Generation'],
    otherProd:['Transfer, insurance, gambling and registration taxes','Property transfer tax and documented legal acts (stamp duty)'],
    propInc:['Property income','Interest, dividends from public companies and rents'],
    propTax:['Property tax (IBI)','Municipal, on the value of land and buildings'],
    otherProdTax:['Business rates and other production taxes','Business activity tax, environmental levies and other charges on production'],
    otherTransfer:['Other transfers received','Current and capital, from sources other than the EU'],
    inherit:['Inheritance and gift tax','Inheritances, gifts and other capital levies'],
    otherCurr:['Wealth, vehicle and other current taxes','Wealth held by individuals, vehicles owned by households and other current levies'],
    customs:['Import duties','Customs duties at the border'],
    taxProdPending:['Consumption & production · pending','VAT, excise, property, transfer taxes — Eurostat has not yet published the 2025 split'],
    taxIncPending:['Income taxes · pending','Personal and corporate income tax — Eurostat has not yet published the 2025 split']
  },
  sRev:{nat:'TOTAL PUBLIC REVENUE',natSub:'all government · ESA 2010',
        tax:'Taxes',soc:'Social contributions',other:'Fees, sales and other',
        eu:'Received from the EU',euSub:'paid to the State, not to Autonomous Regions',
        map:'Attributable to an Autonomous Region',mapSub:'of total',mapNone:'local data not out yet',
        est:'State (AEAT)',aut:'Autonomous Regions',loc:'Local',tas:'Fees & fines'},
  rv:{total:'EVERYTHING raised',st:'State total (AEAT)',irpf:'Personal income',is:'Corporate income',
      iva:'VAT',iiee:'Excise duties',otrosE:'Other state taxes',tasasE:'State fees',
      rg:'Transfer, inheritance, wealth, gambling',lt:'Municipal taxes',
      ibi:'Property tax (IBI)',lf:'Local fees & fines',eu:'EU funds received'},
  grp:{TOTAL:'COMBINED','ESTADO · AEAT':'STATE · AEAT','AUTONÓMICO':'AUTONOMOUS REGIONS',
       LOCAL:'LOCAL','UNIÓN EUROPEA':'EUROPEAN UNION'},
  ssGap:'MISSING · SOCIAL CONTRIBUTIONS',
  ssGapT:'Social security contributions (around €210bn a year, the single largest source of public revenue) are NOT published by Autonomous Region. TGSS only reports national figures. That is why they are absent from this total. Adding them would mean estimating from affiliation and average contribution bases — our calculation, not an official figure.',
  partial:'PARTIAL DATA',
  partialT:'A component is missing for this year. Coverage: state 2007-2025, Autonomous Regions 2012-2024, local 2019-2023, EU funds 2012-2022. The total is only complete for 2019-2022.',
  euLbl:'EU funds',
  euWhoT:'Who does the EU pay?',
  euWho:'The European Commission pays the <b>Member State</b>, not the Autonomous Regions. The money enters the Spanish budget circuit and is then distributed to managing authorities, which are sometimes Autonomous Region bodies. That is why EU funds are a national figure here rather than a map layer.',
  sExp:{tot:'Total gov spending',soc:'Social protection',hea:'Health',edu:'Education',reg:'Autonomous Region spending',def:'Deficit'},
  lensNat:'Total public revenue is {T}. Of that, {M} can be attributed to a specific Autonomous Region — that is all the map shows. The rest (social contributions, EU funds, central government revenue) is not published by Autonomous Region.',
  lensRev:'You are looking at <b>state tax collected by AEAT</b> — not total public revenue.',
  lensExp:'You are looking at <b>total government spending</b> nationally; the map shows what the <b>regional government and councils</b> spend in each Autonomous Region.',
  why:"Why don't these add up?",close:'Close',
  bridgeRevT:'Where every public euro comes from',
  bridgeRevL:'Full breakdown of public revenue for the year, and how much of it can be split by Autonomous Region. Sources: Eurostat national accounts (ESA 2010) for the total; AEAT, IGAE, CONPREL and the Basque and Navarrese foral treasuries for the split by Autonomous Region.',
  brn:{taxes:['Taxes','income, VAT, corporate, excise, transfer, property and all the rest'],
       social:['Social contributions','Social Security — the largest single source. Not published by Autonomous Region'],
       sales:['Fees, charges and sales','what government charges for services'],
       property:['Property income','public interest, dividends and rents'],
       transfers:['Transfers received','includes European funds'],
       total:['TOTAL PUBLIC REVENUE',''],
       mapped:['Attributable to an Autonomous Region','state, Autonomous Region and local taxes — what the map shows'],
       unmapped:['Not attributable to an Autonomous Region','social contributions, EU funds and central revenue not split by Autonomous Region']},
  bridgeExpT:'From €725.0bn to what the map shows',
  bridgeExpL:'Public spending is split across four tiers of government. The map shows only the Autonomous Region tier, which is the one that runs hospitals and schools. 2024 figures, unconsolidated between tiers.',
  br:{aeat:['AEAT state collection','cash basis, non-foral Autonomous Regions — what the map shows'],
      notaeat:['Taxes AEAT does not collect','foral (Basque Country, Navarre) + Autonomous Region (transfer, inheritance) + local (property, vehicle)'],
      alltax:['All tax receipts',''],
      socsec:['Social contributions','collected by Social Security, not the tax agency'],
      taxsoc:['Taxes + social contributions',''],
      nontax:['Non-tax revenue','fees, sales, fines, property income, EU funds'],
      ggtotal:['TOTAL GENERAL GOVERNMENT REVENUE','']},
  tiers:{S1311:['Central government','the State, ministries, agencies'],
         S1312:['Autonomous Regions','health and education — what the map shows'],
         S1313:['Local government','councils and provincial authorities'],
         S1314:['Social security','pensions and benefits'],
         TSUM:['Sum of the four tiers','⚠ NOT public spending — counts transfers twice'],
         ELIM:['Transfers between tiers','money the State gives the Autonomous Regions, which they then spend again'],
         S13:['TOTAL PUBLIC SPENDING (CONSOLIDATED)','the correct figure — Eurostat S13']},
  perCap:'per resident',pop:'Population',gdpL:'Autonomous Region GDP',shr:'National share',
  popY:'Population · 1 Jan {Y}',gdpY:'Autonomous Region GDP · {Y}',
  rank:'Rank',compo:'Composition',compoEcon:'What it is spent on',hint:'Select an Autonomous Region on the map',
  advF:'FORAL REGIME',
  advFt:'This Autonomous Region collects its own taxes under the Concierto or the Convenio Económico. The figures are the ones its own treasury publishes — the Diputaciones Forales and the Hacienda Foral de Navarra — not the residue AEAT collects there.',
  advFn:'This Autonomous Region collects its own taxes under the Concierto or the Convenio Económico, and its foral treasury does not publish the breakdown for this year. Without that figure there is no figure: it is left blank rather than filled with the residue AEAT collects.',
  advFd:'This community collects its own taxes under the Concierto or the Convenio Económico. Its treasury\'s memoria for this year is not published online, so the figures are taken from the Ministry of Finance\'s compiled series of the same collection (Recaudación y Estadísticas del Sistema Tributario Español), which reproduces the Hacienda Foral de Navarra\'s memoria to within €2M on every line in every year both publish.',
  advN:'ADVISORY · NEGATIVE VALUE',
  advNt:'Refunds exceeded gross state collection in this Autonomous Region during the year.',
  advNoReg:'AUTONOMOUS CITY · NO REGIONAL GOVERNMENT',
  advNoRegt:'Ceuta and Melilla are autonomous cities, not Autonomous Regions. The figure is the city\'s own budget, recorded under local government; a function filter shows nothing for them because the regional tier it draws does not exist here.',
  advScope:'SCOPE · REGIONAL GOVERNMENT AND COUNCILS',
  advScopet:'This is what the regional government and the local entities spend in this territory. It excludes what the State and Social Security spend here — pensions, for example, do not appear — because neither is published by Autonomous Region.'
} satisfies Dict;
