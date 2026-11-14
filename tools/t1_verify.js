// يفحص مُصدِر الشيفرة (stdlib/نواة_مولد.dhad) على N مواصفة عشوائية: ينفّذ الشيفرة بضاد ويقارنها بالمُحكَّم الدلالي (جافاسكربت).
// الاستعمال: node tools/t1_verify.js [عدد=600] [بذرة=1]
const R=require('../site/run.js');const S=require('./t1_space.js');
const N=+(process.argv[2]||600),seed=+(process.argv[3]||1);
const rng=S.mkRng(seed);
const lit=v=>Array.isArray(v)?'['+v.map(lit).join('، ')+']':typeof v==='string'?'"'+v+'"':typeof v==='boolean'?(v?'صحيح':'خطأ'):v===null?'لاشيء':String(v).replace(/\d/g,d=>'٠١٢٣٤٥٦٧٨٩'[d]);
function build(specs){
 const src='متغير م = استورد("ضاد/نواة_مولد")\nمتغير ق = '+JSON.stringify(specs)+'\nمن_أجل (س في ق) {\n متغير خ = م.ابنِ(س)\n اطبع(خ)\n اطبع("@@@")\n}';
 const r=R.run(src,{maxMs:600000,maxSteps:5e10});if(!r.ok)throw new Error(r.error);
 return r.out.join('\n').split('\n@@@').map(x=>x.replace(/^\n/,'')).slice(0,specs.length);
}
const specs=[];const seen=new Set();
for(let i=0;i<N*3&&specs.length<N;i++){const s=S.sample(rng);const k=JSON.stringify(s);if(seen.has(k))continue;seen.add(k);specs.push(s)}
const codes=build(specs);
let ok=0,bad=0,noEmit=0;const fails=[];
specs.forEach((s,i)=>{
 const code=codes[i];if(!code||code==='لاشيء'){noEmit++;fails.push([s,'لا شيفرة']);return}
 const ins=S.inputs(s,rng,6);if(ins.length<2){noEmit++;fails.push([s,code,'غير قابلة للاختبار']);return}
 const call=a=>s.اسم+'('+a.map(lit).join('، ')+')';
 const run=R.run(code+'\n'+ins.map(a=>'اطبع('+call(a)+')').join('\n'),{maxMs:5000,maxSteps:2e6});
 const want=R.run(ins.map(a=>{const o=S.oracle(s,a);return 'اطبع('+lit(o)+')'}).join('\n'),{maxMs:2000});
 const got=(run.out||[]).join('\n'),w=(want.out||[]).join('\n');
 if(run.ok&&got===w)ok++;else{bad++;fails.push([s,code,got.slice(0,200),w.slice(0,200),run.error])}
});
console.log({مواصفات:specs.length,صحيح:ok,خلاف:bad,بلا_شيفرة:noEmit});
for(const f of fails.slice(0,8))console.log(JSON.stringify(f[0]),'\n'+f[1],'\nمنفَّذ:',f[2],'\nمحكَّم:',f[3],'\nخطأ:',f[4],'\n---');
process.exit(bad+noEmit?1:0);
