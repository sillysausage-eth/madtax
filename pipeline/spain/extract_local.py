"""Local government OWN revenue by autonomous community, from CONPREL.

Values in the source are THOUSANDS of euros; emitted here as € millions.
Column 6 = Recaudación Líquida (cash), to match the AEAT layer's cash basis.

CRITICAL: chapter 1 and 2 totals include the local share of STATE taxes
(accounts 100/101/102 income & corporate, 210 VAT, 220.xx excise). Those euros are
already inside AEAT territorial collection. Only genuinely local levies are counted.
"""
import xlrd, glob, re, json, os
import openpyxl
from regions import resolve, assert_complete

STATE_SHARE_PREFIXES = ('100','101','102','210','220')   # local share of national taxes
OWN_DIRECT   = {'112','113','114','115','116','117','13','16','17','18','19'}
OWN_INDIRECT = {'26','27','28','290','291','292','293','294','295','296','299'}
IBI          = {'112','113','114'}

def _scan_title(get, maxr=8, maxc=4):
    """Region title moves between files (row 2 col 1 in .xls, row 3 col 2 in .xlsx)."""
    for r in range(maxr):
        for c in range(maxc):
            rid = resolve(get(r, c))
            if rid: return rid
    return None

def read(path):
    if path.endswith('.xlsx'):
        wb = openpyxl.load_workbook(path, data_only=True)
        name = next((n for n in wb.sheetnames if n.strip() in ('Tabla 2','Tabla 2.0')), None)
        if name is None: return None, None
        ws = wb[name]
        get = lambda r, c: ws.cell(r+1, c+1).value
        rid = _scan_title(get)
        rows = {}
        for r in range(1, ws.max_row+1):
            code = str(ws.cell(r,2).value or '').strip()
            if not code: continue
            v = ws.cell(r,7).value                     # Recaudación Líquida
            if isinstance(v,(int,float)): rows.setdefault(code, float(v))
        return rid, rows
    wb = xlrd.open_workbook(path)
    name = next((n for n in wb.sheet_names() if n.strip() in ('Tabla 2','Tabla 2.0')), None)
    if name is None: return None, None
    sh = wb.sheet_by_name(name)
    get = lambda r, c: (sh.cell_value(r,c) if r < sh.nrows and c < sh.ncols else None)
    rid = _scan_title(get)
    rows = {}
    for r in range(sh.nrows):
        code = str(sh.cell_value(r,1)).strip()
        if not code: continue
        v = sh.cell_value(r,6)
        if isinstance(v,(int,float)): rows.setdefault(code, float(v))
    return rid, rows

def bucket(rows):
    if not rows: return None
    g=lambda c: rows.get(c,0.0)
    own_direct   = sum(g(c) for c in OWN_DIRECT)
    own_indirect = sum(g(c) for c in OWN_INDIRECT)
    ibi          = sum(g(c) for c in IBI)
    fees         = g('3')
    ch1, ch2 = g('1'), g('2')
    state_share = sum(v for c,v in rows.items()
                      if c.startswith(STATE_SHARE_PREFIXES) and c.count('.')<=1)
    return {k: round(v/1000) for k,v in dict(   # thousands -> millions
        ownTax=own_direct+own_indirect, ibi=ibi, fees=fees,
        ch1=ch1, ch2=ch2, stateShare=state_share).items()}

out={}
for f in sorted(glob.glob('local/ccaa/EL*C*.xls')+glob.glob('local/ccaa/EL*C*.xlsx')):
    year=re.search(r'EL(\d{4})C', os.path.basename(f)).group(1)
    rid, rows = read(f)
    if rid is None:
        raise SystemExit(f'could not resolve region from {f}')
    rec=bucket(rows)
    if rec: out.setdefault(year,{})[rid]=rec
for y,d in out.items():
    assert_complete(set(d), f'CONPREL {y}')
json.dump(out, open('local_owntax.json','w'))

yrs=sorted(out)
print(f'years {yrs[0]}-{yrs[-1]}, regions per year: '+
      ', '.join(f'{y}:{len(out[y])}' for y in yrs))
y='2023'
tot=sum(r['ownTax'] for r in out[y].values())
ibi=sum(r['ibi'] for r in out[y].values())
fees=sum(r['fees'] for r in out[y].values())
share=sum(r['stateShare'] for r in out[y].values())
print(f'\n{y} national roll-up (€bn):')
print(f'  local OWN taxes (IBI, vehicles, plusvalia, IAE, ICIO...) {tot/1000:8.1f}')
print(f'    of which property tax (IBI)                           {ibi/1000:8.1f}')
print(f'  local fees, charges and fines (chapter 3)               {fees/1000:8.1f}')
print(f'  EXCLUDED: local share of state taxes (already in AEAT)  {share/1000:8.1f}')
print(f'\n  top regions by local own tax (€bn):')
for cc,r in sorted(out[y].items(), key=lambda kv:-kv[1]['ownTax'])[:6]:
    print(f'    {cc}  {r["ownTax"]/1000:6.2f}   IBI {r["ibi"]/1000:5.2f}   fees {r["fees"]/1000:5.2f}')
