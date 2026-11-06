// اختبار ضاد/رياضيات على مراجع المضيف (Math.*) ومراجع بايثون لدالة الخطأ وما يتبعها
const R=require('../site/run.js');
let pass=0,fail=0;const ok=(c,m)=>{if(c)pass++;else{fail++;console.log('FAIL',m)}};
const AR='٠١٢٣٤٥٦٧٨٩';
const num=s=>Number(s.replace(/[٠-٩]/g,d=>AR.indexOf(d)).replace('٫','.').replace('٬',''));
function run(body,imp='متغير ر = استورد("ضاد/رياضيات")\n'){const r=R.run(imp+body,{maxMs:240000,maxSteps:200000000});if(!r.ok)throw new Error(JSON.stringify(r));return r.out.join(' ').split(/\s+/).filter(Boolean)}
function rel(a,b){return Math.abs(a-b)/Math.max(1e-300,Math.abs(b),1e-12)}
function check(name,pts,fnName,ref,tol){
  const out=run(pts.map(x=>`اطبع(ر.${fnName}(${x}))`).join('\n')).map(num);
  pts.forEach((x,i)=>{const e=ref(x),got=out[i];const err=Math.abs(e)<1e-8?Math.abs(got-e):rel(got,e);ok(err<=tol,`${name}(${x}) = ${got} expected ${e} err ${err}`)});
}
check('أس',[-30,-5,-1,-0.1,0,0.3,1,2.5,10,50,100,-100,700],'أس',Math.exp,1e-13);
check('لوغ',[1e-10,0.001,0.5,0.9,1,1.3,2,10,12345.678,1e10,1e100],'لوغ',Math.log,1e-13);
check('جيب',[-10,-3,-1,0.5,1,3,6.5,100,1000],'جيب',Math.sin,1e-12);
check('جتا',[-10,-3,-1,0,0.5,1,3,6.5,100,1000],'جتا',Math.cos,1e-12);
check('ظل_قطعي',[-25,-3,-0.5,-0.00001,0.00001,0.5,1,3,25],'ظل_قطعي',Math.tanh,1e-12);
check('سيني',[-40,-5,-0.5,0,0.5,5,40],'سيني',x=>1/(1+Math.exp(-x)),1e-13);
const O=JSON.parse(require('fs').readFileSync(__dirname+'/math_oracle.json','utf8'));
for(const [fn,key,tol] of [['خطأ_غاوس','erf',1e-12],['جيلو','gelu',1e-12],['زائد_ناعم','softplus',1e-12],['خطأ_مكمل','erfc',1e-12]]){
  const pts=O[key].map(p=>p[0]);const out=run(pts.map(x=>`اطبع(ر.${fn}(${x}))`).join('\n')).map(num);
  O[key].forEach((p,i)=>{const err=Math.abs(p[1])<1e-8?Math.abs(out[i]-p[1]):rel(out[i],p[1]);ok(err<=tol,`${fn}(${p[0]}) = ${out[i]} expected ${p[1]} err ${err}`)});
}
// جيلو التقريبي قريب من الدقيق (فرق معروف ≤ ٢e-٣)
{const pts=[-3,-1,0,0.5,2];const out=run(pts.map(x=>`اطبع(ر.جيلو_تقريبي(${x}))`).join('\n')).map(num);pts.forEach((x,i)=>ok(Math.abs(out[i]-0.5*x*(1+Math.tanh(0.7978845608028654*(x+0.044715*x**3))))<1e-12,'gelu tanh '+x))}
// المولّد حتمي ومتسلسلة Park–Miller المعروفة للبذرة ١
{const o=run('متغير م = ر.مولّد(١)\nمتغير ح = []\nمن_أجل (ي من ١ إلى ٣) { ر.تالي(م)\n أضف(ح، م["حالة"]) }\nاطبع(ح[٠]، ح[١]، ح[٢])').map(num);ok(o[0]===48271&&o[1]===182605794&&o[2]===1291394886,'Park-Miller sequence '+o.join())}
{const a=run('متغير م = ر.مولّد(٧)\nاطبع(ر.طبيعي(م)، ر.طبيعي(م))');const b=run('متغير م = ر.مولّد(٧)\nاطبع(ر.طبيعي(م)، ر.طبيعي(م))');ok(a.join()===b.join(),'deterministic normal stream')}
{const o=run('متغير م = ر.مولّد(٢٠٢٦)\nمتغير س = ٠\nمتغير س٢ = ٠\nمن_أجل (ي من ١ إلى ٢٠٠٠) { متغير ق = ر.طبيعي(م)\n س = س + ق\n س٢ = س٢ + ق * ق }\nاطبع(س / ٢٠٠٠، س٢ / ٢٠٠٠)').map(num);ok(Math.abs(o[0])<0.08&&Math.abs(o[1]-1)<0.1,'normal moments '+o.join())}
console.log('pass',pass,'fail',fail);process.exit(fail?1:0);
