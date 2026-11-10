// جلسة نواة (ضاد/نواة_جلسة) كما تستعملها الصفحة: معالج مضيف، حالة باقية، ملفات المستخدم، استخراج docx/html
const fs=require('fs'),path=require('path');
const R=require(path.join(__dirname,'..','site','run.js')),api=R.api;
let pass=0,fail=0;
const ok=(c,m)=>{if(c)pass++;else{fail++;console.log('FAIL',m);}};
const conv=v=>Object.prototype.toString.call(v)==='[object Map]'?Object.fromEntries([...v].map(([k,x])=>[k,conv(x)])):Array.isArray(v)?v.map(conv):v;
const mk=()=>{const c=api.compile(api.parse('استورد("ضاد/نواة_جلسة")'));const vm=new api.VM({maxSteps:1e8,onPrint:()=>{}});vm.run(c.mainChunkIndex,c.functionChunks);return vm;};
const L={maxSteps:4e9,maxMs:300000};
const ask=(vm,a,x,y)=>conv(vm.callHost([a,x===undefined?null:x,y===undefined?null:y],L));
const base=path.join(__dirname,'..','dist','nawa','base.json');
if(!fs.existsSync(base)){console.log('تخطّي: لا dist/nawa/base.json (شغّل site/pages.gen.js)');process.exit(0);}
const B=fs.readFileSync(base,'utf8');
// معالج بلا تهيئة
{const vm=mk();let e=null;try{ask(vm,'اسأل','مرحبا');}catch(x){e=x.message;}ok(e&&e.includes('لم تُهيَّأ'),'ask-before-init: '+e);}
{const vm=mk();let e=null;try{ask(vm,'فعل_خيالي');}catch(x){e=x.message;}ok(e&&e.includes('فعل غير معروف'),'unknown-action');}
{const vm=new api.VM({});let e=null;try{vm.callHost([]);}catch(x){e=x.message;}ok(e&&e.includes('معالج'),'no-handler-registered');}
const vm=mk();
const init=ask(vm,'تهيئة',B);ok(init['جاهز']===true&&init['أمثلة']>=200,'init '+JSON.stringify(init));
// أسئلة المعرفة
{const r=ask(vm,'اسأل','اكتب لي برنامج الأعداد الأولية بضاد');ok(r['نوع']==='كتابة_برنامج'&&r['نتائج']['توليف']['وُجد']&&r['نتائج']['توليف']['مصدر']==='example/primes','synth primes');
 const run=api.compile(api.parse(r['نتائج']['توليف']['شيفرة']));const out=[];new api.VM({maxSteps:1e8,onPrint:l=>out.push(l)}).run(run.mainChunkIndex,run.functionChunks);ok(out[0]&&out[0].startsWith('[٢، ٣، ٥'),'synth code really runs: '+out[0]);}
{const r=ask(vm,'اسأل','اشرح لي الإغلاقات في ضاد');ok(r['نوع']==='شرح_مفهوم'&&r['نتائج']['استرجاع'].some(x=>x['معرف']==='lesson/closures'),'explain closures');}
{const r=ask(vm,'اسأل','لماذا لا يعمل هذا الخطأ؟ ```\nمتغير عداد = ١\nاطبع(عدادد)\n```');ok(r['نتائج']['تشخيص']['تصنيف']==='اسم_غير_معرف'&&r['نتائج']['تشخيص']['أقرب_اسم']==='عداد'&&r['نتائج']['تشخيص']['سطر']===2,'diagnose typo');}
{const r=ask(vm,'اسأل','مرحبا');ok(r['نوع']==='حوار'&&r['رد'].includes('أهلًا'),'greeting handled by dialogue');}
{const r=ask(vm,'اسأل','ابنِ لي لعبة فضاء ثلاثية الأبعاد بمحرك فيزياء');ok(!r['نتائج']['توليف']||!r['نتائج']['توليف']['وُجد'],'no invented program');}
// الحالة تبقى بين النداءات
ok(ask(vm,'مستندات')['مستندات'].length===0,'no docs yet');
const book=('باب الصلاة: الصلاة عماد الدين وهي خمس صلوات في اليوم والليلة. '.repeat(20))+'\n\n'+('باب الزكاة: تجب الزكاة في المال إذا بلغ النصاب وحال عليه الحول وهو مقدار مئتي درهم. '.repeat(20))+'\n\n'+('باب الصيام: يصوم المسلم شهر رمضان من طلوع الفجر إلى غروب الشمس. '.repeat(20));
{const r=ask(vm,'مستند','كتاب.txt',book);ok(r['مقاطع']>=3,'doc chunks '+r['مقاطع']);}
{const r=ask(vm,'اسأل','ما نصاب الزكاة؟');const p=r['نتائج']['مستندات'];ok(p&&p.length&&p[0]['مقتطف'].includes('الزكاة')&&p[0]['معرف'].startsWith('كتاب.txt#'),'doc search finds zakat passage');}
{const r=ask(vm,'اسأل','متى يصوم المسلم؟');ok(r['نتائج']['مستندات'][0]['مقتطف'].includes('رمضان'),'doc search finds siyam');}
{const r=ask(vm,'اسأل','اكتب لي برنامج الأعداد الأولية بضاد');ok(!r['نتائج']['مستندات'],'code requests do not search user docs');}
// docx / html
const docx='<w:document><w:body><w:p><w:r><w:t>كتاب الطهارة</w:t></w:r></w:p><w:p><w:r><w:t xml:space="preserve">الماء الطهور هو الباقي على أصل خلقته &amp; يرفع الحدث</w:t></w:r></w:p></w:body></w:document>';
{const r=ask(vm,'مستند_docx','طهارة.docx',docx);ok(r['مقاطع']===1,'docx ingest');const q=ask(vm,'اسأل','ما الماء الطهور؟');ok(q['نتائج']['مستندات']&&q['نتائج']['مستندات'][0]['مقتطف'].includes('& يرفع'),'docx entities decoded + searchable');}
{const r=ask(vm,'مستند_html','فصل.html','<html><body><h1>العنوان</h1><p>نص عن الحج والعمرة وأركانهما.</p><script>var a="<p>x</p>"</script></body></html>');ok(r['مقاطع']===1,'html ingest');const q=ask(vm,'اسأل','أركان الحج');ok(q['نتائج']['مستندات']&&q['نتائج']['مستندات'][0]['مقتطف'].includes('الحج')&&!q['نتائج']['مستندات'][0]['مقتطف'].includes('var a'),'html script stripped');}
// إزالة وإعادة فهرسة وقائمة
ok(ask(vm,'مستندات')['مستندات'].length===3,'three docs listed');
ask(vm,'إزالة','كتاب.txt');
ok(ask(vm,'مستندات')['مستندات'].map(d=>d['اسم']).join()==='طهارة.docx,فصل.html'||ask(vm,'مستندات')['مستندات'].length===2,'doc removed');
{const q=ask(vm,'اسأل','ما نصاب الزكاة؟');ok(!q['نتائج']['مستندات']||q['نتائج']['مستندات'].every(x=>!x['معرف'].startsWith('كتاب.txt')),'removed doc no longer searched');}
// استبدال مستند بنفس الاسم لا يضاعف مقاطعه
{ask(vm,'مستند','ثابت.txt','نص قصير عن الوقف.');ask(vm,'مستند','ثابت.txt','نص قصير عن الوقف.');ok(ask(vm,'مستندات')['مستندات'].filter(d=>d['اسم']==='ثابت.txt').length===1,'same name replaces');}
// فهرس فارغ بعد إزالة الكل
for(const d of ask(vm,'مستندات')['مستندات'])ask(vm,'إزالة',d['اسم']);
{const q=ask(vm,'اسأل','ما نصاب الزكاة؟');ok(!q['نتائج']['مستندات'],'no docs → no doc search');}

