# التجربة ١ (تُنفَّذ داخل train.py بمتغير LAB): أمانة الاقتباس لنموذج small. تتوفر هنا: model, tok, gen, DATA, CFG.
import os, glob, json, random, sys
sys.path.insert(0, '/kaggle/working/dhad/tools/lab')
from fidelity import Index, score
idx = Index(6); words = 0; CAP = int(os.environ.get('LAB_WORDS') or 40_000_000)
for p in sorted(glob.glob(DATA + '/*.txt')):
    buf = []
    for ln in open(p, encoding='utf8'):
        buf.append(ln)
        if len(buf) >= 2000: t = ''.join(buf); buf = []; idx.add_text(t); words += len(t.split())
        if words > CAP: break
    if buf: idx.add_text(''.join(buf))
    if words > CAP: break
idx.freeze(); print('فهرس', len(idx.arr), 'متتالية من', words, 'كلمة', flush=True)
random.seed(7); prompts = ['بسم الله الرحمن الرحيم', 'قال رسول الله صلى الله عليه وسلم', 'الحمد لله رب العالمين', 'باب في أحكام الصلاة', 'اختلف الفقهاء في', 'حدثنا', 'قال الله تعالى', 'أخبرنا']
for p in sorted(glob.glob(DATA + '/*.txt'))[:3]:
    ls = [l.strip() for l in open(p, encoding='utf8') if len(l.strip()) > 60]
    prompts += [' '.join(l.split()[:4]) for l in random.sample(ls, min(30, len(ls)))] if ls else []
gens = []
for pr in prompts:
    t = gen(pr, n=150, k=20); gens.append(t[len(pr):])
r = score(gens, idx); r.update(model_params=sum(p.numel() for p in model.parameters()), prompts=len(prompts))
print('نتيجة التجربة ١', json.dumps(r, ensure_ascii=False), flush=True)
json.dump(r, open(OUT + '/lab_e1.json', 'w'), ensure_ascii=False)
