# تدريب المُشكِّل: كل شيء من الإعدادات (الحجم، الطول، الدفعة، الزمن). نفس الأمر على أي جهاز.
# python3 dia_train.py data.npz out_prefix --minutes 30 --d 128 --layers 3 --heads 4 --ff 512 --batch 32 --T 128 --val ali/dataset/val.txt
import sys, time, json, math, argparse
sys.path.insert(0, __file__.rsplit('/', 1)[0])
import numpy as np, dia_model as M, diacritizer_data as DD
xp = M.xp
KEEP = [DD.IDX[c] for c in 'اىيو']   # حروف آخر الكلمة التي يصحّ فيها غياب الحركة
def predict(m, X, T=None, stride=None):
    T = T or m.cfg['maxlen']; stride = stride or T // 2; out = np.zeros(len(X), np.uint8); n = len(X)
    starts = list(range(0, max(1, n - T + stride), stride)); batch = []
    def run(bs):
        ids = np.stack([np.pad(X[s:s + T], (0, T - len(X[s:s + T]))) for s in bs]).astype(np.int64)
        z = m.forward(xp.asarray(ids)); z = z.get() if M.GPU else z; return z.argmax(-1)
    best = np.full(n, -np.inf)   # أفضل موضع: الأقرب لمنتصف النافذة
    for i in range(0, len(starts), 32):
        bs = starts[i:i + 32]; pr = run(bs)
        for s, row in zip(bs, pr):
            L = min(T, n - s); idx = np.arange(L); sc = -np.abs(idx - T / 2)
            if s == 0: sc[: T // 2] = 1e9 - idx[: T // 2] * 0   # بداية النص: خذ كل ما قبل المنتصف
            sel = sc > best[s:s + L]; out[s:s + L][sel] = row[:L][sel]; best[s:s + L][sel] = sc[sel]
    return out
def der(m, X, Y, sub=None):
    if sub: X, Y = X[:sub], Y[:sub]
    pr = predict(m, X); L = X > 1; nxt = np.append(X[1:], 1); last = L & (nxt == 1)
    return float((pr[L] != Y[L]).mean()), float((pr[L & ~last] != Y[L & ~last]).mean())
def load_eval(path):
    X, Y = [], []
    for line in open(path, encoding='utf-8'):
        x, y = DD.encode2(line)
        if len(x) < 3: continue
        X += [x, np.array([1], np.uint8)]; Y += [y, np.array([0], np.uint8)]
    return np.concatenate(X), np.concatenate(Y)
if __name__ == '__main__':
    a = argparse.ArgumentParser(); a.add_argument('data'); a.add_argument('out')
    for k, v in dict(minutes=30., d=128, layers=3, heads=4, ff=512, batch=32, T=128, lr=1e-3, seed=0).items(): a.add_argument('--' + k, type=type(v), default=v)
    a.add_argument('--mask-final-none', action='store_true'); a.add_argument('--val', default=None); a.add_argument('--resume', default=None); A = a.parse_args()
    d = np.load(A.data); X, Y = d['X'], d['Y']; cut = int(len(X) * 0.98); VX, VY = X[cut:], Y[cut:]; X, Y = X[:cut], Y[:cut]
    m = M.Model.load(A.resume) if A.resume else M.Model(dict(d=A.d, layers=A.layers, heads=A.heads, ff=A.ff, maxlen=A.T), A.seed)
    AX = AY = None
    if A.val: AX, AY = load_eval(A.val); AX, AY = AX[:40000], AY[:40000]
    log = open(A.out + '.log', 'a'); P = lambda s: (print(s, flush=True), log.write(s + '\n'), log.flush())
    P(f'params {m.nparams} cfg {m.cfg} gpu {M.GPU}'); mo = {k: xp.zeros_like(v) for k, v in m.p.items()}; v2 = {k: xp.zeros_like(v) for k, v in m.p.items()}
    rng = np.random.default_rng(A.seed + 1); t0 = time.time(); step = 0; T = A.T; B = A.batch
    while time.time() - t0 < A.minutes * 60:
        st = rng.integers(0, len(X) - T, B); ids = np.stack([X[s:s + T] for s in st]).astype(np.int64); y = np.stack([Y[s:s + T] for s in st]).astype(np.int64)
        mask = (ids > 1)
        if A.mask_final_none:   # تسمية ناقصة: حرف ساكن أخير بلا حركة في بيانات الحديث (مقابل ٠٪ في المعيار) فلا يُحسب عليه الخسارة
            nx = np.concatenate([ids[:, 1:], np.zeros((B, 1), np.int64)], 1); mask &= ~((nx == 1) & (y == 0) & ~np.isin(ids, KEEP))
        z, ca = m.forward(xp.asarray(ids), True); z = z - z.max(-1, keepdims=True); pr = xp.exp(z); pr /= pr.sum(-1, keepdims=True)
        yy, mk = xp.asarray(y), xp.asarray(mask); bi, ti = xp.arange(B)[:, None], xp.arange(T)[None, :]; n = float(mk.sum())
        loss = float(-(xp.log(pr[bi, ti, yy] + 1e-9) * mk).sum() / n); dz = pr; dz[bi, ti, yy] -= 1; dz = dz * mk[..., None] / n
        g = m.backward(dz, ca); gn = math.sqrt(sum(float((v * v).sum()) for v in g.values())); sc = min(1.0, 1.0 / (gn + 1e-9)); step += 1
        frac = (time.time() - t0) / (A.minutes * 60); lr = A.lr * 0.5 * (1 + math.cos(math.pi * min(frac, 1))) * min(1, step / 200)
        for k in m.p:
            gk = g[k] * sc; mo[k] = 0.9 * mo[k] + 0.1 * gk; v2[k] = 0.999 * v2[k] + 0.001 * gk * gk
            m.p[k] -= lr * ((mo[k] / (1 - 0.9 ** step)) / (xp.sqrt(v2[k] / (1 - 0.999 ** step)) + 1e-8) + 0.01 * m.p[k] * (k not in ('E',) and m.p[k].ndim > 1))
        if step % 200 == 0:
            msg = f'step {step} loss {loss:.4f} t {time.time()-t0:.0f}s val_hadith_der {der(m, VX, VY, 30000)[0]:.4f}'
            if AX is not None: msg += f' val_fiqh_der {der(m, AX, AY)[0]:.4f}'
            P(msg); m.save(A.out)
    m.save(A.out); P('done')
