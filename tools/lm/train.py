# تدريب نموذج لغة سببي صغير من الصفر على متن نواة (عربية وقرآن وسنة وتراث). الأوزان والمجزّئ ملك المشروع؛ PyTorch أداة حساب فقط.
# البيئة: DATA، OUT، PRESET (smoke|small|base)، HOURS (مدة هذا التشغيل)، MAX_STEPS (أفق الجدول)، HF_TOKEN، HF_REPO.
import os, sys, json, math, time, random, glob
import numpy as np, torch, torch.nn as nn, torch.nn.functional as F
from tokenizers import Tokenizer, models, trainers, pre_tokenizers, decoders
DATA = os.environ.get('DATA', '/kaggle/working/data'); OUT = os.environ.get('OUT', '/kaggle/working/ckpt'); os.makedirs(OUT, exist_ok=True)
PRESET = os.environ.get('PRESET', 'smoke'); HOURS = float(os.environ.get('HOURS', '1')); T0 = time.time()
HF_TOKEN = os.environ.get('HF_TOKEN', ''); HF_REPO = os.environ.get('HF_REPO', 'kaledgmal/nawa-lm')
CFG = {'smoke': dict(d=256, L=4, H=4, T=512, mb=16, acc=1, vocab=8000, lr=1e-3, steps=600),
       'small': dict(d=640, L=10, H=10, T=1024, mb=12, acc=3, vocab=24000, lr=6e-4, steps=30000),
       'base': dict(d=768, L=12, H=12, T=1024, mb=10, acc=4, vocab=32000, lr=5e-4, steps=60000)}[PRESET]
CFG['steps'] = int(os.environ.get('MAX_STEPS') or CFG['steps'])
dev = 'cuda' if torch.cuda.is_available() else 'cpu'; print('الجهاز', dev, torch.cuda.get_device_name(0) if dev == 'cuda' else '', flush=True)
api = None
if HF_TOKEN:
    from huggingface_hub import HfApi, hf_hub_download
    api = HfApi(token=HF_TOKEN); api.create_repo(HF_REPO, private=True, exist_ok=True)
def hf_get(name):
    try: return hf_hub_download(HF_REPO, name, token=HF_TOKEN, local_dir=OUT)
    except Exception: return None
def hf_put(path, name=None):
    if api:
        try: api.upload_file(path_or_fileobj=path, path_in_repo=name or os.path.basename(path), repo_id=HF_REPO); print('رُفع', name or path, flush=True)
        except Exception as e: print('تعذّر الرفع', e, flush=True)
# ١) المجزّئ: يُستأنف من المستودع إن وُجد وإلا يُدرَّب من متننا (BPE بايتي)
manifest = json.load(open(DATA + '/manifest.json', encoding='utf8'))
def docs(name):
    buf = []
    for ln in open(f'{DATA}/{name}.txt', encoding='utf8'):
        if ln.strip(): buf.append(ln.rstrip('\n'))
        elif buf: yield '\n'.join(buf); buf = []
    if buf: yield '\n'.join(buf)
tp = hf_get('tokenizer.json') or (OUT + '/tokenizer.json' if os.path.exists(OUT + '/tokenizer.json') else None)
if tp: tok = Tokenizer.from_file(tp); print('مجزّئ مستأنف', tok.get_vocab_size(), flush=True)
else:
    tok = Tokenizer(models.BPE()); tok.pre_tokenizer = pre_tokenizers.ByteLevel(add_prefix_space=False); tok.decoder = decoders.ByteLevel()
    def sample():
        rnd = random.Random(1); n = 0
        for name in manifest:
            for i, d in enumerate(docs(name)):
                if rnd.random() < float(os.environ.get('TOK_FRAC', '0.15')): yield d[:4000]; n += 1
    tok.train_from_iterator(sample(), trainers.BpeTrainer(vocab_size=CFG['vocab'], special_tokens=['<pad>', '<eos>'], initial_alphabet=pre_tokenizers.ByteLevel.alphabet(), show_progress=False))
    tok.save(OUT + '/tokenizer.json'); hf_put(OUT + '/tokenizer.json')
V = tok.get_vocab_size(); EOS = tok.token_to_id('<eos>'); print('المفردات', V, 'زمن', int(time.time() - T0), flush=True)
# ٢) ترميز المتن إلى مصفوفة uint16 (الحديث/القرآن يُكرَّران وفق rep)
import zlib
tr, va = [], []
for name, meta in manifest.items():
    loc = []; batch = []; chars = 0; n_tok = 0
    def flush_batch():
        global n_tok
        for j, ids in enumerate(tok.encode_batch(batch)):
            a = np.array(ids.ids + [EOS], dtype=np.uint16); n_tok += len(a)
            (va if (zlib.crc32(batch[j][:60].encode()) % 200 == 0) else loc).append(a)
    for d in docs(name):
        for i in range(0, len(d), 200000):   # يحدّ الذاكرة: لا وثيقة ترمَّز دفعة واحدة فوق ٢٠٠ ألف حرف
            batch.append(d[i:i + 200000]); chars += len(batch[-1])
        if chars > 8_000_000: flush_batch(); batch = []; chars = 0
    if batch: flush_batch()
    meta['tokens'] = n_tok; tr.extend(loc * max(1, int(meta.get('rep', 1)))); print(f"{name}: {n_tok/1e6:.1f}M رمز × {meta.get('rep', 1)}", flush=True)
