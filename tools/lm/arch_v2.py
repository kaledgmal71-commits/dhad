# معمارية v2 لنموذج لغة صغير: كل مكوّن مفتاح قابل للإيقاف ليُقاس أثره على حدة (لا نصدّق مكوّنًا لم نقِسه).
# المكوّنات: انتباه مجموعات استعلام GQA، تطبيع Q/K، نافذة محلية متناوبة، تنشيط relu² أو SwiGLU، قصّ اللوجيتات،
# تنبؤ متعدد الرموز MTP (رأس إضافي يتنبأ بالرمز t+2)، تكرار العمق (مشاركة أوزان الطبقات)، ومحسّن Muon للأوزان المصفوفية.
import math, torch, torch.nn as nn, torch.nn.functional as F

class RMS(nn.Module):
    def __init__(s, d): super().__init__(); s.w = nn.Parameter(torch.ones(d))
    def forward(s, x): return x * torch.rsqrt(x.float().pow(2).mean(-1, keepdim=True) + 1e-6).to(x.dtype) * s.w

def rope_cache(T, hd):
    inv = 1.0 / (10000 ** (torch.arange(0, hd, 2).float() / hd)); f = torch.outer(torch.arange(T).float(), inv); return f.cos(), f.sin()
def rope(x, cos, sin):
    x1, x2 = x[..., ::2], x[..., 1::2]; return torch.stack((x1 * cos - x2 * sin, x1 * sin + x2 * cos), -1).flatten(-2).to(x.dtype)

