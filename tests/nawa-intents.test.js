// فهم النوايا من الطرف إلى الطرف عبر المنسّق على مجموعة محجوزة (لم تدخل التدريب)، فيها رسائل المستخدم الحقيقية التي أخفق فيها النظام.
// الأساس قبل المصنِّف المتعلَّم: ٦٠٫٤٪. هذا الاختبار حارس انحدار لا شهادة تعميم (المجموعتان من كتابتي).
const path=require('path');const R=require(path.join(__dirname,'..','site','run.js'));
const H=require('./data/intents-heldout.js'),T=require('./data/intents-train.js');
let pass=0,fail=0;const ok=(c,m)=>{if(c)pass++;else{fail++;console.log('FAIL',m)}};
const tr=new Set();for(const k in T)T[k].forEach(s=>tr.add(s));
let dup=0;for(const k in H)H[k].forEach(s=>{if(tr.has(s))dup++});ok(dup===0,'المحجوزة لا تتقاطع مع التدريب: '+dup);
const P='تأسست المدينة عام ١٩٥٠ على ضفة النهر الكبير. بلغ عدد سكانها ٢٠٠٠٠ نسمة في العام الأول. اشتهرت المدينة بزراعة القطن والقمح الجيد. يبلغ طول النهر ٣٠٠ كيلومتر تقريبا.';
const items=[];for(const k in H)H[k].forEach(q=>items.push([k,q]));
let src='متغير م = استورد("ضاد/نواة_منسق")\n';
for(const [k,q] of items){const full=k==='دراسة_نص'?q+'\n'+P:q;src+='اطبع(م.نفّذ_الطلب("'+full.replace(/\n/g,'"+حرف(١٠)+"')+'"، {})["نوع"])\n';}
const r=R.run(src,{maxMs:280000,maxSteps:5e9});ok(r.ok,'التشغيل: '+r.error);
const map={'محادثة':'خارج_النطاق','سؤال_لغة':'كتابة_برنامج','اختبار':'دراسة_نص','تلخيص':'دراسة_نص','اختصار':'دراسة_نص','نقاط':'دراسة_نص','أسئلة_وأجوبة':'دراسة_نص'};
let good=0;const byClass={};items.forEach(([k,q],i)=>{const t=map[r.out[i]]||r.out[i];byClass[k]=byClass[k]||[0,0];byClass[k][1]++;if(t===k){good++;byClass[k][0]++}});
const acc=good/items.length;console.log('الدقة',good+'/'+items.length,(100*acc).toFixed(1)+'%');
ok(acc>=0.84,'الدقة الشاملة ≥ ٨٤٪: '+(100*acc).toFixed(1));
const real=['هل أنت الآن تعمل بكفاءة','ماذا تحسن من عمل','ابحث في الويب واذكر الرابط هنا عن لغة ضاد dhad وما يرتبط بها من ممارسات'];
items.forEach(([k,q],i)=>{if(real.includes(q)){const t=map[r.out[i]]||r.out[i];ok(t===k,'رسالة المستخدم الحقيقية: '+q+' → '+t)}});
console.log('نجح',pass,'فشل',fail);process.exit(fail?1:0);
