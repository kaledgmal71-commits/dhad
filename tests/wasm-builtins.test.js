// بند ١٠-٣: المدمجات الحسابية (// ** والبتّيات والإزاحات) في الوضع الديناميكي مقابل آلة ضاد الأصلية على حالات عشوائية وحدّية.
const fs = require('fs'), path = require('path');
const R = require('../site/run.js'); const api = R.api;
const dir = path.join(__dirname, '../selfhost');
const files = {};
for (const n of ['مرمز', 'محلل', 'نطاقات', 'وازم']) files[n + '.dhad'] = fs.readFileSync(path.join(dir, n + '.dhad'), 'utf8');
const host = new api.VM({ maxSteps: 1e15, maxMs: 1e12, onPrint: () => {}, readModule: p => (files[p] !== undefined ? files[p] : null) });
const boot = api.compile(api.parse('استورد("وازم")')); host.run(boot.mainChunkIndex, boot.functionChunks);
const compileDyn = host.modules.get('وازم.dhad').exports.get('صرّف_ديناميكي_مع');
const lib = ['نواة-تشغيل', 'نواة-أعداد', 'نواة-قيم', 'نواة-مدمجات'].map(n => fs.readFileSync(path.join(dir, n + '.dhad'), 'utf8')).join('\n');
async function runWasm(src) {
  const bytes = Uint8Array.from(host.callFunctionExternally(compileDyn, [lib, src]));
  const printed = [];
  const { instance } = await WebAssembly.instantiate(bytes, { 'بيئة': { 'اطبع_رقم': n => printed.push(n) } });
  if (instance.exports.__تهيئة) instance.exports.__تهيئة();
  instance.exports.رئيسي();
  return { printed, ex: instance.exports };
}
let pass = 0, fail = 0;
const check = (n, g, w) => { if (JSON.stringify(g) === JSON.stringify(w)) pass++; else { fail++; console.log('اختلاف:', n, 'الناتج', g, 'المتوقع', w); } };
const ref = expr => { try { const c = api.compile(api.parse('اطبع(نص_برمجي(' + expr + '))')); let o = ''; const vm = new api.VM({ maxSteps: 1e6, maxMs: 2000, onPrint: l => { o = String(l); } }); vm.run(c.mainChunkIndex, c.functionChunks); return o; } catch (e) { return null; } };
let s = 12345; const rnd = () => (s = (s * 1664525 + 1013904223) >>> 0) / 4294967296;
const pick = a => a[Math.floor(rnd() * a.length)];
const interesting = [0, 1, -1, 2, -2, 3, 7, 10, 255, 256, 1023, 65535, 65536, 1073741823, 1073741824, -1073741824, -1073741825, 4294967295, 4294967296, 9007199254740991, -9007199254740991, 123456789012, -987654321098, 67108863, 67108864, -67108865];
const num = () => (rnd() < 0.5 ? pick(interesting) : Math.floor((rnd() - 0.5) * Math.pow(2, 1 + Math.floor(rnd() * 52))));
const lit = n => (n < 0 ? '(-' + (-n) + ')' : String(n));
const cases = [];
const add = (expr) => cases.push(expr);
for (let i = 0; i < 70; i++) { const a = num(), b = num(); for (const op of ['&', '|', '^']) add(`${lit(a)} ${op} ${lit(b)}`); add(`~${lit(a)}`); }
for (let i = 0; i < 40; i++) { const a = num(); let b = pick([0, 1, 2, 3, 5, 13, 26, 27, 31, 32, 33, 52, 53, 54, 62, 63, 64, 100, 1100, 1101]); add(`${lit(a)} << ${b}`); add(`${lit(a)} >> ${b}`); }
add('1 << (-1)'); add('1 >> (-1)'); add('1.5 & 1'); add('1 << 0.5');
for (let i = 0; i < 50; i++) { const a = pick([0, 1, -1, 2, -2, 3, -3, 5, 7, -7, 10, 12, 100, 255, 1000]), b = Math.floor(rnd() * 45); add(`${lit(a)} ** ${b}`); }
add('2 ** 52'); add('2 ** 53'); add('3 ** 33'); add('3 ** 34'); add('(-2) ** 53'); add('0 ** 0'); add('0 ** 5'); add('1 ** 100000000'); add('(-1) ** 100000001');
for (let i = 0; i < 50; i++) { const a = num(), b = pick([1, -1, 2, -2, 3, 7, -7, 10, 1000, 4294967296, num() || 1]); add(`${lit(a)} // ${lit(b)}`); }
for (let i = 0; i < 40; i++) { const a = pick([65536, 540032, 2, 1024, 3, -7, 1073741823, 4294967296, num()]), b = pick([65536, 67108864, 1024, 2147483648, -1, 0, 5, num()]); add(`${lit(a)} * ${lit(b)}`); }
add('65536 * 65536'); add('540032 * 67108864'); add('(-65536) * 65536'); add('0 * (-5)');
add('7 // 0'); add('(-7) // 2'); add('7 // (-2)'); add('(-7) // (-2)'); add('7.5 // 2'); add('5 // 0.5');
const toWasm = [], designedError = [];
const chunk = 12;
cases.forEach((e) => { const r = ref(e); toWasm.push({ e, r }); });
const fns = { length: Math.ceil(cases.length / chunk) };
(async () => {
  let ok = 0, mism = [];
  for (let c = 0; c < fns.length; c++) {
    const lo = c * chunk, hi = Math.min(cases.length, lo + chunk);
    const src = 'دالة ف() {\n' + toWasm.slice(lo, hi).map(({ e, r }) => `  حاول { إذا ((${e}) == ${r === null ? 'لاشيء' : (r.startsWith('-') ? '(' + r + ')' : r)}) { اطبع(١) } وإلا { اطبع(٠) } } التقط (خ) { اطبع(٢) }`).join('\n') + '\n}\nصدّر دالة رئيسي() { ف() }';
    let got;
    try { got = (await runWasm(src)).printed.map(Number); } catch (e) { got = 'wasm: ' + e.message.slice(0, 160); }
    for (let k = lo; k < hi; k++) {
      const { e, r } = toWasm[k];
      const g = Array.isArray(got) ? got[k - lo] : got;
      // المرجع يُخطئ ← المتوقع خطأ (٢)؛ المرجع ينجح ← المتوقع تطابق (١)، أو خطأ صريح (٢) فقط في الحالات المصمَّمة غير المدعومة بعد (أسّ كسري/سالب أو ناتج خارج المدى المضمون)
      if (r === null) check(e + ' (خطأ مرجعي)', g, 2);
      else if (g === 1) pass++;
      else if (g === 2 && /\*\*/.test(e) && Math.abs(Number(r)) > 9007199254740991) designedError.push(e);
      else { fail++; mism.push(e); console.log('اختلاف:', e, 'المرجع', r, 'wasm', g); }
    }
  }
  console.log('أسّ مرفوض عمدًا (خارج المضمون):', designedError.length, designedError.slice(0, 5).join(' ; '));
  console.log(`pass ${pass} fail ${fail}`);
  process.exit(fail ? 1 : 0);
})();
