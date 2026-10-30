// اختبار تفاضلي: المُرمِّز المكتوب بضاد (selfhost/مرمز.dhad) مقابل tokenize في front.js، على ملفات المشروع كلها ونصوص عشوائية
// الاستعمال: node tests/selfhost-lexer.test.js [عدد_العشوائي] [بذرة]
const fs = require('fs'), path = require('path');
const R = require('../site/run.js');
const { tokenize } = require('../front.js');
const MOD = fs.readFileSync(path.join(__dirname, '../selfhost/مرمز.dhad'), 'utf8');
const N = +process.argv[2] || 600, SEED = +process.argv[3] || 1;
let s = SEED >>> 0; const rnd = () => (s = (s * 1664525 + 1013904223) >>> 0) / 4294967296;
const pick = a => a[Math.floor(rnd() * a.length)];
function dq(t) {
  let o = '"';
  for (const ch of t) {
    const c = ch.codePointAt(0);
    if (ch === '\\') o += '\\\\'; else if (ch === '"') o += '\\"'; else if (ch === '\n') o += '\\n'; else if (ch === '\t') o += '\\t';
    else if (c < 32 || c === 0x2028 || c === 0x2029 || c === 0xa0 || c === 0xfeff || (c >= 0x200b && c <= 0x200f) || (c >= 0x202a && c <= 0x202e) || c === 0x061c) o += '" + حرف(' + c + ') + "';
    else if (c > 0xffff) { const h = 0xd800 + ((c - 0x10000) >> 10), l = 0xdc00 + ((c - 0x10000) & 0x3ff); o += '" + حرف(' + h + ') + حرف(' + l + ') + "'; }
    else o += ch;
  }
  return o + '"';
}
function files(d, out = []) {
  for (const n of fs.readdirSync(d)) {
    if (n === 'node_modules' || n === '.git') continue;
    const f = path.join(d, n);
    if (fs.statSync(f).isDirectory()) files(f, out); else if (n.endsWith('.dhad')) out.push(f);
  }
  return out;
}
const pieces = ['دالة', 'ارجع', 'إذا', 'وإلا', 'طالما', 'من_أجل', 'من', 'إلى', 'متغير', 'صحيح', 'خطأ', 'لاشيء', 'و', 'أو', 'ليس', 'توقف', 'أكمل', 'اسم', 'x1', '_a', 'س٢', 'ص۳', 'نص_برمجي',
  '0', '12', '3.14', '٣٫١٤', '٠١٢', '۰۱۲', '١٢٣.٤', '٫٥', '1.2.3', '"', "'", '\\', '\\n', '\\t', '\\"', '\\x', '#', ' #', '\n', '\n', ' ', '\t', '\r', '  ',
  '(', ')', '{', '}', '[', ']', ',', '،', ';', ':', '+', '-', '*', '/', '%', '==', '!=', '<=', '>=', '&&', '||', '+=', '-=', '*=', '/=', '%=', '++', '--', '=', '<', '>', '!', '.',
  '؛', '؟', '٪', '٬', '۔', '@', '$', '~', '^', '&', '|', '?', '`', 'é', '😀', '‏', ' ', '«', '»', 'ء', 'ي', 'ۿ', 'ݐ'];
function soup() { let n = 1 + Math.floor(rnd() * 30), t = ''; while (n--) t += pick(pieces) + (rnd() < .5 ? ' ' : ''); return t; }
const cases = [];
for (const f of files(path.join(__dirname, '..'))) cases.push({ n: f, t: fs.readFileSync(f, 'utf8') });
for (let i = 0; i < N; i++) cases.push({ n: 'soup' + i, t: soup() });
cases.push({ n: 'فارغ', t: '' }, { n: 'اقتباس_أخير', t: '"abc\\' }, { n: 'شرطة_أخيرة', t: 'x\\' });
function ref(t) { try { return { ok: tokenize(t) }; } catch (e) { return { err: e.message }; } }
let pass = 0, fail = 0;
const B = 40;
for (let i = 0; i < cases.length; i += B) {
  const chunk = cases.slice(i, i + B);
  const src = 'متغير م = استورد("مرمز")\nمتغير ج = استورد("ضاد/جسون")\nمتغير ن = [' + chunk.map(c => dq(c.t)).join('،') + ']\nمتغير خ = []\nمن_أجل (س في ن) {\n حاول { أضف(خ، {"ok": م.رمّز(س)}) } التقط (ع) { أضف(خ، {"err": ع}) }\n}\nاطبع(ج.اكتب(خ، ٠))\n';
  const r = R.run(src, { files: { 'مرمز': MOD }, maxMs: 600000, maxSteps: 4e9 });
  if (!r.ok) { fail += chunk.length; console.log('تعطّل التشغيل:', r.error); continue; }
  let got; try { got = JSON.parse(r.out[0]); } catch (e) { fail += chunk.length; console.log('ناتج غير JSON', r.out[0].slice(0, 200)); continue; }
  chunk.forEach((c, k) => {
    const want = ref(c.t), g = got[k];
    const a = JSON.stringify(want), b = JSON.stringify(g);
    if (a === b) pass++; else { fail++; if (fail <= 5) console.log('اختلاف في', c.n, '\n  الأصل:', a.slice(0, 300), '\n  ضاد :', b.slice(0, 300)); }
  });
}
console.log(`pass ${pass} fail ${fail}`);
process.exit(fail ? 1 : 0);
