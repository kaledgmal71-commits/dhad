// فضاء مواصفات الدوال لنواة (ت١): مواصفة ← وصف عربي متنوع + مُحكَّم دلالي (جافاسكربت) + مدخلات اختبار.
// المُحكَّم مستقل عن مُصدِر الشيفرة بضاد (stdlib/نواة_مولد.dhad): يُقارَن ناتج الشيفرة المُنفَّذة بناتجه، فكل خلاف خلل في أحدهما.
// الأوصاف مكتوبة من معجمي أنا (حدّ معلن): تقيس التعميم عن صياغاتي لا عن مستخدمين حقيقيين. لا أنظر في DhadBench-H.
'use strict';
function mkRng(seed){let s=seed>>>0;return()=>{s=(s*1664525+1013904223)>>>0;return s/4294967296}}
const AR=n=>String(n).replace(/\d/g,d=>'٠١٢٣٤٥٦٧٨٩'[d]);

// ===== الفضاء =====
const FILTERS=['بلا','زوجي','فردي','موجب','سالب','غير_صفر','أكبر','أكبر_أو_يساوي','أصغر','أصغر_أو_يساوي','يساوي','يقبل_القسمة'];
const MAPS=['بلا','مربع','مكعب','ضعف','ثلاثة_أمثال','سالب','مطلق','زائد','ضرب'];
const REDUCES=['مجموع','ضرب','عدد','أكبر','أصغر','متوسط','قائمة','أول','آخر','يوجد','الكل'];
const PRED=['زوجي','فردي','موجب','سالب','صفر','يقبل_القسمة','أكبر','أصغر','أكبر_أو_يساوي','أصغر_أو_يساوي','يساوي','بين','أولي','مربع_كامل','متناظر'];
const DIGITS=['عدد_الأرقام','مجموع_الأرقام','عكس','آخر_رقم','أول_رقم','أكبر_رقم','أصغر_رقم','ضرب_الأرقام'];
const STRS=['طول','عكس','متناظر','عدد_حرف','يحوي','أول_حرف','آخر_حرف','تكرار','دمج','عدد_كلمات'];
const FORM1=['مربع','مكعب','ضعف','ثلاثة_أمثال','نصف','سالب','التالي','السابق','مطلق','إشارة','زائد_ثابت','ضرب_ثابت','طرح_ثابت'];
const FORM2=['جمع','طرح','ضرب','قسمة','باقي','قوة','أكبر','أصغر','متوسط','محيط','مساحة_مثلث','فرق_مطلق'];
const FORM3=['جمع٣','أكبر٣','أصغر٣','متوسط٣','ضرب٣'];
const FORMS=[...FORM1,...FORM2,...FORM3];
const FILTER_NEEDS_K=new Set(['أكبر','أكبر_أو_يساوي','أصغر','أصغر_أو_يساوي','يساوي','يقبل_القسمة']);
const MAP_NEEDS_K=new Set(['زائد','ضرب']);
const PRED_NEEDS_K=new Set(['يقبل_القسمة','أكبر','أصغر','أكبر_أو_يساوي','أصغر_أو_يساوي','يساوي']);

