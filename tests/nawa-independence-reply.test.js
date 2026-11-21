// قبول الاستقلال في الردود: ٢٠ سؤالًا عامًا لا يُذكر في ردّها اسم ضاد ولا يُستدعى دليلها، وسؤالان عن ضاد يُجابان كأي لغة.
const fs=require('fs'),path=require('path');
const R=require(path.join(__dirname,'..','site','run.js')),api=R.api;
const conv=v=>Object.prototype.toString.call(v)==='[object Map]'?Object.fromEntries([...v].map(([k,x])=>[k,conv(x)])):Array.isArray(v)?v.map(conv):v;
const dist=path.join(__dirname,'..','dist','nawa');
if(!fs.existsSync(path.join(dist,'base.json'))){console.log('تخطّي: شغّل site/pages.gen.js');process.exit(0);}
const c=api.compile(api.parse('استورد("ضاد/نواة_جلسة")'));const vm=new api.VM({maxSteps:1e8,onPrint:()=>{}});vm.run(c.mainChunkIndex,c.functionChunks);
const L={maxSteps:4e9,maxMs:300000};
const ask=(a,x)=>conv(vm.callHost([a,x===undefined?null:x,null],L));
ask('تهيئة',fs.readFileSync(path.join(dist,'base.json'),'utf8'));
if(fs.existsSync(path.join(dist,'guide.json')))ask('دليل',fs.readFileSync(path.join(dist,'guide.json'),'utf8'));
let pass=0,fail=0;const ok=(c,m)=>{if(c)pass++;else{fail++;console.log('FAIL',m)}};
const GEN=['من أنت','ماذا تستطيع أن تفعل','ما عاصمة فرنسا','كيف أطبخ الأرز','ما هي الدالة؟','كيف أبدأ التعلم','اشرح لي الإغلاقات','كيف أكتب حلقة','ما الفرق بين المصفوفة والقائمة','اكتب لي قصيدة عن البحر','كيف أتعلم البرمجة','ما معنى كلمة الشفافية','ما هو الذكاء الاصطناعي','كيف أرتب قائمة من الأرقام','ما هي المتغيرات','لخّص لي فكرة التعلم الآلي','أين أجد ملفاتي','ما هذا الخطأ','هل تتكلم الإنجليزية','كيف حالك'];
for(const q of GEN){const r=ask('اسأل',q);const t=String(r['رد']||'');
  ok(!/ضاد|dhad/i.test(t),'ذُكرت ضاد في الرد على «'+q+'»: '+t.slice(0,80));
  ok(!['دليل','تعليم'].includes(r['نوع'])&&r['لغة']==='','استُدعيت ضاد لـ«'+q+'»: '+r['نوع']+'/'+r['لغة']);}
// ما بعد «اشرح ما قلت» لا يُعيد ذكر ضاد أيضًا
ask('اسأل','ماذا تستطيع أن تفعل');{const r=ask('اسأل','اشرح ما قلته');ok(!/ضاد|dhad/i.test(String(r['رد'])),'شرح الردّ السابق بلا ضاد');}
// السؤال عن ضاد نفسها يُجاب كأي لغة (بالتسمية)
{const r=ask('اسأل','ما هي ضاد؟');ok(String(r['رد']||'').length>0&&r['لغة']==='ضاد','سؤال عن ضاد بالتسمية يصل إلى وحدتها: '+r['نوع']+'/'+r['لغة']);}
{const r=ask('اسأل','كيف أكتب حلقة في ضاد');ok(r['لغة']==='ضاد','سؤال بالتسمية');}
console.log('نجح',pass,'فشل',fail);process.exit(fail?1:0);
