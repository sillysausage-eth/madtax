"""Treasury detail Eurostat does not publish: the maturity ladder, the average life of
   the debt, and what it costs.

   PERIMETER WARNING. Everything here is *State* debt (Deuda del Estado), which is
   smaller than the general government EDP total in debt_edp.json — it excludes the
   regions, councils and social security. merge11.js stamps scope:'state' on both
   blocks for exactly that reason. Never present these next to the €1.70tn headline
   without that label.

   Sources, all from the Tesoro monthly bulletin (ES mirror — the EN mirror uses
   MM/DD/YYYY and 1,234.5, and mixing the two silently transposes dates):
     02.xlsx  average life, years
     03.xlsx  average interest rate of the debt OUTSTANDING, %
     10.xlsx  average effective rate of NEW ISSUANCE, %
     01.xlsx  nominal outstanding by instrument — used only as a cross-check
     https://www.tesoro.es/deuda-publica/valores-del-tesoro/valores-en-circulacion
              every live security with its ISIN, maturity date and amount

   Traps this file exists to survive:
     - 14.xlsx ("vencimientos") and 08.xlsx (FX) are a single embedded PNG with zero
       data cells. The ladder is therefore built security by security from the HTML
       list, which is finer than the chart anyway.
     - The NN in the filename is a POSITION in the bulletin, not an identity. Insert
       one table upstream and every later number shifts silently onto the wrong data.
       Every file is opened through want() which checks the A1 title first.
     - 03.xlsx alternates rate rows with nominal-outstanding rows (the footnote calls
       them "las cifras entre paréntesis"). 1179884 is € millions, not 1.18m percent.
     - Files are overwritten in place every month with no archive, so raw downloads are
       snapshotted into tesoro/ and --offline replays them.

   Usage: python3 extract_tesoro.py            (writes debt_tesoro.json)
          python3 extract_tesoro.py --offline  (reuse the tesoro/ snapshot) """
import openpyxl, re, json, sys, os, subprocess
from collections import defaultdict

OFFLINE = '--offline' in sys.argv
DIR = 'tesoro'
XLSX = 'https://www.tesoro.es/sites/default/files/estadisticas/%s.xlsx'
VALORES = 'https://www.tesoro.es/deuda-publica/valores-del-tesoro/valores-en-circulacion'
MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
         'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre']


def grab(name, url, binary=True):
    """curl, not urllib — same as the COFOG and CONPREL downloads in the README, and it
    is the one that works on a box whose Python has no CA bundle installed."""
    path = os.path.join(DIR, name)
    if not OFFLINE:
        os.makedirs(DIR, exist_ok=True)
        code = subprocess.run(['curl', '-sS', '-L', '-A', 'Mozilla/5.0', '-o', path,
                               '-w', '%{http_code}', url],
                              capture_output=True, text=True).stdout.strip()
        if code != '200':
            sys.exit(f'FAIL {url}: HTTP {code}')
    if not os.path.exists(path):
        sys.exit(f'FAIL {path} missing — run without --offline first')
    return path if binary else open(path, encoding='utf-8').read()


def want(nn, title):
    """Open bulletin table NN and refuse to read it unless A1 says what we came for."""
    ws = openpyxl.load_workbook(grab(nn + '.xlsx', XLSX % nn), data_only=True).active
    a1 = str(ws.cell(1, 1).value or '')
    if title.upper() not in a1.upper():
        sys.exit(f'FAIL {nn}.xlsx: A1 is "{a1[:70]}", expected to contain "{title}". '
                 f'Tesoro renumbers by position — find the table that now carries this title.')
    return ws


def periods(ws, col_a=1):
    """Yield (period, row) down the FECHA column. A year label gives '2026'; a Spanish
    month under it gives '2026-07'. Rows whose first cell is neither — in table 03 the
    nominal-outstanding rows, in every table the footnotes — are skipped, which is the
    only reason a positional reader of 03 does not mistake € millions for a rate."""
    year = None
    for r in range(1, ws.max_row + 1):
        v = ws.cell(r, col_a).value
        s = str(v).strip() if v is not None else ''
        if re.fullmatch(r'(19|20)\d\d', s):
            year = s
            yield s, r
        elif s.lower() in MESES and year:
            yield f'{year}-{MESES.index(s.lower()) + 1:02d}', r


