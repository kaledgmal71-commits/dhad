// الإحالة إلى كلام نواة السابق («اشرح ما قلت»): فئة طلبات تُجاب من الردّ المحفوظ ولا تُرسل إلى الويب. مدونة متنوعة إيجابية وسلبية + جلسة كاملة.
const fs=require('fs'),path=require('path');
const R=require(path.join(__dirname,'..','site','run.js')),api=R.api;
let pass=0,fail=0;const ok=(c,m)=>{if(c)pass++;else{fail++;console.log('FAIL',m);}};
const conv=v=>Object.prototype.toString.call(v)==='[object Map]'?Object.fromEntries([...v].map(([k,x])=>[k,conv(x)])):Array.isArray(v)?v.map(conv):v;
const mk=()=>{const c=api.compile(api.parse('استورد("ضاد/نواة_جلسة")'));const vm=new api.VM({maxSteps:1e8,onPrint:()=>{}});vm.run(c.mainChunkIndex,c.functionChunks);return vm;};
const L={maxSteps:4e9,maxMs:300000};
const ask=(vm,a,x)=>conv(vm.callHost([a,x===undefined?null:x,null],L));
const base=path.join(__dirname,'..','dist','nawa','base.json');
if(!fs.existsSync(base)){console.log('تخطّي: لا dist/nawa/base.json');process.exit(0);}
const vm=mk();ask(vm,'تهيئة',fs.readFileSync(base,'utf8'));
const intent=q=>ask(vm,'نية',q)['نية'];
// إيجابية: كلام عن ردّ نواة نفسها بصياغات متنوعة
const POS=['طيب اشرح ما قلت أنت الآن','اشرح ما قلته','وضح كلامك','ماذا تقصد؟','ما تقصد بهذا الكلام','فسر لي ما ذكرت','لم أفهم','لماذا قلت ذلك','كيف قلت هذا','اشرح لي جوابك','وضّح ردك أكثر','ما معنى كلامك','ماذا تعني بذلك','اعد ما قلت','فصّل ما ذكرته','بسّط كلامك لو سمحت','يعني ماذا قلت','ما المقصود بقولك'];
for(const q of POS)ok(intent(q)==='إحالة','إيجابية: '+q+' ← '+intent(q));
// سلبية: طلبات حقيقية لا تُحال
const NEG=['اشرح لي الإغلاقات','كيف أكتب حلقة في ضاد','قلت لك اكتب برنامجا','اكتب برنامجا يجمع قائمة','ما معنى الدالة','ما هي الوراثة','وضح لي الفرق بين المتغير والثابت','اشرح الكود','المزيد','أصلح هذا الخطأ','شغله','من أنت'];
for(const q of NEG)ok(intent(q)!=='إحالة','سلبية: '+q+' ← '+intent(q));
// جلسة: بعد ردّ القدرات يُفصَّل كل بند ولا يُبحث في الويب
{const a=ask(vm,'اسأل','ماذا تستطيع أن تفعل');ok(a['رد'].includes('يمكنني:'),'قدرات');
 const b=ask(vm,'اسأل','طيب اشرح ما قلت أنت الآن');
 ok(b['نوع']==='إحالة'&&b['رد'].includes('١)')&&b['رد'].includes('٥)'),'تفصيل البنود: '+b['رد'].slice(0,120));
 ok(!b['نتائج']['مستندات']&&!b['نتائج']['استرجاع'],'لا استرجاع للإحالة');
 const c=ask(vm,'اسأل','اشرح ما قلته مرة أخرى');ok(c['نوع']==='إحالة'&&c['رد'].includes('١)'),'تكرار الطلب يبقى على الردّ الأصلي لا على التفصيل');}
// بلا كلام سابق: صدق لا اختلاق
{const v2=mk();ask(v2,'تهيئة',fs.readFileSync(base,'utf8'));const r=ask(v2,'اسأل','اشرح ما قلت');ok(r['نوع']==='إحالة'&&r['رد'].includes('لا أرى كلامًا سابقًا'),'بلا سابق: '+r['رد']);}
// ردّ غير القدرات: يُعرض ما قيل نقاطًا
{const a=ask(vm,'اسأل','مرحبا');const b=ask(vm,'اسأل','ماذا تقصد');ok(b['نوع']==='إحالة'&&b['رد'].includes('كان ردّي السابق'),'ردّ عام: '+b['رد'].slice(0,100));}
console.log('نجح',pass,'فشل',fail);process.exit(fail?1:0);
