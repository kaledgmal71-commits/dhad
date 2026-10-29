// اختبار المساعد والتنزيل: تُحاكى window.claude في التطبيقين، وتُستدعى كل الأدوات بتسلسل ثابت، وتُقارن النتائج والصفحات والمحتوى المنزَّل
const fs = require('fs'), path = require('path');
const { chromium } = require('playwright');
const ORIG = process.env.BOOK_ORIGINAL || '/home/claude/book-editor-original.html';
const MINE = process.argv[2] || '/tmp/bookapp/index.html';
const gen = require('./gen.js')(+process.argv[3] || 3);
const book = gen.book();
const mock = `
window.__log=[];window.__saved=[];
window.claude={use:async(n)=>{
  if(n==='sample')return async(inp,o)=>{
    const out=[];
    for(const t of o.tools){
      const base={page:2,text:'نص جديد للصفحة',query:'بن',index:0,with:'next',line:1,offset:3,intro:true,foot:true,norm:true,two:true,limit:5,heading:'x',from:1,to:2};
      let args={};const props=(t.inputSchema&&t.inputSchema.properties)||{};
      for(const k of Object.keys(props))args[k]=(k in base)?base[k]:(props[k].type==='number'?1:(props[k].enum?props[k].enum[0]:'س'));
      try{const r=await t.execute(args);out.push(t.name+':'+JSON.stringify(r));}catch(e){out.push(t.name+':ERR '+e.message)}
      await new Promise(r=>setTimeout(r,30));
    }
    window.__log=out;if(o.onText)o.onText({text:'جزئي'});return{text:'تم '+out.length};
  };
  if(n==='downloads')return{save:async(x)=>{window.__saved.push(x);}};
  return null;}};`;
async function run(file) {
  const b = await chromium.launch(); const p = await b.newPage();
  await p.addInitScript(mock);
  await p.goto('file://' + file); await p.waitForTimeout(700);
  await p.evaluate(() => { document.querySelector('#ld').click(); document.querySelector('#mode').value = 'ff'; });
  await p.fill('#paste', book.join('\f'));
  await p.click('#go'); await p.waitForTimeout(1500);
  const res = {};
  res.asVisible = await p.isVisible('#as'); res.svVisible = await p.isVisible('#sv');
  await p.click('#ab').catch(() => {});
  await p.fill('#aqi', 'نفّذ'); await p.click('#aqb'); await p.waitForTimeout(8000);
  res.log = await p.evaluate(() => window.__log);
  res.ans = await p.textContent('#ans');
  res.pn = await p.inputValue('#pn').catch(async () => await p.textContent('#pn'));
  res.ta = await p.inputValue('#ta');
  res.tot = await p.textContent('#tot');
  await p.click('#exp-b').catch(() => {}); await p.waitForTimeout(300);
  await p.click('#sv').catch(() => {}); await p.waitForTimeout(300);
  res.saved = await p.evaluate(() => window.__saved);
  await b.close(); return res;
}
(async () => {
  const a = await run(ORIG), m = await run(MINE);
  let bad = 0;
  for (const k of Object.keys(a)) { const x = JSON.stringify(a[k]), y = JSON.stringify(m[k]); if (x !== y) { bad++; if (Array.isArray(a[k])) a[k].forEach((v, i) => { if (v !== m[k][i]) console.log('  فرق في أداة', i, '\n   الأصل:', v.slice(0, 400), '\n   ضاد :', String(m[k][i]).slice(0, 400)); }); console.log('اختلاف في', k, '\n  الأصل:', x.slice(0, 600), '\n  ضاد :', y.slice(0, 600)); } }
  console.log((a.log||[]).map(x=>x.slice(0,70)).join('\n'), 'tot', a.tot, 'savedLen', ((a.saved[0]||{}).data||'').length);
  console.log('أدوات نُفّذت:', (a.log || []).length, '/', (m.log || []).length, '| حفظ:', (m.saved || []).length, '| اختلافات', bad);
  process.exit(bad ? 1 : 0);
})();
