// يدرّب رؤوس الفهم لمولّد نواة (ت١) بضاد (نواة_مصنف.درّب) ويكتب stdlib/نواة_مولد_أوزان.dhad.
// الاستعمال: node tools/t1_train.js [عدد المواصفات=3000] [دورات=25] [--نهائي]
// بلا --نهائي: يدرّب على ٨٠٪ من المواصفات (التقسيم بالمواصفة لا بالوصف: تركيبات مرشِّح×اختزال لم يرها التدريب) ويقيس على ٢٠٪.
const fs=require('fs'),path=require('path');const R=require('../site/run.js');const S=require('./t1_space.js');
const N=+(process.argv[2]||3000),EP=+(process.argv[3]||25),FINAL=process.argv.includes('--نهائي');
const rng=S.mkRng(20261114);const specs=[];const seen=new Set();
for(let i=0;specs.length<N&&i<N*4;i++){const s=S.sample(rng);const k=JSON.stringify(s);if(seen.has(k))continue;
 const ins=S.inputs(s,S.mkRng(i+99),3);if(ins.length<2)continue;seen.add(k);specs.push(s)}
const labels=s=>{const L={عائلة:s.عائلة};const f=s.عائلة;
 if(f==='قائمة'||f==='مدى'){L.مرشح=s.مرشح.نوع;L.تحويل=s.تحويل.نوع;L.اختزال=s.اختزال.نوع}
 else if(f==='محمول')L.محمول=s.نوع;else if(f==='أرقام')L.أرقام=s.نوع;
 else if(f==='نص')L.نص=s.نوع==='دمج'&&s.بمسافة?'دمج_بمسافة':s.نوع;else L.صيغة=s.نوع;return L};
const HEADS=['عائلة','مرشح','تحويل','اختزال','محمول','أرقام','نص','صيغة'];
const isTrain=(s,i)=>FINAL||(i%5!==0);
const trainSets={},evalSets={};HEADS.forEach(h=>{trainSets[h]=[];evalSets[h]=[]});
specs.forEach((s,i)=>{const L=labels(s);const nTr=isTrain(s,i)?2:0;
 for(const h of HEADS)if(L[h]!==undefined){
  if(nTr){for(let t=0;t<nTr;t++)trainSets[h].push([S.describe(rng,s).متن,L[h]])}
  else evalSets[h].push([S.describe(rng,s).متن,L[h]]);
 }});
// سلبيات «خارج الفضاء»: تعلّم رأس العائلة الرفض بدل التخمين
{const nr=S.mkRng(777);const nn=Math.round(N*0.18);for(let i=0;i<nn;i++){const d=S.negative(nr).متن;
 if(!FINAL&&i%5===0)evalSets['عائلة'].push([d,'خارج']);else for(let t=0;t<2;t++)trainSets['عائلة'].push([S.negative(nr).متن,'خارج']);}}
