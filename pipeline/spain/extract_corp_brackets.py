"""Who generates corporate tax: AEAT's consolidated statistic by turnover bracket.

Source: "Cuentas anuales consolidadas del Impuesto sobre Sociedades", the table
"Principales variables por Cifra de Negocio y por signo del resultado contable"
with every filter at Total (RC: Total, Sector: Total, GR: Total). One row per
turnover bracket, seventeen brackets from "0 - 50" to "> 1.000.000" thousand
euros, and the published Total row. Groups (modelo 220) count once, as a group;
companies outside a group (modelo 200) count once each. It is the same statistic
the Informe Anual de Recaudación's table 8.5 summarises, so the Total row must
reproduce corp_types.json for the same year — merge17.js checks that.

The same table is published once per sector, behind the "Sector" filter on that
page: five CNAE groupings that partition the whole census. Those are fetched too
and stored per bracket as `sectors`, so the console can say who the largest
filers actually are. Only filers, profit and tax are kept per sector — the rest
would double the payload for columns nothing renders.

The site is HTML only: no CSV, no XLSX, and every page carries a hashed name that
differs by year. The crawl therefore follows the menu by label, home ->
"Principales variables" -> "... por Cifra de Negocios" -> "... signo del resultado
contable", and stops if any label is missing rather than guessing.

Columns are read by header name, not position: 2016-2018 lack "Empresas con
Cuota Líquida Positiva", which is why `nPos` is null there, and head the taxable
base column "Base imponible" rather than "Base imponible positiva" — the tie-out
against table 8.5 in merge17.js is what confirms it is the same figure. Money is published in
thousands of euros and stored here in millions, three decimals, like every other
money field in the bundle.

Run from this directory. No third-party packages; the stdlib does the fetching.

    python3 extract_corp_brackets.py            # 2016 .. current year
    python3 extract_corp_brackets.py 2021 2023  # a range
"""
import html
import json
import re
import ssl
import sys
import time
import urllib.request
from datetime import date

BASE = ("https://sede.agenciatributaria.gob.es/AEAT/Contenidos_Comunes/"
        "La_Agencia_Tributaria/Estadisticas/Publicaciones/sites/sociedadesdc/")
FIRST_YEAR = 2016  # first edition of the consolidated statistic

# header text -> field. Thousands of euros unless noted.
COLS = {
    "Número de empresas": "n",
    "Empresas con Cuota Líquida Positiva": "nPos",
    "Cifra de Negocios": "turnover",
    "Beneficio": "profit",                # sum of positive accounting results
    "Resultado Contable": "rc",           # net accounting result
    "Base imponible positiva": "base",
    "Base imponible": "base",             # the 2016-2018 header for the same column
    "Cuota íntegra": "gross",
    "Cuota líquida positiva": "tax",
}
COUNTS = {"n", "nPos"}
MONEY = {"turnover", "profit", "rc", "base", "gross", "tax"}

# The "Sector" filter on the same page: five CNAE groupings that partition the
# census. Matched on the menu label, which AEAT abbreviates inconsistently.
SECTORS = [
    ("ind", r"^Industria"),
    ("con", r"^Construcci\u00f3n"),
    ("com", r"^Comercio"),
    ("fin", r"^Actividades financieras"),
    ("srv", r"^Servicios sociales"),
]
# Kept per sector; everything else is published but not stored.
SECTOR_FIELDS = ("n", "profit", "tax")

ctx = ssl.create_default_context()


def get(url, tries=4):
    """One page. AEAT's TLS handshake times out now and then over a long crawl."""
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
    for attempt in range(tries):
        try:
            return urllib.request.urlopen(req, timeout=90, context=ctx).read().decode("utf-8", "replace")
        except urllib.error.HTTPError:
            raise
        except (urllib.error.URLError, TimeoutError, OSError) as e:
            if attempt == tries - 1:
                raise
            print(f"  retrying after {type(e).__name__}: {url.rsplit('/', 1)[-1][:40]}")
            time.sleep(2 * (attempt + 1))


