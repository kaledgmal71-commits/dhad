// ربط عناصر الواجهة بسطر شيفرتها: كل عنصر ينشئه المستخدم (مباشرة أو عبر ضاد/واجهة) يحمل data-dhad-line = سطر الاستدعاء في شيفرته
const { chromium } = require('playwright');
const fs = require('fs'), path = require('path');
const ENGINE = fs.readFileSync(path.join(__dirname, '..', 'dist', 'assets', 'engine.js'), 'utf8');
const CODE = [
  'متغير و٢ = استورد("ضاد/واجهة")',
  'متغير ص = و٢.صفحة("إضافة كتاب")',
  'متغير ح = و٢.حقل(ص، "العنوان"، "أدخل")',
  'و٢.زر(ص، "حفظ"، لاشيء)',
  'متغير خام = عنصر_جديد("div")',
  'عيّن_نص(خام، "خام")',
  'أضف_ابن(الجذر()، خام)',
  'و٢.زر(ص، "متعدد"، دالة() {',
  '    متغير س = ١',
  '    س = س + ١',
  '})',
].join('\n');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage(); const errs = [];
  p.on('pageerror', e => errs.push(String(e)));
  await p.setContent('<div id="r"></div><pre id="o"></pre><pre id="e"></pre>');
  await p.addScriptTag({ content: ENGINE });
  await p.evaluate(c => window.DhadRunApp(c, document.getElementById('r'), document.getElementById('o'), document.getElementById('e')), CODE);
  const got = await p.evaluate(() => ({
    err: document.getElementById('e').textContent,
    rows: [...document.querySelectorAll('#r *')].map(e => [e.tagName.toLowerCase(), e.getAttribute('data-dhad-line')]),
  }));
  await b.close();
  let pass = 0, fail = 0;
  const t = (name, ok) => { if (ok) pass++; else { fail++; console.log('FAIL', name, JSON.stringify(got)); } };
  const line = tag => (got.rows.find(r => r[0] === tag) || [])[1];
  t('no-error', got.err === '' && errs.length === 0);
  t('section-line-2', line('section') === '2');
  t('input-line-3', line('input') === '3');
  t('button-line-4', line('button') === '4');
  t('raw-div-line-5', got.rows.some(r => r[0] === 'div' && r[1] === '5'));
  t('multiline-call-line-8', got.rows.filter(r => r[0] === 'button').map(r => r[1]).join(',') === '4,8');
  t('no-lib-lines', got.rows.every(r => r[1] === null || +r[1] <= 11));
  console.log(`dom-line-map: ${pass} passed, ${fail} failed`); process.exit(fail ? 1 : 0);
})();
