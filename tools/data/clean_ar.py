"""تنظيف النص العربي لبيانات الجامع: إصلاحات إملائية/تشكيلية آلية آمنة، مع عدّاد لكل نوع إصلاح.
القاعدة: لا يُغيَّر حرف أصلي؛ تُزال الشوائب فقط (رموز غير مرئية، مسافات زائدة، علامات تشكيل مكرّرة أو يتيمة، حروف فارسية)."""
import re, collections

TASH = 'ً-ْٰ'          # فتحتان..سكون + ألف خنجرية
MARK = f'[{TASH}]'
FOOT = re.compile(r'<FootNote\b[^>]*>(.*?)</FootNote>', re.S)
TAG = re.compile(r'</?[^<>\n]{1,80}?/?>')
ZW = re.compile('[​-‏‪-‮⁦-⁩﻿]')
PERS = {'ی': 'ي', 'ک': 'ك', 'ھ': 'ه', 'ہ': 'ه', 'ە': 'ه'}
IND = str.maketrans('0123456789', '٠١٢٣٤٥٦٧٨٩')

def split_markup(s):
    """يعيد (النص الصافي، [نصوص الحواشي]) مع إزالة الوسوم وإبقاء ما بينها."""
    notes = [m.group(1).strip() for m in FOOT.finditer(s)]
    s = FOOT.sub(' ', s)
    s = TAG.sub('', s)
    return s, notes

def fix_orthography(s, stats=None):
    st = stats if stats is not None else collections.Counter()
    def sub(name, rx, rep):
        nonlocal s
        s, n = re.subn(rx, rep, s)
        if n: st[name] += n
    # رموز غير مرئية (علامات الاتجاه تُزال؛ ZWNJ/ZWJ بين حروف عربية لا لزوم لها)
    sub('zero_width', ZW, '')
    sub('nbsp', ' ', ' ')
    # تطويل: يُزال دائمًا (لا يحمل معنى في المتن)
    sub('tatweel', 'ـ', '')
    # حروف فارسية/أردية
    for a, b in PERS.items():
        sub('persian_letters', a, b)
    # تشكيل مكرر متتالٍ: الحركة نفسها أكثر من مرة تُختزل إلى واحدة
    sub('dup_same_mark', f'({MARK})\\1+', r'\1')
    # شدة بعد حركة تُنقل قبلها (الترتيب القياسي: شدة ثم حركة)
    sub('shadda_order', '([ً-ِْ])ّ', 'ّ\\1')
    # ثلاث علامات فأكثر متتالية مختلفة: يبقى الشدة + أول حركة
    def _trim(m):
        g = m.group(0)
        return ('ّ' if 'ّ' in g else '') + next((c for c in g if c != 'ّ'), '')
    s, n = re.subn(f'{MARK}{{3,}}', _trim, s)
    if n: st['mark_overflow'] += n
    # علامة يتيمة بعد مسافة: إن كان ما قبلها حرفًا بلا علامة فتُلصق به، وإلا تُحذف
    def _orphan(m):
        prev, mark, nxt = m.group(1), m.group(2), m.group(3)
        st['orphan_mark'] += 1
        return prev + mark + (' ' if nxt else '') + nxt
    s = re.sub(f'([ء-ي])\\s({MARK})(?!\\s)(\\S?)', _orphan, s)
    s, n = re.subn(f'(?<={MARK})(\\s)({MARK})', r'\1', s)
    if n: st['orphan_mark_dropped'] += n
    # مسافات
    sub('multi_space', r'[ \t]{2,}', ' ')
    sub('space_before_punct', r'\s+([،؛؟.:!])(?=\s|$)', r'\1')
    return s.strip(), st

def normalize_digits(s):
    """توحيد الأرقام اللاتينية إلى هندية عربية داخل النص (لا تمسّ داخل أسماء الوسوم؛ تُطبَّق بعد إزالتها)."""
    return s.translate(IND)

def clean(s, keep_notes=False):
    plain, notes = split_markup(s)
    st = collections.Counter()
    out, st = fix_orthography(plain, st)
    out = normalize_digits(out)
    return (out, notes, st) if keep_notes else (out, st)
