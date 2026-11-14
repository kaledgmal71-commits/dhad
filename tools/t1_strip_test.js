// اختبار آلي: نزع التوقيع واستخراج الثوابت في ضاد يطابقان ما بنى عليه المولّد الوصف (جافاسكربت).
const R=require('../site/run.js');const S=require('./t1_space.js');
const rng=S.mkRng(4242);const items=[];
for(let i=0;items.length<700&&i<5000;i++){const s=S.sample(rng);if(S.inputs(s,S.mkRng(i),3).length<2)continue;
 const d=S.describe(rng,s);const exp=[];
 if(s.عائلة==='قائمة'||s.عائلة==='مدى'){if(s.مرشح.ك)exp.push(s.مرشح.ك);if(s.تحويل.ك)exp.push(s.تحويل.ك)}
 else if(s.عائلة==='محمول'){if(s.نوع==='بين')exp.push(s.ك_أ,s.ك_ب);else if(s.ك)exp.push(s.ك)}
 else if(s.ك)exp.push(s.ك);
 items.push({s,d,exp})}
const src='متغير م = استورد("ضاد/نواة_مولد_فهم")\nمتغير ق = '+JSON.stringify(items.map(x=>({و:x.d.كامل,ع:x.s.عائلة,م:x.s.معاملات})))+'\nمن_أجل (س في ق) {\n متغير ت = م.جزّئ(س["و"])\n اطبع(ت["وُجد"] ? "1" : "0")\n اطبع(ت["اسم"])\n اطبع(اربط(ت["معاملات"]، "،"))\n اطبع(ت["متن"])\n متغير أ = []\n من_أجل (ط في م.أطراف(ت["متن"]، س["م"]، س["ع"])) { إذا (يحوي(ط، "قيمة")) { أضف(أ، "ق:" + نص(ط["قيمة"])) } وإلا { أضف(أ، "م:" + ط["معامل"]) } }\n اطبع(اربط(أ، ";"))\n}';
const r=R.run(src,{maxMs:600000,maxSteps:9e10});if(!r.ok){console.error(r.error);process.exit(1)}
let nameOk=0,paramsOk=0,bodyOk=0,kOk=0,kTot=0;const bad=[];
items.forEach((x,i)=>{const o=r.out.slice(i*5,i*5+5);
 const hasSig=x.d.توقيع;if(o[1]===x.s.اسم||!hasSig)nameOk++;
 if(o[2]===x.s.معاملات.join('،')||!hasSig)paramsOk++;
 if(o[3]===x.d.متن)bodyOk++;else bad.push(['متن',x.d.كامل,x.d.متن,o[3]]);
 if(x.exp.length){kTot++;const A=S.AR;const want=x.exp.map(k=>k.قيمة!==undefined?'ق:'+(k.قيمة<0?'-'+A(-k.قيمة):A(k.قيمة)):'م:'+k.معامل);const got=(o[4]||'').split(';').slice(0,want.length);
  if(got.join(';')===want.join(';'))kOk++;else bad.push(['ك',x.d.كامل,want.join(';'),o[4]])}});
console.log({عينات:items.length,اسم:nameOk,معاملات:paramsOk,متن:bodyOk,ثوابت:kOk+'/'+kTot});
bad.slice(0,8).forEach(b=>console.log(b.join('\n   ')));
