// لقطات شاشة للصفحات الرئيسية بعرض الهاتف والحاسوب قبل أي نشر: node tools/shots.js <مجلد-الإخراج>
// تُفتح الصور بعين لا بنص: الاختبارات الآلية تمسك الهيكل، واللقطات تمسك الجمال والتزاحم.
const {chromium}=require('playwright'),http=require('http'),fs=require('fs'),path=require('path');
const out=process.argv[2];if(!out){console.error('الاستعمال: node tools/shots.js <مجلد>');process.exit(1);}
fs.mkdirSync(out,{recursive:true});const D=path.join(__dirname,'..','dist');
const T={'.html':'text/html;charset=utf-8','.css':'text/css','.js':'application/javascript','.json':'application/json','.svg':'image/svg+xml','.png':'image/png','.webmanifest':'application/json'};
const srv=http.createServer((q,r)=>{let u=decodeURIComponent(q.url.split('?')[0]);let f=path.join(D,u);if(u.endsWith('/'))f=path.join(f,'index.html');if(!fs.existsSync(f)||fs.statSync(f).isDirectory()){r.statusCode=404;return r.end('404');}r.setHeader('content-type',T[path.extname(f)]||'application/octet-stream');r.end(fs.readFileSync(f));});
const PAGES=[['/','home'],['/learn/','learn'],['/nawa/','nawa'],['/nawa/learn/','nlearn'],['/nawa/explain/','nexplain']];
srv.listen(0,async()=>{const port=srv.address().port;const b=await chromium.launch();
 for(const [w,h,tag] of [[430,900,'m'],[1280,720,'d']]){const p=await b.newPage({viewport:{width:w,height:h},deviceScaleFactor:1});
  for(const [u,n] of PAGES){await p.goto('http://localhost:'+port+u,{waitUntil:'load'});await p.waitForTimeout(500);const f=path.join(out,n+'_'+tag+'.png');await p.screenshot({path:f});console.log(f);}}
 await b.close();srv.close();});
