# تجربة الخصوبة: BPE على مستوى الكلمة بثلاث تمثيلات (بايتات / نقاط يونيكود / ذري). python3 exp_fertility.py hadith_dir test.txt
import sys, re, glob, collections, unicodedata, json, heapq
MARKS = set('ًٌٍَُِّْ')
def words_of(text):
    text = text.replace('‏', '').replace('ـ', '')
    for w in re.findall(r'[ء-يً-ْٱ]+', text): yield w
def rep_bytes(w): return tuple(w.encode('utf-8'))
def rep_cp(w): return tuple(w)
def rep_atomic(w):
    out = []; i = 0
    while i < len(w):
        c = w[i]
        if c in MARKS:   # علامة يتيمة
            out.append(c); i += 1; continue
        j = i + 1; ms = []
        while j < len(w) and w[j] in MARKS: ms.append(w[j]); j += 1
        out.append((c, ''.join(sorted(ms)))); i = j
    return tuple(out)
def train_bpe(counts, nmerges):
    words = [list(w) for w in counts]; freq = [counts[w] for w in counts]
    pc = collections.Counter(); where = collections.defaultdict(set)
    for wi, w in enumerate(words):
        for a, b in zip(w, w[1:]): pc[(a, b)] += freq[wi]; where[(a, b)].add(wi)
    merges = []
    for _ in range(nmerges):
        if not pc: break
        best = max(pc.items(), key=lambda kv: (kv[1], str(kv[0])))[0]
        if pc[best] < 2: break
        merges.append(best); a, b = best; new = (a, b)
        for wi in list(where[best]):
            w = words[wi]; i = 0; nw = []
            while i < len(w):
                if i < len(w) - 1 and w[i] == a and w[i + 1] == b: nw.append(new); i += 2
                else: nw.append(w[i]); i += 1
            for x, y in zip(w, w[1:]):
                pc[(x, y)] -= freq[wi]
                if pc[(x, y)] <= 0: pc.pop((x, y), None)
                where[(x, y)].discard(wi)
            words[wi] = nw
            for x, y in zip(nw, nw[1:]): pc[(x, y)] += freq[wi]; where[(x, y)].add(wi)
        pc.pop(best, None)
    return merges
def apply_bpe(sym, ranks):
    sym = list(sym)
    while len(sym) > 1:
        best = None; bi = -1
        for i in range(len(sym) - 1):
            r = ranks.get((sym[i], sym[i + 1]))
            if r is not None and (best is None or r < best): best, bi = r, i
        if best is None: break
        sym[bi:bi + 2] = [(sym[bi], sym[bi + 1])]
    return len(sym)
if __name__ == '__main__':
    src, test = sys.argv[1], sys.argv[2]
    tr = collections.Counter()
    for f in sorted(glob.glob(src + '/*/*mushakkala*.csv')):
        for line in open(f, encoding='utf-8'):
            for w in words_of(line): tr[w] += 1
    tr = collections.Counter({w: c for w, c in tr.items() if len(re.sub('[ً-ْ]', '', w)) >= 1})
    te = collections.Counter()
    for line in open(test, encoding='utf-8'):
        for w in words_of(line): te[w] += 1
    top = dict(tr.most_common(20000)); print('train words', sum(tr.values()), 'unique', len(tr), 'used', len(top), 'test words', sum(te.values()), 'unique', len(te))
    res = {}
    for name, rep in (('bytes', rep_bytes), ('codepoints', rep_cp), ('atomic', rep_atomic)):
        c2 = collections.Counter()
        for w, n in top.items(): c2[rep(w)] += n
        base = set(s for w in c2 for s in w) | set(s for w in te for s in rep(w))
        merges = train_bpe(c2, 7600); res[name] = {'base': len(base)}
        for V in (1000, 2000, 4000, 8000):
            nm = max(0, V - len(base)); ranks = {m: i for i, m in enumerate(merges[:nm])}
            tot = sum(n * apply_bpe(rep(w), ranks) for w, n in te.items()); nw = sum(te.values())
            res[name][V] = round(tot / nw, 4)
        print(name, res[name], flush=True)
    print(json.dumps(res))
