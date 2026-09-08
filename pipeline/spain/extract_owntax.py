import openpyxl, glob, re, json
from regions import resolve, assert_complete
# Taxes the region itself levies or manages: ITP/AJD, inheritance & gift, wealth,
# gambling, vehicle registration, and the Canary IGIC.
# D.51 is DELIBERATELY EXCLUDED — it is the region's ceded share of national income tax,
# already counted inside AEAT territorial collection. Including it would double count.
OWN = ['D.211','D.212','D.214','D.29','D.59','D.91']
# What the regional government itself charges for goods and services — market sales
# (P.11), output kept for its own use (P.12, an accounting entry, not cash received)
# and part-payments for public services such as tuition and co-payments (P.131).
# Read for merge17.js; NOT part of OWN, which is the tax figure that goes on the map.
FEES = ['P.11','P.12','P.131']
out = {}
for f in sorted(glob.glob('ccaa_rev/r_*.xlsx')):
    year = re.search(r'r_(\d{4})', f).group(1)
    wb = openpyxl.load_workbook(f, data_only=True)
    ws = wb['Tabla1a'] if 'Tabla1a' in wb.sheetnames else wb[wb.sheetnames[0]]
    hdr = next((r for r in range(4,12)
                if str(ws.cell(r,1).value or '').strip().upper() == 'CÓDIGO'), None)
    if hdr is None:
        raise SystemExit(f'no header row in {f}')
    cols = {}
    for c in range(3, 30):
        rid = resolve(ws.cell(hdr, c).value)
        if rid: cols[c] = rid
    assert_complete({v for v in cols.values() if v != 'ES'}, f)
    rows = {}
    for r in range(hdr+1, hdr+40):
        code = str(ws.cell(r,1).value or '').strip()
        lab  = str(ws.cell(r,2).value or '').strip()
        if code in OWN or code in FEES or code == 'D.51': rows.setdefault(code, r)
        if lab == 'RECURSOS NO FINANCIEROS': rows['TOTREC'] = r
    out[year] = {}
    for c, rid in cols.items():
        rec = {}
        for code, r in rows.items():
            v = ws.cell(r, c).value
            rec[code] = round(float(v)) if isinstance(v, (int, float)) else 0
        rec['OWN'] = sum(rec.get(k, 0) for k in OWN)
        out[year][rid] = rec
json.dump(out, open('ccaa_owntax.json','w'))
yrs = sorted(out)
print(f'years {yrs[0]}-{yrs[-1]}  ·  all 17 regions resolved in every file')
y = '2024'
regs = {k:v for k,v in out[y].items() if k != 'ES'}
tot = sum(r['OWN'] for r in regs.values())
print(f'\n{y} regional own-managed taxes (€bn) — ITP/AJD, inheritance, wealth, gambling, IGIC:')
for rid, rec in sorted(regs.items(), key=lambda kv: -kv[1]['OWN'])[:8]:
    print(f'  {rid}  {rec["OWN"]/1000:6.2f}')
print(f'  ...  SUM {tot/1000:.1f}bn   ({len(regs)} regions)')
