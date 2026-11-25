# موسِّم القواعد: نموذج لغوي مفتوح (استثناء مؤقت مأذون به) يقرأ صفحة فقه ويُخرج مسائلها بنيويًّا،
# ولا تُقبل قيمة إلا إذا كانت مقتطعة حرفيًّا من الصفحة (تحقق آلي). المخرجات إلى مستودع HF خاص؛ النص المصدر لا يُرفع.
import os, re, json, sys, time, subprocess, unicodedata, random
import torch
from transformers import AutoTokenizer, AutoModelForCausalLM, BitsAndBytesConfig
MODEL = os.environ.get('MODEL') or 'ALLaM-AI/ALLaM-7B-Instruct-preview'
N = int(os.environ.get('PAGES') or 60); OUT = os.environ.get('OUT', 'rules'); os.makedirs(OUT, exist_ok=True)
BOOKS = [('muhadhdhab', '0500AH', 'data/0476AbuIshaqShirazi/0476AbuIshaqShirazi.MuhadhdhabFiFiqh/*Shamela0011813-ara1', 'المهذب')]
def sh(c): subprocess.run(c, shell=True, check=True)
def norm(s):
    s = unicodedata.normalize('NFC', s); s = re.sub('[ؐ-ًؚ-ٰٟۖ-ۭـ]', '', s)
    s = re.sub('[آأإٱ]', 'ا', s).replace('ى', 'ي').replace('ة', 'ه'); return ' '.join(re.sub(r'[^ء-غف-ي0-9 ]+', ' ', s).split())
def pages(path):
    d, k, buf = {}, None, []
    for ln in open(path, encoding='utf8'):
        m = re.match(r'# PageV(\d+)P(\d+)', ln)
        if m:
            if k: d[k] = ' '.join(buf)
            k, buf = f'{int(m.group(1))}:{int(m.group(2))}', []; continue
        if k and not ln.startswith('#META#'): buf.append(re.sub(r'^(#|~~)\s*', '', ln.strip()))
    if k: d[k] = ' '.join(buf)
    return {k: re.sub(r'\bms\d+\b|PageV\d+P\d+', ' ', re.sub(r'\s+', ' ', v)).strip() for k, v in d.items()}
tok = AutoTokenizer.from_pretrained(MODEL, trust_remote_code=True)
model = AutoModelForCausalLM.from_pretrained(MODEL, quantization_config=BitsAndBytesConfig(load_in_4bit=True, bnb_4bit_compute_dtype=torch.float16), device_map='auto', trust_remote_code=True)
INSTR = ('فيما يلي صفحة من كتاب «{t}» في الفقه الشافعي. استخرج منها كل مسألة فقهية تامة على حدة. لكل مسألة أخرج كائن JSON بالحقول:\n'
         'if: الشرط أو الموضوع الذي يتعلق به الحكم\nthen: الحكم\nexcept: الاستثناء إن ذُكر (وإلا نص فارغ)\n'
         'disputed: قائمة خلاف على المسألة، كل عنصر {{"school": صاحب القول أو الوجه, "view": قوله}} (وإلا قائمة فارغة)\nbasis: الدليل الذي ساقه المصنف (وإلا نص فارغ)\n'
         'شرط صارم: كل قيمة نصية يجب أن تكون عبارة منقولة حرفيًّا من الصفحة بلا تغيير ولا إضافة ولا تلخيص. أخرج كل مسألة في سطر مستقل: كائن JSON واحد في السطر، بلا مصفوفة ولا شرح.\n\nالصفحة:\n{p}')
def ask(title, page):
    msgs = [{'role': 'user', 'content': INSTR.format(t=title, p=page)}]
    enc = tok.apply_chat_template(msgs, add_generation_prompt=True, return_tensors='pt', return_dict=True)
    ids = (enc['input_ids'] if hasattr(enc, 'keys') else enc).to(model.device)
    with torch.no_grad(): o = model.generate(ids, attention_mask=torch.ones_like(ids), max_new_tokens=1500, do_sample=False, repetition_penalty=1.05)
    return tok.decode(o[0][ids.shape[1]:], skip_special_tokens=True)
