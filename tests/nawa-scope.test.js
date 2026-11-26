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
  let p=await page(async p=>{await p.route(/wikipedia\.org|wikisource\.org|archive\.org|api\.github\.com/,r=>r.abort());});
  await p.evaluate(()=>{const dt=new DataTransfer();dt.items.add(new File(['باب الطهارة: الوضوء فرض وسنن. الغسل والتيمم من أحكام الطهارة المعروفة عند الفقهاء.'],'الشاملة-كتاب١.txt'));dt.items.add(new File(['الطهارة في هذا الكتاب الآخر لا علاقة له بالنطاق المعين أبدا.'],'اخرى-كتاب٢.txt'));const i=document.getElementById('dirIn');i.files=dt.files;i.dispatchEvent(new Event('change'));});await p.waitForTimeout(1500);
  let t=await ask(p,'نطاق عملك في هذه المهمة: المكتبة الشاملة',6000);
  ok(/عيّنتُ النطاق/.test(t)&&/1 ملف|١ ملف|ملفًّا مربوطًا/.test(t),'تعيين النطاق يطابق ملفًّا واحدًا: '+t.slice(-200));
  t=await ask(p,'تدرّب على النطاق',8000);
  ok(/هيّأتُ النطاق/.test(t)&&/لا تدريب أوزان/.test(t),'تهيئة النطاق صادقة: '+t.slice(-200));
  t=await ask(p,'ما أحكام الطهارة',9000);
  ok(/كتاب١/.test(t)&&!/كتاب٢/.test(t),'البحث داخل النطاق وحده: '+t.slice(-300));
  t=await ask(p,'ألغِ النطاق',6000);ok(/أُنهي النطاق/.test(t),'إنهاء النطاق');
  p=await page(async p=>{await p.route(/wikipedia\.org|wikisource\.org|archive\.org|api\.github\.com/,r=>r.abort());});
  t=await ask(p,'تدرّب على النطاق',5000);ok(/لم يُعيَّن نطاق/.test(t),'تهيئة بلا نطاق: ردّ صريح');
 }catch(e){fail++;console.log('ERR',e.message)}
 await b.close();srv.close();console.log('نجح',pass,'فشل',fail);process.exit(fail?1:0);});
