// اختبار ١٧-٣ المحتجَز: طلبات لم تُستعمل في بناء المؤلّف (tests/data/composer-held.json). العتبات مثبَّتة في docs/سجل-النواقص.md قبل البناء.
const R=require('../site/run.js'),fs=require('fs'),path=require('path');
const D=JSON.parse(fs.readFileSync(path.join(__dirname,'data','composer-held.json'),'utf8'));
const lit=s=>JSON.stringify(s);
const src='متغير م = استورد("ضاد/نواة_مؤلف")\n'+[...D.داخل.map(x=>x.طلب),...D.خارج].map(t=>`متغير ن = م.ألّف(${lit(t)})\nاطبع("@@", ن["حالة"])\nاطبع(اربط(ن["ناتج"], "|"))`).join('\n');
const r=R.run(src,{maxMs:240000,maxSteps:5e9});if(!r.ok){console.log('ERR',JSON.stringify(r).slice(0,500));process.exit(1)}
// أسطر الخرج: "@@ حالة" ثم الناتج؛ نقسّم على علامة @@
const blocks=r.out.join('\n').split('@@').slice(1).map(b=>{const L=b.trim().split('\n');return {st:L[0].trim(),out:L.slice(1).join('\n').trim()}});
let inOk=0,outOk=0,bad=0;
D.داخل.forEach((x,i)=>{const b=blocks[i];let ok=false;
 if(b.st==='ناجح'){const lines=b.out===''?[]:b.out.split('|').map(s=>s.trim());
  if(x.متوقع)ok=JSON.stringify(lines)===JSON.stringify(x.متوقع);
  else ok=lines.length===x.أسطر&&x.يحوي.every(h=>b.out.includes(h));}
 if(b.st==='فاشل')bad++;
 if(ok)inOk++;else console.log('داخل-فشل',x.طلب,'→',b.st,b.out.slice(0,80));});
D.خارج.forEach((t,i)=>{const b=blocks[D.داخل.length+i];if(b.st==='مرفوض')outOk++;else console.log('خارج-قُبل',t,'→',b.st)});
console.log('داخل',inOk+'/'+D.داخل.length,'خارج مرفوض',outOk+'/'+D.خارج.length,'فاشل(صياغة/تشغيل)',bad);
const pass=inOk>=21&&outOk>=9&&bad===0;
console.log(pass?'PASS: العتبات تحققت':'FAIL: العتبات لم تتحقق');process.exit(pass?0:1);