class Attn(nn.Module):
    def __init__(s, d, H, KV, qknorm, window):
        super().__init__(); s.H, s.KV, s.hd, s.window = H, KV, d // H, window
        s.q = nn.Linear(d, H * s.hd, bias=False); s.k = nn.Linear(d, KV * s.hd, bias=False); s.v = nn.Linear(d, KV * s.hd, bias=False); s.o = nn.Linear(d, d, bias=False)
        s.qn = RMS(s.hd) if qknorm else None; s.kn = RMS(s.hd) if qknorm else None
    def forward(s, x, cos, sin, mask):
        B, T, D = x.shape
        q = s.q(x).view(B, T, s.H, s.hd).transpose(1, 2); k = s.k(x).view(B, T, s.KV, s.hd).transpose(1, 2); v = s.v(x).view(B, T, s.KV, s.hd).transpose(1, 2)
        if s.qn is not None: q, k = s.qn(q), s.kn(k)
        q, k = rope(q, cos[:T], sin[:T]), rope(k, cos[:T], sin[:T])
        if s.KV != s.H: k = k.repeat_interleave(s.H // s.KV, 1); v = v.repeat_interleave(s.H // s.KV, 1)
        if s.window: a = F.scaled_dot_product_attention(q, k, v, attn_mask=mask[:T, :T])
        else: a = F.scaled_dot_product_attention(q, k, v, is_causal=True)
        return s.o(a.transpose(1, 2).reshape(B, T, D))

class MLP(nn.Module):
    def __init__(s, d, act):
        super().__init__(); s.act = act; h = int(8 * d / 3 / 64) * 64 if act == 'swiglu' else 4 * d
        s.u = nn.Linear(d, h, bias=False); s.g = nn.Linear(d, h, bias=False) if act == 'swiglu' else None; s.dn = nn.Linear(h, d, bias=False)
    def forward(s, x): return s.dn(F.silu(s.g(x)) * s.u(x)) if s.act == 'swiglu' else s.dn(F.relu(s.u(x)).square())

class Block(nn.Module):
    def __init__(s, c, window):
        super().__init__(); s.n1 = RMS(c['d']); s.n2 = RMS(c['d']); s.at = Attn(c['d'], c['H'], c.get('kv', c['H']), c.get('qknorm', False), window); s.ml = MLP(c['d'], c.get('act', 'swiglu'))
    def forward(s, x, cos, sin, mask): x = x + s.at(s.n1(x), cos, sin, mask); return x + s.ml(s.n2(x))

class GPT2(nn.Module):
    def __init__(s, c, V):
        super().__init__(); s.c = c; s.V = V; d = c['d']; s.emb = nn.Embedding(V, d)
        s.blocks = nn.ModuleList(Block(c, c.get('win', 0) if (i % 2 == 0 and c.get('win')) else 0) for i in range(c['L'])); s.nf = RMS(d); s.loops = c.get('loops', 1)
        cs = rope_cache(c['T'], d // c['H']); s.register_buffer('cos', cs[0], persistent=False); s.register_buffer('sin', cs[1], persistent=False)
        T = c['T']; w = c.get('win', 0) or T; i = torch.arange(T); s.register_buffer('mask', (i[None, :] <= i[:, None]) & (i[:, None] - i[None, :] < w), persistent=False)
        if c.get('mtp'): s.mp = nn.Linear(2 * d, d, bias=False); s.mn1 = RMS(d); s.mn2 = RMS(d); s.mb = Block(c, 0)
        s.apply(s._init); n = c['L'] * s.loops
        for b in s.blocks: nn.init.normal_(b.at.o.weight, 0, 0.02 / math.sqrt(2 * n)); nn.init.normal_(b.ml.dn.weight, 0, 0.02 / math.sqrt(2 * n))
    def _init(s, m):
        if isinstance(m, (nn.Linear, nn.Embedding)): nn.init.normal_(m.weight, 0, 0.02)
    def head(s, h):
        lg = F.linear(s.nf(h), s.emb.weight); cap = s.c.get('softcap', 0)
        return cap * torch.tanh(lg / cap) if cap else lg
    def forward(s, x, y=None):
        h = s.emb(x)
        for _ in range(s.loops):
            for b in s.blocks: h = b(h, s.cos, s.sin, s.mask)
        lg = s.head(h)
        if y is None: return lg, None
        loss = F.cross_entropy(lg.float().view(-1, s.V), y.view(-1))
        if s.c.get('mtp'):   # رأس يتنبأ بالرمز t+2 من حالة t ومن تضمين الرمز t+1 (الهدف المعلوم y[t])
            h2 = s.mp(torch.cat([s.mn1(h[:, :-1]), s.mn2(s.emb(y[:, :-1]))], -1)); h2 = s.mb(h2, s.cos, s.sin, s.mask)
            loss = loss + s.c['mtp'] * F.cross_entropy(s.head(h2).float().view(-1, s.V), y[:, 1:].reshape(-1))
        return lg, loss

def _ns(G, steps=5):   # تعامد نيوتن–شولتس لتحديث Muon
    a, b, c = 3.4445, -4.7750, 2.0315; X = G.float(); X = X / (X.norm() + 1e-7); tr = X.size(0) > X.size(1)
    if tr: X = X.T
    for _ in range(steps): A = X @ X.T; X = a * X + (b * A + c * A @ A) @ X
    return X.T if tr else X

class Muon(torch.optim.Optimizer):
    def __init__(s, params, lr=0.02, momentum=0.95):
        super().__init__(params, dict(lr=lr, momentum=momentum))
    @torch.no_grad()
    def step(s):
        for g in s.param_groups:
            for p in g['params']:
                if p.grad is None: continue
                st = s.state[p]; buf = st.setdefault('b', torch.zeros_like(p.grad)); buf.mul_(g['momentum']).add_(p.grad)
                u = _ns(p.grad.add(buf, alpha=g['momentum'])); p.add_(u.to(p.dtype), alpha=-g['lr'] * max(1.0, p.size(0) / p.size(1)) ** 0.5)

def make_opts(model, lr, muon):
    mats = [p for n, p in model.named_parameters() if p.dim() == 2 and 'emb' not in n]; rest = [p for n, p in model.named_parameters() if not (p.dim() == 2 and 'emb' not in n)]
    if muon: return [Muon(mats, lr=0.02), torch.optim.AdamW(rest, lr=lr, betas=(0.9, 0.95), weight_decay=0.0)]
    return [torch.optim.AdamW([{'params': mats, 'weight_decay': 0.1}, {'params': rest, 'weight_decay': 0.0}], lr=lr, betas=(0.9, 0.95))]