def clean(s):
    return re.sub(r"\s+", " ", html.unescape(re.sub(r"<[^>]+>", "", s))).strip()


def links(page):
    return [(clean(t), h) for h, t in re.findall(r'<a[^>]+href="([^"]+)"[^>]*>(.*?)</a>', page, re.S | re.I)]


def follow(page, pattern, what):
    for t, h in links(page):
        if re.search(pattern, t, re.I):
            return h
    raise SystemExit(f"menu entry not found: {what} ({pattern})")


def num(s):
    """'1.683.134' -> 1683134; '21,77' -> 21.77; '' or 'SE' -> None.

    AEAT writes "SE" where a cell is withheld under statistical secrecy: too few
    filers in that sector and turnover bracket for the figure to be published
    without identifying them. It is an absent figure, never a zero, and it stays
    absent all the way to the screen."""
    s = s.strip()
    if not s or not re.search(r"\d", s):
        return None
    return float(s.replace(".", "").replace(",", ".")) if "," in s else int(s.replace(".", ""))


def bounds(label):
    """'0 - 50' -> (0, 50); '> 1.000.000' -> (1000000, None). Thousands of euros."""
    if label.startswith(">"):
        return int(label[1:].strip().replace(".", "")), None
    lo, hi = [int(x.strip().replace(".", "")) for x in label.split("-")]
    return lo, hi


def parse(page, year, expect_sector="Total"):
    """The bracket table on one filter page: (header index, Total row, bracket rows)."""
    title = clean(re.search(r"<title>(.*?)</title>", page, re.S | re.I).group(1))
    if "RC: Total" not in title or "GR: Total" not in title:
        raise SystemExit(f"{year}: table is filtered ({title}); expected RC and GR at Total")
    if expect_sector == "Total" and "Sector: Total" not in title:
        raise SystemExit(f"{year}: expected Sector: Total, got ({title})")

    table = re.findall(r"<table.*?</table>", page, re.S | re.I)[0]
    rows = [[clean(c) for c in re.findall(r"<t[hd][^>]*>(.*?)</t[hd]>", r, re.S | re.I)]
            for r in re.findall(r"<tr.*?</tr>", table, re.S | re.I)]
    header = rows[0]
    # The two effective-rate columns share a spanning header ("Tipos Efectivos")
    # and are the last two cells of every data row: s/Base then s/Benef.
    idx = {}
    for i, h in enumerate(header):
        key = re.sub(r"\s*\(\*\)\s*$", "", h)
        if key in COLS:
            idx[COLS[key]] = i
    missing = [f for f in ("n", "turnover", "profit", "rc", "base", "gross", "tax") if f not in idx]
    if missing:
        raise SystemExit(f"{year}: header lacks {missing}: {header}")

    data = [r for r in rows[1:] if len(r) == len(header) + 1]  # +1: the rate pair spans one header
    if not data or data[0][0] != "Total":
        raise SystemExit(f"{year}: first data row is not Total: {data[:1]}")

    def rec(r):
        d = {}
        for f, i in idx.items():
            v = num(r[i])
            d[f] = v if f in COUNTS or v is None else round(v / 1000, 3)
        for f in COLS.values():
            d.setdefault(f, None)
        d["rateBase"], d["rateProfit"] = num(r[-2]), num(r[-1])
        return d

    total = rec(data[0])
    out_rows = []
    for r in data[1:]:
        lo, hi = bounds(r[0])
        out_rows.append({"lo": lo, "hi": hi, **rec(r)})
    return total, out_rows


