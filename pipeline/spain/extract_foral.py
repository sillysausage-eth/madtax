#!/usr/bin/env python3
"""
extract_foral.py — the tax take of the Basque Country and Navarre, from the
treasuries that actually collect it.

WHY THIS EXISTS
---------------
Every other territorial figure in the bundle comes from AEAT's collection by
delegación (`extract.js`). Under the Concierto Económico and the Convenio
Económico, AEAT collects almost nothing in Álava, Bizkaia, Gipuzkoa and
Navarre — their own treasuries do. So the AEAT series carries a *residual* for
those two communities: 1,463 M€ of IRPF for the Basque Country in 2023 against
the 7,085 M€ its Diputaciones actually took in, and VAT that goes NEGATIVE
because refunds exceed collection once the Concierto adjustment is booked.

Publishing that residual as "the income tax raised in the Basque Country" is a
statement about who administers the tax, not about what was raised. This module
replaces it with the figure the collecting treasury publishes.

REPLACES, NOT ADDS
------------------
The foral figure supersedes the AEAT residual for these two regions; the two are
NOT summed. Both sides book the Concierto/Convenio adjustment flows — OCTE's VAT
line already contains the `Ajuste` settled with the State, and AEAT's negative
VAT in the same territory is the mirror of part of that same flow. Adding them
would double-count the adjustment with the wrong sign. The superseded AEAT
residual falls into the unattributed remainder, where `merge12.js` records it.

SOURCES
-------
Basque Country · Órgano de Coordinación Tributaria de Euskadi,
  "Recaudación de las Diputaciones Forales por tributos concertados", annual.
  https://www.euskadi.eus/recaudacion/web01-s2oga/es/
  One PDF per year, bilingual Basque/Spanish, thousands of euros, columns
  ARABA | BIZKAIA | GIPUZKOA | CAPV year | CAPV year-1 | %.
  The filenames are irregular and NOT derivable from the year (see OCTE_FILES);
  the listing page builds its links in JavaScript, so a new year has to be read
  off that page by hand. The PDFs are AES-encrypted — pypdf needs cryptography.

Navarre · Hacienda Foral de Navarra, Memoria anual, "Cuadro nº 15. Recaudación
  tributaria líquida. Detalle por figuras tributarias".
  https://www.navarra.es/es/web/memoria-{YEAR}/2.4-recaudacion-liquida
  An HTML table carrying the memoria's year AND the year before it, in thousands
  of euros. The cuadro's slug changes between years, so it is discovered from
  the §2.4 page by link text rather than guessed. Memorias 2016-2024 publish it,
  so this route reaches back to 2015 and no further.

Navarre 2012-2014 · Ministerio de Hacienda, Dirección General de Tributos,
  "Recaudación y Estadísticas del Sistema Tributario Español", Parte I series.
  https://www.hacienda.gob.es/es-ES/Areas%20Tematicas/Impuestos/Direccion%20General%20de%20Tributos/Paginas/Estadisticas_Recaudacion.aspx
  One .xlsm of annual series 1986-2023, € millions, cash basis, with the two
  foral treasuries' collection carried tax by tax under Administración "HF".
  It is the Ministry's compilation of the Haciendas Forales' own figures, not
  an independent measurement, and this file PROVES that before using it: for
  every year Navarre's memoria also covers, the series must reproduce the
  memoria bucket by bucket (see DGT_TOL) or the run fails. Only the years the
  memoria cannot reach are taken from it, and foral.json records which.

HOW THE BUCKETS ARE BUILT
-------------------------
The two tables changed shape repeatedly over the years — the excise block alone
is "Total II.EE.Fabricación" up to 2022 and "Total II.EE. sujetos a ajustes con
el Estado" after, with electricity moving in and out of it. Matching every line
label across fourteen years would fail silently the first time a label moved.

So the fine lines are read only where their labels are stable, and each of the
two big families is closed against ITS OWN published subtotal:

    otherProdTax = Total Impuestos Directos − irpf − corp − IRNR − patrimonio
                   − sucesiones                       (+ the D29-family indirects)
    excise       = Total Impuestos Indirectos − vat − otherProd
                   − the D29-family indirects

Everything therefore sums to the published "TOTAL TRIBUTOS CONCERTADOS" by
construction, and a line whose label moved lands in the remainder of its own
family instead of vanishing. `--check` asserts that identity per year and exits
non-zero if any year misses it; that is the guard that a changed source layout
trips. Run it before trusting a refreshed extraction.

Bucket names are the bundle's 17 `PARTS`, so `merge12.js` writes them straight
onto the region record.

Run:  python3 extract_foral.py            # -> foral.json
      python3 extract_foral.py --check    # tie-outs only, no write
"""

