import sys; sys.path.insert(0, __file__.rsplit('/', 1)[0])
import numpy as np, dia_model as M
cfg = dict(d=16, layers=2, heads=2, ff=32, maxlen=16)
m = M.Model(cfg, 1)
for k in m.p: m.p[k] = m.p[k].astype(np.float64)
m.pe = m.pe.astype(np.float64)
r = np.random.default_rng(0); ids = r.integers(0, 40, (3, 7)); y = r.integers(0, 15, (3, 7))
def loss():
    z = m.forward(ids); z = z - z.max(-1, keepdims=True); p = np.exp(z); p /= p.sum(-1, keepdims=True); return -np.log(p[np.arange(3)[:, None], np.arange(7)[None, :], y]).mean()
z, ca = m.forward(ids, True); z = z - z.max(-1, keepdims=True); p = np.exp(z); p /= p.sum(-1, keepdims=True)
dz = p.copy(); dz[np.arange(3)[:, None], np.arange(7)[None, :], y] -= 1; dz /= 21; g = m.backward(dz, ca)
worst = 0; n = 0
for k in m.p:
    a = m.p[k]; fl = a.reshape(-1)
    for i in r.choice(len(fl), min(4, len(fl)), replace=False):
        o = fl[i]; fl[i] = o + 1e-6; l1 = loss(); fl[i] = o - 1e-6; l2 = loss(); fl[i] = o
        num = (l1 - l2) / 2e-6; an = g[k].reshape(-1)[i]; err = abs(num - an) / max(1e-8, abs(num) + abs(an)); worst = max(worst, err); n += 1
        if err > 1e-4: print('BAD', k, i, num, an)
print('checked', n, 'worst rel err', worst)
