# يصدّر أوزان نواة (npz من train.py) إلى صيغة nwt للمتصفح: ترويسة JSON + بيانات خام. int8 لكل صف بمقياس خاص للمصفوفات ثنائية الأبعاد.
import sys, json, struct, numpy as np
def export(weights, cfg, path, int8=False):
    tens = []; blobs = []; off = 0
    def put(name, arr, dtype):
        nonlocal off
        b = arr.tobytes(); tens.append({'name': name, 'shape': list(arr.shape), 'dtype': dtype, 'offset': off, 'bytes': len(b)}); blobs.append(b); off += len(b)
    for k in sorted(weights):
        w = np.asarray(weights[k], dtype=np.float32)
        if int8 and w.ndim == 2:
            sc = np.maximum(np.abs(w).max(axis=1), 1e-8) / 127.0
            q = np.clip(np.rint(w / sc[:, None]), -127, 127).astype(np.int8)
            put(k, q, 'i8'); put(k + '.scale', sc.astype(np.float32), 'f32')
        else: put(k, w, 'f32')
    h = json.dumps({'cfg': cfg, 'tensors': tens}).encode('utf8'); pad = (-(4 + len(h))) % 4
    with open(path, 'wb') as f: f.write(struct.pack('<I', len(h) + pad)); f.write(h + b' ' * pad); [f.write(b) for b in blobs]
    return off
def dequant(weights, int8=True):
    out = {}
    for k, w in weights.items():
        w = np.asarray(w, dtype=np.float32)
        if int8 and w.ndim == 2:
            sc = np.maximum(np.abs(w).max(axis=1), 1e-8) / 127.0; out[k] = np.clip(np.rint(w / sc[:, None]), -127, 127) * sc[:, None]
        else: out[k] = w
    return out
if __name__ == '__main__':
    z = np.load(sys.argv[1]); cfgp = sys.argv[1].replace('.npz', '.json'); c = json.load(open(cfgp))
    cfg = {'d': c['d'], 'L': c['L'], 'H': c['H'], 'T': c['T'], 'V': c['vocab']}
    n = export({k: z[k] for k in z.files}, cfg, sys.argv[2], int8='--int8' in sys.argv); print('كُتب', sys.argv[2], n, 'بايت')