def rate(ws, r, c, what):
    """A percentage, or death. Guards trap 3: anything outside a plausible interest
    rate is a nominal-outstanding row that has been read as if it were a rate."""
    v = ws.cell(r, c).value
    if not isinstance(v, (int, float)) or not -5 < v < 25:
        sys.exit(f'FAIL {what}: row {r} col {c} is {v!r}, not an interest rate. '
                 f'Column layout has moved, or a nominal row was read as a rate.')
    return round(float(v), 3)


def last_monthly(ws, col, what, conv):
    """Latest period that actually carries a value. Monthly rows are preferred over the
    annual ones simply by being later in the sheet; nothing is averaged or filled."""
    seen = [(p, r) for p, r in periods(ws) if ws.cell(r, col).value is not None]
    if not seen:
        sys.exit(f'FAIL {what}: no populated period rows')
    p, r = seen[-1]
    return p, conv(ws, r, col, what)


# ---- 02: average life ----------------------------------------------------------
ws2 = want('02', 'VIDA MEDIA')
# col 11 is TOTAL VIDA MEDIA (own + assumed + FX + BdE loans); col 8 is the narrower
# "deuda en moneda nacional" total. They agree to 0.01y today but are not the same thing.
avg_life_at, avg_life = last_monthly(ws2, 11, '02.xlsx vida media',
                                     lambda w, r, c, k: round(float(w.cell(r, c).value), 2))
if not 0 < avg_life < 30:
    sys.exit(f'FAIL 02.xlsx: average life {avg_life} is not a plausible number of years')
life_parts = {k: ws2.cell([r for p, r in periods(ws2) if p == avg_life_at][0], c).value
              for k, c in (('letras', 2), ('bonos', 3), ('obligaciones', 4))}

# ---- 03: average cost of the debt outstanding ----------------------------------
ws3 = want('03', 'TIPO DE INTERÉS MEDIO DE LA DEUDA EN CIRCULACIÓN')
cost_at, avg_cost = last_monthly(ws3, 8, '03.xlsx tipo medio', rate)

# ---- 10: average cost of new issuance ------------------------------------------
ws10 = want('10', 'TIPOS EFECTIVOS DE INTERÉS DE LAS NUEVAS EMISIONES')
new_at, avg_cost_new = last_monthly(ws10, 15, '10.xlsx nuevas emisiones', rate)
if cost_at != new_at:
    sys.exit(f'FAIL: cost of outstanding is {cost_at} but cost of new issuance is {new_at}. '
             f'The output carries ONE asOf for both — do not publish two dates as one.')

# ---- 14: the trap, asserted rather than commented ------------------------------
ws14 = openpyxl.load_workbook(grab('14.xlsx', XLSX % '14'), data_only=True).active
if any(ws14.cell(r, c).value is not None
       for r in range(1, ws14.max_row + 1) for c in range(1, ws14.max_column + 1)):
    print('NOTE 14.xlsx now has data cells — it was image-only. Worth re-reading.')

# ---- the ladder, security by security ------------------------------------------
html = grab('valores.html', VALORES, binary=False)
secs, trs = [], re.findall(r'<tr>(.*?)</tr>', html, re.S)
for tr in trs:
    tds = [re.sub(r'<[^>]+>', '', t).strip() for t in re.findall(r'<td\b.*?</td>', tr, re.S)]
    if len(tds) < 3:
        continue
    isin = re.match(r'(ES[0-9A-Z]{10})', tds[0])
    # ES dates are DD/MM/YYYY. The EN mirror serves MM/DD/YYYY at the same shape, which
    # is why this file never touches it: 04/09/2026 is September there and April here.
    d = re.match(r'(\d{2})/(\d{2})/(\d{4})$', tds[1])
    if not isin or not d:
        sys.exit(f'FAIL securities list: unparsable row {tds[:2]}')
    secs.append((isin.group(1), d.group(3),
                 float(tds[2].replace('.', '').replace(',', '.'))))   # ES 1.234,5

body_rows = sum(1 for tr in trs if re.search(r'<td\b', tr))
if len(secs) != body_rows:
    sys.exit(f'FAIL securities list: parsed {len(secs)} of {body_rows} table rows — '
             f'a security was dropped and the ladder would be short by its whole amount.')
if not secs:
    sys.exit('FAIL securities list: no securities parsed')