def extract(year):
    base = f"{BASE}{year}/"
    home = get(base + "home.html")
    p1 = follow(home, r"^Principales variables$", "Principales variables")
    p2 = follow(get(base + p1), r"Principales variables por Cifra de Negocio", "por Cifra de Negocios")
    p3 = follow(get(base + p2), r"Cifra de Negocio.*signo del resultado contable", "signo del resultado contable")
    page = get(base + p3)
    total, out_rows = parse(page, year)

    # Published rows must add back to the published Total: counts exactly, money
    # to the rounding of the thousands-of-euros source.
    for f in ("n", "nPos", "turnover", "profit", "rc", "base", "gross", "tax"):
        if total[f] is None:
            continue
        t = sum(x[f] for x in out_rows)
        tol = 0 if f in COUNTS else 0.001 * len(out_rows)
        if abs(t - total[f]) > tol:
            raise SystemExit(f"{year}: brackets sum {t} != Total {total[f]} for {f}")
    if [x["lo"] for x in out_rows] != sorted(x["lo"] for x in out_rows):
        raise SystemExit(f"{year}: brackets out of order")
    for a, b in zip(out_rows, out_rows[1:]):
        if a["hi"] != b["lo"]:
            raise SystemExit(f"{year}: gap between brackets {a['hi']} and {b['lo']}")

    # The same table once per sector. The five partition the census, so for every
    # bracket they must add back to the row already read above.
    sector_links = [(t, h) for t, h in links(page) if "jrubik" in h]
    for key, pat in SECTORS:
        href = None
        for t, h in sector_links:
            if re.search(pat, t):
                href = h
                break
        if href is None:
            raise SystemExit(f"{year}: sector menu entry not found ({pat})")
        _, srows = parse(get(base + href), year, expect_sector=key)
        if [r["lo"] for r in srows] != [r["lo"] for r in out_rows]:
            raise SystemExit(f"{year}/{key}: sector brackets differ from the Total table")
        for r, sr in zip(out_rows, srows):
            r.setdefault("sectors", {})[key] = {f: sr[f] for f in SECTOR_FIELDS}

    # Where no cell is withheld the five sectors must add back to the bracket
    # exactly. Where one is, the rest cannot be made to add up and the bracket is
    # marked instead: the console shows the sectors it has and says one is withheld.
    withheld = 0
    for r in out_rows:
        r["secSE"] = any(v[f] is None for v in r["sectors"].values() for f in SECTOR_FIELDS)
        if r["secSE"]:
            withheld += 1
            continue
        for f in SECTOR_FIELDS:
            t = sum(v[f] for v in r["sectors"].values())
            tol = 0 if f in COUNTS else 0.005
            if abs(t - r[f]) > tol:
                raise SystemExit(f"{year}: sectors sum {t} != {r[f]} for {f} in bracket {r['lo']}")
    if withheld:
        print(f"  {year}: {withheld} bracket(s) carry a sector cell withheld under statistical secrecy")

    return {"total": total, "rows": out_rows, "src": base + p3}


def main(argv):
    if len(argv) == 2:
        years = range(int(argv[0]), int(argv[1]) + 1)
    elif len(argv) == 1:
        years = [int(argv[0])]
    else:
        years = range(FIRST_YEAR, date.today().year)
    out = {}
    for y in years:
        try:
            out[str(y)] = extract(y)
        except urllib.error.HTTPError as e:
            if e.code == 404:
                print(f"{y}: not published yet (404)")
                continue
            raise
        t = out[str(y)]["total"]
        top = out[str(y)]["rows"][-1]
        print(f"{y}: {len(out[str(y)]['rows'])} brackets · {t['n']:,} companies · "
              f"tax €{t['tax']/1000:.1f}bn · top bracket {top['n']} cos pay "
              f"{top['tax']/t['tax']*100:.1f}% at {top['rateProfit']}% of profit")
    if not out:
        raise SystemExit("nothing extracted")
    json.dump(out, open("corp_brackets.json", "w"), ensure_ascii=False)
    print(f"corp_brackets.json: {min(out)}-{max(out)}")


if __name__ == "__main__":
    main(sys.argv[1:])
