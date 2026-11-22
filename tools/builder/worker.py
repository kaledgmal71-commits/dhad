# عامل البناء المستمر: يبقى يعمل حتى ينتهي وقته، يسحب المهام الجديدة من tools/builder/tasks في الفرع الرئيسي كل دقائق،
# يكتب لها النموذج شيفرة ضاد ويتحقق منها المحرك الحقيقي، ثم يدفع النتائج إلى فرع builder-results وحده (لا يلمس الرئيسي).
# البيئة: GH_TOKEN (سرّ)، MODEL، HOURS (افتراضي ٨)، REPO (افتراضي المستودع)، MOCK=1 لاختبار المنطق بلا نموذج.
import os, sys, json, time, shutil, subprocess
HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.environ.get('REPO', 'github.com/kaledgmal71-commits/dhad.git')
TOK = os.environ.get('GH_TOKEN', '')
URL = REPO if '://' in REPO or REPO.startswith('/') else f'https://x-access-token:{TOK}@{REPO}'
W = os.environ.get('WORK', '/kaggle/working/w'); BR = 'builder-results'; K = 3
END = time.time() + float(os.environ.get('HOURS', '8')) * 3600
def sh(*a, cwd=None, check=True):
    p = subprocess.run(a, cwd=cwd, capture_output=True, text=True)
    if check and p.returncode: raise RuntimeError(' '.join(a[:3]).replace(TOK or '\0', '***') + ': ' + (p.stderr or p.stdout)[-300:].replace(TOK or '\0', '***'))
    return p.stdout
def sync():
    if not os.path.isdir(W + '/.git'):
        shutil.rmtree(W, ignore_errors=True); sh('git', 'clone', '-q', URL, W)
        sh('git', 'config', 'user.email', 'builder@nawa.local', cwd=W); sh('git', 'config', 'user.name', 'nawa-builder', cwd=W)
    sh('git', 'fetch', '-q', 'origin', cwd=W)
def main_tasks():
    sh('git', 'checkout', '-q', '-B', 'main', 'origin/main', cwd=W)
    d = W + '/tools/builder/tasks'
    return {f: json.load(open(f'{d}/{f}', encoding='utf8')) for f in sorted(os.listdir(d)) if f.endswith('.json')}
def done_ids():
    if sh('git', 'ls-remote', '--heads', 'origin', BR, cwd=W).strip():
        sh('git', 'checkout', '-q', '-B', BR, 'origin/' + BR, cwd=W)
    else:
        sh('git', 'checkout', '-q', '--orphan', BR, cwd=W); sh('git', 'rm', '-rfq', '.', cwd=W, check=False)
    p = W + '/results/done.json'
    return json.load(open(p, encoding='utf8')) if os.path.exists(p) else {}
if os.environ.get('MOCK'):
    def gen(msgs, t): return '```\n' + MOCK_CODE.get(t['id'], 'دالة س() { ارجع ٠ }') + '\n```'
    MOCK_CODE = {'t01': 'دالة اجمع_الأرقام(ق) {\n متغير م = ٠\n من_أجل (ع في ق) { م = م + ع }\n ارجع م\n}'}
else:
    import torch
    from transformers import AutoTokenizer, AutoModelForCausalLM
    mid = os.environ.get('MODEL', 'Qwen/Qwen3-8B')
    tok = AutoTokenizer.from_pretrained(mid); model = AutoModelForCausalLM.from_pretrained(mid, torch_dtype=torch.float16, device_map='auto')
    def gen(msgs, t):
        enc = tok.apply_chat_template(msgs, add_generation_prompt=True, return_tensors='pt', return_dict=True, enable_thinking=False)
        ids = enc['input_ids'].to(model.device)
        with torch.no_grad(): o = model.generate(ids, attention_mask=torch.ones_like(ids), max_new_tokens=900, do_sample=False)
        return tok.decode(o[0][ids.shape[1]:], skip_special_tokens=True).strip()
sysmsg = open(f'{HERE}/fewshot.md', encoding='utf8').read()
def verify(task, code):
    tp = W + '/.task.json'; json.dump(task, open(tp, 'w', encoding='utf8'), ensure_ascii=False)
    p = subprocess.run(['node', f'{HERE}/verify.js', tp], input=code, capture_output=True, text=True)
    try: return json.loads(p.stdout)
    except Exception: return {'ok': False, 'reason': p.stderr[:300]}
