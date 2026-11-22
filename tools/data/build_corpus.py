# Colab: يطبّق clean_ar على كل الأعمدة النصية العربية لجداول الجامع المصدَّرة، فيكتب نسخة نظيفة + تقرير إصلاحات.
# الأصل لا يُمسّ (hadith-export)؛ الناتج في nawa-libraries/hadith-clean.
import gzip, json, os, re, sys, collections, urllib.request
SRC='https://raw.githubusercontent.com/kaledgmal71-commits/dhad/main/tools/data/clean_ar.py'
os.makedirs('/content/w',exist_ok=True)
urllib.request.urlretrieve(SRC,'/content/w/clean_ar.py'); sys.path.insert(0,'/content/w')
from clean_ar import clean
E='/content/drive/MyDrive/nawa-libraries/hadith-export'
P='/content/drive/MyDrive/nawa-libraries/hadith-sample/profile.json'
O='/content/drive/MyDrive/nawa-libraries/hadith-clean'
os.makedirs(O,exist_ok=True)
prof=json.load(open(P,encoding='utf8'))
AR=re.compile(r'[؀-ۿ]')
report={}
for t,v in prof.items():
    cols=[c for c,d in v['cols'].items() if d['kind']=='text']
    if not cols: continue
    out=f'{O}/{t}.clean.jsonl.gz'
    if os.path.exists(out): continue
    st=collections.Counter(); changed=collections.Counter(); ex={}; n=0; notes_n=0
    with gzip.open(f'{E}/{t}.jsonl.gz','rt',encoding='utf8') as f, gzip.open(out+'.part','wt',encoding='utf8') as g:
        for line in f:
            r=json.loads(line); n+=1
            for c in cols:
                x=r.get(c)
                if isinstance(x,str) and AR.search(x):
                    y,nt,s=clean(x,keep_notes=True)
                    if y!=x:
                        changed[c]+=1
                        if c not in ex and s: ex[c]={'before':x[:200],'after':y[:200]}
                    st.update(s); 
                    if nt: r[c+'_notes']=nt; notes_n+=len(nt)
                    r[c]=y
            g.write(json.dumps(r,ensure_ascii=False)+'\n')
    os.replace(out+'.part',out)
    report[t]={'rows':n,'columns_cleaned':cols,'rows_changed_by_column':dict(changed),'fixes':dict(st),'footnotes_extracted':notes_n,'examples':ex}
    print(t,n,dict(st),flush=True)
json.dump(report,open(f'{O}/clean_report.json','w',encoding='utf8'),ensure_ascii=False,indent=1)
print('تم')
