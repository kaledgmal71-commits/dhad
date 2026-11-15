// وضع المختبر داخل المحرر: تقسيم الواجهة|الكود، تظليل متبادل، بطاقة العلاقة، تغيير القيم، المساعد (على محاكاة مصغّرة لواجهة Monaco لأن الشبكة قد تحجب CDN)
const {chromium}=require('playwright');const http=require('http'),fs=require('fs'),path=require('path');
const S=(process.env.LAB_SHOTS||'');
const SHIM=()=>{ // محاكاة مصغّرة لواجهة Monaco فوق textarea المحرر المدمج
  const ta=document.querySelector('#monaco-editor textarea');
  class Range{constructor(a,b,c,d){this.sl=a;this.sc=b;this.el=c;this.ec=d}}
  const lines=()=>ta.value.split('\n');
  const off=(l,c)=>{const ls=lines();let o=0;for(let i=0;i<l-1;i++)o+=ls[i].length+1;return o+c-1};
  const model={getValue:()=>ta.value,getLineCount:()=>lines().length,getLineMaxColumn:l=>lines()[l-1].length+1,getFullModelRange:()=>new Range(1,1,lines().length,lines()[lines().length-1].length+1)};
  const cbs={content:[],cursor:[]};
  const raw={getModel:()=>model,
    executeEdits:(_,ops)=>{ops.forEach(o=>{const r=o.range;ta.value=ta.value.slice(0,off(r.sl,r.sc))+o.text+ta.value.slice(off(r.el,r.ec));});ta.dispatchEvent(new Event('input',{bubbles:true}));cbs.content.forEach(f=>f());},
    deltaDecorations:(old,nw)=>{window.__decs=nw.map(d=>d.range.sl);return nw.map((_,i)=>'d'+i)},
    revealLineInCenterIfOutsideViewport:()=>{},setPosition:p=>{window.__pos=p.lineNumber},updateOptions:()=>{},layout:()=>{},
    onDidChangeCursorPosition:f=>cbs.cursor.push(f),onDidChangeModelContent:f=>cbs.content.push(f),onDidChangeModel:()=>{}};
  window.__shim={cbs};
  Object.defineProperty(window.__dhad,'monaco',{get:()=>({Range})});
  Object.defineProperty(window.__dhad,'ed',{get:()=>({raw,kind:'fallback',getValue:()=>ta.value})});
  document.dispatchEvent(new CustomEvent('dhad-editor-ready'));
};
const srv=http.createServer((q,r)=>{let u=decodeURIComponent(q.url.split('?')[0]);if(u.endsWith('/'))u+='index.html';const f=path.join('dist',u);if(!fs.existsSync(f)||fs.statSync(f).isDirectory()){r.statusCode=404;return r.end()}r.setHeader('content-type',f.endsWith('.js')?'text/javascript':f.endsWith('.html')?'text/html;charset=utf-8':'application/octet-stream');r.end(fs.readFileSync(f))}).listen(0,async()=>{
 const base='http://localhost:'+srv.address().port;
 const b=await chromium.launch();let fails=0;const ck=(n,c)=>{console.log(c?'ok  ':'FAIL',n);if(!c)fails++};
 for(const [w,h,tag] of [[1400,850,'d'],[390,844,'m']]){
  const p=await b.newPage({viewport:{width:w,height:h}});
  const errs=[];p.on('pageerror',e=>errs.push(e.message));
  await p.route(/cdnjs|googleapis|gstatic/,r=>r.abort());
  await p.goto(base+'/editor/',{waitUntil:'load'});
  await p.waitForFunction(()=>window.__dhad&&window.__dhad.editorKind,{timeout:30000});
  await p.waitForTimeout(600);
  await p.evaluate(()=>{const el=[...document.querySelectorAll('.tree-file')].find(e=>e.textContent.includes('نموذج تسجيل'));el.click();});
  await p.waitForTimeout(500);
  await p.evaluate(SHIM);
  await p.waitForTimeout(1200);
  ck(tag+' split layout on',await p.evaluate(()=>document.querySelector('.editor-area').classList.contains('lab-on')));
  const lines=await p.evaluate(()=>[...document.querySelectorAll('#lab-ui-body [data-dhad-line]')].map(e=>e.tagName+':'+e.getAttribute('data-dhad-line')).join(','));
  console.log(tag,lines);
  ck(tag+' ui has input line 3 and button',/INPUT:3/.test(lines)&&/BUTTON:\d/.test(lines));
  await p.hover('#lab-ui-body button');await p.waitForTimeout(200);
  ck(tag+' hover → decoration on button line',await p.evaluate(()=>(window.__decs||[])[0]===6));
  await p.click('#lab-ui-body input');await p.waitForTimeout(200);
  ck(tag+' click input → relation card mentions السطر',await p.evaluate(()=>document.querySelector('#lab-relbody').textContent.includes('السطر')));
  ck(tag+' try controls present',await p.evaluate(()=>document.querySelectorAll('#lab-ctls input').length>0));
  await p.fill('#lab-ctls input[type=text]','اسم جديد');await p.waitForTimeout(900);
  ck(tag+' editing control changes UI label',await p.evaluate(()=>document.querySelector('#lab-ui-body').textContent.includes('اسم جديد')));
  ck(tag+' terms exist',await p.evaluate(()=>document.querySelectorAll('#lab-termlist details').length>0));
  // assistant
  await p.click('.lab-switch');ck(tag+' chat window shown',await p.isVisible('#lab-aireq'));await p.fill('#lab-aireq','أضف حقل رقم الهاتف');await p.click('#lab-aigo');await p.waitForTimeout(6500);
  ck(tag+' assistant wrote line + UI shows new field',await p.evaluate(()=>document.querySelector('#monaco-editor textarea').value.includes('رقم الهاتف')&&document.querySelector('#lab-ui-body').textContent.includes('رقم الهاتف')));
  if(S)await p.screenshot({path:S+'lab-ed-'+tag+'.png'});
  await p.click('#lab-aiundo');await p.waitForTimeout(700);
  ck(tag+' undo removes it',await p.evaluate(()=>!document.querySelector('#monaco-editor textarea').value.includes('رقم الهاتف')));
  await p.evaluate(()=>{document.querySelector('#monaco-editor textarea').value='اطبع("س")';window.__shim.cbs.content.forEach(f=>f());});await p.waitForTimeout(700);
  ck(tag+' non-UI program restores classic editor',await p.evaluate(()=>!document.querySelector('.editor-area').classList.contains('lab-on')&&document.getElementById('live-app-root').parentNode.id!=='lab-ui-body'));
  console.log(tag,'errs',errs);if(errs.length)fails++;
  await p.close();
 }
 await b.close();srv.close();console.log(fails?'FAILS '+fails:'ALL OK');process.exit(fails?1:0);
});