import html
import json
import os
import re
import sys
import unicodedata
import urllib.request

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "foral.json")
UA = {"User-Agent": "Mozilla/5.0 (compatible; Tax Truth pipeline)"}

# --------------------------------------------------------------- the sources --

OCTE_BASE = "https://www.euskadi.eus/contenidos/informacion/7119/es_2335/adjuntos/"

# Read off the listing page's DOM on 2026-09-03. The page renders its links in
# JavaScript, so curl on the page itself returns none of these — a new year has
# to be added here by hand after checking euskadi.eus/recaudacion.
OCTE_FILES = {
    "2012": "2012.pdf",
    "2013": "2013.pdf",
    "2014": "2014.pdf",
    "2015": "2015.pdf",
    "2016": "2016.pdf",
    "2017": "2017.pdf",
    "2018": "2018.pdf",
    "2019": "2019.pdf",
    "2020": "2020.pdf",
    "2021": "2021.pdf",
    "2022": "12_web_2022.pdf",
    "2023": "12_2023.pdf",
    "2024": "12_web_2024.pdf",
    "2025": "12-web-2025.pdf",
}

# Every memoria carries its own year and the one before it, so 2016..2024 of
# these cover 2015..2024. The 2016 memoria is the first published in this form;
# no earlier one exists on navarra.es (memoria-2015 and before return 404), so
# the years before 2015 come from the Ministry's series below, or not at all.
NAV_MEMORIA_YEARS = ["2016", "2017", "2018", "2019", "2020", "2021", "2022", "2023", "2024"]
NAV_INDEX = "https://www.navarra.es/es/web/memoria-{y}/2.4-recaudacion-liquida"


def fetch(url, binary=False):
    with urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=120) as r:
        d = r.read()
    return d if binary else d.decode("utf-8", "replace")


def squash(s):
    """Lowercase, strip accents and drop every non-alphanumeric character, so a
    label survives the PDF's stray spaces, soft hyphens and 'Total I R P F'."""
    s = unicodedata.normalize("NFKD", s)
    s = "".join(c for c in s if not unicodedata.combining(c))
    return re.sub(r"[^a-z0-9]", "", s.lower())


# ------------------------------------------------------------ Basque Country --

NUM = re.compile(r"\(?-?\d[\d.]*\)?")

# Squashed Spanish label fragments, in match order. `None` marks a line read only
# so it can be subtracted out of its family's remainder.
OCTE_LABELS = [
    ("irpf",       ["totalirpf"]),
    ("corp",       ["totalisociedades"]),
    ("irnr",       ["imptosrentanoresidentes"]),
    ("inherit",    ["imptossucesionesydonaciones"]),
    ("patrimonio", ["patrimonio"]),
    ("vat",        ["totaliva"]),
    ("itp",        ["stransmisionespatrimoniales"]),
    ("ajd",        ["sactosjuridicosdocumentados"]),
    ("transport",  ["determinadosmediosdetransporte"]),
    ("insurance",  ["sprimasdeseguros"]),
    ("gaming",     ["sactividadesdejuego"]),
    ("fgas",       ["totalimptosobregasesfluorados", "sgasesfluorados"]),
    ("ftt",        ["stransaccionesfinancieras"]),
    ("digital",    ["determinadosserviciosdigitales"]),
    ("landfill",   ["depositoderesiduosenvertederos"]),
    ("extinct",    ["impuestosextinguidos", "imptosextinguidos"]),
    ("T_direct",   ["totalimpuestosdirectos"]),
    ("T_indirect", ["totalimpuestosindirectos"]),
    ("T_fees",     ["totaltasasyotrosingresos"]),
    ("T_all",      ["totaltributosconcertados"]),
]


