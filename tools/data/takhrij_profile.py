# Colab: فحص بنية التخريج في بيانات الجامع (المدار pivot، المجموعات group، سلاسل الإسناد) وكشف مرشَّحات تعارض تعيين الرواة.
import gzip, json, os, collections, random
E='/content/drive/MyDrive/nawa-libraries/hadith-export'
S='/content/drive/MyDrive/nawa-libraries/hadith-sample'
def rows(t):
    with gzip.open(f'{E}/{t}.jsonl.gz','rt',encoding='utf8') as f:
        for l in f: yield json.loads(l)
nar={r['id']:r for r in rows('narrators')}
def nm(i): 
    r=nar.get(i); return (r['abb_name'] or r['name'] or str(i)) if r else f'#{i}'
chains={r['id']:r['narrator_id_array'] for r in rows('isnad_chains')}
ih={}                                   # hadith -> (isnad_id)
for r in rows('isnad_hadiths'): ih.setdefault(r['hadith_id'],[]).append(r['isnad_id'])
tk={r['hadith_id']:r for r in rows('takhrij')}
groups=collections.defaultdict(list)
for h,r in tk.items(): groups[r['group_id']].append(h)
rep={}
# اتجاه السلسلة: هل الأخير صحابي؟
last_comp=first_comp=tot=0
for cid,arr in list(chains.items())[:50000]:
    if not arr: continue
    tot+=1
    if nar.get(arr[-1],{}).get('is_companion'): last_comp+=1
    if nar.get(arr[0],{}).get('is_companion'): first_comp+=1
rep['direction']={'chains_checked':tot,'last_is_companion':last_comp,'first_is_companion':first_comp}
sizes=collections.Counter(min(len(v),50) for v in groups.values())
rep['groups']={'n':len(groups),'size_hist':sorted(sizes.items())}
pv=sum(1 for r in tk.values() if r['pivot_id'] not in (0,None)); rep['pivot']={'hadiths_with_pivot':pv,'of':len(tk)}
# هل المدار يقع داخل سلسلة الحديث؟ وأين؟
inside=pos=n=0
posc=collections.Counter()
for h,r in list(tk.items())[:60000]:
    p=r['pivot_id']
    if p in (0,None): continue
    for c in ih.get(h,[]):
        a=chains.get(c) or []
        n+=1
        if p in a:
            inside+=1; posc[len(a)-1-a.index(p)]+=1   # البعد عن آخر السلسلة
rep['pivot_in_chain']={'checked':n,'inside':inside,'distance_from_last':sorted(posc.items())[:10]}
# عيّنة مجموعات بأسماء
random.seed(7); big=[g for g,v in groups.items() if 8<=len(v)<=30]
samp=[]
for g in random.sample(big,min(25,len(big))):
    item={'group':g,'hadiths':[]}
    for h in groups[g][:12]:
        r=tk[h]
        for c in ih.get(h,[])[:1]:
            a=chains.get(c) or []
            item['hadiths'].append({'h':h,'book':r['book_id'],'pivot':nm(r['pivot_id']) if r['pivot_id'] else None,'chain':[ (i,nm(i)) for i in a]})
    samp.append(item)
rep['sample_groups']=samp
# مرشَّحات تعارض التعيين: نصّ اسم واحد بمعرّفات متعددة
forms=collections.defaultdict(dict)
for r in rows('narrator_name_forms'):
    forms[r['rawy_text']][r['rawy_id']]=forms[r['rawy_text']].get(r['rawy_id'],0)+(r['frequency'] or 0)
multi=[(t,d) for t,d in forms.items() if len(d)>1]
multi.sort(key=lambda x:-sum(x[1].values()))
rep['ambiguous_name_forms']={'n':len(multi),'top':[{'text':t,'ids':{str(k):v for k,v in d.items()}} for t,d in multi[:40]]}
# شاذ داخل المجموعة: نفس الجار الأعلى والأدنى ومعرّف مختلف في الوسط
cand=collections.Counter(); ex=[]
for g,hs in groups.items():
    if len(hs)<5: continue
    tri=collections.defaultdict(collections.Counter)
    for h in hs:
        for c in ih.get(h,[])[:1]:
            a=chains.get(c) or []
            for i in range(1,len(a)-1): tri[(a[i-1],a[i+1])][a[i]]+=1
    for k,cn in tri.items():
        if len(cn)>1:
            top,tn=cn.most_common(1)[0]
            for o,on in cn.items():
                if o!=top and on==1 and tn>=3:
                    cand['outlier']+=1
                    if len(ex)<30: ex.append({'group':g,'around':[nm(k[0]),nm(k[1])],'majority':[nm(top),tn],'outlier':[nm(o),o]})
rep['id_outlier_candidates']={'count':cand['outlier'],'examples':ex}
os.makedirs(S,exist_ok=True)
json.dump(rep,open(S+'/takhrij_report.json','w',encoding='utf8'),ensure_ascii=False)
print('تم',rep['pivot'],rep['groups']['n'],cand['outlier'])
