// خط الأساس: توليف نواة الحالي (استرجاع + تحقق) على مهام الكتابة، بقاعدة الموقع الحقيقية. الإصلاح: لا آلية منطقية بعد → الشيفرة المعطوبة كما هي.
const fs=require('fs'),path=require('path');const R=require('../site/run.js');const B=require('./run.js');
const rows=fs.readFileSync(path.join(__dirname,'..','dist','ai','dhad-corpus.jsonl'),'utf8').trim().split('\n').map(l=>JSON.parse(l)).filter(r=>r.status==='ok'&&r.code&&r.output&&['example','lesson','explain','dictionary'].includes(r.source));
const ex=rows.map(r=>({معرف:r.id,عنوان:r.title||r.id,وصف:r.instruction||'',شيفرة:r.code,ناتج:r.output}));
const TASKS=process.argv.includes('--held')?require('./held.js'):B.tasks;
const W=TASKS.filter(t=>t.kind==='كتابة');
const pre='متغير ت = استورد("ضاد/نواة_توليف")\nمتغير ق = ت.ابنِ_قاعدة('+JSON.stringify(ex)+')\n';
let sum=0,found=0;
for(const t of W){const r=R.run(pre+'متغير ن = ت.ولّد(ق،'+JSON.stringify(t.desc)+')\nاطبع(ن["وُجد"])\nاطبع(ن["شيفرة"])',{maxMs:120000,maxSteps:3e9});
 const o=r.out||[];const f=o[0]==='صحيح';const code=o.slice(1).join('\n');
 const s=f&&code?B.score(t,code):0;sum+=s;if(f)found++;console.log(t.id,'وُجد',f,'درجة',s);}
console.log('أمثلة القاعدة',ex.length,'| كتابة نجاح@١ =',(sum/W.length).toFixed(3),'| وُجد مرشَّح لـ',found,'من',W.length);
const F=TASKS.filter(t=>t.kind==='إصلاح');console.log('إصلاح (الشيفرة كما هي) =',(F.reduce((a,t)=>a+B.score(t,t.broken),0)/F.length).toFixed(3));
