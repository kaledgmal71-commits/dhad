# Colab: يستخرج كود التطبيق (app, lib, scripts, tests, docs, db) من Hadith-master.zip إلى zip صغير (نصوص الكود فقط) على درايف.
import zipfile, os
Z='/content/drive/MyDrive/nawa-libraries/Hadith-master.zip'
O='/content/drive/MyDrive/nawa-libraries/hadith_code.zip'
CODE=('.ts','.tsx','.js','.mjs','.cjs','.py','.sql','.md','.json','.css','.sh','.yml','.yaml','.txt')
SKIP=('/node_modules/','/.next/','/motion-graphics/','/public/media/','package-lock.json')
zi=zipfile.ZipFile(Z); n=0
with zipfile.ZipFile(O,'w',zipfile.ZIP_DEFLATED,compresslevel=9) as zo:
    for i in zi.infolist():
        if i.is_dir(): continue
        p=i.filename
        if p.lower().endswith(CODE) and not any(s in p for s in SKIP) and i.file_size<3_000_000 and not p.endswith('.csv'):
            if '/db/shamela-alignment/' in p: continue
            zo.writestr(p, zi.read(p)); n+=1
print(n,'ملفًا |',round(os.path.getsize(O)/1e6,2),'MB')
