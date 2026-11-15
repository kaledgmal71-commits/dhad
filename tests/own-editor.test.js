// محرر ضاد الأصلي: سلوك التحرير بلوحة مفاتيح حقيقية في متصفح حقيقي (عربي/إنجليزي مختلط، أقواس، مسافات، تعليق، نقل سطر، تراجع)
const {chromium}=require('playwright');const http=require('http'),fs=require('fs'),path=require('path');
const srv=http.createServer((q,r)=>{let u=decodeURIComponent(q.url.split('?')[0]);if(u.endsWith('/'))u+='index.html';const f=path.join('dist',u);if(!fs.existsSync(f)||fs.statSync(f).isDirectory()){r.statusCode=404;return r.end()}r.setHeader('content-type',f.endsWith('.js')?'text/javascript':'text/html;charset=utf-8');r.end(fs.readFileSync(f))}).listen(0,async()=>{
 const b=await chromium.launch();let fails=0;const ck=(n,c,x)=>{console.log(c?'ok  ':'FAIL',n,c?'':JSON.stringify(x));if(!c)fails++};
 for(const [w,h,tag] of [[1400,850,'d'],[390,844,'m']]){
  const p=await b.newPage({viewport:{width:w,height:h}});const errs=[];p.on('pageerror',e=>errs.push(e.message));
  await p.route(/cdnjs|googleapis|gstatic/,r=>r.abort());
  await p.goto('http://localhost:'+srv.address().port+'/editor/');await p.waitForFunction(()=>window.__dhad&&window.__dhad.ed,{timeout:20000});await p.waitForTimeout(500);
  const V=()=>p.evaluate(()=>document.querySelector('.fb-ta').value);
  const reset=async(t='')=>{await p.evaluate((t)=>{const ta=document.querySelector('.fb-ta');ta.focus();ta.select();document.execCommand('insertText',false,t);},t);};
  const caret=()=>p.evaluate(()=>document.querySelector('.fb-ta').selectionStart);
  await p.click('.fb-ta');
  ck(tag+' kind is own editor',await p.evaluate(()=>window.__dhad.editorKind==='fallback'));
  await reset();await p.keyboard.type('متغير س = ١٢ + abc');
  ck(tag+' mixed arabic/latin keeps logical order',(await V())==='متغير س = ١٢ + abc',await V());
  await reset();await p.keyboard.type('اطبع(');
  ck(tag+' auto-close paren',(await V())==='اطبع()'&&await caret()===5,[await V(),await caret()]);
  await p.keyboard.type('"');ck(tag+' auto-close quote inside paren',(await V())==='اطبع("")',await V());
  await p.keyboard.type('مرحبا"');ck(tag+' typing closing quote skips over',(await V())==='اطبع("مرحبا")',await V());
  await p.keyboard.type(')');ck(tag+' typing closing paren skips over',(await V())==='اطبع("مرحبا")',await V());
  await reset();await p.keyboard.type('(');await p.keyboard.press('Backspace');
  ck(tag+' backspace removes empty pair',(await V())==='',await V());
  await reset();await p.keyboard.type('إذا صحيح {');await p.keyboard.press('Enter');
  ck(tag+' enter after { indents and closes block',(await V())==='إذا صحيح {\n    \n}'&&await caret()===15,[await V(),await caret()]);
  await reset();await p.keyboard.type('١');await p.keyboard.press('Tab');
  ck(tag+' tab inserts 4 spaces',(await V())==='١    ',await V());
  await reset('١\n٢\n٣');await p.keyboard.press('Control+a');await p.keyboard.press('Tab');
  ck(tag+' tab indents all selected lines',(await V())==='    ١\n    ٢\n    ٣',await V());
  await p.keyboard.press('Shift+Tab');ck(tag+' shift+tab outdents',(await V())==='١\n٢\n٣',await V());
  await p.keyboard.press('Control+/');ck(tag+' ctrl+/ comments',(await V())==='# ١\n# ٢\n# ٣',await V());
  await p.keyboard.press('Control+/');ck(tag+' ctrl+/ uncomments',(await V())==='١\n٢\n٣',await V());
  await reset('١\n٢\n٣');await p.keyboard.press('Control+Home');await p.keyboard.press('Alt+ArrowDown');
  ck(tag+' alt+down moves line',(await V())==='٢\n١\n٣',await V());
  await p.keyboard.press('Alt+ArrowUp');ck(tag+' alt+up moves back',(await V())==='١\n٢\n٣',await V());
  await reset();await p.keyboard.type('اطبع(١)');await p.keyboard.press('Control+z');
  ck(tag+' ctrl+z undoes typing',(await V()).length<'اطبع(١)'.length,await V());
  await reset('متغير س = ١\nاطبع(س)');
  ck(tag+' highlighting marks keyword',await p.evaluate(()=>!!document.querySelector('.fb-hl .tok-keyword')));
  ck(tag+' gutter has a number per line',await p.evaluate(()=>document.querySelectorAll('.fb-ln').length===2));
  await reset('س'.repeat(400));
  ck(tag+' long line scrolls horizontally and overlay follows',await p.evaluate(()=>{const ta=document.querySelector('.fb-ta');ta.scrollLeft=-200;ta.dispatchEvent(new Event('scroll'));return ta.scrollWidth>ta.clientWidth&&ta.scrollLeft!==0&&document.querySelector('.fb-hl').style.transform.includes(String(-ta.scrollLeft)+'px');}));
  console.log(tag,'errs',errs);if(errs.length)fails++;await p.close();
 }
 await b.close();srv.close();console.log(fails?'FAILS '+fails:'ALL OK');process.exit(fails?1:0);
});
