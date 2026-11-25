# يحوّل أوزان المُشكِّل (npz + json) إلى صيغة المتصفح: مصفوفات 2D بـ int8 بمقياس لكل عمود، والباقي float16.
# python3 dia_export_js.py <prefix> <outdir> [text_for_agreement.txt]
import sys, json, struct, numpy as np
sys.path.insert(0, __file__.rsplit('/', 1)[0])
import dia_model as M, dia_train as T
from diacritizer_data import LET, IDX, CLS
prefix, out = sys.argv[1], sys.argv[2]
import os; os.makedirs(out, exist_ok=True)
m = M.Model.load(prefix); cfg = m.cfg
entries, blob = [], bytearray()
def put(b):
    while len(blob) % 4: blob.append(0)
    o = len(blob); blob.extend(b); return o
deq = {}
for k, v in m.p.items():
    a = np.asarray(v.get() if hasattr(v, 'get') else v, np.float32)
    if a.ndim == 2 and k != 'E':
        sc = np.abs(a).max(0) / 127.0; sc[sc == 0] = 1.0
        q = np.clip(np.round(a / sc), -127, 127).astype(np.int8)
        so = put(sc.astype(np.float32).tobytes()); o = put(q.tobytes())
        entries.append(dict(n=k, s=list(a.shape), t='q', o=o, so=so)); deq[k] = q.astype(np.float32) * sc
    else:
        h = a.astype(np.float16); o = put(h.tobytes()); entries.append(dict(n=k, s=list(a.shape), t='h', o=o)); deq[k] = h.astype(np.float32)
open(f'{out}/dia.bin', 'wb').write(blob)
json.dump(dict(cfg=cfg, letters=LET, classes=CLS, tensors=entries), open(f'{out}/dia.json', 'w'), ensure_ascii=False)
print('bytes', len(blob), 'params', m.nparams, 'cfg', cfg)
# اتفاق التنبؤ بين الأوزان الأصلية والمكمَّمة (وبيانات مرجعية لاختبار JS)
if len(sys.argv) > 3:
    txt = open(sys.argv[3], encoding='utf8').read()[:6000]
    X = np.array([IDX.get(c, 1) for c in txt if c in IDX or c == ' '], np.uint8)
    X = np.array([IDX[c] if c in IDX else 1 for c in txt if (c in IDX or c.isspace())], np.uint8)
    p0 = T.predict(m, X)
    orig = {k: m.p[k] for k in m.p}
    for k in m.p: m.p[k] = M.xp.asarray(deq[k])
    p1 = T.predict(m, X)
    print('agreement int8/fp16 vs fp32:', round(float((p0 == p1).mean()), 5), 'on', len(X), 'letters')
    json.dump(dict(x=X[:300].tolist(), y=p1[:300].tolist()), open(f'{out}/ref.json', 'w'))
