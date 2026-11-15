// وضع المختبر داخل المحرر: تقسيم الواجهة|الكود، تظليل متبادل، بطاقة العلاقة، تغيير القيم، المساعد (على محرر ضاد الأصلي في متصفح حقيقي)
const {chromium}=require('playwright');const http=require('http'),fs=require('fs'),path=require('path');
const S=(process.env.LAB_SHOTS||'');
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
  await p.waitForTimeout(1200);
  ck(tag+' split layout on',await p.evaluate(()=>document.querySelector('.editor-area').classList.contains('sm')));
  ck(tag+' ui card is right of code (desktop) / below (phone)',await p.evaluate((w)=>{const c=document.querySelector('#lab-ui').getBoundingClientRect(),e=document.querySelector('.editor-host-wrap').getBoundingClientRect();return w>760?(c.left>=e.right-2&&c.top<=e.top+2&&Math.abs(c.width-e.width)<40):(c.top>=e.bottom-2);},w));
  const lines=await p.evaluate(()=>[...document.querySelectorAll('#lab-ui-body [data-dhad-line]')].map(e=>e.tagName+':'+e.getAttribute('data-dhad-line')).join(','));
  console.log(tag,lines);
  ck(tag+' ui has input line 3 and button',/INPUT:3/.test(lines)&&/BUTTON:\d/.test(lines));
  await p.hover('#lab-ui-body button');await p.waitForTimeout(200);
  ck(tag+' hover → decoration on button line',await p.evaluate(()=>document.querySelectorAll('.fb-deco.lab-hl-line').length===1&&Math.round(parseFloat(document.querySelector('.fb-deco.lab-hl-line').style.top))===10+5*22-document.querySelector('.fb-ta').scrollTop));
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
  await p.click('#lab-collapse');await p.waitForTimeout(300);
  ck(tag+' collapse hides card and code takes the width',await p.evaluate((w)=>{const c=document.querySelector('#lab-ui'),e=document.querySelector('.editor-host-wrap').getBoundingClientRect();return getComputedStyle(c).display==='none'&&e.width>(w>760?w*0.6:w*0.8);},w)&&await p.isVisible('#lab-show'));
  await p.click('#lab-show');await p.waitForTimeout(300);
  ck(tag+' show restores card',await p.isVisible('#lab-ui'));
  await p.click('#lab-expand');await p.waitForTimeout(300);
  ck(tag+' expand covers the editor page',await p.evaluate(([w,h])=>{const r=document.querySelector('#lab-ui').getBoundingClientRect();return r.width>=w-2&&r.height>h*0.7;},[w,h]));
  await p.keyboard.press('Escape');await p.waitForTimeout(300);
  ck(tag+' escape leaves expanded view',await p.evaluate(()=>!document.querySelector('#lab-ui').classList.contains('expanded')));
  await p.evaluate(()=>{document.querySelector('#monaco-editor textarea').value='اطبع("س")';document.querySelector('#monaco-editor textarea').dispatchEvent(new Event('input',{bubbles:true}));});await p.waitForTimeout(700);
  ck(tag+' non-UI program drops explain tab',await p.evaluate(()=>document.getElementById('lab-tab').hidden&&!document.getElementById('panel').classList.contains('lab-panel')));
  console.log(tag,'errs',errs);if(errs.length)fails++;
  await p.close();
 }
 await b.close();srv.close();console.log(fails?'FAILS '+fails:'ALL OK');process.exit(fails?1:0);
});
