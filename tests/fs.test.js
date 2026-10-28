const R=require(require('path').join(__dirname,'..','site','run.js'));
const fsx=require('fs'), os=require('os'), pth=require('path'), cp=require('child_process');
const {NodeFS}=require('../fs_node.js');
let pass=0,fail=0;
const mem=(f)=>new R.api.MemoryFS(f||{});
function t(name, code, expect, host){
  const r=R.run(code,{fs:host===undefined?mem():host});
  const ok=expect===null?!r.ok:(typeof expect==='function'?expect(r):(r.ok&&JSON.stringify(r.out)===JSON.stringify(expect)));
  if(ok)pass++; else {fail++; console.log('FAIL',name,JSON.stringify(r).slice(0,500));}
}
const err=(f)=>r=>!r.ok&&String(r.error).includes(f);
const L='متغير ف = استورد("ضاد/ملفات")\n';
// ---------- بلا صلاحية = بلا ملفات ----------
for(const c of ['اقرأ_ملف("a")','اكتب_ملف("a"، "x")','ألحق_بملف("a"، "x")','نوع_المسار("a")','اسرد_مجلد("/")','أنشئ_مجلد("d")','احذف_مسار("a")'])
  t('nofs-'+c.split('(')[0],c,err('غير متاحة'),null);
