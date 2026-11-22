# جرد Hadith-master.zip على Google Drive داخل Colab (خلية واحدة). لا يكتب شيئًا خارج /content ولا يرفع شيئًا.
# بيانات نصوص الأحاديث خاصة (للتدريب والإحصاء فقط)؛ لا تُنسخ إلى أي مستودع.
from google.colab import drive; drive.mount('/content/drive')
import zipfile, os, collections
Z='/content/drive/MyDrive/nawa-libraries/Hadith-master.zip'
zipfile.ZipFile(Z).extractall('/content/h'); R='/content/h'
ext=collections.Counter(); size=collections.Counter(); big=[]
for d,_,fs in os.walk(R):
    for f in fs:
        p=os.path.join(d,f); n=os.path.getsize(p); e=os.path.splitext(f)[1].lower()
        ext[e]+=1; size[e]+=n; big.append((n,p))
for e,c in ext.most_common(12): print(e or '(بلا امتداد)', c, round(size[e]/1e6,1),'MB')
print('--- أكبر الملفات'); [print(round(n/1e6,1),'MB',p.replace(R,'')) for n,p in sorted(big,reverse=True)[:15]]
