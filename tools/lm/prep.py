# تجهيز المتن: ينزّل المصادر المفتوحة ويستخرج النص العربي فقط، ويكتب ملفًا لكل مصدر + manifest.json (الترخيص والعدّ).
# لا يُدفع أي نص إلى أي مستودع؛ كل شيء داخل مجلد DATA على جهاز التدريب.
import os, re, sys, csv, json, glob, subprocess, collections
DATA = os.environ.get('DATA', '/kaggle/working/data'); SRC = DATA + '/_src'; os.makedirs(SRC, exist_ok=True)
MAXMB = int(os.environ.get('MAX_MB') or 1500)
AR = re.compile(r'[؀-ۿ]')
def ar_ratio(s):
    L = [c for c in s if c.isalpha()]
    return (sum(1 for c in L if '؀' <= c <= 'ۿ') / len(L)) if L else 0.0
def sh(c): return subprocess.run(c, shell=True, capture_output=True, text=True)
def clone(repo, name):
    d = f'{SRC}/{name}'
    if not os.path.isdir(d):
        r = sh(f'GIT_LFS_SKIP_SMUDGE=1 git clone -q --depth 1 https://github.com/{repo} {d}')
        if r.returncode: print('تعذّر الاستنساخ', repo, r.stderr[-200:], flush=True); return None
    return d
manifest = {}
def writer(name, meta):
    f = open(f'{DATA}/{name}.txt', 'w', encoding='utf8'); st = {'docs': 0, 'chars': 0, **meta}; manifest[name] = st
    def w(doc):
        doc = doc.strip()
        if len(doc) < 20 or ar_ratio(doc) < 0.6: return
        if st['chars'] > MAXMB * 1e6: return
        f.write(doc + '\n\n'); st['docs'] += 1; st['chars'] += len(doc)
    return w, f
# ١) الحديث (ODbL: للتدريب والإحصاء فقط)
d = clone('mhashim6/Open-Hadith-Data', 'hadith')
if d:
    w, f = writer('hadith', dict(license='ODbL-1.0', tag='hadith', rep=2, source='mhashim6/Open-Hadith-Data'))
    for p in sorted(glob.glob(d + '/**/*.csv', recursive=True)):
        try:
            for row in csv.reader(open(p, encoding='utf8', errors='ignore')):
                if len(row) >= 2: w(row[-1])
        except Exception as e: print('csv', p, e)
    f.close()
# ٢) القرآن (CC-BY-SA)
d = clone('risan/quran-json', 'quran')
if d:
    w, f = writer('quran', dict(license='CC-BY-SA-4.0', tag='quran', rep=4, source='risan/quran-json (tanzil)'))
    for script in ('uthmani', 'simple'):   # نص تنزيل: العثماني مشكول والإملائي البسيط
        p = f'{d}/data/tanzil/{script}.json'
        try:
            for ch, vs in json.load(open(p, encoding='utf8')).items():
                w('\n'.join(v['text'] for v in vs))
        except Exception as e: print('quran', p, e)
    f.close()
# ٣) OpenITI (CC-BY-NC-SA: للاستعمال الشخصي غير التجاري؛ يُوسَم لاستبعاده قبل أي استعمال تجاري)
RELIG = re.compile(r'فقه|تفسير|حديث|عقيد|أصول|قرآن|قراءات|سيرة|تراجم|رجال|علل|مذهب|فتاو|قواعد|توحيد|كلام|شروح|مصطلح|جرح|أحكام|زهد')
CENT = os.environ.get('CENTURIES', '0200AH,0250AH,0300AH,0350AH,0400AH,0450AH,0500AH,0600AH,0700AH,0800AH').split(',')
subj = collections.Counter()
for c in [x for x in CENT if x]:
    d = clone(f'OpenITI/{c}', c)
    if not d: continue
    w, f = writer(f'openiti_{c}', dict(license='CC-BY-NC-SA-4.0', tag='classical', rep=1, source=f'OpenITI/{c}'))
    for p in sorted(glob.glob(d + '/data/*/*/*-ara*')):
        if p.endswith(('.yml', '.md', '.json')): continue
        try: raw = open(p, encoding='utf8', errors='ignore').read()
        except Exception: continue
        head, _, body = raw.partition('#META#Header#End#')
        if not body: body = raw
        m = re.search(r'BookSUBJ\s*::\s*(.+)', head); s = m.group(1) if m else ''
        subj[s.split('::')[0].strip()] += 1
        lines = []
        for ln in body.split('\n'):
            if ln.startswith('#META#') or ln.startswith('######OpenITI#'): continue
            ln = re.sub(r'PageV\d+P\d+|ms\d+|@\w+\S*|~~|\|+|^#+ ?|^\$+|CHECK \[[^\]]*\]|\(ق?\d+[أب]\)', ' ', ln); ln = re.sub(r'\s+', ' ', ln).strip()
            if ln and AR.search(ln): lines.append(ln)
        doc = '\n'.join(lines)
        for _ in range(2 if RELIG.search(s) else 1): w(doc)
    f.close()
json.dump({'subjects_top': subj.most_common(40)}, open(DATA + '/subjects.json', 'w', encoding='utf8'), ensure_ascii=False)
# ٤) العربية العامة (ويكيبيديا)
N = int(os.environ.get('WIKI_DOCS') or 0)
if N:
    try:
        from datasets import load_dataset
        w, f = writer('wiki_ar', dict(license='CC-BY-SA-4.0', tag='general', rep=1, source='wikimedia/wikipedia 20231101.ar'))
        for i, r in enumerate(load_dataset('wikimedia/wikipedia', '20231101.ar', split='train', streaming=True)):
            if i >= N: break
            w(r['text'])
        f.close()
    except Exception as e: print('wiki تعذّرت', e)
# ٥) بيانات ذكاء الجامع المضمَّن (محادثات باستدعاء أدوات مولَّدة من قاعدة الجامع؛ خاصة، للتدريب فقط): JAMI_SFT=1
if os.environ.get('JAMI_SFT') == '1':
    try:
        from huggingface_hub import hf_hub_download
        jp = hf_hub_download('kaledgmal/aljami-sft', 'train.jsonl', repo_type='dataset', token=os.environ.get('HF_TOKEN'), local_dir=SRC)
        st = {'docs': 0, 'chars': 0, 'license': 'private-aljami', 'tag': 'jami', 'rep': int(os.environ.get('JAMI_REP') or 3), 'source': 'kaledgmal/aljami-sft'}; manifest['jami_sft'] = st
        with open(f'{DATA}/jami_sft.txt', 'w', encoding='utf8') as f:
            for ln in open(jp, encoding='utf8'):
                t = json.loads(ln)['text'].replace('\n\n', '\n')
                f.write(t + '\n\n'); st['docs'] += 1; st['chars'] += len(t)
    except Exception as e: print('jami_sft تعذّر', e, flush=True)
json.dump(manifest, open(DATA + '/manifest.json', 'w', encoding='utf8'), ensure_ascii=False, indent=1)
for k, v in manifest.items(): print(f"{k}: {v['docs']} وثيقة، {v['chars']/1e6:.1f}M حرف، {v['license']}", flush=True)
