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

CITIES = ('ceuta', 'melilla')

# Chapter 3 by article (Orden EHA/3565/2008): 30 basic services (water, refuse,
# sewerage), 31 social and preferential services, 32 local licences and permits,
# 33 private use of public space, 34 public prices, 35 special levies, 36 sales,
# 38 refunds, 39 other income (fines, surcharges, interest). Article 37 is not
# used by the structure. Labels are read from the files, never typed here.
ART_RE = re.compile(r'^3\d$')
ART_LABELS = {}

def _scan_title(get, maxr=8, maxc=4):
    """Region title moves between files (row 2 col 1 in .xls, row 3 col 2 in .xlsx).

    Returns the region id, or 'CITY' for Ceuta and Melilla: CONPREL publishes a
    file for each autonomous city too, but the map carries them as no-data
    territories (no regional government, no regional accounts), so their
    municipal figures are left out here deliberately rather than dropped by
    accident — an unrecognised title still fails the run."""
    for r in range(maxr):
        for c in range(maxc):
            v = get(r, c)
            rid = resolve(v)
            if rid: return rid
            if v and any(k in str(v).lower() for k in CITIES): return 'CITY'
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
            if ART_RE.match(code): ART_LABELS.setdefault(code, str(ws.cell(r,3).value or '').strip())
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
        if ART_RE.match(code): ART_LABELS.setdefault(code, str(sh.cell_value(r,2)).strip())
        v = sh.cell_value(r,6)
        if isinstance(v,(int,float)): rows.setdefault(code, float(v))
    return rid, rows

def bucket(rows):
    if not rows: return None
    g=lambda c: rows.get(c,0.0)
    # CONPREL's Navarre table for 2013 and 2014 exists, resolves and is zero on
    # every line, chapter totals included. An empty published table is an absent
    # figure, not a collection of zero euros: return nothing so the year shows the
    # region as no-data rather than as a community that raised no property tax.
    if g('1') == 0 and g('2') == 0 and g('3') == 0:
        return None
    own_direct   = sum(g(c) for c in OWN_DIRECT)
    own_indirect = sum(g(c) for c in OWN_INDIRECT)
    ibi          = sum(g(c) for c in IBI)
    fees         = g('3')
    # Every article present, in thousands here; they must reproduce the chapter
    # exactly or the file's layout has changed under us.
    arts = {c: v for c, v in rows.items() if ART_RE.match(c)}
    if abs(sum(arts.values()) - fees) > 1:
        raise SystemExit(f'chapter 3 articles do not sum to the chapter: {sum(arts.values())} vs {fees}')
    ch1, ch2 = g('1'), g('2')
    state_share = sum(v for c,v in rows.items()
                      if c.startswith(STATE_SHARE_PREFIXES) and c.count('.')<=1)
    rec = {k: round(v/1000) for k,v in dict(   # thousands -> millions
        ownTax=own_direct+own_indirect, ibi=ibi, fees=fees,
        ch1=ch1, ch2=ch2, stateShare=state_share).items()}
    rec['feesArt'] = {c: round(v/1000) for c, v in sorted(arts.items())}
    return rec

out={}
empty={}
for f in sorted(glob.glob('local/ccaa/EL*C*.xls')+glob.glob('local/ccaa/EL*C*.xlsx')):
    year=re.search(r'EL(\d{4})C', os.path.basename(f)).group(1)
    rid, rows = read(f)
    if rid is None:
        raise SystemExit(f'could not resolve region from {f}')
    if rid == 'CITY':
        continue
    rec=bucket(rows)
    out.setdefault(year,{})
    if rec: out[year][rid]=rec
    else: empty.setdefault(year,[]).append(rid)
# Every one of the 17 must be accounted for — as a figure or as a named empty
# table. An unaccounted region is still a hard failure.
for y,d in out.items():
    assert_complete(set(d)|set(empty.get(y,[])), f'CONPREL {y}')
for y,ids in sorted(empty.items()):
    print(f'NOTE {y}: CONPREL publishes an all-zero table for region(s) {ids} — carried as absent, not zero')
json.dump(out, open('local_owntax.json','w'))
json.dump({'codes': sorted(ART_LABELS), 'labels': ART_LABELS}, open('local_fees_art.json','w'), ensure_ascii=False)

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
for c in sorted(ART_LABELS):
    a=sum(r['feesArt'].get(c,0) for r in out[y].values())
    print(f'    {c} {ART_LABELS[c][:58]:58s} {a/1000:6.1f}')
print(f'  EXCLUDED: local share of state taxes (already in AEAT)  {share/1000:8.1f}')
print(f'\n  top regions by local own tax (€bn):')
for cc,r in sorted(out[y].items(), key=lambda kv:-kv[1]['ownTax'])[:6]:
    print(f'    {cc}  {r["ownTax"]/1000:6.2f}   IBI {r["ibi"]/1000:5.2f}   fees {r["fees"]/1000:5.2f}')
