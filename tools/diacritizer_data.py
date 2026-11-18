# تجهيز بيانات المُشكِّل: حروف بلا تشكيل ← صنف الحركة لكل حرف. numpy فقط.
import re, sys, glob, numpy as np
LET = 'ءآأؤإئابةتثجحخدذرزسشصضطظعغفقكلمنهوىيٱ'
IDX = {c: i + 2 for i, c in enumerate(LET)}   # 0 حشو، 1 فاصل
F, D, K, S, SH, FT, DT, KT = 'َ', 'ُ', 'ِ', 'ْ', 'ّ', 'ً', 'ٌ', 'ٍ'
CLS = ['', F, D, K, S, SH, SH+F, SH+D, SH+K, FT, DT, KT, SH+FT, SH+DT, SH+KT]
CI = {c: i for i, c in enumerate(CLS)}
MARKS = set(F+D+K+S+SH+FT+DT+KT)
def canon(ms):
    s = set(ms); sh = SH in s; v = [m for m in (F, D, K, FT, DT, KT) if m in s]
    if sh: return CI[SH + (v[0] if v else '')]
    if v: return CI[v[0]]
    return CI[S] if S in s else 0
def encode(text):
    """يعيد (رموز الحروف، أصناف الحركات)؛ الفاصل 1 بلا صنف"""
    text = text.replace('‏', '').replace('ـ', '')
    xs, ys = [], []; last = -1
    for ch in text:
        if ch in IDX:
            xs.append(IDX[ch]); ys.append(0); last = len(xs) - 1
        elif ch in MARKS:
            if last >= 0 and xs[last] != 1: ys[last] = ('m', ys[last]) if False else ys[last]; _acc.setdefault(last, []).append(ch)
        else:
            if xs and xs[-1] != 1: xs.append(1); ys.append(0)
            last = -1
    return xs, ys
_acc = {}
def encode2(text):
    global _acc
    _acc = {}
    xs, ys = encode(text)
    ys = [canon(_acc.get(i, [])) if xs[i] != 1 else 0 for i in range(len(xs))]
    return np.array(xs, np.uint8), np.array(ys, np.uint8)
if __name__ == '__main__':
    src, out = sys.argv[1], sys.argv[2]
    X, Y = [], []
    for f in sorted(glob.glob(src + '/*/*mushakkala*.csv')):
        for line in open(f, encoding='utf-8'):
            m = re.match(r'^"[^"]*","(.*)"\s*$', line)
            t = m.group(1) if m else line
            x, y = encode2(t)
            if len(x) < 5 or (y > 0).mean() < 0.4: continue   # أسطر غير مشكولة
            X.append(x); Y.append(y); X.append(np.array([1], np.uint8)); Y.append(np.array([0], np.uint8))
    X = np.concatenate(X); Y = np.concatenate(Y)
    np.savez_compressed(out, X=X, Y=Y); print(len(X), (Y > 0).mean())
