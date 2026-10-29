// اختبار تفاضلي للواجهة: يشغّل التطبيق الأصلي والتطبيق المبني بضاد في Chromium، ويطبّق على الاثنين التسلسل نفسه من الأفعال
// ويقارن حالة الشاشة بعد كل فعل (النص، الشجرة، الأرقام، الرسائل، النوافذ، المؤشر، الشريط الجانبي)
const { chromium } = require('playwright');
const fs = require('fs'), path = require('path'), cp = require('child_process');
const makeGen = require('./gen.js');
const ORIGINAL = process.env.BOOK_ORIGINAL || '/home/claude/book-editor-original.html';
const OUT = '/tmp/bookapp-ui/b.html', ORIG2 = '/tmp/bookapp-ui/a.html';
cp.execFileSync('node', [path.join(__dirname, '../../tools/bundle_app.js'), path.join(__dirname, '../../apps/book-editor'), 'محرّر', OUT]);
fs.mkdirSync('/tmp/bookapp-ui', { recursive: true }); fs.copyFileSync(ORIGINAL, ORIG2);
const SEED = +process.argv[3] || 1, STEPS = +process.argv[2] || 60;
const SNAP = `(()=>{const $=s=>document.querySelector(s);const vis=e=>getComputedStyle(e).display!=='none';
 const U=location.href.split('#')[0];const N=x=>typeof x==='string'?x.split(U).join('URL'):x;return JSON.stringify({ta:N($('#ta').value),pn:$('#pn').value,tot:$('#tot').textContent,msg:$('#msg').textContent,cnt:$('#cnt').textContent,
  tree:[...document.querySelectorAll('#tree a')].map(a=>[a.className,N(a.textContent)]),dlg:vis($('#dlg')),exp:vis($('#exp')),adlg:vis($('#adlg')),
  out:N($('#out').value),rx:$('#rx').value,off:$('#off').value,sel:[$('#ta').selectionStart,$('#ta').selectionEnd],scroll:Math.round($('#ta').scrollTop),
  side:getComputedStyle($('#side')).width,fl:getComputedStyle($('#fl')).width,fs:getComputedStyle($('#fs')).display,fsv:$('#fs').value,
  as:vis($('#as')),ab:$('#ab').disabled,sv:vis($('#sv')),aqi:$('#aqi').value,paste:N($('#paste').value)})})()`;
