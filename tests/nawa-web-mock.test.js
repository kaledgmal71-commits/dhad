// الويب شريان نواة: سؤال عام (بلا ذكر ضاد) يُجاب من مصادر الويب العامة؛ مصادر معطّلة لا تعلّق المحادثة؛ بلا تسرّب لمادة ضاد.
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
  let p=await page(async p=>{
   await p.route(/ar\.wikipedia\.org\/w\/api\.php/,r=>{hits.push('ar');r.fulfill({headers:cors,body:r.request().url().includes('list=search')?JSON.stringify({query:{search:[{pageid:11}]}}):JSON.stringify({query:{pages:{11:{title:'ابن سينا',extract:'ابن سينا طبيب وفيلسوف فارسي من أشهر مؤلفاته القانون في الطب.'}}}})})});
   await p.route(/ar\.wikisource\.org/,r=>{hits.push('ws');r.fulfill({headers:cors,body:JSON.stringify({query:{search:[{title:'القانون في الطب',pageid:22,snippet:'كتاب القانون في الطب'}]}})})});
   await p.route(/archive\.org/,r=>{hits.push('ia');r.fulfill({headers:cors,body:JSON.stringify({response:{docs:[]}})})});
   await p.route(/api\.github\.com/,r=>{hits.push('gh');r.fulfill({headers:cors,body:'{"items":[]}'})});});
  let t=await ask(p,'من هو ابن سينا');
  ok(/من الويب والمستودعات/.test(t)&&/ابن سينا طبيب/.test(t),'سؤال عام يُجاب من الويب');
  ok(hits.includes('ar')&&hits.includes('ws')&&hits.includes('ia'),'ويكيبيديا وويكي مصدر وأرشيف الإنترنت تُستعلَم: '+hits.join(','));
  ok(!/من معرفة الموقع/.test(t)&&!/ضاد/.test(t.replace(/نواة|dhad|NAWA/g,'').replace(/ض\s*ا\s*د/g,'')),'لا تسرّب لمادة ضاد في سؤال عام');
  p=await page(async p=>{await p.route(/wikipedia\.org|wikisource\.org|archive\.org|api\.github\.com/,r=>r.abort());});
  t=await ask(p,'ما هي الفوتوسنثيس',12000);
  ok(/لم أفهم هذا الطلب بعد/.test(t)&&/الويب/.test(t),'مصادر معطّلة: يعود الردّ بلا تعليق ولا ذكر لمعرفة الموقع');
  t=await ask(p,'اكتب برنامجا يحسب مضروب ٥');ok(/بأي لغة/.test(t),'برنامج بلا لغة: يُسأل عنها');
  t=await ask(p,'بضاد',9000);ok(/١٢٠/.test(t),'جواب اللغة وحده يكمّل الطلب');
 }catch(e){fail++;console.log('ERR',e.message)}
 await b.close();srv.close();console.log('نجح',pass,'فشل',fail);process.exit(fail?1:0);});
