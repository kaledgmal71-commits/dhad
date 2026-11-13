// من الحوار إلى التطبيق: «اصنع تطبيقا للتلخيص» يُجهّز بطاقة، والضغط عليها يفتح التطبيق معزولًا ويعمل بخدمات المحيط. وطلبات أخرى لا تُحوَّل تطبيقًا.
const path=require('path');const R=require(path.join(__dirname,'..','site','run.js'));
let pass=0,fail=0;const ok=(c,m)=>{if(c)pass++;else{fail++;console.log('FAIL',m)}};
const t=(q)=>{const r=R.run('متغير م = استورد("ضاد/نواة_منسق")\nمتغير ر = م.نفّذ_الطلب("'+q.replace(/\n/g,'"+حرف(١٠)+"')+'"، {})\nاطبع(ر["نوع"])\nاطبع(ر["رد"])',{maxMs:60000,maxSteps:1e9});return r.ok?r.out:['ERR'];};
const T='تأسست المدينة عام ١٩٥٠ على ضفة النهر الكبير. بلغ عدد سكانها ٢٠٠٠٠ نسمة في العام الأول. اشتهرت المدينة بزراعة القطن والقمح الجيد. يبلغ طول النهر ٣٠٠ كيلومتر تقريبا. أنشئت الجامعة الوطنية سنة ١٩٧٥ لخدمة الطلبة.';
ok(t('اصنع لي تطبيقا للتلخيص')[0]==='تطبيق','تطبيق التلخيص');
ok(t('أريد تطبيقا يعمل لي اختبارات من النصوص')[0]==='تطبيق','تطبيق الاختبار');
ok(t('اعمل لي أداة تلخص النصوص')[0]==='تطبيق','أداة تلخّص');
ok(t('اكتب برنامجا بضاد يطبع مرحبا')[0]!=='تطبيق','برنامج بلغة مسمّاة ليس تطبيقًا');
ok(t('اصنع تطبيقا بلغة بايثون للتلخيص')[0]!=='تطبيق','لغة مسمّاة تحجب القالب');
ok(t('لخّص هذا النص\n'+T)[0]==='تلخيص','تلخيص نص ملصوق يبقى تلخيصًا');
ok(t('مرحبا')[0]==='حوار','التحية كما هي');
let chromium;try{({chromium}=require('playwright'));}catch(e){console.log('نجح',pass,'فشل',fail);process.exit(fail?1:0);}
const http=require('http'),fs=require('fs');
const dist=path.join(__dirname,'..','dist');
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript','.css':'text/css','.json':'application/json','.png':'image/png','.svg':'image/svg+xml','.webmanifest':'application/json'};
const srv=http.createServer((q,r)=>{let u=decodeURIComponent(q.url.split('?')[0]);let f=path.join(dist,u);if(f.endsWith(path.sep)||(fs.existsSync(f)&&fs.statSync(f).isDirectory()))f=path.join(f,'index.html');if(!fs.existsSync(f)){r.writeHead(404);r.end();return}r.writeHead(200,{'content-type':mime[path.extname(f)]||'application/octet-stream'});r.end(fs.readFileSync(f))});
srv.listen(0,async()=>{const port=srv.address().port;const b=await chromium.launch();
 try{
  const ctx=await b.newContext({viewport:{width:430,height:900},deviceScaleFactor:2});const p=await ctx.newPage();
  await p.route(/wikipedia\.org|wikisource\.org|archive\.org|api\.github\.com/,r=>r.abort());
  await p.goto('http://localhost:'+port+'/nawa/');await p.waitForSelector('#in');
  await p.fill('#in','اصنع لي تطبيقا للتلخيص');await p.keyboard.press('Enter');
  await p.waitForSelector('.appcard',{timeout:30000});
  ok((await p.innerText('.appcard')).includes('ملخّص نصوص'),'بطاقة التطبيق ظهرت');
  if(process.env.SHOT1)await p.screenshot({path:process.env.SHOT1});
  await p.click('.appcard .abtn');
  await p.waitForSelector('.appdlg iframe',{timeout:20000});
  const fr=await (async()=>{for(let i=0;i<40;i++){const f=p.frames().find(x=>x!==p.mainFrame()&&x.parentFrame()===p.mainFrame());if(f)return f;await p.waitForTimeout(250)}})();
  await p.waitForTimeout(1200);
  await fr.fill('#t',T);await fr.click('#b');await p.waitForTimeout(3000);
  ok((await fr.innerText('#o')).length>20,'التطبيق لخّص عبر المحيط');
  if(process.env.SHOT2)await p.screenshot({path:process.env.SHOT2});
  await p.click('.appdlg .ibtn');await p.waitForTimeout(300);
  ok(await p.$('.appdlg')===null,'الإغلاق يزيل اللوحة');
 }catch(e){fail++;console.log('ERR',e.message)}
 await b.close();srv.close();console.log('نجح',pass,'فشل',fail);process.exit(fail?1:0);});