(async () => {
  const browser = await chromium.launch();
  const mk = async (url) => { const ctx = await browser.newContext({ viewport: { width: 900, height: 600 } }); const p = await ctx.newPage(); p.on('dialog', d => d.accept()); p.errs = []; p.on('pageerror', e => p.errs.push(e.message)); await p.goto(url); await p.waitForTimeout(800); return p; };
  const A = await mk('file://' + ORIG2), B = await mk('file://' + OUT);
  const gen = makeGen(SEED), rnd = gen.rnd; const pick = a => a[Math.floor(rnd() * a.length)];
  const both = async (fn) => { await fn(A); await fn(B); };
  let pass = 0, fail = 0; const fails = [];
  const check = async (label) => {
    await A.waitForTimeout(450);
    let a = await A.evaluate(SNAP), b = await B.evaluate(SNAP);
    { const ja = JSON.parse(a), jb = JSON.parse(b); if (ja.msg === '' || jb.msg === '') { ja.msg = jb.msg = ''; a = JSON.stringify(ja); b = JSON.stringify(jb); } }
    if (a === b) pass++; else {
      fail++; const ja = JSON.parse(a), jb = JSON.parse(b); const d = Object.keys(ja).filter(k => JSON.stringify(ja[k]) !== JSON.stringify(jb[k]));
      fails.push(label + ' ← فروق في: ' + d.map(k => `${k}: أصل=${JSON.stringify(ja[k]).slice(0, 120)} ضاد=${JSON.stringify(jb[k]).slice(0, 120)}`).join(' | '));
    }
  };
  const bookText = (mode) => {
    const pages = gen.book();
    if (mode === 'mark') return pages.map((p, i) => '=== صفحة ' + (i + 1) + ' ===\n' + p).join('\n');
    if (mode === 'ff') return pages.join('\f');
    return pages.join('\n');
  };
  const load = async (mode, nl, off, rx) => {
    const t = bookText(mode);
    await both(async p => { await p.evaluate(({ mode, nl, off, rx }) => { document.querySelector('#ld').click(); document.querySelector('#mode').value = mode; document.querySelector('#nl').value = nl; document.querySelector('#off').value = off; document.querySelector('#rx').value = rx; }, { mode, nl, off, rx }); await p.fill('#paste', t); await p.click('#go'); });
  };
  await check('البداية');
  await load('auto', '12', '1', '^\\s*\\d+\\s*[-–]\\s*(.{3,90})$'); await check('تحميل تلقائي');
  for (let i = 0; i < STEPS; i++) {
    const r = rnd(); let label;
    if (r < .10) { label = 'التالية'; await both(p => p.click('#next')); }
    else if (r < .18) { label = 'السابقة'; await both(p => p.click('#prev')); }
    else if (r < .24) { const n = String(Math.floor(rnd() * 12)); label = 'رقم صفحة ' + n; await both(async p => { await p.fill('#pn', n); await p.dispatchEvent('#pn', 'change'); }); }
    else if (r < .30) { const k = pick(['Alt+ArrowLeft', 'Alt+ArrowRight']); label = k; await both(p => p.keyboard.press(k)); }
    else if (r < .38) { const t = pick(['س', 'أبان', '\n12 - محمد بن علي\n', 'x', ' ']); label = 'كتابة ' + JSON.stringify(t); await both(async p => { await p.focus('#ta'); await p.keyboard.insertText(t); await p.waitForTimeout(550); }); }
    else if (r < .45) { label = 'تقسيم'; const f = rnd(); await both(async p => { await p.evaluate(f => { const t = document.querySelector('#ta'); const m = Math.floor(f * t.value.length); t.setSelectionRange(m, m); }, f); await p.click('#split'); }); }
    else if (r < .50) { label = 'دمج مع التالية'; await both(p => p.click('#mn')); }
    else if (r < .55) { label = 'دمج مع السابقة'; await both(p => p.click('#mp')); }
    else if (r < .59) { label = 'صفحة جديدة'; await both(p => p.click('#add')); }
    else if (r < .63) { label = 'حذف'; await both(p => p.click('#del')); }
    else if (r < .70) { label = 'تراجع'; await both(p => p.click('#undo')); }
    else if (r < .78) { const k = Math.floor(rnd() * 4); label = 'شجرة ' + k; await both(async p => { const n = await p.locator('#tree a').count(); if (n) await p.locator('#tree a').nth(k % n).click(); }); }
    else if (r < .82) { const q = pick(['محمد', 'بن', 'xyz', 'أحمد', '']); label = 'بحث شجرة ' + q; await both(async p => { await p.click('#sb'); if (await p.isVisible('#fs')) await p.fill('#fs', q); }); }
    else if (r < .85) { label = 'تصدير'; await both(async p => { await p.click('#exp-b'); }); await check('تصدير'); await both(p => p.click('#xc')); }
    else if (r < .88) { label = 'نسخ'; await both(async p => { await p.click('#exp-b'); await p.click('#cp'); await p.waitForTimeout(100); await p.click('#xc'); }); }
    else if (r < .93) { const o = [rnd() < .5, rnd() < .5, rnd() < .5, rnd() < .5]; label = 'تحليل ' + o.join(); await both(async p => { await p.click('#an'); await p.evaluate(o => { ['#o1', '#o2', '#o3', '#o4'].forEach((s, i) => document.querySelector(s).checked = o[i]); }, o); await p.click('#ago'); await p.waitForTimeout(100); }); }
    else if (r < .96) { label = 'سحب الشريط'; const x = 200 + Math.floor(rnd() * 400); await both(async p => { await p.evaluate(() => { getSelection().removeAllRanges(); document.activeElement && document.activeElement.blur(); }); const b = await p.locator('#rz').boundingBox(); await p.mouse.move(b.x + 2, b.y + 40); await p.mouse.down(); await p.mouse.move(x, b.y + 40, { steps: 3 }); await p.mouse.up(); }); }
    else if (r < .98) { label = 'نقرتان على الشريط'; await both(p => p.dispatchEvent('#rz', 'dblclick')); }
    else { const modes = ['auto', 'mark', 'ff', 'lines']; const m = pick(modes); label = 'تحميل ' + m; await load(m, pick(['5', '12', '40', '0']), pick(['1', '0', '7']), pick(['^\\s*\\d+\\s*[-–]\\s*(.{3,90})$', '^(\\d+)', '[', 'محمد'])); }
    await check(`${i + 1}. ${label}`);
  }
  if (A.errs.length || B.errs.length) console.log('أخطاء صفحة:', A.errs.slice(0, 3), B.errs.slice(0, 3));
  await browser.close();
  console.log('pass', pass, 'fail', fail);
  fails.slice(0, 10).forEach(f => console.log(' -', f));
  process.exit(fail ? 1 : 0);
})();
