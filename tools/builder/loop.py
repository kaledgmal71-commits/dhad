# حلقة بناء بإشراف: كل مهمة (prompt + اختبارات + مخرجات متوقعة) يكتب لها نموذج مفتوح شيفرة ضاد،
# ويتحقق منها المحرك الحقيقي؛ عند الفشل يُعاد إليه نص الخطأ (حتى K محاولات). لا يُقبل إلا ما نجح بالتشغيل.
# الاستعمال: python3 loop.py <model_id> <tasks_dir> <out_dir>
import sys, os, json, subprocess, torch
from transformers import AutoTokenizer, AutoModelForCausalLM
mid, tdir, out = sys.argv[1:4]; K = 3; HERE = os.path.dirname(os.path.abspath(__file__))
os.makedirs(out, exist_ok=True)
sysmsg = open(f'{HERE}/fewshot.md', encoding='utf8').read()
tok = AutoTokenizer.from_pretrained(mid)
model = AutoModelForCausalLM.from_pretrained(mid, torch_dtype=torch.float16, device_map='auto')
def gen(msgs):
    enc = tok.apply_chat_template(msgs, add_generation_prompt=True, return_tensors='pt', return_dict=True)
    ids = enc['input_ids'].to(model.device)
    with torch.no_grad(): o = model.generate(ids, attention_mask=torch.ones_like(ids), max_new_tokens=700, do_sample=False)
    return tok.decode(o[0][ids.shape[1]:], skip_special_tokens=True).strip()
def verify(tp, code):
    p = subprocess.run(['node', f'{HERE}/verify.js', tp], input=code, capture_output=True, text=True)
    try: return json.loads(p.stdout)
    except Exception: return {'ok': False, 'reason': p.stderr[:300]}
rows = []
for f in sorted(os.listdir(tdir)):
    if not f.endswith('.json'): continue
    tp = f'{tdir}/{f}'; t = json.load(open(tp, encoding='utf8'))
    msgs = [{'role': 'system', 'content': sysmsg}, {'role': 'user', 'content': t['prompt']}]
    for k in range(1, K + 1):
        a = gen(msgs); v = verify(tp, a)
        if v['ok']: break
        msgs += [{'role': 'assistant', 'content': a}, {'role': 'user', 'content': 'فشل التحقق: ' + v['reason'] + '\nصحّح الشيفرة وأعد الكتلة كاملة.'}]
    rows.append({'id': t['id'], 'ok': v['ok'], 'attempts': k, 'code': a, 'last': v['reason']})
    print(t['id'], 'نجح' if v['ok'] else 'فشل', 'محاولات', k, flush=True)
json.dump(rows, open(f'{out}/results.json', 'w'), ensure_ascii=False, indent=1)
n = sum(r['ok'] for r in rows); open(f'{out}/summary.txt', 'w', encoding='utf8').write(f'{mid}: {n}/{len(rows)} مهمة نجحت بالتشغيل\n')