// ===== الإرفاق مقابل الربط =====
{
  const lib='باب الوقف: الوقف حبس الأصل وتسبيل الثمرة وهو من القربات العظيمة. '.repeat(15)+'\n\n'+'باب الهبة: الهبة تمليك بلا عوض في الحياة. '.repeat(15);
  ask(vm,'مستند','مكتبة.txt',lib);
  const att='باب الصلاة\nالصلاة عماد الدين وهي خمس صلوات في اليوم والليلة. الصلاة تطهر النفس وتقرب العبد من ربه.\n\nباب الزكاة\nتجب الزكاة في المال إذا بلغ النصاب وحال عليه الحول. الزكاة حق الفقراء في أموال الأغنياء.';
  const r0=ask(vm,'مرفق','ملاحظات.txt',att);ok(r0['مقاطع']>=1,'attach ingest');
  const L=ask(vm,'مستندات')['مستندات'];
  ok(L.some(d=>d['اسم']==='ملاحظات.txt'&&d['نوع']==='إرفاق')&&L.some(d=>d['اسم']==='مكتبة.txt'&&d['نوع']==='ربط'),'list marks attach vs link: '+JSON.stringify(L));
  // تحليل المرفق كاملًا لا رمي مقاطع
  {const r=ask(vm,'اسأل','حلل هذا الملف واكتب عنه تقييما');ok(r['نوع']==='تحليل_ملف'&&r['رد'].includes('تحليل الملف «ملاحظات.txt»')&&r['رد'].includes('أبرز المصطلحات')&&!r['رد'].includes('مكتبة.txt'),'analysis targets the attachment only: '+r['رد'].slice(0,200));}
  // الحوار لا يتأثر بالملفات ويذكرها
  ask(vm,'عدد_مربوط',3);
  {const r=ask(vm,'اسأل','ماذا تفعل؟');ok(r['نوع']==='حوار'&&r['رد'].includes('ملف مرفق: ملاحظات.txt')&&r['رد'].includes('المكتبة المربوطة'),'capabilities mention both: '+r['رد']);}
  {const r=ask(vm,'اسأل','السلام عليكم');ok(r['رد'].startsWith('وعليكم السلام')&&r['نوع']==='حوار','salam');}
  // سؤال عادي يبحث في المرفق أولًا ثم المكتبة
  {const r=ask(vm,'اسأل','ما نصاب الزكاة؟');const p=r['نتائج']['مستندات'];ok(p&&p[0]['معرف'].startsWith('ملاحظات.txt#'),'question searches attachment first');}
  {const r=ask(vm,'اسأل','ما هو الوقف؟');const p=r['نتائج']['مستندات'];ok(p&&p.some(x=>x['معرف'].startsWith('مكتبة.txt#')&&x['مقتطف'].includes('الوقف')),'question also reaches the linked library');}
  {const r=ask(vm,'اسأل','ماذا تفعل؟');ok(r['رد'].includes('٣ ملف'),'linked count comes from the connector, not from fetched files');}
  ask(vm,'صفّر_المكتبة');ok(!ask(vm,'مستندات')['مستندات'].some(d=>d['نوع']==='ربط'),'clearing the library drops fetched files only');ask(vm,'مستند','مكتبة.txt',lib);
  // إزالة المرفق لا تمسّ المكتبة، وبعدها لا ملف للتحليل
  ask(vm,'إزالة_مرفق','ملاحظات.txt');
  ok(ask(vm,'مستندات')['مستندات'].every(d=>d['نوع']==='ربط'),'attach removed, library intact');
  {const r=ask(vm,'اسأل','حلل هذا الملف');ok(r['نوع']==='تحليل_ملف'&&r['رد'].includes('لا أرى ملفًا مرفقًا'),'no attachment message');}
  // الاسم نفسه في المجموعتين لا يتداخل
  ask(vm,'مرفق','مكتبة.txt','نص مختلف تماما عن الشركة والمضاربة.');
  ask(vm,'إزالة_مرفق','مكتبة.txt');
  ok(ask(vm,'مستندات')['مستندات'].some(d=>d['اسم']==='مكتبة.txt'&&d['نوع']==='ربط'),'same name in both sets stays separate');
  // تصفير المرفقات
  ask(vm,'مرفق','أ.txt','نص أول طويل بما يكفي ليُحسب.');ask(vm,'مرفق','ب.txt','نص ثان طويل بما يكفي ليُحسب.');
  ask(vm,'صفّر_المرفقات');ok(ask(vm,'مستندات')['مستندات'].every(d=>d['نوع']==='ربط'),'attachments cleared at once');
  // مرفق docx وhtml
  ask(vm,'مرفق_docx','ط.docx','<w:document><w:body><w:p><w:r><w:t>كتاب الطهارة الماء الطهور يرفع الحدث ويزيل الخبث بإذن الله</w:t></w:r></w:p></w:body></w:document>');
  {const r=ask(vm,'اسأل','لخص المرفق');ok(r['رد'].includes('تحليل الملف «ط.docx»'),'docx attachment analysed');}
  ask(vm,'مرفق_html','ح.html','<html><body><p>نص عن الحج والعمرة وأركانهما وواجباتهما في الشريعة</p><script>var a=1</script></body></html>');
  ask(vm,'إزالة_مرفق','ط.docx');
  {const r=ask(vm,'اسأل','حلل الملف');ok(r['رد'].includes('ح.html')&&!r['رد'].includes('var a'),'html attachment analysed without script');}
  // ملف شيفرة مرفق يُشغَّل ويُشخَّص
  ask(vm,'صفّر_المرفقات');
  ask(vm,'مرفق','عطل.dhad','متغير عداد = ١\nاطبع(عدادد)');
  {const r=ask(vm,'اسأل','افحص هذا الملف');ok(r['رد'].includes('التشغيل: فشل')&&r['رد'].includes('عداد'),'code attachment diagnosed: '+r['رد']);}
  ask(vm,'صفّر_المرفقات');
}