def octe_row(line):
    """The CAPV cell of a row, identified structurally rather than by position.

    A data row carries ARABA, BIZKAIA, GIPUZKOA and then the CAPV total, but the
    percentage column tokenises as "0 ,2" in the older files and the odd blank
    cell shifts everything left. So walk the numeric tokens and take the first
    one that the three before it add up to. The published columns are rounded
    independently, so allow the sum to be off by up to three thousand euros.
    """
    toks = []
    for m in NUM.finditer(line):
        t = m.group(0)
        neg = t.startswith("(")
        t = t.strip("()").replace(".", "")
        if not t or t == "-":
            continue
        try:
            v = int(t)
        except ValueError:
            continue
        toks.append(-v if neg else v)
    for i in range(3, len(toks)):
        a, b, g, capv = toks[i - 3], toks[i - 2], toks[i - 1], toks[i]
        if abs(a + b + g - capv) <= 3:
            return {"araba": a, "bizkaia": b, "gipuzkoa": g, "capv": capv}
    return None


def octe_year(pdf_bytes):
    from pypdf import PdfReader
    import io

    txt = PdfReader(io.BytesIO(pdf_bytes)).pages[0].extract_text() or ""
    # The 2022 file uses U+2010 HYPHEN and soft hyphens inside labels.
    txt = txt.replace("‐", "-").replace("‑", "-").replace("­", "")

    raw = {}
    for line in txt.split("\n"):
        line = re.sub(r"\s+", " ", line).strip()
        if not line:
            continue
        cell = octe_row(line)
        if cell is None:
            continue
        label = squash(NUM.sub(" ", line))
        for key, pats in OCTE_LABELS:
            if key in raw:
                continue
            if any(p in label for p in pats):
                raw[key] = cell["capv"]
                break
    return raw


# ------------------------------------------------------------------ Navarre --

# Squashed row labels of Cuadro nº 15. Navarre breaks its table down further than
# the Basque one, so most buckets are read directly and only the two "Resto"
# families rely on a remainder.
NAV_LABELS = [
    ("irpf",        ["totalirpf"]),
    ("premios",     ["gravamensobrepremiosyloterias"]),
    ("corp",        ["totalimpuestosociedades"]),
    ("irnr",        ["imptosrentanoresidentes"]),
    ("inherit",     ["imptosucesionesydonaciones"]),
    ("patrimonio",  ["impuestosobreelpatrimonio"]),
    ("vat_direct",  ["ivarecaudaciondirecta"]),
    ("vat_adj",     ["ajustefiscaliva"]),
    ("iiee_direct", ["totaliieerecaudaciondirecta"]),
    ("transport",   ["imptoespsmediosdetransporte"]),
    ("itp",         ["imptotransmisionespatrimoniales"]),
    ("ajd",         ["imptoactosjuridicosdocumentados"]),
    ("insurance",   ["imptosprimadeseguros"]),
    ("retail_fuel", ["imptosventasminoristashidrocarburos"]),
    ("gaming",      ["imptosactividadesdeljuego"]),
    ("T_direct",    ["totalimpuestosdirectos"]),
    # The State-adjustments subtotal is "TOTAL AJUSTES FISCALES" up to the 2020
    # memoria and "TOTAL AJUSTES ESTADO IMP INDIR" after it. Miss it and the
    # whole ajustes block — over a billion euros in some years — silently drops
    # into the remainder below.
    ("T_adj_ind",   ["totalajustesestadoimpindir", "totalajustesfiscales"]),
    ("T_indirect",  ["totalimpuestosindirectos"]),
    ("T_fees",      ["totaltasasyotros"]),
    ("T_all",       ["totaltributosyotros"]),
]

# The State adjustments block is excise-side except for these two, which belong
# with the taxes they adjust.
NAV_ADJ_NON_EXCISE = [("adj_fgas", ["ajustefiscalgasesfluorados", "ajustefiscalegasesfluorados"])]