t('nofs-lib',L+'اطبع(ف.يوجد("a"))',err('غير متاحة'),null);
// ---------- الدوال الأساسية على MemoryFS ----------
t('write-read','اكتب_ملف("a.txt"، "مرحبا")\nاطبع(اقرأ_ملف("a.txt"))\nاطبع(اقرأ_ملف("/a.txt"))\nاطبع(اقرأ_ملف("./x/../a.txt"))',['مرحبا','مرحبا','مرحبا']);
t('write-returns-path','اطبع(اكتب_ملف("a.txt"، "س"))',['a.txt']);
t('overwrite','اكتب_ملف("a"، "١")\nاكتب_ملف("a"، "٢")\nاطبع(اقرأ_ملف("a"))',['٢']);
t('append','ألحق_بملف("a"، "أ")\nألحق_بملف("a"، "ب")\nاطبع(اقرأ_ملف("a"))',['أب']);
t('empty-file','اكتب_ملف("e"، "")\nاطبع(طول(اقرأ_ملف("e")))\nاطبع(نوع_المسار("e"))',['٠','ملف']);
t('unicode','اكتب_ملف("ملف عربي ٢٠٢٦.txt"، "😀 مَرحبًا")\nاطبع(اقرأ_ملف("ملف عربي ٢٠٢٦.txt"))\nاطبع(اسرد_مجلد("/"))',['😀 مَرحبًا','[ملف عربي ٢٠٢٦.txt]']);
t('kind','أنشئ_مجلد("d")\nاكتب_ملف("d/f"، "x")\nاطبع(نوع_المسار("d"))\nاطبع(نوع_المسار("d/f"))\nاطبع(نوع_المسار("zz") == لاشيء)\nاطبع(نوع_المسار("/"))\nاطبع(نوع_المسار(""))',['مجلد','ملف','صحيح','مجلد','مجلد']);
t('mkdir-nested','أنشئ_مجلد("a/b/c")\nاطبع(نوع_المسار("a/b"))\nأنشئ_مجلد("a/b/c")\nاطبع(اسرد_مجلد("a/b"))',['مجلد','[c]']);
t('list-sorted','اكتب_ملف("ب"، "")\nاكتب_ملف("أ"، "")\nاكتب_ملف("a"، "")\nأنشئ_مجلد("د")\nاطبع(اسرد_مجلد("/"))',['[a، أ، ب، د]']);
t('list-root-forms','اكتب_ملف("x"، "")\nاطبع(اسرد_مجلد("/"))\nاطبع(اسرد_مجلد(""))\nاطبع(اسرد_مجلد("."))',['[x]','[x]','[x]']);
t('remove-file','اكتب_ملف("a"، "x")\nاحذف_مسار("a")\nاطبع(نوع_المسار("a") == لاشيء)',['صحيح']);
t('remove-emptydir','أنشئ_مجلد("d")\nاحذف_مسار("d")\nاطبع(نوع_المسار("d") == لاشيء)',['صحيح']);
// ---------- الأخطاء ----------
t('read-missing','اقرأ_ملف("zz")',err('غير موجود: /zz'));
t('read-dir','أنشئ_مجلد("d")\nاقرأ_ملف("d")',err('مجلد وليس ملفًا'));
t('read-root','اقرأ_ملف("/")',err('مجلد وليس ملفًا'));
t('write-dir','أنشئ_مجلد("d")\nاكتب_ملف("d"، "x")',err('مجلد وليس ملفًا'));
t('write-root','اكتب_ملف("/"، "x")',err('الجذر مجلد'));
t('write-noparent','اكتب_ملف("a/b.txt"، "x")',err('أنشئه بـ أنشئ_مجلد'));
t('write-under-file','اكتب_ملف("f"، "x")\nاكتب_ملف("f/g"، "x")',err('ليس مجلدًا'));
t('mkdir-over-file','اكتب_ملف("f"، "x")\nأنشئ_مجلد("f/g")',err('ليس مجلدًا'));
t('list-file','اكتب_ملف("f"، "x")\nاسرد_مجلد("f")',err('ليس مجلدًا'));
t('list-missing','اسرد_مجلد("zz")',err('غير موجود'));
t('remove-nonempty','أنشئ_مجلد("d")\nاكتب_ملف("d/f"، "x")\nاحذف_مسار("d")',err('غير فارغ'));
t('remove-root','احذف_مسار("/")',err('جذر'));
t('remove-missing','احذف_مسار("zz")',err('غير موجود'));
t('write-nontext','اكتب_ملف("a"، ٥)',err('تحتاج نصًّا'));
t('write-list','اكتب_ملف("a"، [١])',err('تحتاج نصًّا'));
t('path-nontext','اقرأ_ملف(٥)',err('مسارًا نصًّا'));
t('path-nul','اقرأ_ملف("a" + حرف(0) + "b")',err('غير مسموح'));
t('huge','متغير س = كرّر("أ"، ١٠٠٠٠٠٠)\nاكتب_ملف("a"، س + س + س + س + س + "x")',err('أكبر من الحد'));
t('error-line','\nاطبع(1)\nاقرأ_ملف("zz")',r=>!r.ok&&String(r.error).startsWith('السطر 3:'));
// ---------- الهروب من الجذر (خط الدفاع الأول في المحرك) ----------
for(const p of ['../x','../../etc/passwd','a/../../x','/../x','./../x','a/b/../../../x','..','/..']){
  for(const fn of ['اقرأ_ملف','نوع_المسار','اسرد_مجلد','أنشئ_مجلد','احذف_مسار'])
    t('escape-'+fn+'-'+p,fn+'("'+p+'")',err('يخرج من المجلد المسموح'));
  t('escape-write-'+p,'اكتب_ملف("'+p+'"، "x")',err('يخرج من المجلد المسموح'));
  t('escape-append-'+p,'ألحق_بملف("'+p+'"، "x")',err('يخرج من المجلد المسموح'));
}
t('dotdot-inside-ok','أنشئ_مجلد("a/b")\nاكتب_ملف("a/b/../f"، "x")\nاطبع(اسرد_مجلد("a"))',['[b، f]']);
t('escape-not-mutating','حاول { اكتب_ملف("../x"، "س") } التقط (خ) { }\nاطبع(اسرد_مجلد("/"))',['[]']);
// ---------- المكتبة ----------
t('lib-exists',L+'اكتب_ملف("a"، "x")\nأنشئ_مجلد("d")\nاطبع(ف.يوجد("a"))\nاطبع(ف.يوجد("zz"))\nاطبع(ف.هل_ملف("a"))\nاطبع(ف.هل_ملف("d"))\nاطبع(ف.هل_مجلد("d"))\nاطبع(ف.هل_مجلد("a"))',['صحيح','خطأ','صحيح','خطأ','صحيح','خطأ']);
t('lib-read-or',L+'اكتب_ملف("a"، "س")\nاطبع(ف.اقرأ_أو("a"، "؟"))\nاطبع(ف.اقرأ_أو("zz"، "؟"))\nاطبع(ف.اقرأ_أو("zz") == لاشيء)',['س','؟','صحيح']);
t('lib-read-or-dir',L+'أنشئ_مجلد("d")\nاطبع(ف.اقرأ_أو("d"، "؟"))',['؟']);
t('lines-read',L+'اكتب_ملف("a"، "س" + حرف(10) + "ص" + حرف(10))\nاطبع(ف.اقرأ_سطور("a"))\nاكتب_ملف("b"، "س" + حرف(13) + حرف(10) + "ص")\nاطبع(ف.اقرأ_سطور("b"))\nاكتب_ملف("c"، "")\nاطبع(ف.اقرأ_سطور("c"))\nاكتب_ملف("d"، حرف(10))\nاطبع(ف.اقرأ_سطور("d"))\nاكتب_ملف("e"، حرف(10) + حرف(10))\nاطبع(طول(ف.اقرأ_سطور("e")))',['[س، ص]','[س، ص]','[]','[]','٢']);
t('lines-blank-middle',L+'اكتب_ملف("a"، "س" + حرف(10) + حرف(10) + "ص")\nاطبع(طول(ف.اقرأ_سطور("a")))',['٣']);
t('lines-write',L+'ف.اكتب_سطور("a"، ["س"، "ص"])\nاطبع(طول(اقرأ_ملف("a")))\nاطبع(ف.اقرأ_سطور("a"))\nف.اكتب_سطور("b"، [])\nاطبع(طول(اقرأ_ملف("b")))',['٤','[س، ص]','٠']);
t('lines-write-types',L+'ف.اكتب_سطور("a"، ["س"، ٥])',err('يجب أن يكون نصًّا'));
t('lines-write-notlist',L+'ف.اكتب_سطور("a"، "س")',err('قائمة'));
t('lines-roundtrip',L+'متغير ق = ["أ"، ""، "ب ج"، "😀"]\nف.اكتب_سطور("a"، ق)\nاطبع(ف.اقرأ_سطور("a") == ق)\nاطبع(طول(ف.اقرأ_سطور("a")))',['خطأ','٤']);
t('json-rw',L+'ف.اكتب_جسون("c.json"، {"أ": [١، ٢]، "ب": {"ج": صحيح}})\nاطبع(اقرأ_ملف("c.json"))\nمتغير ق = ف.اقرأ_جسون("c.json")\nاطبع(ق["أ"][١])\nاطبع(ق["ب"]["ج"])\nف.اكتب_جسون("m.json"، [١]، ٠)\nاطبع(اقرأ_ملف("m.json"))',['{\n  "أ": [\n    1,\n    2\n  ],\n  "ب": {\n    "ج": true\n  }\n}\n','٢','صحيح','[1]\n']);
t('json-sorted',L+'ف.اكتب_جسون("c.json"، {"ب": ١، "أ": ٢}، ٠، صحيح)\nاطبع(اقرأ_ملف("c.json"))',['{"أ":2,"ب":1}\n']);
t('json-bad-file',L+'اكتب_ملف("b.json"، "{")\nف.اقرأ_جسون("b.json")',err('ليس JSON صالحًا'));
t('json-missing',L+'ف.اقرأ_جسون("zz.json")',err('غير موجود'));
t('tree',L+'اكتب_ملف("ب.txt"، "")\nأنشئ_مجلد("د/هـ")\nاكتب_ملف("د/هـ/و.txt"، "")\nاكتب_ملف("د/أ.md"، "")\nاطبع(ف.اسرد_شجرة())\nاطبع(ف.اسرد_شجرة("/د"))\nاطبع(ف.اسرد_شجرة("/"، صحيح))',['[/ب.txt، /د/أ.md، /د/هـ/و.txt]','[/د/أ.md، /د/هـ/و.txt]','[/ب.txt، /د، /د/أ.md، /د/هـ، /د/هـ/و.txt]']);
t('tree-empty',L+'اطبع(ف.اسرد_شجرة())\nأنشئ_مجلد("د")\nاطبع(ف.اسرد_شجرة())',['[]','[]']);
t('tree-notdir',L+'اكتب_ملف("a"، "")\nاطبع(ف.اسرد_شجرة("a"))',err('ليس مجلدًا'));
t('by-ext',L+'اكتب_ملف("a.txt"، "")\nاكتب_ملف("b.md"، "")\nأنشئ_مجلد("d")\nاكتب_ملف("d/c.txt"، "")\nاكتب_ملف("d/.txt"، "")\nاطبع(ف.ملفات_بامتداد("/"، ".txt"))',['[/a.txt، /d/c.txt]']);
t('rmtree',L+'أنشئ_مجلد("d/e")\nاكتب_ملف("d/e/f"، "")\nاكتب_ملف("d/g"، "")\nاكتب_ملف("keep"، "")\nف.احذف_شجرة("d")\nاطبع(ف.اسرد_شجرة())',['[/keep]']);
t('rmtree-file',L+'اكتب_ملف("f"، "x")\nف.احذف_شجرة("/f")\nاطبع(ف.يوجد("f"))',['خطأ']);
t('rmtree-root',L+'ف.احذف_شجرة("/")',err('جذر'));
t('rmtree-root-dots',L+'ف.احذف_شجرة("a/..")',err('جذر'));
t('rmtree-missing',L+'ف.احذف_شجرة("zz")',err('غير موجود'));
t('rmtree-escape',L+'ف.احذف_شجرة("../x")',err('يخرج من المجلد المسموح'));
t('copy-file',L+'اكتب_ملف("a"، "محتوى")\nف.انسخ("a"، "b")\nاطبع(اقرأ_ملف("b"))\nاطبع(ف.يوجد("a"))',['محتوى','صحيح']);
t('copy-overwrite',L+'اكتب_ملف("a"، "جديد")\nاكتب_ملف("b"، "قديم")\nف.انسخ("a"، "b")\nاطبع(اقرأ_ملف("b"))',['جديد']);
t('copy-dir',L+'أنشئ_مجلد("d/e")\nاكتب_ملف("d/e/f"، "١")\nاكتب_ملف("d/g"، "٢")\nف.انسخ("d"، "n")\nاطبع(ف.اسرد_شجرة("n"))\nاطبع(اقرأ_ملف("n/e/f"))',['[/n/e/f، /n/g]','١']);
t('copy-empty-dir',L+'أنشئ_مجلد("d")\nف.انسخ("d"، "e")\nاطبع(نوع_المسار("e"))',['مجلد']);
t('copy-into-self',L+'أنشئ_مجلد("d")\nف.انسخ("d"، "d/x")',err('داخل نفسه'));
t('copy-into-self-deep',L+'أنشئ_مجلد("d/e")\nف.انسخ("d"، "d/e/x")',err('داخل نفسه'));
t('copy-sibling-prefix-ok',L+'أنشئ_مجلد("d")\nاكتب_ملف("d/f"، "x")\nف.انسخ("d"، "d٢")\nاطبع(اقرأ_ملف("d٢/f"))',['x']);
t('copy-same',L+'اكتب_ملف("a"، "x")\nف.انسخ("a"، "/./a")',err('نفس المسار'));
t('copy-missing',L+'ف.انسخ("zz"، "y")',err('غير موجود'));
t('copy-file-over-dir',L+'اكتب_ملف("a"، "x")\nأنشئ_مجلد("d")\nف.انسخ("a"، "d")',err('مجلد موجود'));
t('copy-dir-over-file',L+'أنشئ_مجلد("d")\nاكتب_ملف("a"، "x")\nف.انسخ("d"، "a")',err('ملف موجود'));
t('copy-root',L+'ف.انسخ("/"، "x")',err('داخل نفسه'));
t('copy-escape',L+'اكتب_ملف("a"، "x")\nف.انسخ("a"، "../b")',err('يخرج من المجلد المسموح'));
t('move',L+'أنشئ_مجلد("d")\nاكتب_ملف("d/f"، "x")\nف.انقل("d"، "e")\nاطبع(ف.يوجد("d"))\nاطبع(اقرأ_ملف("e/f"))',['خطأ','x']);
t('move-file',L+'اكتب_ملف("a"، "x")\nف.انقل("a"، "b")\nاطبع(ف.اسرد_شجرة())',['[/b]']);
t('move-keeps-on-fail',L+'اكتب_ملف("a"، "x")\nحاول { ف.انقل("a"، "../b") } التقط (خ) { }\nاطبع(ف.يوجد("a"))',['صحيح']);
t('lib-blame-line',L+'\nف.اقرأ_جسون("zz")',r=>!r.ok&&String(r.error).startsWith('السطر 3:'));
t('lib-type-error',L+'ف.يوجد(٥)',err('ملفات:'));
t('twice-same',L+'متغير ز = استورد("ضاد/ملفات")\nاطبع(ز == ف)',['صحيح']);
t('deep-tree',L+'متغير م = ""\nمن_أجل (ي من ١ إلى ٥٠) { م = م + "/د" + نص_برمجي(ي) }\nأنشئ_مجلد(م)\nاكتب_ملف(م + "/f"، "x")\nاطبع(طول(ف.اسرد_شجرة()))\nف.احذف_شجرة("/د1")\nاطبع(طول(ف.اسرد_شجرة()))',['١','٠']);
t('many-files',L+'من_أجل (ي من ١ إلى ٣٠٠) { اكتب_ملف("ف" + نص_برمجي(ي)، نص_برمجي(ي)) }\nاطبع(طول(اسرد_مجلد("/")))\nاطبع(اسرد_مجلد("/")[٠])\nمتغير ج = ٠\nمن_أجل (ن في ف.اسرد_شجرة()) { ج = ج + عدد(اقرأ_ملف(ن)) }\nاطبع(ج)',['٣٠٠','ف1','٤٥١٥٠']);
t('initial-files','اطبع(اقرأ_ملف("a.txt"))\nاطبع(اقرأ_ملف("d/b.txt"))\nاطبع(اسرد_مجلد("/"))',['س','ب','[a.txt، d]'],mem({'a.txt':'س','/d/b.txt':'ب'}));
// ---------- نظام الملفات الحقيقي (مجلد مؤقت) ----------
const tmp=fsx.mkdtempSync(pth.join(os.tmpdir(),'dhadfs-'));
const outside=fsx.mkdtempSync(pth.join(os.tmpdir(),'dhadout-'));
fsx.writeFileSync(pth.join(outside,'secret.txt'),'سر');
fsx.mkdirSync(pth.join(tmp,'sub')); fsx.writeFileSync(pth.join(tmp,'sub','a.txt'),'مرحبا');
try{ fsx.symlinkSync(outside,pth.join(tmp,'link_dir')); fsx.symlinkSync(pth.join(outside,'secret.txt'),pth.join(tmp,'link_file')); fsx.symlinkSync('/etc',pth.join(tmp,'etc_link')); fsx.symlinkSync('sub',pth.join(tmp,'inner_link')); fsx.symlinkSync('../'+pth.basename(outside),pth.join(tmp,'sub','up')); }catch(e){ console.log('no symlink support',e.message); }
const real=()=>new NodeFS(tmp);
t('real-read','اطبع(اقرأ_ملف("/sub/a.txt"))',['مرحبا'],real());
t('real-write-read','اكتب_ملف("n.txt"، "😀 س")\nاطبع(اقرأ_ملف("n.txt"))\nأنشئ_مجلد("x/y/z")\nاكتب_ملف("x/y/z/f"، "ع")\nاطبع(اسرد_مجلد("x/y"))',['😀 س','[z]'],real());
t('real-lib',L+'ف.اكتب_سطور("l.txt"، ["أ"، "ب"])\nاطبع(ف.اقرأ_سطور("l.txt"))\nف.انسخ("x"، "x٢")\nاطبع(ف.اسرد_شجرة("x٢"))\nف.احذف_شجرة("x٢")\nف.احذف_شجرة("x")\nاطبع(ف.يوجد("x"))',['[أ، ب]','[/x٢/y/z/f]','خطأ'],real());
t('real-readme-escape-dotdot','اقرأ_ملف("../'+pth.basename(outside)+'/secret.txt")',err('يخرج من المجلد المسموح'),real());
for(const [n,c] of [['link-dir-read','اقرأ_ملف("/link_dir/secret.txt")'],['link-file-read','اقرأ_ملف("/link_file")'],['link-etc','اقرأ_ملف("/etc_link/passwd")'],['link-dir-write','اكتب_ملف("/link_dir/نجح.txt"، "س")'],['link-dir-list','اسرد_مجلد("/link_dir")'],['link-dir-mkdir','أنشئ_مجلد("/link_dir/جديد")'],['link-file-write','اكتب_ملف("/link_file"، "مسح")'],['link-file-append','ألحق_بملف("/link_file"، "x")'],['link-file-kind','نوع_المسار("/link_file")'],['link-via-sub','اقرأ_ملف("/sub/up/secret.txt")'],['link-dir-remove','احذف_مسار("/link_dir")'],['link-file-remove','احذف_مسار("/link_file")'],['link-lib-copy','متغير ف = استورد("ضاد/ملفات")\nف.انسخ("/link_dir"، "/c")'],['link-lib-tree','متغير ف = استورد("ضاد/ملفات")\nاطبع(ف.اسرد_شجرة("/link_dir"))'],['link-lib-rmtree','متغير ف = استورد("ضاد/ملفات")\nف.احذف_شجرة("/link_dir")']])
  t('real-'+n,c,err('يخرج من المجلد المسموح'),real());
