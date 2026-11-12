// تطبيقات نواة في متصفح حقيقي: تحقق ضاد، حزمة، إطار معزول، جسر خدمات حقيقي إلى المحيط، تخزين، التقاط أخطاء، وعزل عن الصفحة الأم.
let chromium;try{({chromium}=require('playwright'));}catch(e){console.log('تخطّي: playwright غير مثبّت');process.exit(0);}
const http=require('http'),fs=require('fs'),path=require('path');
const dist=path.join(__dirname,'..','dist');if(!fs.existsSync(path.join(dist,'assets','nawa.app.js'))){console.log('تخطّي: لا dist');process.exit(0);}
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript','.css':'text/css','.json':'application/json','.png':'image/png','.svg':'image/svg+xml','.webmanifest':'application/json'};
const srv=http.createServer((q,r)=>{let u=decodeURIComponent(q.url.split('?')[0]);let f=path.join(dist,u);if(f.endsWith(path.sep)||(fs.existsSync(f)&&fs.statSync(f).isDirectory()))f=path.join(f,'index.html');if(!fs.existsSync(f)){r.writeHead(404);r.end();return}r.writeHead(200,{'content-type':mime[path.extname(f)]||'application/octet-stream'});r.end(fs.readFileSync(f))});
let pass=0,fail=0;const ok=(c,m)=>{if(c)pass++;else{fail++;console.log('FAIL',m)}};
const T='تأسست المدينة عام ١٩٥٠ على ضفة النهر الكبير. بلغ عدد سكانها ٢٠٠٠٠ نسمة في العام الأول. اشتهرت المدينة بزراعة القطن والقمح الجيد. يبلغ طول النهر ٣٠٠ كيلومتر تقريبا. أنشئت الجامعة الوطنية سنة ١٩٧٥ لخدمة الطلبة.';
srv.listen(0,async()=>{const port=srv.address().port;const b=await chromium.launch();
 try{
  const ctx=await b.newContext({viewport:{width:430,height:900},deviceScaleFactor:2});const p=await ctx.newPage();
  const external=[];p.on('request',r=>{const u=r.url();if(!u.startsWith('http://localhost')&&!u.startsWith('data:')&&!u.startsWith('blob:')&&!/fonts\.(googleapis|gstatic)/.test(u))external.push(u)});
  await p.route(/wikipedia\.org|wikisource\.org|archive\.org|api\.github\.com/,r=>r.abort());
  await p.goto('http://localhost:'+port+'/nawa/');await p.waitForSelector('#in');
  await p.addScriptTag({url:'/assets/nawa.app.js'});
  await p.evaluate(()=>window.NawaCore.ready);
  const tpl=await p.evaluate(()=>fetch('/assets/nawa.templates.json').then(r=>r.json()));
  // مضيف ظاهر للقطة
  await p.evaluate(()=>{const h=document.createElement('div');h.id='appHost';h.style.cssText='position:fixed;inset:0;z-index:9999;background:#fff';document.body.appendChild(h)});
  // ١) تطبيق التلخيص
  const r1=await p.evaluate(async(pr)=>{const x=await window.NawaApp.run(window.NawaCore,pr,document.getElementById('appHost'));window.__h=x;return {ok:x.ok,ready:x.ready,errors:x.errors}},tpl['ملخّص_نصوص']);
  ok(r1.ready&&r1.ok,'تطبيق التلخيص يعمل بلا أخطاء: '+JSON.stringify(r1));
  const fr=p.frames().find(f=>f!==p.mainFrame()&&f.parentFrame()===p.mainFrame());
  await fr.fill('#t',T);await fr.click('#b');await p.waitForTimeout(2500);
  const out=await fr.innerText('#o');
  ok(out.length>20&&T.includes(out.split('.')[0].trim().slice(0,20)),'الخدمة أجابت عبر الجسر إلى ضاد: '+out.slice(0,60));
  if(process.env.SHOT)await p.screenshot({path:process.env.SHOT});
  // ٢) العزل: لا وصول إلى الصفحة الأم
  const iso=await fr.evaluate(()=>{try{return typeof parent.document.title}catch(e){return 'blocked'}});
  ok(iso==='blocked','الإطار معزول عن الصفحة الأم: '+iso);
  const ls=await fr.evaluate(()=>{try{return typeof localStorage.getItem('x')}catch(e){return 'blocked'}});
  ok(ls==='blocked','لا تخزين مباشر داخل الإطار: '+ls);
  // ٣) خدمة غير معلنة تُرفض
  const bad=await fr.evaluate(()=>window.nawa.call('اختبار',{نص:'x'}).then(()=>'مرّت',e=>e.message));
  ok(/غير معلنة/.test(bad),'خدمة غير معلنة في البيان تُرفض: '+bad);
  // ٤) التخزين عبر الجسر يبقى بعد إعادة التشغيل
  await p.evaluate(()=>window.__h.destroy());
  await p.evaluate(async(pr)=>{window.__h=await window.NawaApp.run(window.NawaCore,pr,document.getElementById('appHost'))},tpl['ملخّص_نصوص']);
  const fr2=p.frames().find(f=>f!==p.mainFrame()&&f.parentFrame()===p.mainFrame());await p.waitForTimeout(800);
  ok((await fr2.innerText('#o')).length>20,'التخزين عبر الجسر يبقى بعد إعادة التشغيل');
  await p.evaluate(()=>window.__h.destroy());
  // ٥) تطبيق الاختبار الذاتي: بناء ثم تصحيح
  await p.evaluate(async(pr)=>{window.__h=await window.NawaApp.run(window.NawaCore,pr,document.getElementById('appHost'))},tpl['اختبار_ذاتي']);
  const fr3=p.frames().find(f=>f!==p.mainFrame()&&f.parentFrame()===p.mainFrame());
  await fr3.fill('#t',T);await fr3.click('#b');await p.waitForTimeout(3000);
  const q=await fr3.innerText('#q');ok(/[1١]\)/.test(q)&&/أ\)/.test(q),'الأسئلة ظهرت: '+q.slice(0,40));
  await fr3.fill('#a','١ أ ٢ أ ٣ أ');await fr3.click('#c');await p.waitForTimeout(2500);
  ok(/نتيجتك/.test(await fr3.innerText('#r')),'التصحيح ظهر');
  await p.evaluate(()=>window.__h.destroy());
  // ٦) خطأ في التطبيق يُلتقط
  const r6=await p.evaluate(async()=>{const pr={name:'عاطل',files:{'index.html':'<html><head></head><body><script src="a.js"></script></body></html>','a.js':'undefinedFunction()','نواة.json':'{"خدمات":[]}'}};const x=await window.NawaApp.run(window.NawaCore,pr,document.getElementById('appHost'));const o={ok:x.ok,errors:x.errors};x.destroy();return o});
  ok(!r6.ok&&r6.errors.length>0,'خطأ التطبيق يُلتقط: '+JSON.stringify(r6));
  // ٧) مشروع غير سليم يُرفض قبل التشغيل
  const r7=await p.evaluate(()=>window.NawaApp.run(window.NawaCore,{name:'ناقص',files:{'index.html':'<html><script src="x.js"></script></html>'}},document.body).then(()=>'مرّ',e=>e.message));
  ok(/غير سليم/.test(r7)&&/x\.js/.test(r7),'المشروع غير السليم يُرفض: '+r7);
  ok(external.length===0,'لا طلبات خارجية من التطبيقات: '+external.slice(0,3).join(','));
 }catch(e){fail++;console.log('ERR',e.message)}
 await b.close();srv.close();console.log('نجح',pass,'فشل',fail);process.exit(fail?1:0);});
