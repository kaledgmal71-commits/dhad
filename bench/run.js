// مشغّل DhadBench: node bench/run.js [--ref]  | أو require واستدعاء score(task, code)
const R=require('../site/run.js');const tasks=require('./tasks.js');
const A=n=>String(n).replace(/\d/g,d=>'٠١٢٣٤٥٦٧٨٩'[d]);
const lit=v=>Array.isArray(v)?'['+v.map(lit).join('، ')+']':typeof v==='string'?'"'+v+'"':typeof v==='boolean'?(v?'صحيح':'خطأ'):A(v);
function score(t,code){let ok=0;for(const [args,exp] of t.cases){
  const call=`${t.fn}(${args.map(lit).join('، ')})`;
  const prog=code+'\nاطبع('+call+')';
  const r=R.run(prog,{maxMs:2000,maxSteps:300000});
  const got=(r.out||[]).join('\n').trim();
  const want=(()=>{const r2=R.run('اطبع('+lit(exp)+')',{maxMs:500});return (r2.out||[]).join('\n').trim()})();
  if(r.ok&&got===want)ok++;}
  return ok/t.cases.length}
module.exports={score,tasks,lit};
if(require.main===module){let bad=0;for(const t of tasks){const s=score(t,t.ref);const b=t.broken?score(t,t.broken):null;
  const flag=(s!==1||(b!==null&&b===1))?'✗':'✓';if(flag==='✗')bad++;console.log(flag,t.id,t.kind,'مرجع',s,b!==null?'معطوب '+b:'')}
  console.log('مهام',tasks.length,'غير صالحة',bad)}
