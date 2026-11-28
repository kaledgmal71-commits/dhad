# التجربة ٦ (تُنفَّذ داخل train.py بمتغير LAB): مقياس NB-1 على نماذج مفتوحة الأوزان (مسار المعاملات)، بنفس أسئلة التجربة ٥ (بذرة ١١).
# المرشحون (استثناء مؤقت معتمد): Qwen3-1.7B (النموذج الذي تعرضه الصفحة)، ثم Qwen3-8B. الدرجة: متوسط لوغاريتم الاحتمال للرموز.
import sys, os, json, gc
sys.path.insert(0, '/kaggle/working/dhad/tools/lab')
import nb1, torch
def lines(name):
    p = f'{DATA}/{name}.txt'; return [l.strip() for l in open(p, encoding='utf8') if l.strip()] if os.path.exists(p) else []
items = nb1.build(lines('quran'), lines('hadith'), seed=11, n=200)
print('NB1 أسئلة', {k: len(v) for k, v in items.items()}, flush=True)
from transformers import AutoTokenizer, AutoModelForCausalLM
allres = {}
for name in ('Qwen/Qwen3-1.7B', 'Qwen/Qwen3-8B'):
    try:
        tk = AutoTokenizer.from_pretrained(name); m = AutoModelForCausalLM.from_pretrained(name, torch_dtype=torch.float16, device_map='auto'); m.eval()
        class S:
            @torch.no_grad()
            def complete(s, prompt, n_words):
                ids = tk(prompt, return_tensors='pt').to(m.device); o = m.generate(**ids, max_new_tokens=40, do_sample=False)
                return tk.decode(o[0][ids['input_ids'].shape[1]:], skip_special_tokens=True)
            @torch.no_grad()
            def plausibility(s, text):
                ids = tk(text, return_tensors='pt').to(m.device); out = m(**ids, labels=ids['input_ids']); return -out.loss.item()
        r = nb1.run(S(), items); allres[name] = {'result': r, 'verdict': nb1.verdict(r)}
        print('نتيجة التجربة ٦', name, json.dumps(r, ensure_ascii=False), flush=True)
        ex = items['Q_complete'][0]; print('عيّنة', name, ex['prompt'], '←', S().complete(ex['prompt'], 8)[:80].replace('\n', ' '), '| ذهبي:', ' '.join(ex['gold']), flush=True)
        del m; gc.collect(); torch.cuda.empty_cache()
    except Exception as e:
        allres[name] = {'error': str(e)[:300]}; print('تعذّر', name, str(e)[:300], flush=True)
json.dump(allres, open(OUT + '/lab_e6.json', 'w'), ensure_ascii=False)