def nav_table(page_html):
    """Cuadro nº 15 as ({year: column}, {squashed label: [col0, col1]}).

    Every data row is eight cells wide and always the same shape:

        label | prior amount | prior share | this amount | this share | | change | rate

    So the two amounts are read by position (1 and 3) rather than by hunting for
    numbers — a blank cell means the tax did not exist that year and must stay
    blank, not shift the next value left into its place.
    """
    m = re.search(r"<table.*?</table>", page_html, re.S)
    if not m:
        return None, None

    def cells_of(tr):
        return [
            html.unescape(re.sub(r"<[^>]+>", "", c))
            .replace("\xa0", " ")
            .replace("\n", "")
            .replace("\t", "")
            .strip()
            for c in re.findall(r"<t[dh][^>]*>(.*?)</t[dh]>", tr, re.S)
        ]

    rows_html = re.findall(r"<tr[^>]*>(.*?)</tr>", m.group(0), re.S)
    all_cells = [cells_of(tr) for tr in rows_html]

    years = [c for row in all_cells for c in row if re.fullmatch(r"20\d\d", c)]
    if len(years) < 2:
        return None, None
    prev, cur = years[0], years[1]

    def num(s):
        s = s.replace(".", "").replace(",", ".")
        return float(s) if re.fullmatch(r"-?\d+(\.\d+)?", s) else None

    rows = {}
    for row in all_cells:
        if len(row) < 5 or not row[0]:
            continue
        if re.fullmatch(r"[-\d.,%\s]*", row[0]):        # a header or spacer
            continue
        rows.setdefault(squash(row[0]), [num(row[1]), num(row[3])])
    return {prev: 0, cur: 1}, rows


def nav_year(page_html):
    idx, rows = nav_table(page_html)
    if not rows:
        return {}
    out = {}
    for year, col in idx.items():
        raw = {}
        for key, pats in NAV_LABELS + NAV_ADJ_NON_EXCISE:
            for label, vals in rows.items():
                if any(p in label for p in pats):
                    raw[key] = vals[col]
                    break
        out[year] = raw
    return out


# ------------------------------------------------------- bucket construction --


# Both territories build `otherProdTax` as the leftover of their own published
# family subtotals, so a line whose label drifts lands there instead of vanishing.
# That is the point — but it also means the bucket is where a broken parse shows
# up, and it is genuinely small (a handful of D.29-family levies). Anything above
# this share of the year's total take is a parse failure, not a tax.
REMAINDER_CEILING = 0.03


def remainder_ok(buckets, published):
    return published and abs(buckets["otherProdTax"]) <= abs(published) * REMAINDER_CEILING


def buckets_capv(r):
    g = lambda k: r.get(k, 0) or 0
    if not all(k in r for k in ("irpf", "corp", "vat", "T_direct", "T_indirect")):
        return None
    d29_ind = g("fgas") + g("ftt") + g("digital") + g("landfill") + g("extinct")
    other_prod = g("itp") + g("ajd") + g("transport") + g("insurance") + g("gaming")
    other_curr = g("irnr") + g("patrimonio")
    b = {
        "irpf": g("irpf"),
        "corp": g("corp"),
        "vat": g("vat"),
        "inherit": g("inherit"),
        "otherCurr": other_curr,
        "otherProd": other_prod,
        "otherProdTax": g("T_direct") - g("irpf") - g("corp") - other_curr
                        - g("inherit") + d29_ind,
        "excise": g("T_indirect") - g("vat") - other_prod - d29_ind,
        "sales": g("T_fees"),
    }
    published = r.get("T_all")
    if published is None:
        published = g("T_direct") + g("T_indirect") + g("T_fees")
    return b, published


def buckets_nav(r):
    g = lambda k: r.get(k, 0) or 0
    if not all(k in r for k in ("irpf", "corp", "T_direct", "T_indirect", "T_fees")):
        return None
    other_prod = (g("itp") + g("ajd") + g("insurance") + g("retail_fuel")
                  + g("gaming") + g("transport"))
    other_curr = g("irnr") + g("patrimonio")
    # `iiee_direct` includes the transport excise, which the bundle keeps with
    # the D214 product taxes; `T_adj_ind` is excise-side apart from the fluorinated
    # gases adjustment, which belongs with the tax it adjusts.
    excise = g("iiee_direct") - g("transport") + g("T_adj_ind") - g("adj_fgas") - g("vat_adj")
    b = {
        # Navarre lists the lottery-prize levy outside its IRPF total; the Basque
        # table keeps it inside. Held with IRPF in both, so the series compare.
        "irpf": g("irpf") + g("premios"),
        "corp": g("corp"),
        "vat": g("vat_direct") + g("vat_adj"),
        "inherit": g("inherit"),
        "otherCurr": other_curr,
        "otherProd": other_prod,
        "excise": excise,
        "sales": g("T_fees"),
    }
    b["otherProdTax"] = (g("T_direct") + g("T_indirect")
                         - sum(v for k, v in b.items() if k != "sales"))
    return b, g("T_all")



