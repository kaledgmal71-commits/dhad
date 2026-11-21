# مقارنة نماذج مفتوحة لخانة التوليد: كل نموذج بدقة ٤ بت يجيب عن ٢٠ سؤالًا ثابتًا بلا عشوائية.
# المخرجات في /kaggle/working/gen: ملف json لكل نموذج، وsummary.txt (مقاييس آلية قصيرة)، وblind.txt (إجابات بأسماء مخفية للقراءة)، وkey.txt (المفتاح).
import json, os, re, time, gc, random, sys
import torch
from transformers import AutoTokenizer, AutoModelForCausalLM, BitsAndBytesConfig
OUT = sys.argv[1] if len(sys.argv) > 1 else '/kaggle/working/gen'; os.makedirs(OUT, exist_ok=True)
QUESTIONS = ["كيف حالك اليوم؟", "ما هي عاصمة فرنسا؟", "اكتب لي قصيدة قصيرة عن البحر", "ما الفرق بين الحلقة والشرط في البرمجة؟", "من هو الخوارزمي؟", "ما رأيك في الذكاء الاصطناعي؟", "لخص لي أهمية القراءة في ثلاث جمل", "ما هي الدالة في البرمجة؟", "هل تستطيع مساعدتي في دراستي؟", "اشرح لي كيف تعمل الطائرة", "ما إعراب كلمة «الطالبُ» في جملة: جاء الطالبُ؟", "شكّل هذه الجملة تشكيلًا كاملًا: ذهب الولد إلى المدرسة", "ما الفرق بين الحديث الصحيح والحسن؟", "اكتب دالة بلغة بايثون تحسب مجموع قائمة أرقام", "ترجم إلى العربية: Knowledge is power", "اشرح لي معنى الاستعارة مع مثال", "اكتب رسالة قصيرة أعتذر فيها عن التأخر عن اجتماع", "ما سبب اختلاف الفصول الأربعة؟", "هل الحوت سمكة؟", "أعطني خطة لحفظ جزء من القرآن في شهر"]
MODELS = [["ALLaM-7B", "ALLaM-AI/ALLaM-7B-Instruct-preview"], ["Fanar-9B", "QCRI/Fanar-1-9B-Instruct"], ["Qwen3-8B", "Qwen/Qwen3-8B"], ["Qwen3-4B", "Qwen/Qwen3-4B"], ["Jais2-8B", "inception42/Jais-2-8B-Chat"]]
MAXNEW = 220
REFUSE = ('لا أستطيع', 'لا يمكنني', 'آسف', 'عذرا', 'عذرًا', 'لا أملك', 'I cannot', "I can't", 'Sorry')
def license_of(mid):
    try:
        from huggingface_hub import HfApi
        i = HfApi().model_info(mid); return str((i.card_data.to_dict() if i.card_data else {}).get('license')) + ' | ' + str(getattr(i, 'gated', ''))
    except Exception as e: return 'غير معروف: ' + type(e).__name__
def metrics(res):
    ar = rep = cut = ref = 0; n = len(res)
    for r in res:
        a = r['a']; L = [c for c in a if c.isalpha()]; ar += (sum('؀' <= c <= 'ۿ' for c in L) / len(L)) if L else 0
        w = a.split(); g = [tuple(w[i:i + 4]) for i in range(max(0, len(w) - 3))]; rep += (1 - len(set(g)) / len(g)) if g else 0
        cut += r['hit']; ref += any(k in a[:120] for k in REFUSE)
    return dict(arabic=round(ar / n, 2), repetition=round(rep / n, 2), hit_limit=cut, refusals=ref)
summ = []
for name, mid in MODELS:
    t0 = time.time(); p = f'{OUT}/{name}.json'
    if os.path.exists(p): continue
    lic = license_of(mid)
    try:
        tok = AutoTokenizer.from_pretrained(mid, trust_remote_code=True)
        model = AutoModelForCausalLM.from_pretrained(mid, quantization_config=BitsAndBytesConfig(load_in_4bit=True, bnb_4bit_compute_dtype=torch.float16), device_map='auto', trust_remote_code=True)
        res = []
        for q in QUESTIONS:
            kw = {'enable_thinking': False} if 'Qwen3' in mid else {}
            enc = tok.apply_chat_template([{'role': 'user', 'content': q}], add_generation_prompt=True, return_tensors='pt', return_dict=True, **kw)
            ids = (enc['input_ids'] if hasattr(enc, 'keys') else enc).to(model.device)
            with torch.no_grad(): o = model.generate(ids, attention_mask=torch.ones_like(ids), max_new_tokens=MAXNEW, do_sample=False, repetition_penalty=1.05)
            gen = o[0][ids.shape[1]:]; res.append({'q': q, 'a': tok.decode(gen, skip_special_tokens=True).strip(), 'hit': int(len(gen) >= MAXNEW)})
        m = metrics(res); json.dump({'model': mid, 'license': lic, 'answers': res, 'seconds': round(time.time() - t0), **m}, open(p, 'w'), ensure_ascii=False, indent=1)
        summ.append(f'{name}: {m} | ترخيص: {lic} | {round(time.time() - t0)}ث'); print(summ[-1], flush=True)
    except Exception as e:
        summ.append(f'{name}: فشل {type(e).__name__} {str(e)[:160]} | ترخيص: {lic}'); print(summ[-1], flush=True)
    finally:
        try: del model
        except Exception: pass
        gc.collect(); torch.cuda.empty_cache()
data = [json.load(open(f'{OUT}/{f}')) for f in sorted(os.listdir(OUT)) if f.endswith('.json')]
order = list(range(len(data))); random.Random(7).shuffle(order); lab = 'أبجدهوزح'
with open(f'{OUT}/blind.txt', 'w', encoding='utf-8') as b:
    for i, q in enumerate(QUESTIONS):
        b.write(f"\n{'=' * 50}\nس{i + 1}: {q}\n")
        for k, j in enumerate(order): b.write(f"[{lab[k]}] {data[j]['answers'][i]['a'][:350]}\n\n".replace('\n\n\n', '\n\n'))
open(f'{OUT}/key.txt', 'w', encoding='utf-8').write('\n'.join(f"{lab[k]} = {data[j]['model']}" for k, j in enumerate(order)))
open(f'{OUT}/summary.txt', 'w', encoding='utf-8').write('\n'.join(summ)); print('\n'.join(summ))
