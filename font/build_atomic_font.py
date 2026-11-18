#!/usr/bin/env python3
# بناء خط تجريبي يرسم الحروف الذرية (PUA) ويصلها: كل حرف ذري = شكل الحرف القاعدي + علاماته، والوصل بقواعد calt داخل الخط.
# المصدر: DejaVu Sans (ترخيص Bitstream Vera/DejaVu الحر). الخرج: font/NawaAtomic.ttf
import sys, unicodedata, json
from fontTools.ttLib import TTFont, newTable
from fontTools.pens.ttGlyphPen import TTGlyphPen
from fontTools.pens.boundsPen import BoundsPen
from fontTools.pens.transformPen import TransformPen
from fontTools.feaLib.builder import addOpenTypeFeaturesFromString

SRC = sys.argv[1] if len(sys.argv) > 1 else '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf'
OUT = sys.argv[2] if len(sys.argv) > 2 else 'font/NawaAtomic.ttf'
f = TTFont(SRC); cmap = f.getBestCmap(); gs = f.getGlyphSet(); hmtx = f['hmtx']

BASES = list('ابتثجحخدذرزسشصضطظعغفقكلمنهوي') + list('ءأإؤئآىةٱ')
FATHA, DAMMA, KASRA, SHADDA, SUKUN, TF, TD, TK = 'َ', 'ُ', 'ِ', 'ّ', 'ْ', 'ً', 'ٌ', 'ٍ'
MARK_SETS = [FATHA, DAMMA, KASRA, SUKUN, FATHA+SHADDA, DAMMA+SHADDA, KASRA+SHADDA, TF, TD, TK, TF+SHADDA, TD+SHADDA, TK+SHADDA]
# تصنيف الوصل: D مزدوج، R يوصل بما قبله فقط، U لا يوصل
R_SET = set('اأإآٱدذرزوؤة'); U_SET = set('ء')
def jt(b): return 'U' if b in U_SET else 'R' if b in R_SET else 'D'

# أشكال العرض (FE70–FEFF) لكل حرف: isol/init/medi/fina
FORMS = {}
for cp in range(0xFE70, 0xFF00):
    d = unicodedata.decomposition(chr(cp))
    if d.startswith('<') and ' ' in d:
        tag, rest = d.split(' ', 1)
        if len(rest.split()) == 1: FORMS.setdefault(chr(int(rest, 16)), {})[tag.strip('<>')] = chr(cp)
# حروف بلا شكل عرض مستقل في Unicode: ٱ (0671) له FB50..
for cp in range(0xFB50, 0xFC00):
    d = unicodedata.decomposition(chr(cp))
    if d.startswith('<') and len(d.split()) == 2:
        tag, rest = d.split(' ', 1); FORMS.setdefault(chr(int(rest, 16)), {})[tag.strip('<>')] = chr(cp)
ALIAS = {'ٱ': 'ا'}  # الخط المصدر بلا ألف الوصل: يُرسم بالألف في التجربة (الخط الإنتاجي يرسم علامة الوصل)
def gname(ch, form):
    ch = ALIAS.get(ch, ch)
    base = chr(ord(ch)) if form == 'isolated' else None
    c = FORMS.get(ch, {}).get(form)
    if c and ord(c) in cmap: return cmap[ord(c)]
    if form == 'isolated' and ord(ch) in cmap: return cmap[ord(ch)]
    # لا شكل مستقل (حروف غير موصولة): استعمل المنفرد
    if ord(ch) in cmap: return cmap[ord(ch)]
    return None
def bounds(name):
    bp = BoundsPen(gs); gs[name].draw(bp); return bp.bounds
MK = {m: cmap[ord(m)] for m in (FATHA, DAMMA, KASRA, SHADDA, SUKUN, TF, TD, TK)}
def draw(name, dx=0, dy=0, pen=None):
    gs[name].draw(TransformPen(pen, (1, 0, 0, 1, dx, dy)))
def mk_glyph(base_gn, marks):
    pen = TTGlyphPen(gs); draw(base_gn, 0, 0, pen)
    bb = bounds(base_gn) or (0, 0, hmtx[base_gn][0], 0); adv = hmtx[base_gn][0]
    cx = (bb[0] + bb[2]) / 2; top = max(bb[3], 900); bot = min(bb[1], -150)
    above = [m for m in marks if m in (FATHA, DAMMA, SUKUN, SHADDA, TF, TD)]; below = [m for m in marks if m in (KASRA, TK)]
    # ترتيب الطبقات: الشدّة أولًا ثم الحركة فوقها
    above.sort(key=lambda m: 0 if m == SHADDA else 1)
    y = top
    for m in above:
        mb = bounds(MK[m]); mcx = (mb[0] + mb[2]) / 2
        draw(MK[m], cx - mcx, y - mb[1] + 40, pen); y = y + (mb[3] - mb[1]) + 60
    y = bot
    for m in below:
        mb = bounds(MK[m]); mcx = (mb[0] + mb[2]) / 2
        draw(MK[m], cx - mcx, y - mb[3] - 40, pen); y -= (mb[3] - mb[1]) + 60
    return pen.glyph(), adv

