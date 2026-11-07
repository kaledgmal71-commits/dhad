// الطبقتان: لنواة شريطها الخاص وصفحاتها، ولضاد شريطها؛ لا تسرّب بينهما، وكل رابط داخلي في صفحات نواة يصل إلى ملف
const fs=require('fs'),path=require('path');
const D=path.join(__dirname,'..','dist');let pass=0,fail=0;
const ok=(c,m)=>{if(c)pass++;else{fail++;console.log('FAIL',m);}};
if(!fs.existsSync(path.join(D,'nawa','learn','index.html'))){console.log('تخطّي: لا dist (شغّل site/pages.gen.js)');process.exit(0);}
const rd=p=>fs.readFileSync(path.join(D,p),'utf8');
const navOf=h=>{const m=/<nav class="tabs">([\s\S]*?)<\/nav>/.exec(h);return m?m[1]:'';};
const pages=['nawa/index.html','nawa/learn/index.html','nawa/guide/index.html','nawa/explain/index.html'];
for(const p of pages){
  const h=rd(p),nav=navOf(h);
  ok(/class="ly on" href="\/nawa\/"/.test(h)&&/class="ly" href="\/"/.test(h),p+': نصفا الطبقتين');
  ok(nav.includes('href="/nawa/learn/"')&&nav.includes('href="/nawa/guide/"')&&nav.includes('href="/nawa/explain/"'),p+': تبويبات نواة');
  ok(!/href="\/(learn|explain|docs|dictionary|examples|editor|roadmap)\//.test(nav),p+': لا تبويبات ضاد في شريط نواة');
  for(const m of h.matchAll(/href="(\/[^"#?]*)/g)){const u=m[1];if(u==='/'||/\.(css|js|json|webmanifest)$/.test(u))continue;const f=path.join(D,u.replace(/^\//,''),u.endsWith('/')?'index.html':'');if(!fs.existsSync(f)&&!fs.existsSync(path.join(D,u.replace(/^\//,''))))ok(false,p+': رابط مكسور '+u);else pass++;}
}
const home=rd('index.html');
ok(/<nav class="main">/.test(home)&&!/<nav class="main">[\s\S]*?\/nawa\/[\s\S]*?<\/nav>/.test(home),'شريط ضاد بلا ن في وسطه');
ok(/class="ly" href="\/nawa\/"/.test(home)&&/class="ly on" href="\/"/.test(home),'ضاد: نصفا الطبقتين');
ok((rd('nawa/explain/index.html').match(/<svg viewBox/g)||[]).length>=4,'أربعة رسوم في شروح المكوّنات');
ok(!/اكتب لي برنامج الأعداد الأولية', 'اشرح لي الإغلاقات'/.test(fs.readFileSync(path.join(__dirname,'..','site','assets','nawa.js'),'utf8')),'لا اقتراحات جاهزة عن ضاد');
const sm=rd('sitemap.xml');ok(sm.includes('/nawa/learn/')&&sm.includes('/nawa/guide/')&&sm.includes('/nawa/explain/'),'خريطة الموقع');
console.log('pass '+pass+' fail '+fail);process.exit(fail?1:0);