# ------------------------------------------- the Ministry's compiled series --

DGT_ZIP = ("https://www.hacienda.gob.es/sgt/tributos/estadisticas/recaudacion/"
           "2022/series.zip")
DGT_MEMBER = "Series/Parte I_1-2-3-4.xlsm"
DGT_CACHE = os.path.join(HERE, "dgt_series.zip")

# Series codes of the Parte I sheet, by territory. The IIEE block lists the
# products AND a "Total Impuestos Especiales" row; for Navarre that total
# EXCLUDES the "Ajustes con el Estado" row underneath it, which the memoria's
# excise figure includes — leave the ajustes out and every year misses the
# memoria by exactly that row. The transport excise is moved to `otherProd`,
# where the bundle keeps the D214 product taxes, as `buckets_nav` does.
DGT_NAV = {
    "irpf":     ["1.01.14", "1.01.15", "1.01.16", "1.01.17", "1.01.18", "1.01.19"],
    "corp":     ["1.02.12", "1.02.13", "1.02.14"],
    "inherit":  ["1.06.16"],
    "otherCurr": ["1.03.04", "1.07.16"],                       # IRNR + patrimonio
    "vat":      ["2.01.08", "2.01.09"],                        # direct + ajuste convenio
    "excise+":  ["2.02.19", "2.02.18"],                        # total IIEE + ajustes
    "excise-":  ["2.02.16"],                                   # minus transport
    "otherProd": ["2.04.18", "2.05.15", "2.08.16", "2.10.02", "2.13.02"],
    "otherProdTax": ["1.05.02", "1.09.02", "2.11.02", "2.12.02", "2.14.02",
                     "2.15.15", "2.17.16"],
    "sales":    ["3.01.16", "3.07.02"],                        # tasas juego + otros
}
DGT_PV = {
    "irpf":     ["1.01.20", "1.01.21", "1.01.22", "1.01.23", "1.01.24", "1.01.25", "1.01.26"],
    "corp":     ["1.02.15", "1.02.16", "1.02.17", "1.02.18", "1.02.19"],
    "inherit":  ["1.06.17"],
    "otherCurr": ["1.03.05", "1.07.17"],
    "vat":      ["2.01.10", "2.01.11"],
    "excise+":  ["2.02.20", "2.02.21", "2.02.22", "2.02.23", "2.02.24", "2.02.25", "2.02.26"],
    "excise-":  ["2.02.24"],
    "otherProd": ["2.04.19", "2.05.16", "2.08.17", "2.10.03", "2.13.03"],
    "otherProdTax": ["1.05.03", "1.09.03", "2.11.03", "2.12.03", "2.14.03",
                     "2.15.16", "2.17.17"],
    "sales":    ["3.01.17", "3.07.03"],
}
# Thousands of euros a bucket may differ from the memoria before the series is
# distrusted. The observed differences are 0 on every tax and up to 1.3 M€ on
# the fees block (the memoria and the Ministry round the "otros ingresos" line
# differently); anything above this is a changed layout, not rounding.
DGT_TOL = 2000


def dgt_series():
    """{territory: {series code: {year: € millions}}} for the HF rows of Parte I."""
    import io
    import subprocess
    import zipfile

    import openpyxl

    if not os.path.exists(DGT_CACHE):
        # curl, not urllib: this host's chain is not in Python's trust store on
        # every machine, and certificates are still verified (no -k).
        code = subprocess.run(["curl", "-sS", "-L", "-A", "Mozilla/5.0", "-o", DGT_CACHE,
                               "-w", "%{http_code}", DGT_ZIP],
                              capture_output=True, text=True).stdout.strip()
        if code != "200":
            raise RuntimeError(f"DGT series.zip: HTTP {code}")
    with zipfile.ZipFile(DGT_CACHE) as z:
        wb = openpyxl.load_workbook(io.BytesIO(z.read(DGT_MEMBER)),
                                    read_only=True, data_only=True)
    rows = list(wb["Series"].iter_rows(values_only=True))
    header = next(r for r in rows if r[0] == "Código Series")
    years = {j: str(int(c)) for j, c in enumerate(header)
             if isinstance(c, (int, float)) and 1980 < c < 2100}
    out = {}
    for row in rows:
        if row[3] is None or str(row[3]).strip() != "HF":
            continue
        code = str(row[0]).strip()
        ser = {y: (float(row[j]) if isinstance(row[j], (int, float)) else None)
               for j, y in years.items()}
        out.setdefault(str(row[4]).strip(), {})[code] = ser
    return out


