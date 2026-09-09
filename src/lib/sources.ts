import type { Mode } from "@/lib/modes";

/**
 * Every published dataset the site's figures are read from, per screen.
 *
 * The footer used to name its sources in one line of prose ("Fuente: AEAT vía
 * ISTAC · IGAE · CONPREL · …") with the institution names linkified by a regex.
 * That line said who published something, never what, and a reader could not
 * tell which of seven names carried the figure in front of them. This is the
 * same claim made as a list: one row per publisher, one link per dataset, and
 * the publisher's own code for the series where it has one, so a reader can go
 * and read the number for themselves.
 *
 * The lists are per screen and exhaustive for that screen — the debt footer does
 * not name AEAT, which contributes nothing to it, and the revenue footer does not
 * name the Tesoro. `overview` is the exception: the home screen stands for the
 * site, so it carries the union of all three.
 *
 * Only sources a rendered figure comes from are here. The pipeline also reads
 * AEAT's IRPF declarant table and its table 8.5 to tie the decile series and the
 * turnover brackets out against, and neither is drawn; `docs/02-data-sources.md`
 * and `pipeline/spain/README.md` carry those.
 *
 * Every `href` is the page the publisher puts the data on, not the file the
 * pipeline fetches — a footer link should open something a reader can read.
 * All of them were confirmed 200 by hand on 2026-09-09.
 */
export type Source = {
  /** Key into the locale dictionary's `srcLab` table: what the dataset is. */
  id: string;
  /** The published landing page. */
  href: string;
  /** The publisher's own identifier for the series, printed after the label. */
  code?: string;
};

/** One publisher and the datasets a screen reads from it. */
export type SourceGroup = {
  /** Institution names are not translated; they are the same words in both. */
  pub: string;
  sources: Source[];
};

/** Eurostat publishes every dataset behind the same databrowser path. */
const eu = (id: string, code: string): Source => ({
  id,
  code,
  href: `https://ec.europa.eu/eurostat/databrowser/view/${code}/default/table?lang=en`,
});

const S = {
  euMain: eu("euMain", "gov_10a_main"),
  euTaxag: eu("euTaxag", "gov_10a_taxag"),
  euExp: eu("euExp", "gov_10a_exp"),
  euEdp: eu("euEdp", "gov_10dd_edpt1"),
  euGdp: eu("euGdp", "nama_10r_2gdp"),
  euPop: eu("euPop", "demo_r_pjanaggr3"),

  /* AEAT's territorial series is published by AEAT and redistributed with a
     usable API by the Canary statistics office, which is where the pipeline
     reads it; the label says so and the link goes where the data is. */
  aeatTerr: {
    id: "aeatTerr",
    href: "https://www3.gobiernodecanarias.org/istac/statistical-visualizer/visualizer/data.html?resourceType=dataset&agencyId=ISTAC&resourceId=E32001A_000003",
  },
  /* The excise-by-product and VAT-by-rate tables and the IRPF decile series are
     all annexes to this one report, so it is one entry, not three. */
  aeatIart: {
    id: "aeatIart",
    href: "https://sede.agenciatributaria.gob.es/Sede/datosabiertos/catalogo/hacienda/Informes_anuales_de_Recaudacion_Tributaria.shtml",
  },
  aeatIs: {
    id: "aeatIs",
    href: "https://sede.agenciatributaria.gob.es/Sede/datosabiertos/catalogo/hacienda/Cuentas_Anuales_Consolidadas_del_Impuesto_sobre_Sociedades.shtml",
  },

  /* Two different IGAE publications, and the pages that actually carry the
     annual per-community files the pipeline reads. */
  igaeReg: {
    id: "igaeReg",
    href: "https://www.igae.pap.hacienda.gob.es/sitios/igae/es-ES/Contabilidad/ContabilidadNacional/Publicaciones/Paginas/ianofinancierasCA.aspx",
  },
  igaeCofog: {
    id: "igaeCofog",
    href: "https://www.igae.pap.hacienda.gob.es/sitios/igae/es-ES/Contabilidad/ContabilidadNacional/Publicaciones/Paginas/iacofogCA.aspx",
  },

  conprel: {
    id: "conprel",
    href: "https://serviciostelematicosext.hacienda.gob.es/SGFAL/CONPREL",
  },

  /* The two treasuries that collect under the Concierto and the Convenio, and
     the Ministry series that reaches the three Navarrese years their own
     memorias do not publish. */
  octe: { id: "octe", href: "https://www.euskadi.eus/recaudacion/web01-s2oga/es/" },
  hfn: {
    id: "hfn",
    href: "https://www.navarra.es/es/web/memoria-2024/2.4-recaudacion-liquida",
  },
  dgt: {
    id: "dgt",
    href: "https://www.hacienda.gob.es/es-ES/Areas%20Tematicas/Impuestos/Direccion%20General%20de%20Tributos/Paginas/Estadisticas_Recaudacion.aspx",
  },

  /* The holder split, on the same consolidated EDP perimeter as the headline. */
  bde: {
    id: "bde",
    href: "https://www.bde.es/webbe/es/estadisticas/temas/administraciones-publicas.html",
  },

  /* Average life and average cost, and the securities the redemption ladder is
     rebuilt from — State debt only, which the maturity view says on its face. */
  tesoro: { id: "tesoro", href: "https://www.tesoro.es/deuda-publica/estadisticas-mensuales" },
  tesoroCirc: {
    id: "tesoroCirc",
    href: "https://www.tesoro.es/deuda-publica/valores-del-tesoro/valores-en-circulacion",
  },
} satisfies Record<string, Source>;

