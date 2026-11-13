// فئة «نواة تجيب عن أي سؤال بمادة ضاد»: العتبة مسجَّلة قبل التشغيل — صفر مخالفات على المجموعة.
// القاعدة (ميثاق ضاد ونواة): جواب نواة جواب نموذج؛ لا وسم لغة ضاد ولا بطاقة درس/شرح/دليل إلا إذا سُمّيت ضاد أو وُجدت شيفرتها أو طُلب ذلك صراحةً.
const fs=require('fs'),path=require('path');
const R=require(path.join(__dirname,'..','site','run.js')),api=R.api;
let pass=0,fail=0;const ok=(c,m)=>{if(c)pass++;else{fail++;console.log('FAIL',m)}};
const conv=v=>Object.prototype.toString.call(v)==='[object Map]'?Object.fromEntries([...v].map(([k,x])=>[k,conv(x)])):Array.isArray(v)?v.map(conv):v;
const mk=()=>{const c=api.compile(api.parse('استورد("ضاد/نواة_جلسة")'));const vm=new api.VM({maxSteps:1e8,onPrint:()=>{}});vm.run(c.mainChunkIndex,c.functionChunks);return vm;};
const L={maxSteps:4e9,maxMs:300000};
const dist=path.join(__dirname,'..','dist','nawa');
if(!fs.existsSync(path.join(dist,'base.json'))){console.log('تخطّي: شغّل site/pages.gen.js');process.exit(0);}
const vm=mk();const ask=(a,x)=>conv(vm.callHost([a,x===undefined?null:x,null],L));
ask('تهيئة',fs.readFileSync(path.join(dist,'base.json'),'utf8'));
if(fs.existsSync(path.join(dist,'guide.json')))ask('دليل',fs.readFileSync(path.join(dist,'guide.json'),'utf8'));
const GENERAL=['مرحبا','السلام عليكم','من أنت؟','ما عاصمة فرنسا','اشرح لي الذكاء الاصطناعي ببساطة','كيف أتعلم البرمجة','ما هي الدالة؟','اشرح لي الإغلاقات','كيف أكتب حلقة','ما الفرق بين المصفوفة والقائمة','ما هو الشرط في البرمجة','اكتب لي برنامجا يحسب مضروب ٥','صحح هذا النص لغويا: ذهبت الى المدرسه','ما هي المتغيرات','اشرح الدرس الأول','ما أفضل لغة برمجة للمبتدئين','اكتب دالة بايثون تجمع عددين','حدثني عن تاريخ الخوارزمي','ما هي الشروحات','درس','شرح','hello','what is a variable','explain recursion','ما معنى كلمة نواة','احسب ٢٥ ضرب ١٣','علمني مفهوم التكرار','ما هي الأصناف والكائنات'];
for(const q of GENERAL){const r=ask('اسأل',q);ok(r['لغة']===''&&!['دليل','تعليم'].includes(r['نوع']),'عام لا يُوسم ضادًا ولا يُجاب ببطاقة: «'+q+'» → '+r['نوع']+' لغة='+r['لغة']);
  ok(!/\/(learn|explain|guide)\//.test(JSON.stringify(r['نتائج']||'')+String(r['رد']||'')),'لا رابط درس/شرح في: «'+q+'»');}
// مع التسمية الصريحة تعمل وحدة ضاد
{const r=ask('اسأل','كيف أكتب حلقة في ضاد');ok(r['لغة']==='ضاد','بالتسمية: لغة ضاد');}
console.log('نجح',pass,'فشل',fail);process.exit(fail?1:0);
