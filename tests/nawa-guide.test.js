// دليل ضاد داخل نواة: الجواب من نص الدليل والدروس والشروحات، ومستويات الشرح (بسّط/عمّق)، وعدم خطف الطلبات الأخرى
const fs=require('fs'),path=require('path');
const R=require(path.join(__dirname,'..','site','run.js')),api=R.api;
let pass=0,fail=0;
const ok=(c,m)=>{if(c)pass++;else{fail++;console.log('FAIL',m);}};
const conv=v=>Object.prototype.toString.call(v)==='[object Map]'?Object.fromEntries([...v].map(([k,x])=>[k,conv(x)])):Array.isArray(v)?v.map(conv):v;
const mk=()=>{const c=api.compile(api.parse('استورد("ضاد/نواة_جلسة")'));const vm=new api.VM({maxSteps:1e8,onPrint:()=>{}});vm.run(c.mainChunkIndex,c.functionChunks);return vm;};
const L={maxSteps:4e9,maxMs:300000};
const ask=(vm,a,x,y)=>conv(vm.callHost([a,x===undefined?null:x,y===undefined?null:y],L));
const dir=path.join(__dirname,'..','dist','nawa');
if(!fs.existsSync(path.join(dir,'guide.json'))){console.log('تخطّي: لا dist/nawa/guide.json (شغّل site/pages.gen.js)');process.exit(0);}
const vm=mk();
ask(vm,'تهيئة',fs.readFileSync(path.join(dir,'base.json'),'utf8'));
const g=ask(vm,'دليل',fs.readFileSync(path.join(dir,'guide.json'),'utf8'));
ok(g['جاهز']===true&&g['مقاطع']>=300,'guide loaded '+JSON.stringify(g));
const Q=t=>ask(vm,'اسأل',t);
// سؤال عن ضاد: يجاب بنص الدرس وبرابطه
{const r=Q('اشرح لي الإغلاقات');const d=r['نتائج']['دليل'];ok(r['نوع']==='دليل'&&d&&/إغلاق|تتذكّر|التقط/.test(d['نص']+d['عنوان'])&&/^\/(learn|explain)\//.test(d['رابط']),'closures answered from guide '+JSON.stringify(r['نوع']));ok(r['رد'].includes('المصدر: /'),'source line');}
// المتابعات: بسّط أقصر، عمّق أطول، والموضوع واحد
{const a=Q('ما الاستدعاء الذاتي؟');const n0=a['نتائج']['دليل']['نص'].length;const s=Q('بسّطه');const e=Q('عمّقه');
 ok(a['نوع']==='دليل'&&s['نوع']==='دليل'&&e['نوع']==='دليل','follow-ups stay in guide: '+[a['نوع'],s['نوع'],e['نوع']]);
 ok(s['نتائج']['دليل']['نص'].length<=n0,'simplify not longer '+s['نتائج']['دليل']['نص'].length+' vs '+n0);
 ok(e['نتائج']['دليل']['نص'].length>n0,'deepen longer '+e['نتائج']['دليل']['نص'].length+' vs '+n0);
 ok(s['نتائج']['دليل']['عنوان']===a['نتائج']['دليل']['عنوان'],'same topic after simplify');}
// المستوى داخل الطلب نفسه
{const s=Q('اشرح لي القوائم ببساطة');const e=Q('اشرح لي القوائم بالتفصيل');ok(s['نوع']==='دليل'&&e['نوع']==='دليل'&&e['نتائج']['دليل']['نص'].length>s['نتائج']['دليل']['نص'].length,'level in request');}
// لا خطف: خارج ضاد، كتابة برنامج، تحية، ملفات
{const r=Q('ما سعر الذهب اليوم');ok(r['نوع']!=='دليل','off-topic not answered from guide: '+r['نوع']);}
{const r=Q('اكتب لي برنامج الأعداد الأولية');ok(r['نوع']==='كتابة_برنامج'&&r['نتائج']['توليف']['وُجد'],'code request still writes program');}
{const r=Q('مرحبا');ok(r['نوع']==='حوار','greeting');}
{const r=Q('ابحث في ملفاتي عن الإغلاقات');ok(r['نوع']!=='دليل','files request not hijacked');}
// تبسيط بلا شرح سابق: رد صريح بلا اختلاق
{const v2=mk();ask(v2,'تهيئة',fs.readFileSync(path.join(dir,'base.json'),'utf8'));ask(v2,'دليل',fs.readFileSync(path.join(dir,'guide.json'),'utf8'));const r=ask(v2,'اسأل','بسّطه');ok(/لا أرى شرحًا سابقًا/.test(r['رد']),'no previous explanation: '+r['رد']);}
console.log('pass '+pass+' fail '+fail);process.exit(fail?1:0);
