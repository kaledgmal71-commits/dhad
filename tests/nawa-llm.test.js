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
  const stub="export async function CreateMLCEngine(id,o){o&&o.initProgressCallback&&o.initProgressCallback({text:'تحميل',progress:1});return{chat:{completions:{create:async(req)=>{window.__msgs=req.messages;async function* g(){const w=['<think>x</think>','مرحبًا ','بك ','من ','النموذج.'];for(const x of w){yield{choices:[{delta:{content:x}}]};}}return g();}}}};}";
  const ctx=await b.newContext();await ctx.addInitScript(()=>{Object.defineProperty(navigator,'gpu',{value:{}});});
  const p=await ctx.newPage();
  await p.route(/cdn\.jsdelivr\.net\/npm\/@mlc-ai/,r=>r.fulfill({headers:{'content-type':'text/javascript','access-control-allow-origin':'*'},body:stub}));
  await p.route(/wikipedia\.org|wikisource\.org|archive\.org|api\.github\.com/,r=>r.abort());
  await p.goto('http://localhost:'+port+'/nawa/');await p.waitForSelector('#in');
  let t=await ask(p,'كيف حالك اليوم؟',9000);
  ok(/أحتاج نموذج توليد/.test(t)&&!/لم أجد ما يجيب/.test(t),'بلا نموذج: بطاقة إعداد لا ردّ قالبي: '+t.slice(-200));
  await p.click('.llmcard button');await p.waitForTimeout(9000);
  t=await p.innerText('#col');
  ok(/مرحبًا بك من النموذج\./.test(t)&&!/think|<think>/.test(t),'التوليد يُبثّ ويُحذف وسم التفكير: '+t.slice(-200));
  const msgs=await p.evaluate(()=>window.__msgs);
  ok(msgs&&msgs[0].role==='system'&&/نواة/.test(msgs[0].content)&&msgs[msgs.length-1].role==='user','يصل النموذج نظام وسجلّ وسؤال');
  t=await ask(p,'وما رأيك في القراءة؟',9000);
  const m2=await p.evaluate(()=>window.__msgs);
  ok(m2.length>=4&&m2.some(x=>x.role==='assistant'&&/النموذج/.test(x.content)),'السجلّ الحواري يتراكم: '+m2.length);
  t=await ask(p,'شكّل: ذهب الولد إلى المدرسة',20000);
  ok(/الْوَلَدِ|[\u064B-\u0652]/.test(t.split('شكّل')[1]||''),'المحركات تبقى أدوات: التشكيل لا يمرّ بالنموذج');
 }catch(e){fail++;console.log('ERR',e.message)}
 await b.close();srv.close();console.log('نجح',pass,'فشل',fail);process.exit(fail?1:0);});
