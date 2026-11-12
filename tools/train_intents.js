// يدرّب مصنّف النوايا بضاد (نواة_نوايا.درّب) ويكتب الأوزان إلى stdlib/نواة_نوايا_أوزان.dhad، بعد اختيار عتبة الامتناع على تقسيم تحقق.
const fs=require('fs'),path=require('path');const R=require('../site/run.js');
const T=require('../tests/data/intents-train.js');
// تصنيف الحوار إلى أنواع فرعية بقواعد وسم بسيطة (لا تدخل الاستدلال؛ تُستعمل لوسم بيانات التدريب فقط)
const nrm=q=>q.toLowerCase().replace(/[ً-ْـ]/g,'').replace(/[أإآ]/g,'ا').replace(/ى/g,'ي').replace(/ة/g,'ه');
const sub=q=>{const n=nrm(q);
 if(/شكر|مشكور|تسلم|جزاك|بارك|ممتن|thank|تشكرات|يعطيك العافيه/.test(n))return 'حوار:شكر';
 if(/وداع|سلامه|لقاء|bye|تصبح|اراك|نلتقي|امان الله|^سلام$/.test(n))return 'حوار:وداع';
 if(/كيف حالك|الحال|اخبار|عامل ايه|ازيك|شلونك|how are you|بخير|شغال|تعمل|جاهز|متصل|موجود|تسمعني|^تمام/.test(n))return 'حوار:حال';
 if(/من انت|اسمك|هويت|عرف نفسك|ذكاء|انسان|بشر|what are you|who are|tell me about|مين|ما اسم|بماذا تسمي|وظيفت|لماذا صنعت|اصدار|نبذه عنك|حدثني عن نفسك|ايش تشتغل/.test(n))return 'حوار:هوية';
 if(/قدرات|تستطيع|تفعل|تجيد|خدمات|مميزات|تقدم|تحسن|امكانيات|what can|وش تقدر|ايش تعرف|تقدر|يمكنك|كيف ابدا|كيف استخدمك|كيف اتعامل|بماذا تساعد|تساعدني/.test(n))return 'حوار:قدرات';
 if(/سلام عليكم/.test(n))return 'حوار:سلام';
 return 'حوار:تحية'};
const all=[];for(const k in T)T[k].forEach(q=>{if(/["`\\]/.test(q))throw new Error('حرف ممنوع: '+q);all.push([q,k==='حوار'?sub(q):k])});
const lit=a=>'['+a.map(([q,k])=>'["'+q+'"،"'+k+'"]').join('،')+']';
const va=all.filter((_,i)=>i%5===0),tr=all.filter((_,i)=>i%5!==0);
const run=(src)=>{const r=R.run(src,{maxMs:3000000,maxSteps:5e10});if(!r.ok){console.error(r.error);process.exit(1)}return r.out};
const t0=Date.now();
// ١) نموذج على ٨٠٪ لاختيار العتبة
let out=run('متغير ن = استورد("ضاد/نواة_نوايا")\nمتغير م = ن.درّب('+lit(tr)+'، {})\nمتغير ت = '+lit(va)+'\nمن_أجل (د في ت) { متغير ق = ن.صنّف(م، د[٠])\nاطبع(ق["نية"] + "|" + نص(ق["ثقة"]) + "|" + د[١]) }');
console.log('زمن تدريب التحقق',((Date.now()-t0)/1000).toFixed(0),'ث');
const ar=s=>s.replace(/[٠-٩]/g,d=>'٠١٢٣٤٥٦٧٨٩'.indexOf(d)).replace('٫','.');
const rows=out.map(l=>{const [a,b,c]=l.split('|');return [a,parseFloat(ar(b)),c]});
let best=0,bt=0;for(let t=0;t<=.8;t+=.05){let ok=0;rows.forEach(([p,c,y])=>{if((c<t?'خارج_النطاق':p)===y)ok++});const a=ok/rows.length;if(a>best+1e-9){best=a;bt=t}}
console.log('عتبة الامتناع (من التحقق):',bt.toFixed(2),'دقة التحقق',best.toFixed(3));
// ٢) النموذج النهائي على كل البيانات
const t1=Date.now();
out=run('متغير ن = استورد("ضاد/نواة_نوايا")\nمتغير م = ن.درّب('+lit(all)+'، {})\nاطبع(اربط(م["تصنيفات"]، "|"))\nاطبع(اربط(م["انحياز"]، "|"))\nمن_أجل (ف في مفاتيح(م["أوزان"])) { اطبع(نص(ف) + ":" + اربط(م["أوزان"][ف]، ",")) }');
console.log('زمن التدريب النهائي',((Date.now()-t1)/1000).toFixed(0),'ث');
const lat=s=>s.replace(/[٠-٩]/g,d=>'٠١٢٣٤٥٦٧٨٩'.indexOf(d)).replace(/٬/g,'');
const cls=out[0].split('|'),bias=lat(out[1]).split('|').map(Number);
const W=out.slice(2).map(l=>{const i=l.indexOf(':');return [lat(l.slice(0,i)),lat(l.slice(i+1)).split(',').map(Number)]});
const A=n=>String(n).replace(/\d/g,d=>'٠١٢٣٤٥٦٧٨٩'[d]);
const body=W.map(([k,v])=>A(k)+':'+v.map(A).join(',')).join(';');
const tpl=fs.readFileSync(path.join(__dirname,'intents_weights.tpl'),'utf8');
let src=tpl.replace('__CLS__',cls.map(c=>'"'+c+'"').join('،')).replace('__BIAS__',bias.map(A).join(',')).replace('__BODY__',body).replace('__THR__',A(bt).replace('.','٫'));
fs.writeFileSync(path.join(__dirname,'..','stdlib','نواة_نوايا_أوزان.dhad'),src);
console.log('كُتب النموذج:',W.length,'سمة غير مهملة،',(src.length/1024).toFixed(0),'ك.بايت');
