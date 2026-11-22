# Colab: تحليل جداول الجامع المصدَّرة وكتابة عيّنات وملف profile.json صغير على درايف ليقرأه Claude.
# يكشف أصناف الأخطاء الآلية (حروف فارسية، تطويل، أرقام لاتينية داخل نص، رموز غير مرئية، أقواس غير متوازنة، تشكيل مكرر/شاذ...).
import gzip, json, os, re, collections, sys
E='/content/drive/MyDrive/nawa-libraries/hadith-export'
S='/content/drive/MyDrive/nawa-libraries/hadith-sample'
os.makedirs(S,exist_ok=True)
AR=re.compile(r'[؀-ۿ]')
CHK={
 'persian_ya_kaf':re.compile('[یکھہ]'),
 'tatweel':re.compile('ـ'),
 'zero_width':re.compile('[​-‏‪-‮⁦-⁩﻿]'),
 'latin_digit_in_ar':re.compile(r'(?<=[؀-ۿ] )\d|\d(?= [؀-ۿ])'),
 'double_space':re.compile(r'  +'),
 'tashkeel_double':re.compile('[ً-ْ]{3,}'),
 'tashkeel_orphan':re.compile(r'(?:^|\s)[ً-ْ]'),
 'shadda_after_vowel':re.compile('[ً-ّْ][ّ]'),
 'html_tag':re.compile(r'</?[a-zA-Z][^>]*>'),
 'nbsp':re.compile(' '),
 'alef_madda_split':re.compile('آ'),
 'qur_ornate':re.compile('[﴾﴿]'),
 'mojibake':re.compile('[ÃØÙ][\u0080-¿]'),
}
prof={}
for fn in sorted(os.listdir(E)):
    if not fn.endswith('.jsonl.gz'): continue
    t=fn[:-9]; cols=collections.OrderedDict(); n=0; samp=[]
    with gzip.open(f'{E}/{fn}','rt',encoding='utf8') as f:
        for line in f:
            r=json.loads(line); n+=1
            if len(samp)<25: samp.append({k:(v[:500] if isinstance(v,str) else v) for k,v in r.items()})
            for k,v in r.items():
                c=cols.setdefault(k,{'null':0,'str':0,'arabic':0,'maxlen':0,'sumlen':0,'issues':collections.Counter(),'ex':{}})
                if v is None: c['null']+=1; continue
                if isinstance(v,str):
                    c['str']+=1; L=len(v); c['maxlen']=max(c['maxlen'],L); c['sumlen']+=L
                    if AR.search(v):
                        c['arabic']+=1
                        for nm,rx in CHK.items():
                            if rx.search(v):
                                c['issues'][nm]+=1
                                if nm not in c['ex'] and len(c['ex'])<6:
                                    m=rx.search(v); a=max(0,m.start()-30); c['ex'][nm]=v[a:m.end()+30]
    out={'rows':n,'cols':{}}
    for k,c in cols.items():
        if c['str']==0 and c['null']==n: kind='null'
        else: kind='text' if c['arabic'] else ('str' if c['str'] else 'other')
        d={'kind':kind,'null':c['null']}
        if c['str']: d.update(maxlen=c['maxlen'],avglen=round(c['sumlen']/c['str']),arabic=c['arabic'])
        if c['issues']: d['issues']=dict(c['issues']); d['examples']=c['ex']
        out['cols'][k]=d
    prof[t]=out
    with open(f'{S}/sample_{t}.json','w',encoding='utf8') as g: json.dump(samp,g,ensure_ascii=False)
    print(t,n,flush=True)
json.dump(prof,open(f'{S}/profile.json','w',encoding='utf8'),ensure_ascii=False)
print('تم')