const lit=a=>'['+a.map(([q,k])=>'["'+q.replace(/["\\]/g,'')+'"،"'+k+'"]').join('،')+']';
const run=src=>{const r=R.run(src,{maxMs:3000000,maxSteps:9e10});if(!r.ok){console.error(r.error);process.exit(1)}return r.out};
const models={};
for(const h of HEADS){
 const tr=trainSets[h];if(tr.length<10)continue;const t0=Date.now();
 if(!FINAL){
  const ev=evalSets[h];
  const out=run('متغير ن = استورد("ضاد/نواة_مصنف")\nمتغير م = ن.درّب('+lit(tr)+'، {"دورات": '+S.AR(EP)+'})\nمتغير ت = '+lit(ev)+'\nمن_أجل (د في ت) { متغير ق = ن.صنّف(م، د[٠])\nاطبع(ق["فئة"] + "|" + د[١]) }');
  let ok=0;out.forEach(l=>{const [a,b]=l.split('|');if(a===b)ok++});
  console.log(h.padEnd(8),'تدريب',tr.length,'تحقق',ev.length,'دقة',(ok/ev.length).toFixed(3),((Date.now()-t0)/1000).toFixed(0)+'ث');
 }else{
  const out=run('متغير ن = استورد("ضاد/نواة_مصنف")\nمتغير م = ن.درّب('+lit(tr)+'، {"دورات": '+S.AR(EP)+'})\nاطبع(اربط(م["تصنيفات"]، "|"))\nاطبع(اربط(م["انحياز"]، "|"))\nمن_أجل (ف في مفاتيح(م["أوزان"])) { اطبع(نص(ف) + ":" + اربط(م["أوزان"][ف]، ",")) }');
  const lat=s=>s.replace(/[٠-٩]/g,d=>'٠١٢٣٤٥٦٧٨٩'.indexOf(d)).replace(/٬/g,'');
  const A=n=>String(n).replace(/\d/g,d=>'٠١٢٣٤٥٦٧٨٩'[d]);
  const cls=out[0].split('|'),bias=lat(out[1]).split('|').map(Number);
  const body=out.slice(2).map(l=>{const i=l.indexOf(':');return A(lat(l.slice(0,i)))+':'+lat(l.slice(i+1)).split(',').map(Number).map(A).join(',')}).join(';');
  models[h]={cls,bias:bias.map(A).join(','),body};
  console.log(h.padEnd(8),'نهائي',tr.length,'تصنيفات',cls.length,((Date.now()-t0)/1000).toFixed(0)+'ث');
 }
}
if(FINAL){
 const parts=Object.entries(models).map(([h,m])=>`    "${h}": {"تصنيفات": [${m.cls.map(c=>'"'+c+'"').join('،')}]، "انحياز": "${m.bias}"، "نص": "${m.body}"}`).join('،\n');
 const src=`# ضاد/نواة_مولد_أوزان — مولَّد بـ tools/t1_train.js من نواة_مصنف.درّب؛ لا يُحرَّر يدويًّا.
# رؤوس الفهم لمولّد نواة: عائلة، مرشح، تحويل، اختزال، محمول، أرقام، نص، صيغة. الأوزان أعداد صحيحة ×١٠٠٠ بالتجزئة نفسها في «ضاد/نواة_مصنف».

متغير _رؤوس = {
${parts}
}
متغير _مخزن = {}

دالة _عدد(ك) {
    متغير س = ١
    متغير ق = ٠
    متغير ب = ك
    إذا (طول(ب) > ٠ و ب[٠] == "-") { س = -١; ب = ب[١:طول(ب)] }
    من_أجل (ح في ب) {
        من_أجل (ي في مدى(١٠)) { إذا ("٠١٢٣٤٥٦٧٨٩"[ي] == ح) { ق = ق * ١٠ + ي } }
    }
    ارجع س * ق
}

دالة _قائمة(ن) {
    متغير خ = []
    من_أجل (ك في افصل(ن، ",")) { أضف(خ، _عدد(ك)) }
    ارجع خ
}

صدّر دالة رؤوس() { ارجع مفاتيح(_رؤوس) }

صدّر دالة نموذج(اسم) {
    إذا (ليس يحوي(_مخزن، اسم)) {
        متغير ر = _رؤوس[اسم]
        متغير أوزان_ = {}
        من_أجل (مدخل في افصل(ر["نص"]، ";")) {
            متغير نقطتان = ٠
            من_أجل (ي في مدى(طول(مدخل))) { إذا (مدخل[ي] == ":" و نقطتان == ٠) { نقطتان = ي } }
            أوزان_[_عدد(مدخل[٠:نقطتان])] = _قائمة(مدخل[نقطتان + ١:طول(مدخل)])
        }
        _مخزن[اسم] = {"تصنيفات": ر["تصنيفات"]، "انحياز": _قائمة(ر["انحياز"])، "أوزان": أوزان_}
    }
    ارجع _مخزن[اسم]
}
`;
 fs.writeFileSync(path.join(__dirname,'..','stdlib','نواة_مولد_أوزان.dhad'),src);
 console.log('كُتب النموذج',(src.length/1024).toFixed(0),'ك.بايت');
}