const LISTP=['ق','قائمة','أرقام','أعداد','ل','مصفوفة'];
const NUMP=['ن','س','ص','أ','ب','ج','ه','ر','م'];
const STRP=['س','نص_','كلمة','جملة','ك','ن٢'];
const NAMES={
 قائمة:['مجموع_الزوجية','ناتج_القائمة','حلّل_القائمة','احسب_من_القائمة','معالج','قيمة_مطلوبة','حصيلة','نتيجة_القائمة','فحص_قائمة','تلخيص'],
 مدى:['حصيلة_المدى','احسب_حتى','معالجة_حتى','قيمة_حتى','مجاميع','تجميع_الأعداد','نتيجة_المدى','عدّاد'],
 محمول:['هل_عدد','فحص_عدد','اختبر','تحقق','هل_تنطبق','حالة','شرط_العدد','سؤال'],
 أرقام:['أرقام_العدد','فحص_الأرقام','حلّل_العدد','خانات','عمليات_الأرقام','تفكيك'],
 نص:['معالجة_نص','فحص_نص','عمل_على_نص','سلوك_النص','تحليل_نص','ناتج_نص'],
 صيغة:['احسب','حساب','صيغة','عملية','ناتج','قيمة','حاصل','نتيجة_حسابية']
};
const P=(rng,a)=>a[Math.floor(rng()*a.length)];
const shuffle=(rng,a)=>{a=a.slice();for(let i=a.length-1;i>0;i--){const j=Math.floor(rng()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a};

function uniqueParams(rng,pools,n){const out=[];const pool=shuffle(rng,pools);for(const x of pool){if(out.length>=n)break;if(!out.includes(x))out.push(x)}return out}
function mkK(rng,params,idx,allowParam,range){ // ثابت أو معامل
 if(allowParam&&params.length>idx&&rng()<0.4)return {معامل:params[idx]};
 const lo=range[0],hi=range[1];return {قيمة:lo+Math.floor(rng()*(hi-lo+1))};
}

function sample(rng,fam){
 fam=fam||P(rng,['قائمة','قائمة','قائمة','مدى','مدى','محمول','أرقام','نص','صيغة','صيغة']);
 const name=P(rng,NAMES[fam]);
 if(fam==='قائمة'||fam==='مدى'){
  const isList=fam==='قائمة';
  const red=P(rng,REDUCES);
  let filt=P(rng,FILTERS),map='بلا';
  if(red==='يوجد'||red==='الكل')while(filt==='بلا')filt=P(rng,FILTERS);
  if(['مجموع','ضرب','قائمة','متوسط'].includes(red)&&rng()<0.45)map=P(rng,MAPS.slice(1));
  const needExtra=FILTER_NEEDS_K.has(filt)||MAP_NEEDS_K.has(map);
  const params=isList?uniqueParams(rng,LISTP,1).concat(uniqueParams(rng,NUMP,1)):uniqueParams(rng,NUMP,2);
  const useParam=needExtra&&rng()<0.4;
  const spec={عائلة:fam,اسم:name,معاملات:useParam?params:[params[0]],مرشح:{نوع:filt},تحويل:{نوع:map},اختزال:{نوع:red}};
  if(FILTER_NEEDS_K.has(filt))spec.مرشح.ك=useParam?{معامل:params[1]}:{قيمة:filt==='يقبل_القسمة'?2+Math.floor(rng()*8):Math.floor(rng()*21)-5};
  if(MAP_NEEDS_K.has(map))spec.تحويل.ك=(useParam&&!FILTER_NEEDS_K.has(filt))?{معامل:params[1]}:{قيمة:2+Math.floor(rng()*8)};
  return spec;
 }
 if(fam==='محمول'){
  const kind=P(rng,PRED);const p=uniqueParams(rng,NUMP,3);
  const spec={عائلة:fam,اسم:name,نوع:kind,معاملات:[p[0]]};
  if(PRED_NEEDS_K.has(kind)){const useP=rng()<0.45;if(useP){spec.معاملات=[p[0],p[1]];spec.ك={معامل:p[1]}}else spec.ك={قيمة:kind==='يقبل_القسمة'?2+Math.floor(rng()*8):Math.floor(rng()*21)-5}}
  if(kind==='بين'){const useP=rng()<0.5;if(useP){spec.معاملات=[p[0],p[1],p[2]];spec.ك_أ={معامل:p[1]};spec.ك_ب={معامل:p[2]}}else{const a=Math.floor(rng()*10);spec.ك_أ={قيمة:a};spec.ك_ب={قيمة:a+3+Math.floor(rng()*15)}}}
  return spec;
 }
 if(fam==='أرقام')return {عائلة:fam,اسم:name,نوع:P(rng,DIGITS),معاملات:uniqueParams(rng,NUMP,1)};
 if(fam==='نص'){
  const kind=P(rng,STRS);const spec={عائلة:fam,اسم:name,نوع:kind};
  if(kind==='عدد_حرف'||kind==='يحوي'||kind==='دمج')spec.معاملات=uniqueParams(rng,STRP.concat(['ح','ت']),2);
  else if(kind==='تكرار'){const s=uniqueParams(rng,STRP,1)[0];spec.معاملات=[s,P(rng,NUMP)]}
  else spec.معاملات=uniqueParams(rng,STRP,1);
  if(kind==='دمج'&&rng()<0.35)spec.بمسافة=1;
  return spec;
 }
 // صيغة
 const kind=P(rng,FORMS);const ar=FORM1.includes(kind)?1:FORM2.includes(kind)?2:3;
 const spec={عائلة:fam,اسم:name,نوع:kind,معاملات:uniqueParams(rng,NUMP,ar)};
 if(['زائد_ثابت','ضرب_ثابت','طرح_ثابت'].includes(kind))spec.ك={قيمة:2+Math.floor(rng()*12)};
 return spec;
}

// ===== المُحكَّم =====
const FILT_FN={بلا:()=>true,زوجي:x=>x%2===0,فردي:x=>x%2!==0,موجب:x=>x>0,سالب:x=>x<0,غير_صفر:x=>x!==0,
 أكبر:(x,k)=>x>k,أكبر_أو_يساوي:(x,k)=>x>=k,أصغر:(x,k)=>x<k,أصغر_أو_يساوي:(x,k)=>x<=k,يساوي:(x,k)=>x===k,يقبل_القسمة:(x,k)=>x%k===0};
const MAP_FN={بلا:x=>x,مربع:x=>x*x,مكعب:x=>x*x*x,ضعف:x=>x*2,ثلاثة_أمثال:x=>x*3,سالب:x=>0-x,مطلق:x=>Math.abs(x),زائد:(x,k)=>x+k,ضرب:(x,k)=>x*k};
const kv=(k,spec,args)=>{if(!k)return undefined;return k.قيمة!==undefined?k.قيمة:args[spec.معاملات.indexOf(k.معامل)]};
const isPrime=n=>{if(n<2)return false;for(let i=2;i*i<=n;i++)if(n%i===0)return false;return true};
const digitsOf=n=>String(Math.abs(n)).split('').map(Number);
function oracle(spec,args){
 const fam=spec.عائلة;
 if(fam==='قائمة'||fam==='مدى'){
  const src=fam==='قائمة'?args[0]:Array.from({length:Math.max(0,args[0])},(_,i)=>i+1);
  const kf=kv(spec.مرشح.ك,spec,args),km=kv(spec.تحويل.ك,spec,args);
  const pass=x=>FILT_FN[spec.مرشح.نوع](x,kf);
  const red=spec.اختزال.نوع;
  if(red==='الكل')return src.every(pass);
  const sel=src.filter(pass);
  const vals=sel.map(x=>MAP_FN[spec.تحويل.نوع](x,km));
  switch(red){
   case 'مجموع':return vals.reduce((a,b)=>a+b,0);
   case 'ضرب':return vals.reduce((a,b)=>a*b,1);
   case 'عدد':return sel.length;
   case 'أكبر':return vals.length?Math.max(...vals):null;
   case 'أصغر':return vals.length?Math.min(...vals):null;
   case 'متوسط':return vals.length?vals.reduce((a,b)=>a+b,0)/vals.length:null;
   case 'قائمة':return vals;
   case 'أول':return vals.length?vals[0]:null;
   case 'آخر':return vals.length?vals[vals.length-1]:null;
   case 'يوجد':return sel.length>0;
  }
 }
 if(fam==='محمول'){
  const n=args[0],k=kv(spec.ك,spec,args);
  switch(spec.نوع){
   case 'زوجي':return n%2===0;case 'فردي':return n%2!==0;case 'موجب':return n>0;case 'سالب':return n<0;case 'صفر':return n===0;
   case 'يقبل_القسمة':return n%k===0;case 'أكبر':return n>k;case 'أصغر':return n<k;case 'أكبر_أو_يساوي':return n>=k;case 'أصغر_أو_يساوي':return n<=k;case 'يساوي':return n===k;
   case 'بين':return n>=kv(spec.ك_أ,spec,args)&&n<=kv(spec.ك_ب,spec,args);
   case 'أولي':return isPrime(n);
   case 'مربع_كامل':return n>=0&&Math.round(Math.sqrt(n))**2===n;
   case 'متناظر':return n>=0&&String(n)===String(n).split('').reverse().join('');
  }
 }
 if(fam==='أرقام'){
  const d=digitsOf(args[0]);
  switch(spec.نوع){
   case 'عدد_الأرقام':return d.length;case 'مجموع_الأرقام':return d.reduce((a,b)=>a+b,0);
   case 'عكس':return Number(d.slice().reverse().join(''));case 'آخر_رقم':return d[d.length-1];case 'أول_رقم':return d[0];
   case 'أكبر_رقم':return Math.max(...d);case 'أصغر_رقم':return Math.min(...d);case 'ضرب_الأرقام':return d.reduce((a,b)=>a*b,1);
  }
 }
 if(fam==='نص'){
  const s=args[0];
  switch(spec.نوع){
   case 'طول':return s.length;case 'عكس':return s.split('').reverse().join('');case 'متناظر':return s===s.split('').reverse().join('');
   case 'عدد_حرف':return s.split('').filter(c=>c===args[1]).length;case 'يحوي':return s.includes(args[1]);
   case 'أول_حرف':return s[0];case 'آخر_حرف':return s[s.length-1];case 'تكرار':return s.repeat(args[1]);
   case 'دمج':return spec.بمسافة?s+' '+args[1]:s+args[1];
   case 'عدد_كلمات':return s.split(' ').length;
  }
 }
 if(fam==='صيغة'){
  const [a,b,c]=args;
  switch(spec.نوع){
   case 'مربع':return a*a;case 'مكعب':return a*a*a;case 'ضعف':return a*2;case 'ثلاثة_أمثال':return a*3;case 'نصف':return a/2;case 'سالب':return 0-a;
   case 'التالي':return a+1;case 'السابق':return a-1;case 'مطلق':return Math.abs(a);case 'إشارة':return a>0?1:a<0?-1:0;
   case 'زائد_ثابت':return a+spec.ك.قيمة;case 'ضرب_ثابت':return a*spec.ك.قيمة;case 'طرح_ثابت':return a-spec.ك.قيمة;
   case 'جمع':return a+b;case 'طرح':return a-b;case 'ضرب':return a*b;case 'قسمة':return a/b;case 'باقي':return a%b;case 'قوة':return a**b;
   case 'أكبر':return a>b?a:b;case 'أصغر':return a<b?a:b;case 'متوسط':return (a+b)/2;case 'محيط':return 2*(a+b);case 'مساحة_مثلث':return a*b/2;case 'فرق_مطلق':return Math.abs(a-b);
   case 'جمع٣':return a+b+c;case 'أكبر٣':return Math.max(a,b,c);case 'أصغر٣':return Math.min(a,b,c);case 'متوسط٣':return (a+b+c)/3;case 'ضرب٣':return a*b*c;
  }
 }
 throw new Error('مواصفة مجهولة '+JSON.stringify(spec));
}

// ===== مدخلات الاختبار =====
function inputs(spec,rng,n=7){
 const ri=(lo,hi)=>lo+Math.floor(rng()*(hi-lo+1));
 const out=[];const fam=spec.عائلة;let tries=0;
 for(let t=0;t<n;t++){
  if(++tries>400)break;
  const args=[];
  if(fam==='قائمة'||fam==='مدى'){
   const needNonEmpty=fam==='قائمة'&&['أكبر','أصغر','متوسط','أول','آخر'].includes(spec.اختزال.نوع);
   if(fam==='قائمة'){const len=ri(needNonEmpty?1:0,6);args.push(Array.from({length:len},()=>ri(-9,12)))}
   else args.push(ri(1,9));
   if(spec.معاملات.length>1)args.push(spec.مرشح.نوع==='يقبل_القسمة'?ri(1,6):ri(-5,9));
   // لا نقبل مدخلًا تُنتج فيه الدالة null عند غياب عناصر (نتيجة غير معرَّفة في المواصفة)
   if(oracle(spec,args)===null){t--;continue}
  }else if(fam==='محمول'){
   args.push(spec.نوع==='متناظر'||spec.نوع==='أولي'||spec.نوع==='مربع_كامل'?ri(0,130):ri(-12,40));
   for(let i=1;i<spec.معاملات.length;i++)args.push(spec.نوع==='يقبل_القسمة'?ri(1,6):ri(-5,12));
   if(spec.نوع==='بين'&&spec.معاملات.length===3){const a=ri(0,10);args[1]=a;args[2]=a+ri(0,12)}
  }else if(fam==='أرقام')args.push(ri(0,99999)*(rng()<0.2?-1:1));
  else if(fam==='نص'){
   const al='abcdeأبتثجح';const w=()=>Array.from({length:ri(1,6)},()=>al[ri(0,al.length-1)]).join('');
   if(spec.نوع==='متناظر'){const h=w();args.push(rng()<0.5?h+h.split('').reverse().join(''):w())}
   else if(spec.نوع==='عدد_كلمات')args.push(Array.from({length:ri(1,5)},w).join(' '));
   else args.push(w());
   if(spec.نوع==='عدد_حرف')args.push(al[ri(0,6)]);
   else if(spec.نوع==='يحوي'){const s=args[0];args.push(rng()<0.5?s.slice(ri(0,s.length-1),s.length):w())}
   else if(spec.نوع==='تكرار')args.push(ri(0,4));
   else if(spec.نوع==='دمج')args.push(w());
  }else{ // صيغة
   for(let i=0;i<spec.معاملات.length;i++)args.push(ri(-9,12));
   if(spec.نوع==='قسمة'||spec.نوع==='باقي'){if(args[1]===0)args[1]=ri(1,5)}
   if(spec.نوع==='قوة')args[1]=ri(0,4);
  }
  out.push(args);
 }
 return out;
}

// ===== الأوصاف =====
const HN=n=>rng=>n; // تعبير للتوافق
function kText(rng,k,allowWord){if(k.معامل!==undefined)return k.معامل;const v=k.قيمة;const w=rng();return v<0?(w<0.5?'-'+AR(-v):'سالب '+AR(-v)):(w<0.5?AR(v):String(v))}
const sigOf=(spec)=>spec.اسم+'('+spec.معاملات.join('، ')+')';
const FP={ // مرشح: جمع-صفة، مفرد، محمولي-جمع
 زوجي:{pl:['الزوجية','الزوجية منها','التي هي زوجية'],sg:['زوجي','زوجي القيمة'],pr:['زوجية']},
 فردي:{pl:['الفردية','الفردية منها','التي هي فردية'],sg:['فردي'],pr:['فردية']},
 موجب:{pl:['الموجبة','الأكبر من الصفر','التي قيمتها موجبة'],sg:['موجب','أكبر من الصفر'],pr:['موجبة','أكبر من الصفر']},
 سالب:{pl:['السالبة','الأصغر من الصفر','التي قيمتها سالبة'],sg:['سالب','أصغر من الصفر'],pr:['سالبة','أصغر من الصفر']},
 غير_صفر:{pl:['غير الصفرية','التي لا تساوي الصفر','المخالفة للصفر'],sg:['لا يساوي الصفر','غير صفري'],pr:['غير صفرية','لا تساوي الصفر']},
 أكبر:{pl:['الأكبر من {K}','التي تزيد عن {K}','التي قيمتها أكبر من {K}','الأكبر تماما من {K}'],sg:['أكبر من {K}','يزيد عن {K}'],pr:['أكبر من {K}','تزيد عن {K}']},
 أكبر_أو_يساوي:{pl:['التي لا تقل عن {K}','الأكبر من {K} أو المساوية له','التي تساوي {K} أو تزيد عليه'],sg:['لا يقل عن {K}','أكبر من أو يساوي {K}'],pr:['لا تقل عن {K}','أكبر من أو تساوي {K}']},
 أصغر:{pl:['الأصغر من {K}','التي تقل عن {K}','التي قيمتها أقل من {K}'],sg:['أصغر من {K}','يقل عن {K}'],pr:['أصغر من {K}','تقل عن {K}']},
 أصغر_أو_يساوي:{pl:['التي لا تزيد عن {K}','الأصغر من {K} أو المساوية له','التي تساوي {K} أو تقل عنه'],sg:['لا يزيد عن {K}','أصغر من أو يساوي {K}'],pr:['لا تزيد عن {K}','أصغر من أو تساوي {K}']},
 يساوي:{pl:['المساوية لـ{K}','التي تساوي {K}','التي قيمتها {K}'],sg:['يساوي {K}','قيمته {K}'],pr:['تساوي {K}']},
 يقبل_القسمة:{pl:['التي تقبل القسمة على {K}','القابلة للقسمة على {K}','التي هي من مضاعفات {K}','المضاعفة لـ{K}'],sg:['يقبل القسمة على {K}','من مضاعفات {K}'],pr:['تقبل القسمة على {K}','من مضاعفات {K}']}
};
const fill=(s,K)=>s.replace(/\{K\}/g,K);
function listNP(rng,spec,L,N){ // العبارة الاسمية للعناصر المرشَّحة (جمع)
 const isList=spec.عائلة==='قائمة';const f=spec.مرشح.نوع;
 const kT=spec.مرشح.ك?kText(rng,spec.مرشح.ك):'';
 const adj=f==='بلا'?'':fill(P(rng,FP[f].pl),kT);
 const noun=P(rng,['الأعداد','العناصر','القيم','الأرقام']);
 if(isList){
  if(!adj)return P(rng,[`عناصر القائمة ${L}`,`عناصر ${L}`,`الأعداد في ${L}`,`كل الأعداد في ${L}`,`القيم الموجودة في ${L}`]);
  return P(rng,[`${noun} ${adj} في ${L}`,`${noun} ${adj} من ${L}`,`${noun} ${adj} الموجودة في ${L}`,`${noun} ${adj} في القائمة ${L}`]);
 }
 if(!adj)return P(rng,[`الأعداد من 1 إلى ${N}`,`الأعداد الصحيحة من ١ إلى ${N}`,`الأعداد من ١ حتى ${N}`,`الأعداد الصحيحة من 1 حتى ${N} ضمنا`]);
 return P(rng,[`${noun} ${adj} من 1 إلى ${N}`,`${noun} ${adj} من ١ حتى ${N}`,`${noun} ${adj} بين 1 و${N}`,`${noun} ${adj} من الأعداد الصحيحة من ١ إلى ${N}`]);
}
function singContainer(rng,spec,L,N){return spec.عائلة==='قائمة'?P(rng,[`في ${L}`,`من ${L}`,`في القائمة ${L}`]):P(rng,[`من 1 إلى ${N}`,`بين 1 و${N}`,`من ١ حتى ${N}`])}
function mapNP(rng,spec,np){
 const m=spec.تحويل.نوع;const kT=spec.تحويل.ك?kText(rng,spec.تحويل.ك):'';
 switch(m){
  case 'بلا':return np;
  case 'مربع':return P(rng,[`مربعات ${np}`,`مربع كل عدد من ${np}`,`المربعات الناتجة من ${np}`]);
  case 'مكعب':return P(rng,[`مكعبات ${np}`,`مكعب كل عدد من ${np}`]);
  case 'ضعف':return P(rng,[`ضعف كل عدد من ${np}`,`${np} بعد ضرب كل منها في 2`,`ضعف ${np}`]);
  case 'ثلاثة_أمثال':return P(rng,[`ثلاثة أمثال كل عدد من ${np}`,`${np} بعد ضرب كل منها في 3`]);
  case 'سالب':return P(rng,[`سالب كل عدد من ${np}`,`${np} بعد تغيير إشارتها`]);
  case 'مطلق':return P(rng,[`القيم المطلقة لـ${np}`,`القيمة المطلقة لكل عدد من ${np}`]);
  case 'زائد':return P(rng,[`كل عدد من ${np} مضافا إليه ${kT}`,`${np} بعد زيادة ${kT} على كل منها`]);
  case 'ضرب':return P(rng,[`كل عدد من ${np} مضروبا في ${kT}`,`${np} بعد ضرب كل منها في ${kT}`]);
 }
}
function pipeR(rng,spec){
 const isList=spec.عائلة==='قائمة';const L=spec.معاملات[0];const N=spec.معاملات[0];
 const np=listNP(rng,spec,L,N);const red=spec.اختزال.نوع;const f=spec.مرشح.نوع;
 const kT=spec.مرشح.ك?kText(rng,spec.مرشح.ك):'';
 const cont=singContainer(rng,spec,L,N);
 const sgAdj=f==='بلا'?'':fill(P(rng,FP[f].sg),kT);
 const prAdj=f==='بلا'?'':fill(P(rng,FP[f].pr),kT);
 const mnp=mapNP(rng,spec,np);
 switch(red){
  case 'مجموع':return `${P(rng,['مجموع','حاصل جمع','ناتج جمع','جمع'])} ${mnp}`;
  case 'ضرب':return `${P(rng,['حاصل ضرب','ناتج ضرب'])} ${mnp}`;
  case 'عدد':return `${P(rng,['عدد','تعداد','كمية','عدد مرات وجود'])} ${np}`;
  case 'متوسط':return `${P(rng,['متوسط','المتوسط الحسابي لـ','معدل'])} ${mnp}`;
  case 'قائمة':return `${P(rng,['قائمة جديدة تحوي','قائمة بـ','قائمة فيها','قائمة مكونة من'])} ${mnp}`;
  case 'أكبر':return sgAdj?`أكبر ${P(rng,['عدد','عنصر','قيمة'])} ${sgAdj} ${cont}`:`${P(rng,['أكبر عدد','أكبر عنصر','أكبر قيمة','القيمة العظمى'])} ${cont}`;
  case 'أصغر':return sgAdj?`أصغر ${P(rng,['عدد','عنصر','قيمة'])} ${sgAdj} ${cont}`:`${P(rng,['أصغر عدد','أصغر عنصر','أصغر قيمة','القيمة الصغرى'])} ${cont}`;
  case 'أول':return sgAdj?`أول ${P(rng,['عدد','عنصر'])} ${sgAdj} ${cont}`:`أول ${P(rng,['عدد','عنصر'])} ${cont}`;
  case 'آخر':return sgAdj?`آخر ${P(rng,['عدد','عنصر'])} ${sgAdj} ${cont}`:`آخر ${P(rng,['عدد','عنصر'])} ${cont}`;
  case 'يوجد':return P(rng,[`صحيح إذا وُجد ${P(rng,['عدد','عنصر'])} ${sgAdj} ${cont}، وخطأ خلاف ذلك`,`صحيحا إن كان ${cont.replace(/^(في|من) /,'$1 ')} ${P(rng,['عدد','عنصر'])} ${sgAdj}`,`صحيح أو خطأ بحسب وجود ${P(rng,['عدد','عنصر'])} ${sgAdj} ${cont}`]);
  case 'الكل':return P(rng,[`صحيح إذا كانت جميع ${isList?'عناصر '+L:'الأعداد '+cont} ${prAdj}، وخطأ خلاف ذلك`,`صحيحا إن كانت كل ${isList?'عناصر '+L:'الأعداد '+cont} ${prAdj}`]);
 }
}
function predR(rng,spec){
 const N=spec.معاملات[0];const k=spec.ك?kText(rng,spec.ك):'';
 const pr={زوجي:['زوجيا'],فردي:['فرديا'],موجب:['موجبا','أكبر من الصفر'],سالب:['سالبا','أصغر من الصفر'],صفر:['صفرا','يساوي صفرا'],
  يقبل_القسمة:['يقبل القسمة على {K}','من مضاعفات {K}'],أكبر:['أكبر من {K}','يزيد عن {K}'],أصغر:['أصغر من {K}','يقل عن {K}'],
  أكبر_أو_يساوي:['لا يقل عن {K}','أكبر من أو يساوي {K}'],أصغر_أو_يساوي:['لا يزيد عن {K}','أصغر من أو يساوي {K}'],يساوي:['يساوي {K}'],
  أولي:['أوليا','عددا أوليا'],مربع_كامل:['مربعا كاملا','مربعا لعدد صحيح'],متناظر:['متناظرا (يُقرأ بالقيمة نفسها من الجهتين)','متماثل الأرقام من الجهتين']}[spec.نوع];
 if(spec.نوع==='بين'){const a=kText(rng,spec.ك_أ),b=kText(rng,spec.ك_ب);return P(rng,[`صحيح إذا كان ${N} بين ${a} و${b} (شاملا الطرفين)`,`صحيحا إن وقع العدد ${N} في المدى من ${a} إلى ${b} ضمنا`])}
 const p=fill(P(rng,pr),k);
 return P(rng,[`صحيح إذا كان العدد ${N} ${p}، وخطأ وإلا`,`صحيحا إن كان ${N} ${p}`,`هل العدد ${N} ${p}؟ تعيد صحيح أو خطأ`,`قيمة منطقية تدل على أن ${N} ${p}`]);
}
function digitR(rng,spec){
 const N=spec.معاملات[0];
 const T={
  عدد_الأرقام:[`عدد أرقام العدد ${N}`,`كم رقما في العدد ${N}`,`عدد خانات ${N}`],
  مجموع_الأرقام:[`مجموع أرقام العدد ${N}`,`حاصل جمع خانات ${N}`,`ناتج جمع الأرقام المكونة للعدد ${N}`],
  عكس:[`العدد ${N} بعد عكس ترتيب أرقامه`,`عكس أرقام العدد ${N}`,`العدد المكوَّن من أرقام ${N} بترتيب معكوس`],
  آخر_رقم:[`الرقم الأخير من العدد ${N}`,`رقم الآحاد في ${N}`,`آخر رقم في العدد ${N}`],
  أول_رقم:[`الرقم الأول من العدد ${N}`,`أول رقم من اليسار في ${N}`,`رقم الخانة الأعلى في ${N}`],
  أكبر_رقم:[`أكبر رقم في العدد ${N}`,`أعلى خانة قيمة بين أرقام ${N}`],
  أصغر_رقم:[`أصغر رقم في العدد ${N}`,`أقل رقم بين أرقام ${N}`],
  ضرب_الأرقام:[`حاصل ضرب أرقام العدد ${N}`,`ناتج ضرب خانات ${N}`]
 }[spec.نوع];return P(rng,T);
}
function strR(rng,spec){
 const [S,T]=spec.معاملات;
 const D={
  طول:[`طول النص ${S}`,`عدد حروف ${S}`,`عدد الأحرف في النص ${S}`],
  عكس:[`النص ${S} معكوسا`,`عكس النص ${S}`,`النص ${S} مقلوبا من الآخر إلى الأول`],
  متناظر:[`صحيح إذا كان النص ${S} متناظرا (يُقرأ كما هو من الجهتين)، وخطأ وإلا`,`صحيحا إن كان ${S} يتطابق مع عكسه`,`هل النص ${S} متماثل؟ تعيد صحيح أو خطأ`],
  عدد_حرف:[`عدد مرات ظهور الحرف ${T} في النص ${S}`,`كم مرة يتكرر ${T} في ${S}`],
  يحوي:[`صحيح إذا كان النص ${S} يحتوي على ${T}`,`صحيحا إن وُجد ${T} داخل ${S}`,`هل ${S} يحوي ${T}؟ تعيد صحيح أو خطأ`],
  أول_حرف:[`أول حرف من النص ${S}`,`الحرف الأول في ${S}`],
  آخر_حرف:[`آخر حرف من النص ${S}`,`الحرف الأخير في ${S}`],
  تكرار:[`النص ${S} مكررا ${T} مرة`,`تكرار النص ${S} عدد ${T} من المرات`,`النص الناتج عن لصق ${S} بنفسه ${T} مرات`],
  دمج:spec.بمسافة?[`النصين ${S} و${T} مفصولين بمسافة واحدة`,`${S} ثم مسافة ثم ${T}`]:[`النص ${S} متبوعا بالنص ${T}`,`ربط النصين ${S} و${T}`,`دمج ${S} مع ${T}`],
  عدد_كلمات:[`عدد الكلمات في الجملة ${S}`,`كم كلمة في ${S} (تفصلها مسافة واحدة)`]
 }[spec.نوع];return P(rng,D);
}
function formR(rng,spec){
 const [A,B,C]=spec.معاملات;const k=spec.ك?kText(rng,spec.ك):'';
 const D={
  مربع:[`مربع العدد ${A}`,`حاصل ضرب ${A} في نفسه`],مكعب:[`مكعب العدد ${A}`,`${A} مرفوعا إلى القوة الثالثة`],
  ضعف:[`ضعف العدد ${A}`,`${A} مضروبا في 2`],ثلاثة_أمثال:[`ثلاثة أمثال ${A}`,`${A} مضروبا في 3`],
  نصف:[`نصف العدد ${A}`,`${A} مقسوما على 2`],سالب:[`سالب العدد ${A}`,`العدد ${A} بإشارة معكوسة`],
  التالي:[`العدد التالي لـ${A}`,`${A} زائد واحد`],السابق:[`العدد السابق لـ${A}`,`${A} ناقص واحد`],
  مطلق:[`القيمة المطلقة للعدد ${A}`,`العدد ${A} دون إشارته`],إشارة:[`إشارة العدد ${A}: 1 إن كان موجبا و-1 إن كان سالبا و0 إن كان صفرا`],
  زائد_ثابت:[`${A} زائد ${k}`,`${A} مضافا إليه ${k}`],ضرب_ثابت:[`${A} مضروبا في ${k}`,`حاصل ضرب ${A} في ${k}`],طرح_ثابت:[`${A} ناقص ${k}`,`${A} مطروحا منه ${k}`],
  جمع:[`مجموع ${A} و${B}`,`${A} زائد ${B}`,`حاصل جمع العددين ${A} و${B}`],
  طرح:[`${A} ناقص ${B}`,`ناتج طرح ${B} من ${A}`,`${A} مطروحا منه ${B}`],
  ضرب:[`حاصل ضرب ${A} في ${B}`,`${A} مضروبا في ${B}`,`مساحة مستطيل طوله ${A} وعرضه ${B}`],
  قسمة:[`ناتج قسمة ${A} على ${B}`,`${A} مقسوما على ${B}`],
  باقي:[`باقي قسمة ${A} على ${B}`,`الباقي عند قسمة ${A} على ${B}`],
  قوة:[`${A} مرفوعا للأس ${B}`,`${A} أس ${B}`],
  أكبر:[`الأكبر بين العددين ${A} و${B}`,`العدد الأكبر من ${A} و${B}`],
  أصغر:[`الأصغر بين العددين ${A} و${B}`,`العدد الأصغر من ${A} و${B}`],
  متوسط:[`متوسط العددين ${A} و${B}`,`المعدل الحسابي للعددين ${A} و${B}`],
  محيط:[`محيط مستطيل طوله ${A} وعرضه ${B}`,`ضعف مجموع ${A} و${B}`],
  مساحة_مثلث:[`مساحة مثلث قاعدته ${A} وارتفاعه ${B}`,`نصف حاصل ضرب ${A} في ${B}`],
  فرق_مطلق:[`الفرق المطلق بين ${A} و${B}`,`القيمة المطلقة لطرح ${B} من ${A}`],
  جمع٣:[`مجموع الأعداد ${A} و${B} و${C}`,`${A} زائد ${B} زائد ${C}`],
  أكبر٣:[`أكبر الأعداد الثلاثة ${A} و${B} و${C}`,`العدد الأكبر بين ${A} و${B} و${C}`],
  أصغر٣:[`أصغر الأعداد الثلاثة ${A} و${B} و${C}`,`العدد الأصغر بين ${A} و${B} و${C}`],
  متوسط٣:[`متوسط الأعداد ${A} و${B} و${C}`,`المعدل الحسابي للأعداد الثلاثة ${A} و${B} و${C}`],
  ضرب٣:[`حاصل ضرب ${A} و${B} و${C}`,`${A} مضروبا في ${B} مضروبا في ${C}`]
 }[spec.نوع];return P(rng,D);
}
function resultPhrase(rng,spec){
 switch(spec.عائلة){case 'قائمة':case 'مدى':return pipeR(rng,spec);case 'محمول':return predR(rng,spec);case 'أرقام':return digitR(rng,spec);case 'نص':return strR(rng,spec);default:return formR(rng,spec)}
}
function describe(rng,spec){
 const R=resultPhrase(rng,spec);const sig=sigOf(spec);
 const verb=P(rng,['تعيد','ترجع','تُعيد','تُرجع','تحسب وتعيد']);
 const fmts=[
  `اكتب دالة ${sig} ${verb} ${R}`,
  `اكتب دالة ${sig} ${verb} ${R}`,
  `أريد دالة ${sig} ${verb} ${R}`,
  `المطلوب دالة ${sig} ${verb} ${R}`,
  `عرّف دالة ${sig} ${verb} ${R}`,
  `أنشئ دالة ${sig} ${verb} ${R}`,
  `ابنِ دالة ${sig} ناتجها ${R}`,
  `دالة ${sig} ${verb} ${R}`,
  `${sig}: دالة ${verb} ${R}`,
  `اكتب دالة اسمها ${spec.اسم} تأخذ (${spec.معاملات.join('، ')}) وتعيد ${R}`
 ];
 return P(rng,fmts);
}
module.exports={mkRng,sample,oracle,inputs,describe,FILTERS,MAPS,REDUCES,PRED,DIGITS,STRS,FORMS,AR,shuffle,P};
