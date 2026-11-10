// الخطة المركّبة في الصفحة الحقيقية: ثلاث خطوات تظهر مرقّمة في ردّ واحد، وسؤال اللغة يُستأنف.
let chromium;try{({chromium}=require('playwright'));}catch(e){console.log('تخطّي: playwright غير مثبّت');process.exit(0);}
const http=require('http'),fs=require('fs'),path=require('path');
const dist=path.join(__dirname,'..','dist');if(!fs.existsSync(path.join(dist,'nawa','index.html'))){console.log('تخطّي: لا dist');process.exit(0);}
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript','.css':'text/css','.json':'application/json','.png':'image/png','.svg':'image/svg+xml','.webmanifest':'application/json'};
const srv=http.createServer((q,r)=>{let u=decodeURIComponent(q.url.split('?')[0]);let f=path.join(dist,u);if(f.endsWith(path.sep)||(fs.existsSync(f)&&fs.statSync(f).isDirectory()))f=path.join(f,'index.html');if(!f.startsWith(dist)||!fs.existsSync(f)){r.writeHead(404);return r.end();}r.writeHead(200,{'content-type':mime[path.extname(f)]||'application/octet-stream'});r.end(fs.readFileSync(f));});
let pass=0,fail=0;const ok=(c,m)=>{if(c)pass++;else{fail++;console.log('FAIL',m)}};
srv.listen(0,async()=>{const port=srv.address().port;const b=await chromium.launch();
 try{
  const ctx=await b.newContext({viewport:{width:430,height:900},deviceScaleFactor:2});const p=await ctx.newPage();
  await p.route(/wikipedia\.org|wikisource\.org|archive\.org|api\.github\.com/,r=>r.abort());
  await p.goto('http://localhost:'+port+'/nawa/');await p.waitForSelector('#in');
  const ask=async(q,w)=>{await p.fill('#in',q);await p.keyboard.press('Enter');await p.waitForTimeout(w||9000);return p.innerText('#col');};
  let t=await ask('اكتب برنامجا بضاد يجمع ٤ و٦ ثم شغّله ثم اشرحه',12000);
  ok(/١\)/.test(t)&&/٢\)/.test(t)&&/٣\)/.test(t),'ثلاث خطوات مرقّمة في الصفحة');
  ok(/١٠/.test(t),'ناتج التشغيل ظاهر');
  if(process.env.SHOT)await p.screenshot({path:process.env.SHOT,fullPage:false});
 }catch(e){fail++;console.log('ERR',e.message)}
 await b.close();srv.close();console.log('نجح',pass,'فشل',fail);process.exit(fail?1:0);});