sec_total = round(sum(a for _, _, a in secs), 1)
ladder = defaultdict(float)
for _, y, a in secs:
    ladder[y] += a
# The current year is PARTIAL: this snapshot is taken mid-year, so 2026 holds only the
# redemptions still to come (Sep-Dec), not the ones already paid in Jan-Aug.
rows = [[y, round(ladder[y], 1)] for y in sorted(ladder)]

lsum = round(sum(v for _, v in rows), 1)
if abs(lsum - sec_total) > 0.5:
    sys.exit(f'FAIL ladder {lsum} does not sum to the securities list {sec_total}')

# Snapshot dates are printed per table and they differ — Letras and Bonos are refreshed
# on different days. Carry both rather than picking one and implying a single date.
asof = re.findall(r'Datos a (\d{2}/\d{2}/\d{4})', html)
if not asof:
    sys.exit('FAIL securities list: no "Datos a DD/MM/YYYY" stamp found')
asof_iso = sorted('%s-%s-%s' % (d[6:], d[3:5], d[:2]) for d in asof)[-1]

# ---- cross-check against 01.xlsx, the one printed total on the same perimeter ----
ws1 = want('01', 'DEUDA DEL ESTADO EN CIRCULACIÓN')
p1, r1 = [(p, r) for p, r in periods(ws1) if ws1.cell(r, 18).value is not None][-1]
letras = sum(ws1.cell(r1, c).value or 0 for c in range(2, 7))
byo = sum(ws1.cell(r1, c).value or 0 for c in range(7, 13))
printed_total = ws1.cell(r1, 18).value
components = letras + byo + sum(ws1.cell(r1, c).value or 0 for c in range(13, 18))
if abs(components - printed_total) > 1:
    sys.exit(f'FAIL 01.xlsx {p1}: components {components} vs printed TOTAL {printed_total}')

out = {
  'maturity': {'asOf': asof_iso, 'avgLife': avg_life, 'avgLifeAsOf': avg_life_at,
               'rows': rows, 'totalLaddered': sec_total, 'nSecurities': len(secs)},
  'cost': {'asOf': cost_at, 'avgCost': avg_cost, 'avgCostNew': avg_cost_new}
}
json.dump(out, open('debt_tesoro.json', 'w'))

print(f'securities snapshot {asof_iso} ({" + ".join(sorted(set(asof)))}) · {len(secs)} securities')
print(f'  laddered  €{sec_total/1000:,.1f}bn across {rows[0][0]}-{rows[-1][0]} '
      f'({len(rows)} years with a redemption)')
print(f'  avg life  {avg_life}y at {avg_life_at} '
      f'(letras {life_parts["letras"]} · bonos {life_parts["bonos"]} · obligaciones {life_parts["obligaciones"]})')
print(f'  avg cost  {avg_cost}% outstanding · {avg_cost_new}% on new issuance, both {cost_at}')

print(f'\nCROSS-CHECK vs 01.xlsx {p1} (nominal, printed TOTAL €{printed_total:,.0f}M)')
print(f'  letras + bonos y obligaciones  €{letras+byo:,.0f}M   ladder €{sec_total:,.1f}M   '
      f'diff {sec_total-(letras+byo):+,.1f}M')
print(f'  the rest of the State total    €{printed_total-letras-byo:,.0f}M '
      f'(eurobonos, loans, assumed debt, FX) — outside the securities list by definition')

# Official shares come off 14.xlsx's chart, whose denominator includes the loans and FX
# debt the securities list has no rows for, on a different snapshot date. The gap is a
# fact about the two perimeters; it is reported, never closed by rescaling.
OFFICIAL = {'2026': 4.94, '2027': 11.99, '2028': 8.47, '2029': 9.84, '2030': 8.60,
            '2031': 6.28, '2032': 5.39, '2033': 7.84, '2071': 0.60}
print('\nLADDER vs the official 14.xlsx percentages (differences expected, not errors)')
print('  year      ours    official     diff')
for y, pc in sorted(OFFICIAL.items()):
    ours = ladder.get(y, 0) / lsum * 100
    print(f'  {y}    {ours:6.2f}%     {pc:5.2f}%   {ours-pc:+6.2f}pp'
          + ('   partial year: Sep-Dec only' if y == asof_iso[:4] else ''))
