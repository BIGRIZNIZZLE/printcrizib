# Contact sheet of the comic icon set (light + dark), with the HTML brand tags drawn for reference.
import os
from PIL import Image, ImageDraw, ImageFont
D = os.path.join(os.path.dirname(__file__), '..'); IC = os.path.join(D, 'icons', 'comic'); OUT = os.path.join(D, 'screenshots')
ORDER = 'printer ams spool resin nozzle plate tools parts consumables dryer part'.split()
LBL = dict(printer='printer', ams='AMS', spool='filament spool', resin='resin', nozzle='nozzle / hotend', plate='build plate', tools='tools', parts='parts / spares', consumables='consumables', dryer='dryer', part='printed part')
fb = '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf'
F = ImageFont.truetype(fb, 15); FT = ImageFont.truetype(fb, 30); FS = ImageFont.truetype(fb.replace('-Bold', ''), 16); FB = ImageFont.truetype(fb, 12)
for theme, bg, tile, soft, ink, shadow, txt, mut, dot in [('light', '#f4f6fb', '#ffffff', '#e3ebfb', '#121826', '#121826', '#121826', '#5d6678', (47, 99, 201, 46)), ('dark', '#07090f', '#10151f', '#16233f', '#3a4766', '#000000', '#e9edf5', '#97a1b5', (93, 142, 239, 34))]:
    cols, cell, pad, th = 6, 150, 40, 120
    rows = (len(ORDER) + 2 + cols - 1) // cols
    W = pad * 2 + cols * cell; H = th + rows * (cell + 34) + pad
    im = Image.new('RGBA', (W, H), bg); d = ImageDraw.Draw(im)
    d.text((pad, 34), 'Print Crizib · comic icon set (11)', font=FT, fill=txt)
    d.text((pad, 76), 'Corporate blue #2f63c9 · Bambu tag + spool color dot are live HTML', font=FS, fill=mut)
    def tilef(x, y, key, brand=None, badge=None):
        s = 112; ov = Image.new('RGBA', (s, s), (0, 0, 0, 0)); od = ImageDraw.Draw(ov)
        od.rounded_rectangle((0, 0, s - 1, s - 1), 18, fill=soft)
        for yy in range(4, s, 8):
            for xx in range(4, s, 8): od.ellipse((xx - 1.1, yy - 1.1, xx + 1.1, yy + 1.1), fill=dot)
        mask = Image.new('L', (s, s), 0); ImageDraw.Draw(mask).rounded_rectangle((0, 0, s - 1, s - 1), 18, fill=255)
        d.rounded_rectangle((x + 4, y + 4, x + s + 4, y + s + 4), 18, fill=shadow)
        im.paste(ov, (x, y), mask); d.rounded_rectangle((x, y, x + s, y + s), 18, outline=ink, width=2)
        ic = Image.open(os.path.join(IC, key + '.webp')).convert('RGBA').resize((96, 96), Image.LANCZOS); im.alpha_composite(ic, (x + 8, y + 8))
        if brand:
            c = {'bambu': '#00ae42', 'other': '#c2c8d2'}[brand]
            d.polygon([(x + 2, y + 2), (x + 30, y + 2), (x + 2, y + 30)], fill=c); d.line([(x + 30, y + 2), (x + 2, y + 30)], fill=shadow, width=3)
        if badge:
            d.ellipse((x + s - 14, y + s - 14, x + s + 6, y + s + 6), fill=badge, outline='#111', width=2)
        return s
    items = [(k, None, '#2f63c9' if k == 'spool' else None, LBL[k]) for k in ORDER] + [('printer', 'bambu', None, 'tag: Bambu Lab'), ('spool', 'other', '#d4262f', 'tag: other brand')]
    for i, (k, br, bd, l) in enumerate(items):
        r, c = divmod(i, cols); x = pad + c * cell + 15; y = th + r * (cell + 34) + 10
        tilef(x, y, k, br, bd); tw = d.textlength(l, font=F); d.text((x + 56 - tw / 2, y + 124), l, font=F, fill=mut if not br else txt)
    im.convert('RGB').save(os.path.join(OUT, f'icon-contact-sheet-{theme}.png'), optimize=True); print(theme, im.size)
