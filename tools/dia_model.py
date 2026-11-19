# مُشكِّل: Transformer encoder ثنائي الاتجاه (pre-LN)، يعتمد على الإعدادات فقط (الحجم لا يغيّر الكود).
# مستقل عن العتاد: وحدة المصفوفات xp = numpy افتراضيًا، وcupy إن وُجدت (نفس الكود). الأوزان: npz + config.json.
import json, math
try:
    import cupy as xp; GPU = True
except Exception:
    import numpy as xp; GPU = False
import numpy as np
DEFAULT = dict(vocab=40, classes=15, d=128, layers=3, heads=4, ff=512, maxlen=128)
def sinus(T, d):
    pos = np.arange(T)[:, None]; i = np.arange(d // 2)[None, :]
    a = pos / (10000 ** (2 * i / d)); pe = np.zeros((T, d), np.float32); pe[:, 0::2] = np.sin(a); pe[:, 1::2] = np.cos(a); return pe
def gelu(x): c = 0.7978845608; t = xp.tanh(c * (x + 0.044715 * x ** 3)); return 0.5 * x * (1 + t), t
def gelu_bwd(x, t, dy): c = 0.7978845608; return dy * (0.5 * (1 + t) + 0.5 * x * (1 - t * t) * c * (1 + 3 * 0.044715 * x * x))
def ln_f(x, g, b): mu = x.mean(-1, keepdims=True); var = x.var(-1, keepdims=True); r = 1 / xp.sqrt(var + 1e-5); xh = (x - mu) * r; return xh * g + b, (xh, r, g)
def ln_b(dy, c): xh, r, g = c; dxh = dy * g; return r * (dxh - dxh.mean(-1, keepdims=True) - xh * (dxh * xh).mean(-1, keepdims=True)), (dy * xh).sum((0, 1)), dy.sum((0, 1))
class Model:
    def __init__(s, cfg=None, seed=0):
        s.cfg = dict(DEFAULT, **(cfg or {})); c = s.cfg; r = np.random.default_rng(seed); d = c['d']
        n = lambda *a, k=1.0: xp.asarray((r.standard_normal(a) * k / math.sqrt(a[0])).astype(np.float32))
        z = lambda *a: xp.zeros(a, np.float32); o = lambda *a: xp.ones(a, np.float32)
        s.p = {'E': xp.asarray((r.standard_normal((c['vocab'], d)) * 0.05).astype(np.float32)), 'lnf_g': o(d), 'lnf_b': z(d), 'Wo_': n(d, c['classes']), 'bo_': z(c['classes'])}
        for l in range(c['layers']):
            for k in ('q', 'k', 'v', 'o'): s.p[f'{k}{l}'] = n(d, d, k=(0.5 if k == 'o' else 1.0)); s.p[f'b{k}{l}'] = z(d)
            s.p[f'f1{l}'] = n(d, c['ff']); s.p[f'bf1{l}'] = z(c['ff']); s.p[f'f2{l}'] = n(c['ff'], d, k=0.5); s.p[f'bf2{l}'] = z(d)
            for k in ('ln1', 'ln2'): s.p[f'{k}g{l}'] = o(d); s.p[f'{k}b{l}'] = z(d)
        s.pe = xp.asarray(sinus(c['maxlen'], d)); s.nparams = sum(int(np.prod(v.shape)) for v in s.p.values())
    def forward(s, ids, train=False):
        c = s.cfg; p = s.p; B, T = ids.shape; d, h = c['d'], c['heads']; dk = d // h
        x = p['E'][ids] * math.sqrt(d) + s.pe[:T]; caches = []
        for l in range(c['layers']):
            xn, c1 = ln_f(x, p[f'ln1g{l}'], p[f'ln1b{l}'])
            q = (xn @ p[f'q{l}'] + p[f'bq{l}']).reshape(B, T, h, dk).transpose(0, 2, 1, 3)
            k = (xn @ p[f'k{l}'] + p[f'bk{l}']).reshape(B, T, h, dk).transpose(0, 2, 1, 3)
            v = (xn @ p[f'v{l}'] + p[f'bv{l}']).reshape(B, T, h, dk).transpose(0, 2, 1, 3)
            sc = (q @ k.transpose(0, 1, 3, 2)) / math.sqrt(dk); sc = sc - sc.max(-1, keepdims=True); A = xp.exp(sc); A = A / A.sum(-1, keepdims=True)
            om = (A @ v).transpose(0, 2, 1, 3).reshape(B, T, d); x1 = x + om @ p[f'o{l}'] + p[f'bo{l}']
            xn2, c2 = ln_f(x1, p[f'ln2g{l}'], p[f'ln2b{l}']); u = xn2 @ p[f'f1{l}'] + p[f'bf1{l}']; a, t = gelu(u); x = x1 + a @ p[f'f2{l}'] + p[f'bf2{l}']
            caches.append((xn, c1, q, k, v, A, om, xn2, c2, u, t, a))
        xf, cf = ln_f(x, p['lnf_g'], p['lnf_b']); z = xf @ p['Wo_'] + p['bo_']
        return (z, (ids, caches, xf, cf)) if train else z
    def backward(s, dz, cache):
        c = s.cfg; p = s.p; ids, caches, xf, cf = cache; B, T, _ = dz.shape; d, h = c['d'], c['heads']; dk = d // h; g = {}
        g['Wo_'] = xf.reshape(-1, xf.shape[-1]).T @ dz.reshape(-1, dz.shape[-1]); g['bo_'] = dz.sum((0, 1))
        dx, g['lnf_g'], g['lnf_b'] = ln_b(dz @ p['Wo_'].T, cf)
        for l in reversed(range(c['layers'])):
            xn, c1, q, k, v, A, om, xn2, c2, u, t, a = caches[l]; fl = lambda m: m.reshape(-1, m.shape[-1])
            g[f'f2{l}'] = fl(a).T @ fl(dx); g[f'bf2{l}'] = dx.sum((0, 1)); da = dx @ p[f'f2{l}'].T; du = gelu_bwd(u, t, da)
            g[f'f1{l}'] = fl(xn2).T @ fl(du); g[f'bf1{l}'] = du.sum((0, 1)); dxn2 = du @ p[f'f1{l}'].T
            dd, g[f'ln2g{l}'], g[f'ln2b{l}'] = ln_b(dxn2, c2); dx1 = dx + dd
            g[f'o{l}'] = fl(om).T @ fl(dx1); g[f'bo{l}'] = dx1.sum((0, 1)); dom = (dx1 @ p[f'o{l}'].T).reshape(B, T, h, dk).transpose(0, 2, 1, 3)
            dA = dom @ v.transpose(0, 1, 3, 2); dv = A.transpose(0, 1, 3, 2) @ dom
            ds = A * (dA - (dA * A).sum(-1, keepdims=True)) / math.sqrt(dk); dq = ds @ k; dk_ = ds.transpose(0, 1, 3, 2) @ q
            mg = lambda m: m.transpose(0, 2, 1, 3).reshape(B, T, d); dq, dk_, dv = mg(dq), mg(dk_), mg(dv)
            for nm, dm in (('q', dq), ('k', dk_), ('v', dv)): g[f'{nm}{l}'] = fl(xn).T @ fl(dm); g[f'b{nm}{l}'] = dm.sum((0, 1))
            dxn = dq @ p[f'q{l}'].T + dk_ @ p[f'k{l}'].T + dv @ p[f'v{l}'].T
            dd, g[f'ln1g{l}'], g[f'ln1b{l}'] = ln_b(dxn, c1); dx = dx1 + dd
        dE = xp.zeros_like(p['E']); dd = dx * math.sqrt(d)
        if GPU:
            import cupyx; cupyx.scatter_add(dE, xp.asarray(ids), dd)
        else: np.add.at(dE, ids, dd)
        g['E'] = dE; return g
    def save(s, path):
        np.savez(path + '.npz', **{k: (v.get() if GPU else v) for k, v in s.p.items()}); open(path + '.json', 'w').write(json.dumps(s.cfg))
    @staticmethod
    def load(path):
        m = Model(json.load(open(path + '.json'))); d = np.load(path + '.npz')
        for k in m.p: m.p[k] = xp.asarray(d[k])
        return m