// ===== مطابقة الجذور: لا مقاطع عشوائية =====
{
  ask(vm,'مستند','وقف.txt','باب الوقف: الوقف حبس الأصل وتسبيل الثمرة وهو من القربات العظيمة. '.repeat(10));
  ask(vm,'مرفق','صلاة.txt','باب الصلاة: الصلاة عماد الدين وهي خمس صلوات في اليوم والليلة وتطهر النفس. '.repeat(10));
  const r=ask(vm,'اسأل','ما هو الوقف؟');const p=r['نتائج']['مستندات']||[];
  ok(p.length>0&&p.every(x=>x['مقتطف'].includes('الوقف')),'only passages containing the query root: '+JSON.stringify(p.map(x=>x['معرف'])));
  ok(!p.some(x=>x['معرف'].startsWith('صلاة.txt')),'unrelated attachment not shown');
  const r2=ask(vm,'اسأل','ما حكم الصلاة؟');const p2=r2['نتائج']['مستندات']||[];
  ok(p2.length>0&&p2[0]['معرف'].startsWith('صلاة.txt#'),'related attachment shown first');
  ask(vm,'صفّر_المرفقات');ask(vm,'إزالة','وقف.txt');
}

// ===== السياق بين الرسائل: شغّله، اشرحه، المزيد =====
{
  ask(vm,'صفّر_السياق');
  {const r=ask(vm,'اسأل','شغّله');ok(r['لغة']===''&&r['نوع']!=='تشغيل'&&!r['رد'].includes('شُغِّل'),'follow-up without context stays language-neutral: '+r['رد']);}
  ask(vm,'اسأل','اكتب لي برنامج الأعداد الأولية بضاد');
  {const r=ask(vm,'اسأل','شغّله');ok(r['نوع']==='متابعة'&&r['نتائج']['تنفيذ']['ناجح']&&r['نتائج']['تنفيذ']['مخرجات'][0].startsWith('[٢، ٣، ٥')&&r['رد'].includes('شُغِّل البرنامج السابق'),'run last program: '+JSON.stringify(r['نتائج']['تنفيذ']));}
  {const r=ask(vm,'اسأل','جرّبه');ok(r['نوع']==='متابعة'&&r['نتائج']['تنفيذ']['ناجح'],'جرّبه also runs');}
  {const r=ask(vm,'اسأل','اشرح الكود');ok(r['نوع']==='شرح'&&r['نتائج']['شرح']['صحيح']&&r['رد'].includes('يعرّف دالة')&&r['رد'].includes('الناتج عند التشغيل'),'explain follow-up explains the program itself from its syntax tree: '+r['نوع']);}
  // اشرحه بعد شرح مفهوم لا يخلط بالبرنامج
  ask(vm,'صفّر_السياق');
  ask(vm,'اسأل','اشرح لي الإغلاقات في ضاد');
  {const r=ask(vm,'اسأل','المزيد');ok(r['نوع']==='متابعة'&&r['نتائج']['استرجاع'].every(x=>x['معرف']!=='lesson/closures'),'more excludes already shown: '+JSON.stringify(r['نتائج']['استرجاع'].map(x=>x['معرف'])));
   const r2=ask(vm,'اسأل','المزيد');const a=r['نتائج']['استرجاع'].map(x=>x['معرف']),b=r2['نتائج']['استرجاع'].map(x=>x['معرف']);ok(b.every(x=>!a.includes(x)),'second more gives different ones: '+a+' / '+b);}
  // طلب جديد يغيّر السياق، فلا يُشغَّل برنامج قديم
  ask(vm,'صفّر_السياق');ask(vm,'اسأل','اكتب لي برنامج الأعداد الأولية بضاد');ask(vm,'اسأل','اشرح لي القوائم');
  {const r=ask(vm,'اسأل','شغّله');ok(r['نتائج']['تنفيذ']&&r['نتائج']['تنفيذ']['ناجح'],'program context survives a later explanation');}
  // جملة طويلة فيها «شغّل» ليست متابعة
  {const r=ask(vm,'اسأل','اكتب لي برنامج يشغّل عدادا ويطبع الأرقام من واحد إلى عشرة');ok(r['نوع']==='سؤال_لغة'&&r['رد'].includes('بأي لغة'),'program request without a language asks which: '+r['نوع']);}
  ask(vm,'صفّر_السياق');
}

// ===== تحية + طلب في رسالة واحدة =====
{
  ask(vm,'صفّر_السياق');
  {const r=ask(vm,'اسأل','السلام عليكم، اكتب لي برنامج الأعداد الأولية بضاد');ok(r['نوع']==='كتابة_برنامج'&&r['نتائج']['توليف']['وُجد']&&r['نتائج']['توليف']['مصدر']==='example/primes'&&r['بادئة'].startsWith('وعليكم السلام'),'greeting does not pollute synthesis: '+r['نوع']+' '+JSON.stringify(r['بادئة']));}
  {const r=ask(vm,'اسأل','مرحبا اشرح لي الإغلاقات في ضاد');ok(r['نوع']==='شرح_مفهوم'&&r['نتائج']['استرجاع'].some(x=>x['معرف']==='lesson/closures')&&r['بادئة']==='أهلًا بك.','greeting + explain');}
  {const r=ask(vm,'اسأل','شغّله');ok(r['نتائج']['تنفيذ']&&r['نتائج']['تنفيذ']['ناجح'],'program from greeting-prefixed request is runnable');}
  ask(vm,'صفّر_السياق');
}
console.log('pass',pass,'fail',fail);