train = np.concatenate(tr); val = np.concatenate(va) if va else train[:100000]
print('رموز التدريب', len(train), 'تحقق', len(val), flush=True)
del tr, va
json.dump(manifest, open(OUT + '/manifest.json', 'w', encoding='utf8'), ensure_ascii=False, indent=1)
# المصادر الأعلى وزنًا (الحديث، القرآن) مكرَّرة في المتن وفق rep
rng = np.random.default_rng(0)
def batch_of(arr, B, T):
    ix = rng.integers(0, len(arr) - T - 1, size=B)
    x = np.stack([arr[i:i + T] for i in ix]).astype(np.int64); y = np.stack([arr[i + 1:i + T + 1] for i in ix]).astype(np.int64)
    return torch.from_numpy(x).to(dev), torch.from_numpy(y).to(dev)
# ٣) النموذج: RMSNorm + RoPE + SwiGLU + انتباه سببي، أوزان الإدخال والإخراج مشتركة
class RMS(nn.Module):
    def __init__(s, d): super().__init__(); s.w = nn.Parameter(torch.ones(d))
    def forward(s, x): return x * torch.rsqrt(x.float().pow(2).mean(-1, keepdim=True) + 1e-6).to(x.dtype) * s.w
def rope_cache(T, hd, dev):
    inv = 1.0 / (10000 ** (torch.arange(0, hd, 2, device=dev).float() / hd)); t = torch.arange(T, device=dev).float()
    f = torch.outer(t, inv); return f.cos(), f.sin()
def rope(x, cos, sin):
    x1, x2 = x[..., ::2], x[..., 1::2]; o = torch.stack((x1 * cos - x2 * sin, x1 * sin + x2 * cos), -1); return o.flatten(-2).to(x.dtype)
