"""IRPF by fixed income bracket (AEAT 'Estadística por tramos de rendimiento', 2023).
Brackets are on rendimientos e imputaciones, in thousands of euros."""
import re, html, json
s=open('cuota.html',encoding='utf-8',errors='replace').read()
rows=[]
for r in re.findall(r'<tr[^>]*>(.*?)</tr>', s, re.S|re.I):
    c=[html.unescape(re.sub(r'\s+',' ',re.sub(r'<[^>]+>','',x))).strip()
       for x in re.findall(r'<t[hd][^>]*>(.*?)</t[hd]>', r, re.S|re.I)]
    if len(c)>=8 and re.search(r'\d', c[1]): rows.append(c)
def num(x):
    x=x.replace('.','').replace(',','.')
    try: return float(x)
    except: return None
BANDS=[  # label key, lower, upper (euros); None = open ended
 ('neg',None,0),('b0',0,1500),('b1',1500,6000),('b2',6000,12000),('b3',12000,21000),
 ('b4',21000,30000),('b5',30000,60000),('b6',60000,150000),('b7',150000,601000),('b8',601000,None)]
out=[]
for i,c in enumerate(rows):
    if c[0].lower().startswith('total'):
        total={'n':num(c[1]),'tax':num(c[5]),'avg':num(c[7])}; continue
    if i>=len(BANDS): continue
    k,lo,hi=BANDS[i]
    out.append({'k':k,'lo':lo,'hi':hi,'n':num(c[1]),'nPct':num(c[2]),
                'payers':num(c[3]),'tax':num(c[5]),'taxPct':num(c[6]),'avg':num(c[7])})
data={'2023':{'rows':out,'total':total}}
json.dump(data,open('irpf_brackets.json','w'))
print(f"{len(out)} brackets, total tax €{total['tax']/1e9:.1f}bn, {total['n']/1e6:.2f}m taxpayers\n")
print("  band                    people      % ppl      tax €bn    % tax    avg tax")
for r in out:
    lab = 'negative/zero' if r['k']=='neg' else (
          f"up to €{r['hi']:,.0f}" if r['lo']==0 else
          f"over €{r['lo']:,.0f}" if r['hi'] is None else
          f"€{r['lo']:,.0f} – €{r['hi']:,.0f}")
    print(f"  {lab:<22}{r['n']:>11,.0f}{r['nPct']:>9.1f}%{r['tax']/1e9:>11.2f}{r['taxPct']:>8.1f}%   €{r['avg']:>10,.0f}")
sn=sum(r['n'] for r in out); st=sum(r['tax'] for r in out)
print(f"\n  Σpeople {sn:,.0f} vs total {total['n']:,.0f}   Σtax €{st/1e9:.2f}bn vs €{total['tax']/1e9:.2f}bn")
