# التجربة ٥ (تُنفَّذ داخل train.py بمتغير LAB): مقياس NB-1 على نموذج small (مسار المعاملات). تتوفر: model, tok, gen, DATA, OUT, CFG, dev, torch, F.
import sys, json, glob, os
sys.path.insert(0, '/kaggle/working/dhad/tools/lab')
import nb1
from fidelity import Index
def lines(name):
    p = f'{DATA}/{name}.txt'; return [l.strip() for l in open(p, encoding='utf8') if l.strip()] if os.path.exists(p) else []
verses = lines('quran'); hads = [d for d in lines('hadith')]
items = nb1.build(verses, hads, seed=11, n=200)
print('NB1 أسئلة', {k: len(v) for k, v in items.items()}, flush=True)
@torch.no_grad()
def greedy(prompt, n_tok=48):
    ids = torch.tensor([tok.encode(prompt).ids], device=dev); model.eval()
    for _ in range(n_tok):
        lg, _ = model(ids[:, -CFG['T']:]); ids = torch.cat([ids, lg[0, -1].argmax().view(1, 1)], 1)
    return tok.decode(ids[0].tolist())[len(prompt):]
@torch.no_grad()
def loss_of(text):
    ids = torch.tensor([tok.encode(text).ids[:CFG['T']]], device=dev); model.eval(); _, l = model(ids[:, :-1], ids[:, 1:]); return -l.item()
class LM:
    def complete(s, prompt, n_words): return greedy(prompt)
    def plausibility(s, text): return loss_of(text)
res = nb1.run(LM(), items)
# مسار مؤسَّس (فهرس حرفي على المتن): للتمييز بين الأصيل والمزيَّف فقط؛ الإكمال بالاسترجاع محسوم بالاختبار الوحدوي
idx = Index(4)
for t in verses + hads[:400000]: idx.add_text(t)
idx.freeze()
def pl(text):
    import numpy as np; g = nb1.norm(text); gs = [h for h in __import__('fidelity').grams(g, 4)]; m = idx.has(gs); return float(m.mean()) if len(m) else 0.0
gres = {k: {'n': len(v), 'acc': sum(nb1.score_pair(pl(i['real']), pl(i['fake'])) for i in v) / max(1, len(v))} for k, v in items.items() if 'pair' in k}
out = {'parametric': res, 'parametric_verdict': nb1.verdict(res), 'grounded_pair': gres, 'params': sum(p.numel() for p in model.parameters())}
print('نتيجة التجربة ٥', json.dumps(out, ensure_ascii=False), flush=True)
json.dump(out, open(OUT + '/lab_e5.json', 'w'), ensure_ascii=False)
for k in ('Q_complete', 'H_complete'):
    for i in items[k][:4]: print('عيّنة', k, i['prompt'], '←', greedy(i['prompt'])[:90].replace('\n', ' '), '| ذهبي:', ' '.join(i['gold']), flush=True)
