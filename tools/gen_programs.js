// مولّد برامج ضاد قصيرة كاملة من قوالب (حتمي)، مرشَّحة بالتشغيل. يُخرج {train, held} إلى stdout أو ملف.
// العائلتان «طالما» و«خريطة» محتجَزتان من التدريب (تجربة ١٧-٢د).
const R=require('../site/run.js');
let seed=20261110;const rnd=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296};
const pick=a=>a[Math.floor(rnd()*a.length)];
const AR=n=>String(n).replace(/\d/g,d=>'٠١٢٣٤٥٦٧٨٩'[d]);
const Q=String.fromCharCode(34);
const names=['س','ص','ع','ك','ل','ن','كمية','مجموع','قيمة','ناتج','رقم','عنصر','درجة','سعر'];
const words=['ضاد','نواة','سلام','مرحبا','كتاب','قلم','نور','علم','بيت','شمس'];
const num=()=>AR(1+Math.floor(rnd()*20));
const str=()=>Q+pick(words)+Q;
const fam={
 طباعة:()=>pick([`اطبع(${str()})`,`اطبع(${str()}، ${str()})`,`اطبع(${str()} + ${Q} ${Q} + ${str()})`,`اطبع(${num()}، ${str()})`]),
 متغير:()=>{const a=pick(names);return `متغير ${a} = ${num()}\nاطبع(${a})`},
 حساب:()=>{const a=pick(names);const op=pick(['+','-','*']);return `متغير ${a} = ${num()} ${op} ${num()}\nاطبع(${a})`},
 شرط:()=>{const a=pick(names);const c=pick(['>','<','>=','==']);return `متغير ${a} = ${num()}\nإذا (${a} ${c} ${num()}) {\n    اطبع(${str()})\n} وإلا {\n    اطبع(${str()})\n}`},
 حلقة:()=>{const a=pick(['ي','ع','ك']);const body=pick([`اطبع(${a})`,`اطبع(${a} * ${num()})`,`اطبع(${a}، ${str()})`,`اطبع(${a} + ${num()})`]);return `من_أجل (${a} من ${AR(1)} إلى ${AR(2+Math.floor(rnd()*8))}) {\n    ${body}\n}`},
 دالة:()=>{const f=pick(['جمع','ضرب','زد','مجموع_']);const a=pick(['أ','س']),b=pick(['ب','ص']);const op=pick(['+','*','-']);return `دالة ${f}(${a}، ${b}) {\n    ارجع ${a} ${op} ${b}\n}\nاطبع(${f}(${num()}، ${num()}))`},
 قائمة:()=>{const a=pick(['ق','قائمة_','أرقام']);return `متغير ${a} = [${num()}، ${num()}]\nأضف(${a}، ${num()})\nاطبع(طول(${a}))`},
 طالما:()=>{const a=pick(names);return `متغير ${a} = ${AR(2+Math.floor(rnd()*4))}\nطالما (${a} > ${AR(0)}) {\n    اطبع(${a})\n    ${a} = ${a} - ${AR(1)}\n}`},
 خريطة:()=>{const a=pick(['ش','خ','بيانات']);return `متغير ${a} = {${Q}اسم${Q}: ${str()}، ${Q}عدد${Q}: ${num()}}\nاطبع(${a}[${Q}اسم${Q}])`}
};
const TRAIN=['طباعة','متغير','حساب','شرط','حلقة','دالة','قائمة'],HELD=['طالما','خريطة'];
function make(fams,n){const out=[];const seen=new Set();for(const f of fams){let got=0,guard=0;while(got<n&&guard++<n*80){const p=fam[f]();if(seen.has(p))continue;const r=R.run(p,{maxMs:2000,maxSteps:200000});if(r.ok&&!(r.out||[]).some(l=>/^خطأ: /.test(l))){seen.add(p);out.push(p);got++}}}return out}
const train=make(TRAIN,60),held=make(HELD,25);
require('fs').writeFileSync(process.argv[2]||'/tmp/programs.json',JSON.stringify({train,held}));
console.log('train',train.length,'held',held.length);
