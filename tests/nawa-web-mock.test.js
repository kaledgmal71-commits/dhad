// نواة لا تجيب من الويب: لا طلبات إلى ويكيبيديا أو أرشيف الإنترنت أو GitHub، والجواب عند غياب ما يجيب صادق بلا اختلاق.
// الشبكة هنا مُحاكاة بـ page.route (البيئة لا تصل إلى الشبكة العامة)، فالمختبَر ربط الصفحة بالمصادر لا الشبكة الحقيقية.
let chromium;try{({chromium}=require('playwright'));}catch(e){console.log('تخطّي: playwright غير مثبّت');process.exit(0);}
const http=require('http'),fs=require('fs'),path=require('path');
const dist=path.join(__dirname,'..','dist');if(!fs.existsSync(path.join(dist,'nawa','index.html'))){console.log('تخطّي: لا dist');process.exit(0);}
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript','.css':'text/css','.json':'application/json','.png':'image/png','.svg':'image/svg+xml','.webmanifest':'application/json'};
const srv=http.createServer((q,r)=>{let u=decodeURIComponent(q.url.split('?')[0]);let f=path.join(dist,u);if(f.endsWith(path.sep)||(fs.existsSync(f)&&fs.statSync(f).isDirectory()))f=path.join(f,'index.html');if(!f.startsWith(dist)||!fs.existsSync(f)){r.writeHead(404);return r.end();}r.writeHead(200,{'content-type':mime[path.extname(f)]||'application/octet-stream'});r.end(fs.readFileSync(f));});
let pass=0,fail=0;const ok=(c,m)=>{if(c)pass++;else{fail++;console.log('FAIL',m)}};
srv.listen(0,async()=>{const port=srv.address().port;const b=await chromium.launch();
 try{
  const cors={'access-control-allow-origin':'*','content-type':'application/json'};
  async function page(mocks){const p=await(await b.newContext()).newPage();await mocks(p);await p.goto('http://localhost:'+port+'/nawa/');await p.waitForSelector('#in');return p;}
  const ask=async(p,q,w)=>{await p.fill('#in',q);await p.keyboard.press('Enter');await p.waitForTimeout(w||8000);return p.innerText('#col');};
  const hits=[];
  let p=await page(async p=>{await p.route(/wikipedia\.org|wikisource\.org|archive\.org|api\.github\.com/,r=>{hits.push(r.request().url());r.abort();});});
  let t=await ask(p,'من هو ابن سينا',9000);
  ok(hits.length===0,'لا طلبات إلى مصادر الويب: '+hits.join(','));
  ok(/لم أجد ما يجيب هذا الطلب/.test(t)&&!/الويب/.test(t),'الجواب عند غياب المصدر صادق ولا يذكر الويب');
  t=await ask(p,'اكتب برنامجا يحسب مضروب ٥');ok(/بأي لغة/.test(t),'برنامج بلا لغة: يُسأل عنها');
  t=await ask(p,'بضاد',9000);ok(/١٢٠/.test(t),'جواب اللغة وحده يكمّل الطلب');
 }catch(e){fail++;console.log('ERR',e.message)}
 await b.close();srv.close();console.log('نجح',pass,'فشل',fail);process.exit(fail?1:0);});