glyph_order = list(f.getGlyphOrder()); new_glyphs = {}; cmap_add = {}; cls = {k: [] for k in ('D_isol', 'D_init', 'D_medi', 'D_fina', 'R_isol', 'R_fina')}
cp = 0xE000; table = []
for b, ms in [(b, m) for b in BASES for m in MARK_SETS] + [(b, '') for b in BASES]:  # ثم الحروف العارية (بلا علامات) بعد الـ481
    if True:
        ch = chr(cp); cp += 1
        iso = gname(b, 'isolated'); 
        t = jt(b)
        forms = {'isol': iso}
        if t == 'D': forms.update(init=gname(b, 'initial'), medi=gname(b, 'medial'), fina=gname(b, 'final'))
        if t == 'R': forms.update(fina=gname(b, 'final'))
        nm = 'ua%04X' % ord(ch)
        for k, g in forms.items():
            if g is None: g = iso
            gl, adv = mk_glyph(g, ms)
            name = nm if k == 'isol' else nm + '.' + k
            new_glyphs[name] = (gl, adv); glyph_order.append(name)
        cmap_add[ord(ch)] = nm
        if t == 'D': cls['D_isol'].append(nm); cls['D_init'].append(nm + '.init'); cls['D_medi'].append(nm + '.medi'); cls['D_fina'].append(nm + '.fina')
        if t == 'R': cls['R_isol'].append(nm); cls['R_fina'].append(nm + '.fina')
# أدخل الخطوط
f.setGlyphOrder(glyph_order)
glyf = f['glyf']
for name, (gl, adv) in new_glyphs.items():
    glyf.glyphs[name] = gl; gl.recalcBounds(glyf); hmtx.metrics[name] = (adv, getattr(gl, 'xMin', 0) if gl.numberOfContours else 0)  # الحافة اليسرى = xMin وإلا انزاح الرسم عن موضعه فانقطع الوصل
for t in f['cmap'].tables:
    if t.isUnicode(): t.cmap.update(cmap_add)
f['maxp'].numGlyphs = len(glyph_order)
if 'post' in f and getattr(f['post'], 'formatType', 0) == 2.0: f['post'].extraNames = []; f['post'].mapping = {}
f['post'].formatType = 3.0
# قواعد الوصل. ملاحظة تجريبية: في Chromium مع direction:rtl يمرّر HarfBuzz الحروف إلى جداول الخط بترتيب العرض (معكوسًا عن المنطقي)،
# فالقاعدة هنا مكتوبة على الترتيب المعكوس: «ما قبل» الحرف في المخزن = الحرف التالي منطقيًّا (عولج قبله فصار شكله نهائيًّا)، و«ما بعده» = السابق منطقيًّا (لم يُعالج بعد، ما زال منفردًا).
J = ' '.join(cls['D_isol'])
rules = """  sub @Back @D_isol' lookup L_medi @D_isol;
  sub @D_isol' lookup L_finaD @D_isol;
  sub @Back @D_isol' lookup L_init;
  sub @R_isol' lookup L_finaR @D_isol;
"""
fea = f"""
@D_isol = [{' '.join(cls['D_isol'])}];
@D_init = [{' '.join(cls['D_init'])}];
@D_medi = [{' '.join(cls['D_medi'])}];
@D_fina = [{' '.join(cls['D_fina'])}];
@R_isol = [{' '.join(cls['R_isol'])}];
@R_fina = [{' '.join(cls['R_fina'])}];
@Back = [{' '.join(cls['D_medi'] + cls['D_fina'] + cls['R_fina'])}];
lookup L_init {{ sub @D_isol by @D_init; }} L_init;
lookup L_medi {{ sub @D_isol by @D_medi; }} L_medi;
lookup L_finaD {{ sub @D_isol by @D_fina; }} L_finaD;
lookup L_finaR {{ sub @R_isol by @R_fina; }} L_finaR;
feature calt {{
  script DFLT; language dflt;
{rules}}} calt;
feature calt {{
  script arab; language dflt;
{rules}}} calt;
"""
open('font/atomic.fea', 'w', encoding='utf-8').write(fea)
addOpenTypeFeaturesFromString(f, fea)
f['name'].setName('NawaAtomic Spike', 1, 3, 1, 0x409); f['name'].setName('NawaAtomic Spike', 4, 3, 1, 0x409); f['name'].setName('NawaAtomicSpike', 6, 3, 1, 0x409)
f.save(OUT); print('glyphs', len(glyph_order), '->', OUT)
