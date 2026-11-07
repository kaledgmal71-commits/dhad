// مواصفات الواجهة الملزمة كما قالها صاحب المشروع حرفيًا، تُفحص على كل صفحة في الموقع لا على عيّنة:
// ١) الشريط العلوي نصفان بعرض الشريط، في كل نصف: الحرف ثم الاسم العربي ثم شرطة ثم الإنجليزي (ن نواة — NAWA، ض ضاد — dhad)
// ٢) لا شيء بجانبهما إلا زر السمة؛ لا تبويبات ولا موصّلات داخل الشريط
// ٣) تبويبات كل طبقة في صف مستقل تحته، وتبويبات ضاد لا تظهر في صفحات نواة ولا العكس
const fs=require('fs'),path=require('path');
const D=path.join(__dirname,'..','dist');let pass=0,fail=0;
const ok=(c,m)=>{if(c)pass++;else{fail++;if(fail<25)console.log('FAIL',m);}};
if(!fs.existsSync(path.join(D,'index.html'))){console.log('تخطّي: لا dist');process.exit(0);}
const files=[];(function walk(d){for(const f of fs.readdirSync(d,{withFileTypes:true})){const p=path.join(d,f.name);if(f.isDirectory())walk(p);else if(f.name==='index.html'||f.name==='404.html')files.push(p);}})(D);
let checked=0;
for(const f of files){
  const rel=path.relative(D,f),h=fs.readFileSync(f,'utf8');
  if(!/<header class="top">/.test(h))continue; // المحرر له واجهته الخاصة
  checked++;
  const m=/<div class="lbar">([\s\S]*?)<\/button><\/div>/.exec(h);
  ok(!!m,rel+': لا شريط طبقتين');if(!m)continue;
  const bar=m[1]+'</button>';
  const halves=[...bar.matchAll(/<a class="ly( on)?" href="([^"]+)"><i>(.)<\/i><b>([^<]+)<\/b><s>—<\/s><em>([^<]+)<\/em><\/a>/g)];
  ok(halves.length===2,rel+': يجب نصفان بالصيغة حرف/عربي/شرطة/إنجليزي، وُجد '+halves.length);
  if(halves.length===2){
    ok(halves[0][3]==='ن'&&halves[0][4]==='نواة'&&halves[0][5]==='NAWA','ن نواة — NAWA في الأول '+rel);
    ok(halves[1][3]==='ض'&&halves[1][4]==='ضاد'&&halves[1][5]==='dhad','ض ضاد — dhad في الثاني '+rel);
    ok(halves.filter(x=>x[1]).length===1,rel+': نصف واحد فقط نشط');
    const inNawa=rel.startsWith('nawa');ok((halves[0][1]?true:false)===inNawa,rel+': النصف النشط يطابق الطبقة');
  }
  ok((bar.match(/<button/g)||[]).length===1&&/id="theme"/.test(bar),rel+': زر السمة وحده بجانب النصفين');
  ok(!/<nav|class="tabs"|الموصّلات|افتح المحرر/.test(bar),rel+': لا تبويبات أو أدوات داخل الشريط');
  const after=h.slice(h.indexOf(m[0])+m[0].length,h.indexOf('</header>'));
  if(rel.startsWith('nawa')){
    ok(/<nav class="tabs">/.test(after)&&/href="\/nawa\/learn\/"/.test(after),rel+': تبويبات نواة في صف تحت الشريط');
    ok(!/href="\/(learn|explain|docs|dictionary|examples|editor|roadmap)\//.test(after.replace(/<div class="tools">[\s\S]*$/,'')),rel+': لا تبويبات ضاد في نواة');
  }else{
    ok(/<nav class="main">/.test(after),rel+': تبويبات ضاد في صف تحت الشريط');
    ok(!/href="\/nawa\/(learn|guide|explain)\//.test(after),rel+': لا تبويبات نواة في ضاد');
  }
}
ok(checked>=70,'فُحصت صفحات كثيرة: '+checked);
console.log('pages '+checked+' pass '+pass+' fail '+fail);process.exit(fail?1:0);
