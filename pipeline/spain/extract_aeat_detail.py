"""Administrative detail AEAT publishes and national accounts do not:
   excise by product (table 5.1) and VAT by rate (table 8.7).

   Both are AEAT accrued state figures ("devengado"), so they do NOT equal the
   Eurostat ESA bucket for general government — the foral territories collect their
   own, and the ESA bucket is wider. We keep AEAT's own total so the gap is visible
   rather than papered over with a rescaling."""
import openpyxl, re, json

WB = 'who/Cuadros_IART24.xlsx'
wb = openpyxl.load_workbook(WB, data_only=True)

def year_cols(ws):
    """Year headers run left to right and then give way to a percent-change block;
    stop at the first non-year once we have started. '(p)' marks provisional."""
    out = {}
    for c in range(3, ws.max_column + 1):
        v = str(ws.cell(6, c).value or '').strip()
        m = re.match(r'^((?:19|20)\d\d)(\s*\(p\))?$', v)
        if m:
            out[m.group(1)] = (c, bool(m.group(2)))
        elif out:
            break
    return out

def num(v):
    return round(float(v)) if isinstance(v, (int, float)) else None

def block(ws, cols, total_row, rows, since=2012):
    """Rows that partition total_row. Returns {year: {'total':n,'prov':bool,'rows':[[k,v]]}}"""
    out = {}
    for y, (c, prov) in cols.items():
        if int(y) < since:
            continue
        tot = num(ws.cell(total_row, c).value)
        if tot is None:
            continue
        parts = []
        for r, k in rows:
            v = num(ws.cell(r, c).value)
            if v:
                parts.append([k, v])
        if not parts:
            continue
        s = sum(v for _, v in parts)
        if abs(s - tot) > 2:
            print(f"  MISMATCH {y}: parts {s} vs total {tot} ({s-tot:+d})")
        out[y] = {'total': tot, 'prov': prov,
                  'rows': sorted(parts, key=lambda x: -x[1])}
    return out

# ---- 5.1 excise duties accrued, by product ----
ws = wb['5.1']
excise = block(ws, year_cols(ws), 23, [
    (24, 'alcohol'), (25, 'beer'), (26, 'intermediate'), (27, 'fuel'),
    (28, 'tobacco'), (29, 'coal'), (30, 'plastic'), (31, 'electricity')])

# ---- 8.7 VAT accrued, by rate. The rate split is published for the general regime
#      only; the special regimes and the foral adjustment sit outside it. ----
ws = wb['8.7']
cols = year_cols(ws)
vat = block(ws, cols, 40, [
    (41, 'r0'), (42, 'r25'), (43, 'rsuper'), (44, 'r5'),
    (45, 'r75'), (46, 'rreduced'), (47, 'rgeneral')])
# context rows so the page can say what the rate split leaves out
for y, (c, _) in cols.items():
    if y in vat:
        vat[y]['accrued'] = num(ws.cell(39, c).value)   # all accrued VAT
        vat[y]['special'] = num(ws.cell(64, c).value)   # special regimes
        vat[y]['foral']   = num(ws.cell(74, c).value)   # foral territories
        vat[y]['adjOther']= num(ws.cell(75, c).value)   # other adjustments

json.dump({'excise': excise, 'vat': vat}, open('aeat_detail.json', 'w'))

ey, vy = sorted(excise)[-1], sorted(vat)[-1]
print(f"excise {sorted(excise)[0]}-{ey} · vat {sorted(vat)[0]}-{vy}")
print(f"\nEXCISE {ey} (AEAT accrued, total €{excise[ey]['total']/1000:.1f}bn"
      f"{' provisional' if excise[ey]['prov'] else ''})")
for k, v in excise[ey]['rows']:
    print(f"  {k:<13}{v/1000:>7.2f}bn{v/excise[ey]['total']*100:>7.1f}%")
print(f"\nVAT BY RATE {vy} (general regime, €{vat[vy]['total']/1000:.1f}bn"
      f"{' provisional' if vat[vy]['prov'] else ''})")
for k, v in vat[vy]['rows']:
    print(f"  {k:<13}{v/1000:>7.2f}bn{v/vat[vy]['total']*100:>7.1f}%")
print(f"  all accrued VAT €{vat[vy]['accrued']/1000:.1f}bn = general regime"
      f" + special €{vat[vy]['special']/1000:.1f}bn"
      f" + foral €{vat[vy]['foral']/1000:.1f}bn"
      f" + other €{vat[vy]['adjOther']/1000:.1f}bn")
