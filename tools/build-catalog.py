# Builds catalog.json (Bambu Lab quick-pick) from the Bambu Lab US store's public product sitemap
# (robots.txt allows it). One request. Names exactly as published; no prices are stored (they change daily).
import re, json, sys, urllib.request, datetime, html
UA = 'Mozilla/5.0 (RIZNOSS Print Crizib catalog builder; one sitemap request; github.com/BIGRIZNIZZLE)'
SRC = 'https://us.store.bambulab.com/sitemap_products_1.xml'
xml = urllib.request.urlopen(urllib.request.Request(SRC, headers={'User-Agent': UA}), timeout=30).read().decode('utf8')
items = {}
for u in re.findall(r'<url>(.*?)</url>', xml, re.S):
    loc = re.search(r'<loc>([^<]+)</loc>', u); t = re.search(r'<image:title>([^<]*)</image:title>', u)
    if not loc: continue
    slug = loc.group(1).rsplit('/products/', 1)[-1]
    items[slug] = (loc.group(1), html.unescape(html.unescape(t.group(1) if t else '')).replace('\u2122', '').strip())
PRINTERS = ['a1-mini', 'a1', 'a2l', 'p1s', 'p2s', 'x2d', 'h2s', 'h2d', 'h2d-pro', 'h2c', 'h3c']
SYSTEMS = ['tpu-feed-assist-module', 'ams-2-pro', 'ams-ht', 'ams-lite', 'ams-hub', 'ams-hub-a1-series', 'filament-buffer', 'bambu-lab-e1-air-purifier', 'bambu-lab-purifier-e1-pro', 'auto-fire-extinguishing-system', 'p1p-enclosure-kit', 'ams-drawer-stacker']
PLATES = [s for s in items if re.fullmatch(r'bambu-(textured-pei|smooth-pei|dual-texture-pei|engineering|cool-plate-supertack|3d-effect)-plate|build-plates-expansion-kit', s)]
PARTS = [s for s in items if re.fullmatch(r'bambu-(high-flow-)?hotend-[a-z0-9-]+|tungsten-carbide-nozzle-[a-z0-9-]+|hardened-steel-upgrade-combo|multi-size-hotends-kit|hotends-combo-h2-series|obxidian-high-flow-hotend|silicone-sock-for-hotend|nozzle-cleaning-sponge|replacement-filament-cutter|bambu-reusable-spool|ams-rubber-seal', s)]
CONSUMABLES = ['glue-stick-for-build-plate', 'liquid-glue-for-build-plate']
TOOLS = ['bambu-scraper-3-pcs', '4-piece-needle-file-set', 'h2d-h2s-h2c-toolbox', 'filament-respooler-winder']
MAT = [(r'^pla-cf', 'PLA-CF'), (r'^pla-', 'PLA'), (r'^petg-cf', 'PETG-CF'), (r'^petg-', 'PETG'), (r'^pet-cf', 'PET-CF'), (r'^abs-gf', 'ABS-GF'), (r'^abs', 'ABS'),
       (r'^asa-cf', 'ASA-CF'), (r'^asa', 'ASA'), (r'^pa6-cf', 'PA6-CF'), (r'^pa6-gf', 'PA6-GF'), (r'^paht-cf', 'PAHT-CF'), (r'^pc-', 'PC'), (r'^tpu', 'TPU'), (r'^ppa-cf', 'PPA-CF'), (r'^pps-cf', 'PPS-CF'),
       (r'^support-for-pla', 'Support (PLA)'), (r'^support-for-pa', 'Support (PA/PET)'), (r'^support-for-abs', 'Support (ABS)')]
SKIP_FIL = re.compile(r'feed-assist|mystery|swatches|lithophane|beginner|trial|palette|pack|bundle|upgrade|2-85mm')
out = []
def add(slug, c, **kw):
    if slug not in items: return
    url, title = items[slug]
    out.append({'id': 'bb:' + slug, 'b': 'E3D' if title.startswith('E3D') else 'Bambu Lab', 'c': c, 'n': title or slug.replace('-', ' ').title(), 'u': url, **kw})
for s in PRINTERS: add(s, 'printer', k='printer')
for s in ['bambu-lab-p2s-combo-starter-kit', 'bambu-lab-a1-combo-starter-kit', 'bambu-lab-x2d-combo-starter-kit']: add(s, 'printer', k='printer')
for s in SYSTEMS: add(s, 'accessory', k='ams' if s.startswith('ams') or s == 'filament-buffer' else 'accessory')
for s in sorted(items):
    if SKIP_FIL.search(s): continue
    for pat, m in MAT:
        if re.search(pat, s): add(s, 'filament', mat=m, k='spool'); break
for s in sorted(PLATES): add(s, 'parts', k='plate')
for s in sorted(PARTS): add(s, 'parts', k='nozzle' if re.search('hotend|nozzle', s) else 'parts')
for s in CONSUMABLES: add(s, 'consumables', k='consumables')
for s in TOOLS: add(s, 'tools', k='tools')
missing = [s for s in PRINTERS + SYSTEMS + CONSUMABLES + TOOLS if s not in items]
cat = {'generated': datetime.date.today().isoformat(), 'source': SRC, 'note': 'Names from the Bambu Lab US store product sitemap. No prices stored.', 'items': out}
json.dump(cat, open(__file__.rsplit('/tools/', 1)[0] + '/catalog.json', 'w'), separators=(',', ':'), ensure_ascii=False)
from collections import Counter
print(len(out), Counter(x['c'] for x in out), 'missing:', missing)
