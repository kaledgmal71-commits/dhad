// يقيس مولّد نواة (ت١) على DhadBench: node tools/t1_bench.js [--held] [--verbose]
// نجاح@١ = اجتياز كل حالات المهمة بتشغيل الشيفرة المولَّدة (bench/run.js). الرفض الصريح يُحسب إخفاقًا ويُسجَّل سببه.
// «إيجابية كاذبة» = حالة ناجح (مرّ بالتحقق الداخلي) لكن المعيار رسب. لا يطبع وصفًا ولا شيفرة مهمة محتجَزة إلا مع --verbose.
const R=require('../site/run.js');const B=require('../bench/run.js');
const held=process.argv.includes('--held'),verbose=process.argv.includes('--verbose');
const tasks=held?require('../bench/held.js'):B.tasks;
const items=tasks.map(t=>({id:t.id,kind:t.kind,desc:t.desc,broken:t.broken||''}));
const q=s=>JSON.stringify(s).replace(/\\u([0-9a-f]{4})/g,(_,h)=>String.fromCharCode(parseInt(h,16)));
const src='متغير م = استورد("ضاد/نواة_مولد_فهم")\nمتغير ق = '+q(items)+'\nمن_أجل (ت في ق) {\n متغير ن = لاشيء\n إذا (ت["kind"] == "كتابة") { ن = م.ولّد(ت["desc"]، لاشيء) } وإلا { ن = م.أصلح(ت["desc"]، ت["broken"]) }\n اطبع(ن["حالة"])\n اطبع(ن["سبب"])\n اطبع(ن["شيفرة"])\n اطبع("@@@")\n}';
const t0=Date.now();const r=R.run(src.replace(/"kind"/g,'"kind"'),{maxMs:900000,maxSteps:9e10});
if(!r.ok){console.error(r.error);process.exit(1)}
const blocks=r.out.join('\n').split('\n@@@').slice(0,tasks.length).map(x=>x.replace(/^\n/,''));
const agg={كتابة:{n:0,ok:0},إصلاح:{n:0,ok:0}};const reasons={};let fp=0,failed=0,rejected=0;
tasks.forEach((t,i)=>{const [st,why,...code]=blocks[i].split('\n');const c=code.join('\n');
 const a=agg[t.kind];a.n++;let s=0;
 if(st==='ناجح')s=B.score(t,c);else if(st==='فاشل')failed++;else{rejected++;reasons[why]=(reasons[why]||0)+1}
 if(s===1)a.ok++;if(st==='ناجح'&&s<1)fp++;
 console.log(t.id,st,why||'',s===1?'✓':'✗'+(st==='ناجح'?' '+s.toFixed(2):''));
 if(verbose)console.log('   ',t.desc,'\n'+c);
});
console.log('---');
console.log('كتابة',agg.كتابة.ok+'/'+agg.كتابة.n,'| إصلاح',agg.إصلاح.ok+'/'+agg.إصلاح.n,'| رفض',rejected,'| فاشل صياغةً/تشغيلًا',failed,'| إيجابية كاذبة',fp);
console.log('أسباب الرفض',JSON.stringify(reasons),'| زمن',((Date.now()-t0)/1000).toFixed(0)+'ث');
