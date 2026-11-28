# تجربة ٣: أثر كل مكوّن معماري على خسارة التحقق بنفس البيانات والمعاملات التقريبية والخطوات (يُنفَّذ بعد train.py ويرث train, val, tok, V, dev).
import sys, json, time, math, numpy as np, torch
sys.path.insert(0, '/kaggle/working/dhad/tools/lm' if __import__('os').path.isdir('/kaggle/working/dhad') else 'tools/lm')
import arch_v2 as A
import os
S = int(os.environ.get('E3_STEPS', '700')); B, T = 16, 256; SEEDS = int(os.environ.get('E3_SEEDS', '1')); ONLY = [x for x in os.environ.get('E3_ONLY', '').split(',') if x]
base = dict(d=int(os.environ.get('E3_D', '256')), L=int(os.environ.get('E3_L', '4')), H=int(os.environ.get('E3_H', '4')), T=T)
VARS = {
  'أساس': dict(base),
  'GQA(2)': dict(base, kv=2),
  'تطبيع Q/K': dict(base, qknorm=True),
  'relu²': dict(base, act='relu2'),
  'قصّ اللوجيتات': dict(base, softcap=30),
  'نافذة محلية': dict(base, win=128),
  'MTP': dict(base, mtp=0.3),
  'تكرار العمق ×2 (نصف الطبقات)': dict(base, L=2, loops=2),
  'Muon': dict(base, _muon=True),
  'الحزمة': dict(base, kv=2, qknorm=True, act='relu2', softcap=30, mtp=0.3, _muon=True),
  'Muon+relu²': dict(base, act='relu2', _muon=True),
}
if ONLY: VARS = {k: v for k, v in VARS.items() if k in ONLY}
def batch(arr, rng):
    ix = rng.integers(0, len(arr) - T - 1, size=B); x = np.stack([arr[i:i + T] for i in ix]).astype(np.int64); y = np.stack([arr[i + 1:i + T + 1] for i in ix]).astype(np.int64)
    return torch.from_numpy(x).to(dev), torch.from_numpy(y).to(dev)
res = {}
for name, c0 in VARS.items():
  vals = []
  for seed in range(SEEDS):
    c = dict(c0); torch.manual_seed(seed); rng = np.random.default_rng(seed); muon = c.pop('_muon', False); m = A.GPT2(c, V).to(dev); n = sum(p.numel() for p in m.parameters())
    opts = A.make_opts(m, 1e-3, muon); t0 = time.time(); m.train()
    for s in range(S):
        f = min(1, (s + 1) / 50) * (0.1 + 0.9 * 0.5 * (1 + math.cos(math.pi * s / S)))
        for o in opts:
            for g in o.param_groups: g['lr'] = g.setdefault('base', g['lr']) * f
        x, y = batch(train, rng); _, loss = m(x, y); loss.backward(); torch.nn.utils.clip_grad_norm_(m.parameters(), 1.0)
        for o in opts: o.step()
        m.zero_grad(set_to_none=True)
    m.eval(); r2 = np.random.default_rng(1); L = []
    with torch.no_grad():
        for _ in range(30): x, y = batch(val, r2); lg, _ = m(x); L.append(torch.nn.functional.cross_entropy(lg.float().view(-1, V), y.view(-1)).item())
    vals.append(float(np.mean(L))); print('E3', name, 'seed', seed, round(vals[-1], 4), 'params', n, 'sec', round(time.time() - t0, 1), flush=True)
  res[name] = dict(val=round(float(np.mean(vals)), 4), std=round(float(np.std(vals)), 4), seeds=len(vals), params=n)
json.dump(res, open(OUT + '/lab_e3.json', 'w'), ensure_ascii=False, indent=1); hf_put(OUT + '/lab_e3.json') if 'hf_put' in globals() else None
print('E3 الخلاصة', json.dumps(res, ensure_ascii=False), flush=True)