def parse(t):
    out = []
    for ln in t.splitlines():
        ln = ln.strip().rstrip(',')
        if ln.startswith('{') and ln.endswith('}'):
            try:
                x = json.loads(ln)
                if isinstance(x, dict) and 'then' in x: out.append(x)
            except Exception: pass
    return out
def shingles(w, n=3): return {tuple(w[i:i + n]) for i in range(max(1, len(w) - n + 1))}
def cover(field, nw_page_set, page_words_n):
    f = norm(str(field or '')).split()
    if not f: return 1.0
    if len(f) < 4: return 1.0 if ' '.join(f) in ' '.join(page_words_n) else 0.0
    sf = shingles(f); return len(sf & nw_page_set) / len(sf)
def anchor(then, ow, nw):
    f = norm(str(then or '')).split()
    if len(f) < 3: return None
    L = min(len(f) + 3, 40); sf = shingles(f, 2); best, bi = 0, 0
    for i in range(0, max(1, len(nw) - L + 1)):
        sc = len(sf & shingles(nw[i:i + L], 2))
        if sc > best: best, bi = sc, i
    return ' '.join(ow[bi:bi + L]) if best >= max(2, len(sf) * 0.5) else None
res = []; stat = dict(pages=0, items=0, then_ok=0, all_ok=0, bad_json=0)
for key, rep, glob_, title in BOOKS:
    d = f'/kaggle/working/{rep}'
    if not os.path.isdir(d):
        sh(f'git clone -q --filter=blob:none --no-checkout --depth 1 https://github.com/OpenITI/{rep}.git {d}')
        sh(f'cd {d} && git sparse-checkout set --no-cone "{glob_}" && git checkout -q')
    f = subprocess.check_output(f'find {d} -type f -name "*Shamela*" | grep -v yml | head -1', shell=True, text=True).strip()
    P = pages(f); ks = [k for k in P if len(P[k].split()) > 120]
    random.Random(5).shuffle(ks); ks = ks[:N]
    for k in ks:
        page = P[k]; npage = norm(page); t0 = time.time(); raw = ask(title, page); items = parse(raw); stat['pages'] += 1
        if not items: stat['bad_json'] += 1
        ow = page.split(); nw = [norm(w) for w in ow]; nws = shingles([x for x in nw if x]); pn = [x for x in nw if x]
        for it in items:
            stat['items'] += 1
            c = {f: cover(it.get(f), nws, pn) for f in ('then', 'if', 'except', 'basis')}
            dv = [min(cover(x.get('view'), nws, pn), cover(x.get('school'), nws, pn)) for x in (it.get('disputed') or []) if isinstance(x, dict)]
            q = anchor(it.get('then'), ow, nw)
            thn = c['then'] >= 0.8 and bool(norm(str(it.get('then') or ''))) and q is not None
            allf = thn and c['if'] >= 0.6 and c['except'] >= 0.6 and c['basis'] >= 0.6 and all(x >= 0.6 for x in dv)
            stat['then_ok'] += bool(thn); stat['all_ok'] += bool(allf)
            res.append({'book': key, 'page': k, 'quote': q, 'cover': c, 'verified_then': bool(thn), 'verified_all': bool(allf), 'rule': it})
        print(k, len(items), f'{time.time()-t0:.0f}s', stat, flush=True)
json.dump(stat, open(f'{OUT}/stats.json', 'w'))
open(f'{OUT}/rules.jsonl', 'w', encoding='utf8').write('\n'.join(json.dumps(r, ensure_ascii=False) for r in res) + '\n')
tk = os.environ.get('HF_TOKEN', '')
if tk and not tk.startswith('__'):
    from huggingface_hub import HfApi
    a = HfApi(token=tk); me = a.whoami()['name']; rp = f'{me}/nawa-rules'
    a.create_repo(rp, repo_type='dataset', private=True, exist_ok=True)
    a.upload_folder(folder_path=OUT, repo_id=rp, repo_type='dataset', path_in_repo=f'run-{int(time.time())}')
print('انتهى', stat)
