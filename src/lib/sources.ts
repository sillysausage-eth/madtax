/**
 * Where the footer's source names point.
 *
 * The footer captions name their sources in prose ("Fuente: AEAT vía ISTAC ·
 * Eurostat · INE"), and the names are the same words in both locales — they are
 * institutions and Eurostat dataset codes, not translatable text. So the links
 * live here, once, keyed by the name as it appears in the caption, instead of
 * being duplicated into every string in every language.
 *
 * Each URL is the published landing page for the series the pipeline actually
 * reads; they are the same pages `docs/02-data-sources.md` records.
 */
export const SOURCE_LINKS: Record<string, string> = {
  AEAT: "https://sede.agenciatributaria.gob.es/Sede/datosabiertos/catalogo/hacienda/Informes_anuales_de_Recaudacion_Tributaria.shtml",
  ISTAC: "https://www.gobiernodecanarias.org/istac/estadisticas/",
  /* The two treasuries that collect in the foral territories. AEAT's series
     carries only the residual it still collects there, so these are the sources
     the Basque and Navarrese figures on the map actually come from. */
  OCTE: "https://www.euskadi.eus/recaudacion/web01-s2oga/es/",
  "Hacienda Foral de Navarra":
    "https://www.navarra.es/es/web/memoria-2024/2.4-recaudacion-liquida",
  IGAE: "https://www.igae.pap.hacienda.gob.es/sitios/igae/es-ES/Contabilidad/ContabilidadPublica/CPE/EjecucionPresupuestaria/",
  INE: "https://www.ine.es/",
  Eurostat:
    "https://ec.europa.eu/eurostat/web/government-finance-statistics/database",
  gov_10a_main:
    "https://ec.europa.eu/eurostat/databrowser/view/gov_10a_main/default/table?lang=en",
  gov_10a_taxag:
    "https://ec.europa.eu/eurostat/databrowser/view/gov_10a_taxag/default/table?lang=en",
  gov_10a_exp:
    "https://ec.europa.eu/eurostat/databrowser/view/gov_10a_exp/default/table?lang=en",
  gov_10dd_edpt1:
    "https://ec.europa.eu/eurostat/databrowser/view/gov_10dd_edpt1/default/table?lang=en",
};

/** A run of caption text, linked when it names a source. */
export type SourceSegment = { text: string; href?: string };

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/**
 * Split a footer caption into plain runs and linked source names.
 *
 * Matching is whole-word and case-sensitive: the captions spell the names
 * exactly as this table keys them, and a looser match would linkify prose that
 * merely mentions a word. `overrides` lets a mode point a shared name at its own
 * series — "Eurostat" under spending means the COFOG table, not the database
 * root.
 */
export function splitSources(
  caption: string,
  overrides?: Record<string, string>,
): SourceSegment[] {
  const links = overrides ? { ...SOURCE_LINKS, ...overrides } : SOURCE_LINKS;
  const names = Object.keys(links).sort((a, b) => b.length - a.length);
  const re = new RegExp(`\\b(${names.map(escape).join("|")})\\b`, "g");

  const out: SourceSegment[] = [];
  let cut = 0;
  for (const m of caption.matchAll(re)) {
    if (m.index > cut) out.push({ text: caption.slice(cut, m.index) });
    out.push({ text: m[0], href: links[m[0]] });
    cut = m.index + m[0].length;
  }
  if (cut < caption.length) out.push({ text: caption.slice(cut) });
  return out;
}
