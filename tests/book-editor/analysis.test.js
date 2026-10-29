// اختبار تفاضلي: وحدة التحليل بضاد مقابل دالة analyze() في التطبيق الأصلي، على نصوص اصطناعية بالآلاف من الأسطر
const fs = require('fs'), path = require('path');
const { chromium } = require('playwright');
const R = require('../../site/run.js');
const makeGen = require('./gen.js');
const ORIGINAL = process.env.BOOK_ORIGINAL || '/home/claude/book-editor-original.html';
const MOD = fs.readFileSync(path.join(__dirname, '../../apps/book-editor/تحليل.dhad'), 'utf8');
function dq(s) {
  let o = '"';
  for (const ch of s) {
    const c = ch.codePointAt(0);
    if (ch === '\\') o += '\\\\'; else if (ch === '"') o += '\\"'; else if (ch === '\n') o += '\\n'; else if (ch === '\t') o += '\\t';
    else if (c < 32 || c === 0x2028 || c === 0x2029 || c === 0xa0 || c === 0xfeff || (c >= 0x200b && c <= 0x200f) || (c >= 0x202a && c <= 0x202e) || c === 0x061c) o += '" + حرف(' + c + ') + "';
    else o += ch;
  }
  return o + '"';
}
const N = +process.argv[2] || 40, SEED = +process.argv[3] || 1;
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.goto('file://' + ORIGINAL);
  const gen = makeGen(SEED);
  let pass = 0, fail = 0, totalLines = 0, dhadMs = 0;
  const fails = [];
  for (let k = 0; k < N; k++) {
    const pages = gen.book(), op = gen.opts();
    totalLines += pages.reduce((a, p) => a + p.split('\n').length, 0);
    const want = await page.evaluate(`(()=>{pages=${JSON.stringify(pages)};hist=[];const n=analyze(${JSON.stringify({ intro: op.مقدمة, foot: op.حواشي, norm: op.تنظيف, two: op.صفحتان })});return n===undefined?null:{صفحات:pages,عدد:n}})()`);
    const src = 'متغير ح = استورد("تحليل")\nمتغير ج = استورد("ضاد/جسون")\nمتغير ص = [' + pages.map(dq).join('، ') + ']\nاطبع(ج.اكتب(ح.حلّل(ص، {"مقدمة": ' + (op.مقدمة ? 'صحيح' : 'خطأ') + '، "حواشي": ' + (op.حواشي ? 'صحيح' : 'خطأ') + '، "تنظيف": ' + (op.تنظيف ? 'صحيح' : 'خطأ') + '، "صفحتان": ' + (op.صفحتان ? 'صحيح' : 'خطأ') + '})))';
    const t0 = Date.now();
    const r = R.run(src, { files: { 'تحليل': MOD }, maxMs: 300000, maxSteps: 2e9 });
    dhadMs += Date.now() - t0;
    let ok = r.ok, got = null;
    if (ok) { try { got = JSON.parse(r.out[0]); } catch (e) { ok = false; fails.push('ناتج غير JSON: ' + r.out[0].slice(0, 200)); } }
    else fails.push('خطأ تشغيل: ' + r.error);
    if (ok && JSON.stringify(got) !== JSON.stringify(want)) {
      ok = false;
      let msg = 'اختلاف في الكتاب ' + k + ' خيارات ' + JSON.stringify(op);
      if (got && want) {
        msg += `\n   عدد التراجم: ضاد ${got['عدد']} / الأصل ${want['عدد']}، الصفحات: ${got['صفحات'].length} / ${want['صفحات'].length}`;
        for (let i = 0; i < Math.max(got['صفحات'].length, want['صفحات'].length); i++) if (got['صفحات'][i] !== want['صفحات'][i]) { msg += `\n   أول فرق في الصفحة ${i}:\n   ضاد: ${JSON.stringify((got['صفحات'][i] || '').slice(0, 300))}\n   أصل: ${JSON.stringify((want['صفحات'][i] || '').slice(0, 300))}`; break; }
      } else msg += `\n   ضاد: ${JSON.stringify(got).slice(0, 100)} / أصل: ${JSON.stringify(want).slice(0, 100)}`;
      fails.push(msg);
    }
    if (ok) pass++; else fail++;
  }
  await browser.close();
  console.log(`pass ${pass} fail ${fail} | أسطر ${totalLines} | زمن ضاد ${(dhadMs / 1000).toFixed(1)}ث`);
  fails.slice(0, 6).forEach(f => console.log(f));
  process.exit(fail ? 1 : 0);
})();
