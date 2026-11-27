# مقياس أمانة الاقتباس: كم من نص النموذج المولَّد موجود حرفيًّا في المتن، وكم من «المنسوب» (قال رسول الله / حدثنا / قال تعالى …) مختلَق.
# مسجَّل قبل التشغيل (٢٧ نوفمبر): الفرضية ف٣ = إن زادت نسبة المنسوب غير الموجود في المتن عن ٥٠٪ فلا يُعتمد التوليد من الأوزان وحدها في الاقتباس، ويلزم الاسترجاع الحرفي.
import re, zlib, numpy as np
AR_MARKS = re.compile('[ً-ٰٟـ]')
def norm(s):
    s = AR_MARKS.sub('', s)
    s = re.sub('[إأآٱ]', 'ا', s).replace('ى', 'ي').replace('ة', 'ه')
    return re.findall('[ء-ي]+', s)
def h(ws): return zlib.crc32(' '.join(ws).encode('utf8')) | (zlib.adler32(' '.join(ws).encode('utf8')) << 32)
def grams(words, n=6):
    return [h(words[i:i + n]) for i in range(len(words) - n + 1)]
class Index:
    def __init__(s, n=6): s.n = n; s.parts = []; s.arr = None
    def add_text(s, text):
        g = grams(norm(text), s.n)
        if g: s.parts.append(np.array(g, dtype=np.uint64))
    def freeze(s): s.arr = np.unique(np.concatenate(s.parts)) if s.parts else np.zeros(0, np.uint64); s.parts = []
    def has(s, gs):
        if not gs: return np.zeros(0, bool)
        a = np.array(gs, dtype=np.uint64); i = np.searchsorted(s.arr, a); i[i >= len(s.arr)] = 0
        return s.arr[i] == a if len(s.arr) else np.zeros(len(a), bool)
MARK = re.compile(r'(قال رسول الله|قال النبي|حدثنا|أخبرنا|قال الله تعالى|قال تعالى|عن النبي)')
def score(gens, idx, window=14):
    # gens: قائمة نصوص مولَّدة (دون المطالبة). يعيد قاموس المقاييس.
    tot = hit = 0; att = att_bad = 0
    for g in gens:
        ws = norm(g); gs = grams(ws, idx.n); m = idx.has(gs); tot += len(gs); hit += int(m.sum())
        for mt in MARK.finditer(g):
            tail = norm(g[mt.end():])[:window]
            if len(tail) < idx.n: continue
            att += 1
            if not idx.has(grams(tail, idx.n)).any(): att_bad += 1
    return {'ngrams': tot, 'copy_rate': hit / tot if tot else 0.0, 'attributed': att, 'attributed_fabricated': att_bad, 'fabricated_rate': att_bad / att if att else None}
