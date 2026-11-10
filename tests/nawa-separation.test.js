// فصل نواة عن ضاد: نواة عامة؛ ضاد وحدة لغة لا تُستدعى إلا حين تُطلب باسمها أو بشيفرتها؛ وإزالتها لا تمسّ بقية نواة.
const fs=require('fs'),path=require('path');
const R=require(path.join(__dirname,'..','site','run.js')),api=R.api;
let pass=0,fail=0;const ok=(c,m)=>{if(c)pass++;else{fail++;console.log('FAIL',m)}};
const conv=v=>Object.prototype.toString.call(v)==='[object Map]'?Object.fromEntries([...v].map(([k,x])=>[k,conv(x)])):Array.isArray(v)?v.map(conv):v;
const mk=()=>{const c=api.compile(api.parse('استورد("ضاد/نواة_جلسة")'));const vm=new api.VM({maxSteps:1e8,onPrint:()=>{}});vm.run(c.mainChunkIndex,c.functionChunks);return vm;};
const L={maxSteps:4e9,maxMs:300000};
const ask=(vm,a,x,y)=>conv(vm.callHost([a,x===undefined?null:x,y===undefined?null:y],L));
const dist=path.join(__dirname,'..','dist','nawa');
if(!fs.existsSync(path.join(dist,'base.json'))){console.log('تخطّي: شغّل site/pages.gen.js');process.exit(0);}
const vm=mk();ask(vm,'تهيئة',fs.readFileSync(path.join(dist,'base.json'),'utf8'));
if(fs.existsSync(path.join(dist,'guide.json')))ask(vm,'دليل',fs.readFileSync(path.join(dist,'guide.json'),'utf8'));
const BT='```';
const noDhad=(q,m)=>{const r=ask(vm,'اسأل',q);ok(r['لغة']===''&&!['تعليم','دليل','شرح','إصلاح','تأليف'].includes(r['نوع']),m+' → '+r['نوع']+' لغة='+r['لغة']);return r};
// ١) بلا تسمية: لا ضاد
noDhad('كيف أكتب حلقة','تعليم بلا لغة');
noDhad('ما هي الدالة؟','سؤال عام لا يُجاب من دليل الموقع');
noDhad('اشرح لي الإغلاقات','شرح عام لا يستدعي دروس ضاد');
noDhad('كيف أبدأ التعلم','سؤال عام');
{const r=noDhad('اكتب برنامجا يحسب مضروب ٥','برنامج بلا لغة');ok(r['نوع']==='سؤال_لغة','يُسأل عن اللغة: '+r['نوع']);ok(!/اطبع|متغير/.test(r['رد']),'لا شيفرة في سؤال اللغة');}
{const r=ask(vm,'اسأل','بضاد');ok(r['نوع']==='تأليف'&&r['رد'].includes('١٢٠'),'جواب اللغة وحده يكمّل الطلب المعلّق: '+r['نوع']);ok(r['لغة']==='ضاد','لغة النتيجة ضاد');}
// ٢) بالتسمية: ضاد تعمل
{const r=ask(vm,'اسأل','كيف أكتب حلقة في ضاد');ok(r['نوع']==='تعليم'&&r['لغة']==='ضاد','تعليم بالتسمية: '+r['نوع']);}
{const r=ask(vm,'اسأل','اكتب برنامجا بضاد يجمع ٤ و٦');ok(r['نوع']==='تأليف'&&r['رد'].includes('١٠'),'تأليف بالتسمية');}
{const r=ask(vm,'اسأل','اشرح هذا الكود\n'+BT+'\nمتغير س = ٣\nاطبع(س)\n'+BT);ok(r['نوع']==='شرح'&&r['لغة']==='ضاد','شيفرة ضاد تُعرف بلا تسمية: '+r['نوع']);}
{const r=ask(vm,'اسأل','اشرحه');ok(r['لغة']==='ضاد','المتابعة ترث اللغة النشطة: '+r['لغة']);}
// ٣) شيفرة بلغة أخرى لا تُعامَل ضادًا
{const r=ask(vm,'اسأل','اشرح هذا الكود\n'+BT+'python\nfor i in range(3):\n    print(i)\n'+BT);ok(r['لغة']!=='ضاد'&&r['نوع']!=='شرح','شيفرة بايثون لا تُشرح بمحلل ضاد: '+r['نوع']+' '+r['لغة']);}
// ٤) نواة لا تستورد وحدات ضاد مباشرة
const src=fs.readFileSync(path.join(__dirname,'..','stdlib','نواة_منسق.dhad'),'utf8');
for(const m of ['نواة_تعليم','نواة_مصلح','نواة_مؤلف','نواة_شرح','نواة_دليل','نواة_وحدة_ضاد','نواة_منفذ','نواة_توليف','نواة_أخطاء'])ok(!src.includes('استورد("ضاد/'+m+'")'),'المنسّق لا يستورد '+m);
ok(src.includes('ضاد/نواة_وحدات')&&src.includes('ضاد/نواة_لغات'),'المنسّق يصل إلى اللغات عبر المحمّل وسجلّ اللغات فقط');
ok(!/"ضاد"/.test(src.replace(/#[^\n]*/g,'')),'لا اسم لغة في شيفرة المنسّق');
ok(!/\.dhad"/.test(src),'لا امتداد لغة في المنسّق');
const ses=fs.readFileSync(path.join(__dirname,'..','stdlib','نواة_جلسة.dhad'),'utf8');
ok(!/استورد\("ضاد\/نواة_(وحدة_ضاد|تعليم|مصلح|مؤلف|شرح|دليل)"\)/.test(ses),'الجلسة لا تستورد وحدات ضاد');
// ٥) إزالة وحدة ضاد لا تكسر بقية نواة
const t=R.run('متغير س = استورد("ضاد/نواة_منسق")\nمتغير ل = استورد("ضاد/نواة_لغات")\nس.جهّز()\nل.صفّر_الوحدات()\nمتغير أ = س.نفّذ_الطلب("مرحبا")\nمتغير ب = س.نفّذ_الطلب("اكتب برنامجا بضاد يحسب مضروب ٥")\nمتغير ج = س.نفّذ_الطلب("ما مجموع الأعداد في ملفي")\nاطبع(أ["نوع"]، ب["لغة"] == ""، ب["نوع"] != "تأليف"، ج["لغة"] == "")',{maxMs:120000,maxSteps:2e9});
ok(t.ok&&t.out[0]==='حوار صحيح صحيح صحيح','بلا وحدة ضاد تبقى نواة تعمل: '+JSON.stringify(t).slice(0,300));
console.log('نجح',pass,'فشل',fail);process.exit(fail?1:0);