class Block(nn.Module):
    def __init__(s, d, H):
        super().__init__(); s.H = H; s.n1 = RMS(d); s.n2 = RMS(d); s.qkv = nn.Linear(d, 3 * d, bias=False); s.o = nn.Linear(d, d, bias=False)
        h = int(8 * d / 3 / 64) * 64; s.g = nn.Linear(d, h, bias=False); s.u = nn.Linear(d, h, bias=False); s.dn = nn.Linear(h, d, bias=False)
    def forward(s, x, cos, sin):
        B, T, D = x.shape; q, k, v = s.qkv(s.n1(x)).view(B, T, 3, s.H, D // s.H).permute(2, 0, 3, 1, 4)
        q, k = rope(q, cos[:T], sin[:T]), rope(k, cos[:T], sin[:T])
        a = F.scaled_dot_product_attention(q, k, v, is_causal=True).transpose(1, 2).reshape(B, T, D)
        x = x + s.o(a); h = s.n2(x); return x + s.dn(F.silu(s.g(h)) * s.u(h))
class GPT(nn.Module):
    def __init__(s, c):
        super().__init__(); s.c = c; s.emb = nn.Embedding(V, c['d']); s.blocks = nn.ModuleList(Block(c['d'], c['H']) for _ in range(c['L'])); s.nf = RMS(c['d'])
        s.register_buffer('cos', rope_cache(c['T'], c['d'] // c['H'], 'cpu')[0], persistent=False); s.register_buffer('sin', rope_cache(c['T'], c['d'] // c['H'], 'cpu')[1], persistent=False)
        s.apply(s._init)
        for b in s.blocks: nn.init.normal_(b.o.weight, 0, 0.02 / math.sqrt(2 * c['L'])); nn.init.normal_(b.dn.weight, 0, 0.02 / math.sqrt(2 * c['L']))
    def _init(s, m):
        if isinstance(m, (nn.Linear, nn.Embedding)): nn.init.normal_(m.weight, 0, 0.02)
    def forward(s, x, y=None):
        h = s.emb(x)
        for b in s.blocks: h = b(h, s.cos, s.sin)
        lg = F.linear(s.nf(h), s.emb.weight)
        return lg, (F.cross_entropy(lg.float().view(-1, V), y.view(-1)) if y is not None else None)
model = GPT(CFG).to(dev); npar = sum(p.numel() for p in model.parameters()); print(f"المعاملات {npar/1e6:.1f}M", flush=True)
dec = [p for n, p in model.named_parameters() if p.dim() >= 2]; nod = [p for n, p in model.named_parameters() if p.dim() < 2]
opt = torch.optim.AdamW([{'params': dec, 'weight_decay': 0.1}, {'params': nod, 'weight_decay': 0.0}], lr=CFG['lr'], betas=(0.9, 0.95), fused=(dev == 'cuda'))
scaler = torch.amp.GradScaler(enabled=(dev == 'cuda')); step = 0
last = hf_get('last.pt') or (OUT + '/last.pt' if os.path.exists(OUT + '/last.pt') else None)
if last:
    ck = torch.load(last, map_location=dev); model.load_state_dict(ck['model']); opt.load_state_dict(ck['opt']); step = ck['step']; print('استئناف من الخطوة', step, flush=True)
def lr_at(s):
    w = 200
    if s < w: return CFG['lr'] * (s + 1) / w
    p = min(1.0, (s - w) / max(1, CFG['steps'] - w)); return CFG['lr'] * (0.1 + 0.9 * 0.5 * (1 + math.cos(math.pi * p)))
@torch.no_grad()
def evaluate(n=20):
    model.eval(); L = []
    for _ in range(n):
        x, y = batch_of(val, CFG['mb'], CFG['T'])
        with torch.autocast(dev, dtype=torch.float16, enabled=(dev == 'cuda')): _, l = model(x, y)
        L.append(l.item())
    model.train(); return float(np.mean(L))
def save(tag):
    p = OUT + '/last.pt'; torch.save({'model': model.state_dict(), 'opt': opt.state_dict(), 'step': step, 'cfg': CFG}, p)
    hf_put(p, 'last.pt'); json.dump({'step': step, 'cfg': CFG, 'params': npar, 'vocab': V}, open(OUT + '/status.json', 'w')); hf_put(OUT + '/status.json')
# ٤) حلقة التدريب بمهلة زمنية
budget = HOURS * 3600 - 420; model.train(); t_last = time.time(); t_ck = time.time(); tokens_seen = 0; ema = None
while step < CFG['steps'] and (time.time() - T0) < budget:
    for g in opt.param_groups: g['lr'] = lr_at(step)
    tot = 0.0
    for _ in range(CFG['acc']):
        x, y = batch_of(train, CFG['mb'], CFG['T'])
        with torch.autocast(dev, dtype=torch.float16, enabled=(dev == 'cuda')): _, loss = model(x, y)
        scaler.scale(loss / CFG['acc']).backward(); tot += loss.item() / CFG['acc']
    scaler.unscale_(opt); torch.nn.utils.clip_grad_norm_(model.parameters(), 1.0); scaler.step(opt); scaler.update(); opt.zero_grad(set_to_none=True); step += 1
    tokens_seen += CFG['mb'] * CFG['acc'] * CFG['T']; ema = tot if ema is None else 0.98 * ema + 0.02 * tot
    if step % 25 == 0: print(f"خطوة {step} خسارة {ema:.3f} lr {lr_at(step):.2e} رمز/ث {tokens_seen/(time.time()-t_last+1e-9):.0f}", flush=True)
    if step % 250 == 0: print(f"تحقق {step}: خسارة {evaluate():.3f}", flush=True)
    if time.time() - t_ck > 2700: save('mid'); t_ck = time.time()
vl = evaluate(50); print(f"نهاية التشغيل: خطوة {step} خسارة تحقق {vl:.3f} حيرة {math.exp(vl):.1f}", flush=True)
save('end')
# ٥) تصدير الأوزان بصيغة npz (fp32) لتحميلها بمحركنا المستقل لاحقًا + عيّنات توليد
np.savez(OUT + '/nawa_lm.npz', **{k: v.float().cpu().numpy() for k, v in model.state_dict().items()}); json.dump(dict(CFG, vocab=V, params=npar, step=step, val_loss=vl), open(OUT + '/nawa_lm.json', 'w'))
hf_put(OUT + '/nawa_lm.npz'); hf_put(OUT + '/nawa_lm.json')
@torch.no_grad()
def gen(prompt, n=60, k=20):
    ids = torch.tensor([tok.encode(prompt).ids], device=dev); model.eval()
    for _ in range(n):
        lg, _ = model(ids[:, -CFG['T']:]); p = F.softmax(lg[0, -1].float(), -1); v, ix = p.topk(k); ids = torch.cat([ids, ix[torch.multinomial(v, 1)].view(1, 1)], 1)
    return tok.decode(ids[0].tolist())
for pr in ['بسم الله الرحمن الرحيم', 'قال رسول الله صلى الله عليه وسلم', 'الحمد لله رب العالمين', 'باب في أحكام الصلاة', 'اختلف الفقهاء في']:
    print('>>', gen(pr).replace('\n', ' '), flush=True)
