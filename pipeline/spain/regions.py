"""Canonical Spanish autonomous community resolver.

Three separate IGAE/AEAT workbooks have now each named the regions differently —
"Comunidad Valenciana", "Comunitat Valenciana" and a source typo "Comunitat Valencia";
"Madrid" and "Comunidad de Madrid". Substring matching plus a hard completeness
assertion is the only thing that keeps a whole region from vanishing silently.
"""
import re, unicodedata

def norm(s):
    s = unicodedata.normalize('NFD', str(s)).encode('ascii', 'ignore').decode().lower()
    return re.sub(r'[^a-z]', '', s)

# id -> distinctive substrings, most specific first
PATTERNS = [
    ('08', ['castillalamancha', 'castillamancha']),
    ('07', ['castillayleon', 'castillaleon']),
    ('01', ['andaluc']),
    ('02', ['aragon']),
    ('03', ['asturias']),
    ('04', ['balear']),
    ('05', ['canaria']),
    ('06', ['cantabria']),
    ('09', ['catalu']),
    ('10', ['valenc']),
    ('11', ['extremadura']),
    ('12', ['galicia']),
    ('13', ['madrid']),
    ('14', ['murcia']),
    ('15', ['navarra']),
    ('16', ['paisvasco', 'euskadi']),
    ('17', ['rioja']),
]
ALL = [p[0] for p in PATTERNS]
TOTAL_HINTS = ['totaladministracionregional', 'totalccaa', 'total', 'administracionregional']

def resolve(label):
    """Return region id, 'ES' for a total column, or None."""
    k = norm(label)
    if not k:
        return None
    for rid, pats in PATTERNS:
        if any(p in k for p in pats):
            return rid
    for h in TOTAL_HINTS:
        if k.startswith(h):
            return 'ES'
    return None

def assert_complete(found, context):
    """Fail loudly rather than silently losing a region."""
    missing = [r for r in ALL if r not in found]
    if missing:
        raise SystemExit(
            f"REGION RESOLVER FAILED for {context}: missing {missing}. "
            f"Resolved {sorted(found)}. Add the new spelling to regions.py PATTERNS."
        )
