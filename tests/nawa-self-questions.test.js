// أسئلة المستخدم عن نواة نفسها تُجاب حوارًا ولا تُحوَّل بحثًا؛ وطبقة الويب لا تبحث بها.
const fs=require('fs'),path=require('path');const R=require(path.join(__dirname,'..','site','run.js'));
let pass=0,fail=0;const ok=(c,m)=>{if(c)pass++;else{fail++;console.log('FAIL',m)}};
const t=(q)=>{const r=R.run('متغير م = استورد("ضاد/نواة_منسق")\nمتغير ر = م.نفّذ_الطلب("'+q.replace(/\n/g,'"+حرف(١٠)+"')+'"، {})\nاطبع(ر["نوع"])\nاطبع(ر["رد"])',{maxMs:60000,maxSteps:1e9});return r.ok?r.out:['ERR'];};
let o=t('مرحبا\nهل أنت الآن تعمل بكفاءة');ok(o[0]==='حوار'&&!o[1].includes('لم أفهم'),'تحية وسؤال عن الحال: '+o[0]);
o=t('ماذا تحسن من عمل');ok(o[0]==='حوار'&&o[1].includes('يمكنني'),'«ماذا تحسن» = قدرات');
const js=fs.readFileSync(path.join(__dirname,'..','site','assets','nawa.js'),'utf8');
ok(/social = [^;]*ماذا \(تحسن/.test(js),'طبقة الويب تتخطى أسئلة نواة عن نفسها');
console.log('نجح',pass,'فشل',fail);process.exit(fail?1:0);
