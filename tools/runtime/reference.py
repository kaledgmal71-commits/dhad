# مرجع numpy لبنية train.py (RMSNorm + RoPE + SwiGLU + انتباه سببي + أوزان مشتركة): يُستعمل للتحقق من تطابق محرك JS.
import numpy as np
def rms(x, w): return x / np.sqrt((x * x).mean(-1, keepdims=True) + 1e-6) * w
def rope(x, T, hd):
    inv = 1.0 / (10000 ** (np.arange(0, hd, 2, dtype=np.float32) / hd)); f = np.outer(np.arange(T, dtype=np.float32), inv)
    c, s = np.cos(f)[None], np.sin(f)[None]; x1, x2 = x[..., 0::2], x[..., 1::2]
    o = np.empty_like(x); o[..., 0::2] = x1 * c - x2 * s; o[..., 1::2] = x1 * s + x2 * c; return o
def forward(W, cfg, ids):
    d, L, H = cfg['d'], cfg['L'], cfg['H']; hd = d // H; T = len(ids); h = W['emb.weight'][ids]
    for i in range(L):
        p = f'blocks.{i}.'; a = rms(h, W[p + 'n1.w']) @ W[p + 'qkv.weight'].T
        q, k, v = [a[:, j * d:(j + 1) * d].reshape(T, H, hd).transpose(1, 0, 2) for j in range(3)]
        q, k = rope(q, T, hd), rope(k, T, hd); sc = q @ k.transpose(0, 2, 1) / np.sqrt(hd); sc = sc + np.triu(np.full((T, T), -1e30, np.float32), 1)
        sc = np.exp(sc - sc.max(-1, keepdims=True)); sc /= sc.sum(-1, keepdims=True)
        o = (sc @ v).transpose(1, 0, 2).reshape(T, d); h = h + o @ W[p + 'o.weight'].T
        m = rms(h, W[p + 'n2.w']); g = m @ W[p + 'g.weight'].T; u = m @ W[p + 'u.weight'].T; h = h + ((g / (1 + np.exp(-g))) * u) @ W[p + 'dn.weight'].T
    return rms(h, W['nf.w']) @ W['emb.weight'].T