const EUROSTAT = "Eurostat";
const AEAT = "AEAT";
const IGAE = "IGAE";
const CONPREL = "CONPREL";
const OCTE = "OCTE";
const HFN = "Hacienda Foral de Navarra";
const DGT = "Ministerio de Hacienda (DGT)";
const BDE = "Banco de España";
const TESORO = "Tesoro Público";

/**
 * What each screen reads from. Publishers are ordered by how much of the screen
 * they carry, not alphabetically: the reader is looking for the source of the
 * big number first.
 */
export const MODE_SOURCES: Record<Mode, SourceGroup[]> = {
  /* The site's whole list. The home screen's own chart is the first entry of the
     first row; the rest is what the three consoles behind it are built from. */
  overview: [
    { pub: EUROSTAT, sources: [S.euMain, S.euTaxag, S.euExp, S.euEdp, S.euGdp, S.euPop] },
    { pub: AEAT, sources: [S.aeatTerr, S.aeatIart, S.aeatIs] },
    { pub: IGAE, sources: [S.igaeReg, S.igaeCofog] },
    { pub: CONPREL, sources: [S.conprel] },
    { pub: OCTE, sources: [S.octe] },
    { pub: HFN, sources: [S.hfn] },
    { pub: DGT, sources: [S.dgt] },
    { pub: BDE, sources: [S.bde] },
    { pub: TESORO, sources: [S.tesoro, S.tesoroCirc] },
  ],
  revenue: [
    { pub: EUROSTAT, sources: [S.euTaxag, S.euMain, S.euGdp, S.euPop] },
    { pub: AEAT, sources: [S.aeatTerr, S.aeatIart, S.aeatIs] },
    { pub: IGAE, sources: [S.igaeReg] },
    { pub: CONPREL, sources: [S.conprel] },
    { pub: OCTE, sources: [S.octe] },
    { pub: HFN, sources: [S.hfn] },
    { pub: DGT, sources: [S.dgt] },
  ],
  spending: [
    { pub: EUROSTAT, sources: [S.euExp, S.euMain, S.euGdp, S.euPop] },
    { pub: IGAE, sources: [S.igaeCofog] },
    { pub: CONPREL, sources: [S.conprel] },
  ],
  debt: [
    { pub: EUROSTAT, sources: [S.euEdp, S.euMain] },
    { pub: BDE, sources: [S.bde] },
    { pub: TESORO, sources: [S.tesoro, S.tesoroCirc] },
  ],
};
