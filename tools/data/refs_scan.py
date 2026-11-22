# Colab: مسح مواضع الإحالة (وبه / نحوه / بمثله ...) في hadith_toc: أنواع وسم «تكشيف» وأكثر الألفاظ تكرارًا، وهل الإحالة موسومة أم لا.
import gzip, json, re, collections, os
E='/content/drive/MyDrive/nawa-libraries/hadith-export/hadith_toc.jsonl.gz'
S='/content/drive/MyDrive/nawa-libraries/hadith-sample'
TAKSHIF=re.compile(r'<تكشيف\b([^>]*)>(.*?)</تكشيف>',re.S)
ATTR=re.compile(r'(\w+)="([^"]*)"')
TAG=re.compile(r'<[^<>]{1,80}>')
DIAC=re.compile('[ً-ْٰـ]')
PHR=re.compile(r'(?:^|\s)((?:ب|و|ف)?(?:نحو|مثل|معنى|لفظ|مثله|نحوه|بمثله|بنحوه|بمعناه|بلفظه|بمثل|بنحو|بهذا|بإسناده|وبه|به)[^\s،.:]{0,12}(?:\s(?:حديث|مثل|نحو|الإسناد|إسناده)\S*)?)')
kinds=collections.Counter(); surf=collections.defaultdict(collections.Counter)
untagged=collections.Counter(); n=0; with_ref=0; starts=collections.Counter(); ex={}
def plain(x): return DIAC.sub('',TAG.sub('',x)).strip()
with gzip.open(E,'rt',encoding='utf8') as f:
    for line in f:
        r=json.loads(line); c=r.get('content') or ''; n+=1
        ms=list(TAKSHIF.finditer(c))
        if ms: with_ref+=1
        tagged=set()
        for m in ms:
            a=dict(ATTR.findall(m.group(1))); k=a.get('نوع','?'); kinds[k]+=1
            t=plain(m.group(2)); surf[k][t]+=1; tagged.add(t)
            ex.setdefault(k,c[max(0,m.start()-60):m.end()+60])
        body=plain(c)
        # أول كلمات المتن بعد الرقم: هل يبدأ بصيغة إحالة غير موسومة؟
        for m in PHR.finditer(body[:300]):
            w=m.group(1)
            if w not in tagged: untagged[w]+=1
        starts[' '.join(body.split()[:2])]+=1
out={'hadiths':n,'with_takshif_tag':with_ref,'tag_kinds':dict(kinds),
 'top_surfaces':{k:v.most_common(40) for k,v in surf.items()},
 'untagged_candidates_top':untagged.most_common(60),
 'examples':ex,'top_starts':starts.most_common(40)}
os.makedirs(S,exist_ok=True)
json.dump(out,open(S+'/refs_report.json','w',encoding='utf8'),ensure_ascii=False,indent=1)
print('تم',n,with_ref,dict(kinds))
