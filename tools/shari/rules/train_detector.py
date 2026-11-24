# كاشف الجمل الحاكمة: انحدار لوجستي مبني بأيدينا على ميزات n-gram مُجزَّأة (hashing) — أوزانه تُولَّد في المهمة ولا تُحفظ.
# python3 train_detector.py src.txt gold.jsonl
import sys, json, re, unicodedata, numpy as np
sys.path.insert(0, '.')
def norm(s):
    s = unicodedata.normalize('NFC', s)
    s = re.sub('[ؐ-ًؚ-ٰٟۖ-ۭـ]', '', s)
    s = re.sub('[آأإٱ]', 'ا', s).replace('ى', 'ي').replace('ة', 'ه')
    return re.sub(r'[^ء-غف-ي0-9 ]+', ' ', s).split()
def pages(f):
    d, k, buf = {}, None, []
    for ln in open(f, encoding='utf8'):
        m = re.match(r'# PageV(\d+)P(\d+)', ln)
        if m:
            if k: d[k] = ' '.join(buf)
            k, buf = int(m.group(2)), []; continue
        if k and not ln.startswith('#META#'): buf.append(re.sub(r'^(#|~~)\s*', '', ln.strip()))
    if k: d[k] = ' '.join(buf)
    return d
def sents(t): return [s.strip() for s in re.split(r'(?<=[.؟!:])\s+', t) if len(s.split()) >= 4]
D = 2**16
def feats(s):
    w = norm(s); f = set()
    for i, x in enumerate(w):
        f.add(hash(('u', x)) % D)
        if i + 1 < len(w): f.add(hash(('b', x, w[i+1])) % D)
    if w: f.add(hash(('first', w[0])) % D); f.add(hash(('first2', tuple(w[:2]))) % D)
    for x in w: f.add(hash(('p', x[:3])) % D)   # بادئات تلتقط الاشتقاق
    return list(f)
def fit(X, y, ep=60, lr=0.5, l2=1e-4):
    w = np.zeros(D); b = 0.0
    for _ in range(ep):
        for i in np.random.permutation(len(X)):
            z = w[X[i]].sum() + b; p = 1 / (1 + np.exp(-z)); g = p - y[i]
            w[X[i]] -= lr * (g + l2 * w[X[i]]); b -= lr * g
    return w, b
if __name__ == '__main__':
    import os; os.environ['PYTHONHASHSEED'] = '0'
    src, gold = sys.argv[1:3]
    P = pages(src); G = [json.loads(l) for l in open(gold, encoding='utf8') if l.strip()]
    gq = [' '.join(norm(g['src']['quote'])) for g in G]
    lo, hi = min(g['src']['page'] for g in G), max(g['src']['page'] for g in G)
    S = [(p, s) for p in sorted(P) if lo <= p <= hi for s in sents(P[p])]
    y = np.array([1 if any(q.startswith(' '.join(norm(s)[:5])) or ' '.join(norm(s)[:8]) in q or q[:40] in ' '.join(norm(s)) for q in gq) else 0 for _, s in S])
    X = [feats(s) for _, s in S]
    print('جمل', len(S), 'إيجابية', y.sum())
    rng = np.random.RandomState(1); idx = rng.permutation(len(S)); K = 5; tp = fp = fn = 0
    for k in range(K):
        te = idx[k::K]; tr = np.setdiff1d(idx, te)
        w, b = fit([X[i] for i in tr], y[tr])
        pr = np.array([w[X[i]].sum() + b > 0 for i in te]); yt = y[te]
        tp += (pr & (yt == 1)).sum(); fp += (pr & (yt == 0)).sum(); fn += (~pr & (yt == 1)).sum()
    print(f'تحقق متقاطع: دقة {tp/max(1,tp+fp):.2f} استدعاء {tp/max(1,tp+fn):.2f}')
