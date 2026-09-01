import raw from "./generated/map.json";
import type { MapSection, RegionGeometry } from "@/lib/types";

/**
 * Map geometry only: the projected paths, the canvas box and the Canaries inset.
 * The 42.7KB of path data is the pipeline's, reused verbatim and never
 * re-projected here.
 *
 * It lives in its own section so every mode's map loads the same geometry chunk
 * while the numbers travel with the mode that renders them.
 */
export const mapSection = raw as unknown as MapSection;

export const { W, H, CB, regions } = mapSection;

/**
 * How far the canvas extends past the easternmost geography. It clears the
 * selection brackets and the sweep, both of which are drawn 7 units outside a
 * region's own bounding box.
 */
const INK_MARGIN = 10;

/**
 * The width the console actually draws in.
 *
 * The pipeline's `W` is the projection's canvas, and it leaves ~148 units of
 * empty sea east of Menorca — the map was as wide as its coordinate space rather
 * than as wide as its content. This is the same canvas cropped to the ink, which
 * is what lets the map pane be narrower on the page without anything on the map
 * being drawn smaller: the pane loses exactly the fraction the canvas loses, so
 * the scale between them is unchanged. `globals.css` carries the other half of
 * that pair and names the ratio.
 *
 * Derived, not typed in: if the projection ever changes, the crop follows it.
 */
export const CANVAS_W = Math.ceil(
  Math.max(...regions.map((r) => r.bbox[2])) + INK_MARGIN,
);

/**
 * The short form of each community's name, as Spanish usage writes it. The map
 * labels a territory with the name people call it by, not with its statistical
 * code — `ES30` identifies a row in a Eurostat table, `MAD` identifies a place.
 *
 * Keyed by the bundle's region id; the NUTS code is given for reference. The
 * abbreviations are the same in both languages: they are proper names, not
 * translations.
 */
export const REGION_ABBR: Record<string, string> = {
  "01": "AND", // ES61 · Andalucía
  "02": "ARA", // ES24 · Aragón
  "03": "AST", // ES12 · Asturias
  "04": "BAL", // ES53 · Illes Balears
  "05": "CAN", // ES70 · Canarias
  "06": "CNT", // ES13 · Cantabria
  "07": "CYL", // ES41 · Castilla y León
  "08": "CLM", // ES42 · Castilla-La Mancha
  "09": "CAT", // ES51 · Cataluña
  "10": "VAL", // ES52 · Comunitat Valenciana
  "11": "EXT", // ES43 · Extremadura
  "12": "GAL", // ES11 · Galicia
  "13": "MAD", // ES30 · Comunidad de Madrid
  "14": "MUR", // ES62 · Región de Murcia
  "15": "NAV", // ES22 · Navarra
  "16": "PV", //  ES21 · País Vasco
  "17": "RIO", // ES23 · La Rioja
  "18": "CEU", // ES63 · Ceuta
  "19": "MEL", // ES64 · Melilla
};

export const regionAbbr = (r: RegionGeometry): string => REGION_ABBR[r.id] ?? r.nuts;

/**
 * Every region is labelled, including the ones too small to hold a label inside
 * their own outline. Where the centroids crowd — the Cantabrian strip, the Ebro
 * valley, the two cities in Africa — the label is nudged clear of its neighbours
 * and set a size down, because a label that is hidden until you hover is a
 * figure the reader has to go looking for.
 *
 * Offsets are in map units (the viewBox is 1000 × 700), applied to the centroid.
 */
export const LABEL_NUDGE: Record<string, { dx: number; dy: number; tight?: boolean }> = {
  "03": { dx: -14, dy: -13, tight: true }, // Asturias — above the north coast
  "06": { dx: 6, dy: -21, tight: true }, //  Cantabria — clear of Asturias
  "16": { dx: 4, dy: -25, tight: true }, //  País Vasco — above the Basque coast
  "17": { dx: -30, dy: 15, tight: true }, // La Rioja — down-left, off Navarra
  "15": { dx: 34, dy: -6, tight: true }, //  Navarra — right, off La Rioja
  "18": { dx: -26, dy: 12, tight: true }, // Ceuta — beside its dot
  "19": { dx: 22, dy: 12, tight: true }, //  Melilla — beside its dot
  "04": { dx: 12, dy: 6 }, //                Illes Balears — off Mallorca's outline
};

export const labelNudge = (
  r: RegionGeometry,
): { dx: number; dy: number; tight: boolean } => {
  const n = LABEL_NUDGE[r.id];
  return { dx: n?.dx ?? 0, dy: n?.dy ?? 0, tight: n?.tight ?? false };
};
