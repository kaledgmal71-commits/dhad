# التجربة ٢: أثر تكميم int8 (لكل صف) على خسارة التحقق لنموذج small، وتصدير nwt لمحرك المتصفح. تُنفَّذ داخل train.py (LAB).
import sys, json, copy, time
sys.path.insert(0, '/kaggle/working/dhad/tools/runtime')
from export_nwt import export, dequant
model.eval(); t0 = time.time(); base = evaluate(100)
sd = {k: v.float().cpu().numpy() for k, v in model.state_dict().items()}
orig = {k: v.clone() for k, v in model.state_dict().items()}
dq = dequant(sd); model.load_state_dict({k: torch.from_numpy(dq[k]).to(orig[k].dtype).to(orig[k].device) for k in dq}, strict=False)
q = evaluate(100)
dq2 = {k: (dq[k] if ('blocks' in k and v.ndim == 2) else sd[k]) for k, v in sd.items()}
model.load_state_dict({k: torch.from_numpy(dq2[k]).to(orig[k].dtype).to(orig[k].device) for k in dq2}, strict=False)
q_blocks = evaluate(100)
model.load_state_dict(orig)
cfg = {'d': CFG['d'], 'L': CFG['L'], 'H': CFG['H'], 'T': CFG['T'], 'V': V}
n8 = export(sd, cfg, OUT + '/nawa_lm.int8.nwt', int8=True); n32 = export(sd, cfg, OUT + '/nawa_lm.f32.nwt', int8=False)
r = {'val_fp32': base, 'val_int8_all': q, 'val_int8_blocks_only': q_blocks, 'delta_all': q - base, 'delta_blocks': q_blocks - base, 'bytes_int8': n8, 'bytes_fp32': n32}
print('نتيجة التجربة ٢', json.dumps(r), flush=True)
json.dump(r, open(OUT + '/lab_e2.json', 'w'))
hf_put(OUT + '/nawa_lm.int8.nwt')