import re
DIAC = re.compile('[\u064B-\u0652\u0670]')
def fix_name(t, code):
    # النموذج يُسقط علامات التشكيل من اسم الدالة المطلوب؛ نعيد الاسم كما ورد في المهمة حرفيًا (معالجة جذرية لا لمهمة بعينها).
    m = re.search('«([^»\\s]+)»', t['prompt'])
    if not m: return code
    want = m.group(1); bare = DIAC.sub('', want)
    return re.sub(r'(?<![\w_])' + re.escape(bare) + r'(?![\w_])', want, code) if bare != want else code
def solve(t):
    msgs = [{'role': 'system', 'content': sysmsg}, {'role': 'user', 'content': t['prompt']}]
    hist = []
    for k in range(1, K + 1):
        a = fix_name(t, gen(msgs, t)); v = verify(t, a); hist.append({'code': a[-1500:], 'reason': v['reason'][:300]})
        if v['ok']: break
        msgs += [{'role': 'assistant', 'content': a}, {'role': 'user', 'content': 'فشل التحقق: ' + v['reason'] + '\nصحّح الشيفرة وأعد الكتلة كاملة.'}]
    return {'id': t['id'], 'ok': v['ok'], 'attempts': k, 'code': a, 'last': v['reason'], 'history': hist, 'time': int(time.time())}
os.makedirs(W, exist_ok=True)
if os.environ.get('OUT'):
    # وضع الدفعة (يُشغَّل من GitHub Actions عبر Kaggle API): يحلّ المهام الجديدة فقط ويكتب النتائج في OUT دون أي دفع إلى git.
    import urllib.request
    OUT = os.environ['OUT']; os.makedirs(OUT, exist_ok=True)
    try: done = json.load(urllib.request.urlopen(f'https://raw.githubusercontent.com/{REPO.replace(".git","").split("github.com/")[-1]}/{BR}/{os.environ.get("DONE_PATH", "results/done.json")}', timeout=30))
    except Exception: done = {}
    tdir = os.environ.get('TASKS', HERE + '/tasks'); newdone = {}
    for f in sorted(os.listdir(tdir)):
        if not f.endswith('.json'): continue
        t = json.load(open(f'{tdir}/{f}', encoding='utf8'))
        if t['id'] in done: continue
        if os.environ.get('ONLY') and not re.fullmatch(os.environ['ONLY'], t['id']): continue
        r = solve(t); newdone[t['id']] = {'ok': r['ok'], 'attempts': r['attempts']}
        json.dump(r, open(f'{OUT}/{t["id"]}.json', 'w', encoding='utf8'), ensure_ascii=False, indent=1)
        json.dump(newdone, open(f'{OUT}/done_new.json', 'w', encoding='utf8'), ensure_ascii=False, indent=1)
        print(t['id'], 'نجح' if r['ok'] else 'فشل', 'محاولات', r['attempts'], flush=True)
    print('انتهت الدفعة:', len(newdone), 'مهمة', flush=True); sys.exit(0)
while time.time() < END:
    try:
        sync(); tasks = main_tasks(); verifier_dir = HERE
        done = done_ids(); new = {f: t for f, t in tasks.items() if t['id'] not in done}
        if new:
            sh('git', 'checkout', '-q', 'origin/main', '--', 'tools/builder', cwd=W)
            for f, t in new.items():
                r = solve(t); done[t['id']] = {'ok': r['ok'], 'attempts': r['attempts']}
                os.makedirs(W + '/results', exist_ok=True)
                json.dump(r, open(f'{W}/results/{t["id"]}.json', 'w', encoding='utf8'), ensure_ascii=False, indent=1)
                json.dump(done, open(W + '/results/done.json', 'w', encoding='utf8'), ensure_ascii=False, indent=1)
                sh('git', 'rm', '-rfq', '--cached', 'tools', cwd=W, check=False)
                sh('git', 'add', 'results', cwd=W); sh('git', 'commit', '-qm', f'نتيجة {t["id"]}: ' + ('نجح' if r['ok'] else 'فشل'), cwd=W)
                sh('git', 'push', '-q', 'origin', BR, cwd=W); print(t['id'], 'نجح' if r['ok'] else 'فشل', 'محاولات', r['attempts'], flush=True)
        else: print('لا مهام جديدة', time.strftime('%H:%M'), flush=True)
    except Exception as e: print('خطأ دورة:', str(e)[:300], flush=True)
    if os.environ.get('ONCE'): break
    time.sleep(600)
