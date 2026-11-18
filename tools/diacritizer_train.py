# مُشكِّل حرفي بنافذة سياق: تضمين الحروف ← طبقتان مخفيتان ← ١٥ صنف حركة. numpy فقط، انتشار عكسي يدوي وAdam.
import sys, time, numpy as np
sys.path.insert(0, __file__.rsplit('/', 1)[0])
import diacritizer_data as DD
W = 12; V = 40; ED = 32; H1 = 768; H2 = 384; NC = len(DD.CLS); WIN = 2 * W + 1
def windows(X, pos):
    idx = pos[:, None] + np.arange(-W, W + 1)[None, :]
    idx = np.clip(idx, 0, len(X) - 1)
    return X[idx].astype(np.int64)
class Net:
    def __init__(s, seed=0):
        r = np.random.default_rng(seed); g = lambda *a, k=1.0: (r.standard_normal(a) * np.sqrt(2.0 / a[0]) * k).astype(np.float32)
        s.p = {'E': (r.standard_normal((V, ED)) * 0.1).astype(np.float32), 'W1': g(WIN * ED, H1), 'b1': np.zeros(H1, np.float32),
               'W2': g(H1, H2), 'b2': np.zeros(H2, np.float32), 'W3': g(H2, NC, k=0.5), 'b3': np.zeros(NC, np.float32)}
    def fwd(s, ids, train=False):
        p = s.p; e = p['E'][ids].reshape(len(ids), -1)
        a1 = np.maximum(e @ p['W1'] + p['b1'], 0); a2 = np.maximum(a1 @ p['W2'] + p['b2'], 0)
        z = a2 @ p['W3'] + p['b3']; return (e, a1, a2, z) if train else z
def softmax(z):
    z = z - z.max(1, keepdims=True); e = np.exp(z); return e / e.sum(1, keepdims=True)
def train(X, Y, minutes, val, out, bs=4096, lr=1.5e-3, log=print):
    net = Net(); p = net.p; m = {k: np.zeros_like(v) for k, v in p.items()}; v2 = {k: np.zeros_like(v) for k, v in p.items()}
    letters = np.flatnonzero(X > 1); rng = np.random.default_rng(1); t0 = time.time(); step = 0
    while time.time() - t0 < minutes * 60:
        pos = letters[rng.integers(0, len(letters), bs)]; ids = windows(X, pos); y = Y[pos].astype(np.int64)
        e, a1, a2, z = net.fwd(ids, True); pr = softmax(z); loss = -np.log(pr[np.arange(bs), y] + 1e-9).mean()
        dz = pr; dz[np.arange(bs), y] -= 1; dz /= bs; gr = {}
        gr['W3'] = a2.T @ dz; gr['b3'] = dz.sum(0); da2 = (dz @ p['W3'].T) * (a2 > 0)
        gr['W2'] = a1.T @ da2; gr['b2'] = da2.sum(0); da1 = (da2 @ p['W2'].T) * (a1 > 0)
        gr['W1'] = e.T @ da1; gr['b1'] = da1.sum(0); de = (da1 @ p['W1'].T).reshape(bs, WIN, ED)
        gE = np.zeros_like(p['E']); np.add.at(gE, ids, de); gr['E'] = gE
        step += 1; frac = (time.time() - t0) / (minutes * 60); cur = lr * (0.5 * (1 + np.cos(np.pi * min(frac, 1)))) * min(1, step / 200)
        for k in p:
            m[k] = 0.9 * m[k] + 0.1 * gr[k]; v2[k] = 0.999 * v2[k] + 0.001 * gr[k] ** 2
            p[k] -= cur * (m[k] / (1 - 0.9 ** step)) / (np.sqrt(v2[k] / (1 - 0.999 ** step)) + 1e-8)
        if step % 300 == 0:
            log(f'step {step} loss {loss:.4f} t {time.time()-t0:.0f}s val_der {evaluate(net, *val)[0]:.4f}'); np.savez(out, **p)
    np.savez(out, **p); return net
def predict(net, X, bs=8192):
    letters = np.flatnonzero(X > 1); out = np.zeros(len(X), np.uint8)
    for i in range(0, len(letters), bs):
        pos = letters[i:i + bs]; out[pos] = net.fwd(windows(X, pos)).argmax(1)
    return out
def evaluate(net, X, Y, sub=60000):
    if len(X) > sub: X, Y = X[:sub], Y[:sub]
    pr = predict(net, X); L = X > 1
    # نهاية الكلمة: حرف يليه فاصل أو نهاية
    nxt = np.append(X[1:], 1); last = L & (nxt == 1)
    der = (pr[L] != Y[L]).mean(); der_nc = (pr[L & ~last] != Y[L & ~last]).mean()
    return der, der_nc, pr
def load_eval(path):
    X, Y = [], []
    for line in open(path, encoding='utf-8'):
        x, y = DD.encode2(line)
        if len(x) < 3: continue
        X.append(x); Y.append(y); X.append(np.array([1], np.uint8)); Y.append(np.array([0], np.uint8))
    return np.concatenate(X), np.concatenate(Y)
if __name__ == '__main__':
    npz, minutes, out = sys.argv[1], float(sys.argv[2]), sys.argv[3]
    d = np.load(npz); X, Y = d['X'], d['Y']; cut = int(len(X) * 0.98)
    val = (X[cut:], Y[cut:]); X, Y = X[:cut], Y[:cut]
    f = open(out + '.log', 'a')
    def log(s): print(s); f.write(s + '\n'); f.flush()
    train(X, Y, minutes, val, out + '.npz', log=log)