def buckets_dgt(series, spec, year):
    """One year's buckets in thousands of euros, or None if the year has no data."""
    def total(codes):
        vals = [series.get(c, {}).get(year) for c in codes]
        return sum(v for v in vals if v is not None), any(v is not None for v in vals)

    b, seen = {}, False
    for k in ("irpf", "corp", "inherit", "otherCurr", "vat", "otherProd",
              "otherProdTax", "sales"):
        v, has = total(spec[k])
        b[k] = v
        seen = seen or has
    plus, has_p = total(spec["excise+"])
    minus, _ = total(spec["excise-"])
    b["excise"] = plus - minus
    seen = seen or has_p
    if not seen:
        return None
    return {k: round(v * 1000) for k, v in b.items()}     # € millions -> thousands


# ------------------------------------------------------------------- driver --


def build():
    out = {"16": {}, "15": {}, "src": {}, "srcYear": {"15": {}, "16": {}}, "excluded": {}}
    print("Basque Country — OCTE, tributos concertados")
    for year, fname in sorted(OCTE_FILES.items()):
        try:
            raw = octe_year(fetch(OCTE_BASE + fname, binary=True))
        except Exception as exc:                                  # noqa: BLE001
            print(f"  {year}  FETCH/PARSE FAILED — {exc}")
            continue
        made = buckets_capv(raw)
        if made is None:
            print(f"  {year}  incomplete — required subtotals missing, year dropped")
            continue
        b, published = made
        total = sum(b.values())
        if abs(total - published) > 3:
            print(f"  {year}  TIE-OUT FAILED  Σ {total:,} vs published {published:,}")
            continue
        if not remainder_ok(b, published):
            print(f"  {year}  REMAINDER TOO LARGE  otherProdTax "
                  f"{b['otherProdTax']/1000:,.1f} M of {published/1000:,.1f} M — "
                  f"a line label has moved; year dropped")
            continue
        out["16"][year] = b
        print(f"  {year}  irpf {b['irpf']/1000:9,.1f} M   total {total/1000:9,.1f} M")

    print("Navarre — Hacienda Foral de Navarra, Cuadro nº 15")
    # Each year appears twice: as its own memoria's headline column and as the
    # next memoria's prior-year column. Neither is reliably the better one —
    # memoria 2021 leaves 2019/2020 figures standing on its two TOTAL rows while
    # every other row has moved on, and memoria 2021's prior-year column repeats
    # the same stale pair. So try the year's own memoria first, fall back to the
    # restated column, and publish only a version that ties out.
    own, prior = {}, {}
    for memoria in NAV_MEMORIA_YEARS:
        try:
            index = fetch(NAV_INDEX.format(y=memoria))
        except Exception as exc:                                  # noqa: BLE001
            print(f"  memoria {memoria}  index unreachable — {exc}")
            continue
        link = None
        for m in re.finditer(r'<a[^>]+href="([^"]+)"[^>]*>(.*?)</a>', index, re.S):
            text = html.unescape(re.sub(r"<[^>]+>", "", m.group(2))).strip()
            if text.startswith("Cuadro") and " 15" in text:
                link = m.group(1)
                break
        if not link:
            print(f"  memoria {memoria}  Cuadro nº 15 link not found")
            continue
        try:
            years = nav_year(fetch(link))
        except Exception as exc:                                  # noqa: BLE001
            print(f"  memoria {memoria}  parse failed — {exc}")
            continue
        for year, raw in years.items():
            (own if year == memoria else prior)[year] = raw

    for year in sorted(set(own) | set(prior)):
        chosen, why, failures = None, None, []
        for source, raw in (("own memoria", own.get(year)),
                            ("the next memoria's restated column", prior.get(year))):
            if raw is None:
                continue
            made = buckets_nav(raw)
            if made is None:
                failures.append(f"{source}: required subtotals missing")
                continue
            b, published = made
            total = sum(b.values())
            if not published or abs(total - published) > 3:
                failures.append(
                    f"{source}: Σ {total/1000:,.1f} M vs published "
                    f"{(published or 0)/1000:,.1f} M")
                continue
            if not remainder_ok(b, published):
                failures.append(
                    f"{source}: remainder {b['otherProdTax']/1000:,.1f} M of "
                    f"{published/1000:,.1f} M — a line label has moved")
                continue
            chosen, why = b, source
            break
        if chosen is None:
            print(f"  {year}  DROPPED — " + "; ".join(failures))
            continue
        if why != "own memoria":
            print(f"  {year}  taken from {why}")
        # Navarre publishes to one decimal of a thousand euros; the Basque table
        # is whole thousands, so both series land on the same unit here.
        out["15"][year] = {k: round(v) for k, v in chosen.items()}
        out["srcYear"]["15"][year] = "memoria"
        print(f"  {year}  irpf {chosen['irpf']/1000:9,.1f} M   "
              f"total {sum(chosen.values())/1000:9,.1f} M")
    for year in out["16"]:
        out["srcYear"]["16"][year] = "octe"

    print("Navarre before 2015 — Ministerio de Hacienda, DGT series (Parte I)")
    # The series is admitted only if it reproduces the memoria wherever the two
    # overlap. That is asserted bucket by bucket, and a single miss aborts the
    # run rather than letting a re-cut series fill the early years.
    series = dgt_series()
    nav = series.get("Navarra", {})
    bad = []
    for year in sorted(out["15"]):
        d = buckets_dgt(nav, DGT_NAV, year)
        if d is None:
            continue
        for k, v in out["15"][year].items():
            if abs(d[k] - v) > DGT_TOL:
                bad.append(f"{year}/{k}: DGT {d[k]/1000:,.1f} M vs memoria {v/1000:,.1f} M")
    if bad:
        print("  DGT SERIES DOES NOT REPRODUCE THE MEMORIA — not used:")
        for line in bad:
            print("    " + line)
        raise SystemExit(1)
    overlap = [y for y in out["15"] if buckets_dgt(nav, DGT_NAV, y) is not None]
    print(f"  reproduces the memoria within {DGT_TOL/1000:.0f} M on every bucket, "
          f"{len(overlap)} years ({overlap[0]}-{overlap[-1]})")
    first = min(out["15"]) if out["15"] else None
    for year in sorted(y for y in nav.get("1.01.14", {}) if y >= "2012"):
        if year in out["15"] or (first and year >= first):
            continue
        d = buckets_dgt(nav, DGT_NAV, year)
        if d is None:
            continue
        out["15"][year] = d
        out["srcYear"]["15"][year] = "dgt"
        print(f"  {year}  irpf {d['irpf']/1000:9,.1f} M   total {sum(d.values())/1000:9,.1f} M"
              "   (Ministry series)")
    # Informational only: the Basque series is the OCTE's own and is not replaced.
    pv = series.get("País Vasco", {})
    off = []
    for year in sorted(out["16"]):
        d = buckets_dgt(pv, DGT_PV, year)
        if d is None:
            continue
        diff = sum(d.values()) - sum(out["16"][year].values())
        if abs(diff) > DGT_TOL:
            off.append(f"{year} {diff/1000:+,.1f} M")
    print("  Basque cross-check vs OCTE totals: " +
          (("differs in " + ", ".join(off) + " — OCTE kept") if off else "identical every year"))

    out["src"] = {
        "16": "Órgano de Coordinación Tributaria de Euskadi — Recaudación de las "
              "Diputaciones Forales por tributos concertados",
        "15": "Hacienda Foral de Navarra — Memoria anual, Cuadro nº 15",
        "dgt": "Ministerio de Hacienda, Dirección General de Tributos — Recaudación y "
               "Estadísticas del Sistema Tributario Español, series Parte I "
               "(Haciendas Forales, recaudación por figura)",
        "unit": "thousands of euros, cash basis",
        "basis": "recaudación líquida (cash), as published by the collecting treasury",
    }
    return out


if __name__ == "__main__":
    data = build()
    print(f"\nyears: Basque {len(data['16'])}   Navarre {len(data['15'])}")
    if "--check" in sys.argv:
        ok = len(data["16"]) and len(data["15"])
        print("check: " + ("OK" if ok else "NOTHING EXTRACTED"))
        sys.exit(0 if ok else 1)
    with open(OUT, "w", encoding="utf-8") as fh:
        json.dump(data, fh, ensure_ascii=False, indent=1)
    print(f"wrote {os.path.relpath(OUT)}")