t('real-inner-link-ok','اطبع(اقرأ_ملف("/inner_link/a.txt"))',['مرحبا'],real());
t('real-missing','اقرأ_ملف("/zz")',err('غير موجود'),real());
t('real-dir-read','اقرأ_ملف("/sub")',err('مجلد وليس ملفًا'),real());
t('real-nonempty-rm','احذف_مسار("/sub")',err('غير فارغ'),real());
t('real-noparent','اكتب_ملف("/nope/x"، "س")',err('أنشئه بـ'),real());
t('real-under-file','اكتب_ملف("/sub/a.txt/x"، "س")',err('ليس مجلدًا'),real());
t('real-list-sorted','اطبع(اسرد_مجلد("/sub"))',r=>r.ok&&r.out[0].includes('a.txt'),real());
// الملفات خارج الجذر لم تتغير ولم يُنشأ فيها شيء
{
  const ok1=fsx.readFileSync(pth.join(outside,'secret.txt'),'utf8')==='سر';
  const ok2=fsx.readdirSync(outside).join(',')==='secret.txt';
  if(ok1&&ok2)pass++; else {fail++; console.log('FAIL outside-untouched',ok1,ok2,fsx.readdirSync(outside));}
}
// ---------- أداة سطر الأوامر ----------
function cli(args,input){ const r=cp.spawnSync('node',[pth.join(__dirname,'..','dhad.js'),...args],{encoding:'utf8',input}); return {code:r.status,out:r.stdout,err:r.stderr}; }
{
  const f=pth.join(tmp,'prog.dhad'); fsx.writeFileSync(f,'اطبع(اقرأ_ملف("/sub/a.txt"))\nاكتب_ملف("/cli.txt"، "من الأداة")');
  let r=cli(['--ملفات='+tmp,f]); (r.code===0&&r.out.trim()==='مرحبا'&&fsx.readFileSync(pth.join(tmp,'cli.txt'),'utf8')==='من الأداة')?pass++:(fail++,console.log('FAIL cli-ar',r));
  r=cli(['--fs='+tmp,f]); (r.code===0)?pass++:(fail++,console.log('FAIL cli-en',r));
  r=cli([f]); (r.code===1&&r.err.includes('غير متاحة'))?pass++:(fail++,console.log('FAIL cli-nofs',r));
  r=cli(['--ملفات='+pth.join(tmp,'لا_يوجد'),f]); (r.code===1&&r.err.includes('تعذّر فتح مجلد الملفات'))?pass++:(fail++,console.log('FAIL cli-badroot',r));
  r=cli(['--ملفات='+tmp,'-e','اقرأ_ملف("/link_dir/secret.txt")']); (r.code===1&&r.err.includes('يخرج من المجلد المسموح'))?pass++:(fail++,console.log('FAIL cli-escape',r));
  r=cli(['--ملفات='+tmp,'-e','اطبع(اسرد_مجلد("/sub"))']); (r.code===0&&r.out.includes('a.txt'))?pass++:(fail++,console.log('FAIL cli-e',r));
}
fsx.rmSync(tmp,{recursive:true,force:true}); fsx.rmSync(outside,{recursive:true,force:true});
console.log('pass',pass,'fail',fail);
process.exit(fail?1:0);
