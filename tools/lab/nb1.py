# مقياس نواة NB-1: أمانة النص المقدَّس والمنسوب (قرآن + حديث) بمفتاح إجابة آلي من المتن نفسه.
# العتبات والفرضيات مسجَّلة في docs/مقياس-نواة-NB1.md قبل أي تشغيل. لا تُدفع نصوص المتن إلى المستودع: الأسئلة تُبنى عند التشغيل بذرة ثابتة.
# واجهة النظام المقيس: complete(prompt, n_words) -> str  و  plausibility(text) -> float (الأعلى = أرجح أصالةً).
import re, random, json
_MARKS = re.compile('[ً-ٰٟـ]')
def norm(s):
    s = _MARKS.sub('', s)
    s = re.sub('[إأآٱ]', 'ا', s).replace('ى', 'ي').replace('ة', 'ه')
    return re.findall('[ء-ي]+', s)
def _words(s): return re.findall(r'\S+', s)

def build(verses, hadiths, seed=11, n=200, plen=4, hlen=5, glen=6):
    # verses: أسطر نص الآيات؛ hadiths: نصوص الأحاديث. يعيد قاموسًا بأربع مجموعات أسئلة.
    rnd = random.Random(seed); out = {}
    for name, src, pl, minw in (('Q', verses, plen, 10), ('H', hadiths, hlen, 14)):
        seen = {}; 
        for t in src:
            k = ' '.join(norm(t))
            if len(norm(t)) >= minw: seen.setdefault(k, t)
        texts = sorted(seen.values()); starts = {}
        for t in texts: starts[' '.join(norm(t)[:pl])] = starts.get(' '.join(norm(t)[:pl]), 0) + 1
        uniq = [t for t in texts if starts[' '.join(norm(t)[:pl])] == 1]   # بداية فريدة: لا غموض في المتابعة
        rnd.shuffle(uniq); pick = uniq[:n]
        vocab = sorted({w for t in texts[:20000] for w in norm(t)})
        comp, pair = [], []
        for t in pick:
            ws = _words(t); gold = norm(' '.join(ws[pl:pl + glen]))
            if len(norm(' '.join(ws[:pl]))) != pl or len(gold) != glen: continue   # اتساق التقسيم بين النص الأصلي والمطبَّع
            comp.append({'prompt': ' '.join(ws[:pl]), 'gold': gold})
            real = ' '.join(ws[:12]); rw = norm(real)
            fk = list(rw)
            for i in rnd.sample(range(2, len(fk)), 2): fk[i] = rnd.choice(vocab)
            fake = ' '.join(fk)
            if fake != ' '.join(rw) and fake not in seen: pair.append({'real': real, 'fake': fake})
        out[name + '_complete'] = comp; out[name + '_pair'] = pair
    return out

def score_complete(output, gold):
    ws = norm(output)[:len(gold)]; k = 0
    while k < min(len(ws), len(gold)) and ws[k] == gold[k]: k += 1
    return {'strict': float(len(ws) >= len(gold) and ws == gold), 'prefix': k / len(gold)}
def score_pair(p_real, p_fake): return 1.0 if p_real > p_fake else (0.5 if p_real == p_fake else 0.0)

def run(system, items, n_words=8):
    res = {}
    for name, its in items.items():
        if name.endswith('_complete'):
            sc = [score_complete(system.complete(i['prompt'], n_words), i['gold']) for i in its]
            res[name] = {'n': len(its), 'strict': sum(s['strict'] for s in sc) / max(1, len(sc)), 'prefix': sum(s['prefix'] for s in sc) / max(1, len(sc))}
        else:
            sc = [score_pair(system.plausibility(i['real']), system.plausibility(i['fake'])) for i in its]
            res[name] = {'n': len(its), 'acc': sum(sc) / max(1, len(sc))}
    return res

# العتبات المسجَّلة (مصدر: docs/مقياس-نواة-NB1.md): شرط عرض النظام مقتبِسًا من القرآن والحديث
THRESHOLDS = {'Q_complete.strict': 0.95, 'H_complete.strict': 0.90, 'Q_pair.acc': 0.99, 'H_pair.acc': 0.97}
def verdict(res):
    v = {}
    for k, th in THRESHOLDS.items():
        a, b = k.split('.'); v[k] = {'value': res.get(a, {}).get(b), 'threshold': th, 'pass': (res.get(a, {}).get(b) or 0) >= th}
    v['all_pass'] = all(x['pass'] for x in v.values()); return v

class IndexSystem:   # مسار «مؤسَّس»: بحث حرفي في المتن (مرجع علوي يُثبت أن المقياس قابل للحل بالاسترجاع)
    def __init__(s, texts, n=4):
        s.n = n; s.grams = set(); s.pre = {}
        for t in texts:
            w = norm(t)
            for L in (4, 5): s.pre.setdefault(' '.join(w[:L]), []).append(w[L:])
            for i in range(len(w) - n + 1): s.grams.add(' '.join(w[i:i + n]))
    def complete(s, prompt, n_words):
        c = s.pre.get(' '.join(norm(prompt)), [])
        return ' '.join(c[0][:n_words]) if len(c) == 1 else ''
    def plausibility(s, text):
        w = norm(text); g = [' '.join(w[i:i + s.n]) for i in range(len(w) - s.n + 1)]
        return sum(x in s.grams for x in g) / len(g) if g else 0.0

class RandomSystem:   # خط الأساس الصفري
    def __init__(s, seed=0): s.r = random.Random(seed)
    def complete(s, prompt, n_words): return ''
    def plausibility(s, text): return s.r.random()
