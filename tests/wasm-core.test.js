// ضاد-نواة → WebAssembly (selfhost/وازم.dhad): نصرّف برامج صغيرة بمصرِّف مكتوب بضاد ثم ننفّذ الـwasm الناتج
// ونقارنه بالآلة الأصلية وبمراجع JS.
const fs = require('fs'), path = require('path');
const R = require('../site/run.js'); const api = R.api;
const dir = path.join(__dirname, '../selfhost');
const files = {};
for (const n of ['مرمز', 'محلل', 'وازم']) files[n + '.dhad'] = fs.readFileSync(path.join(dir, n + '.dhad'), 'utf8');
const host = new api.VM({ maxSteps: 1e15, maxMs: 1e12, onPrint: () => {}, readModule: p => (files[p] !== undefined ? files[p] : null) });
const boot = api.compile(api.parse('استورد("وازم")'));
host.run(boot.mainChunkIndex, boot.functionChunks);
const compileWasm = host.modules.get('وازم.dhad').exports.get('صرّف_نواة');
const compileWithLib = host.modules.get('وازم.dhad').exports.get('صرّف_نواة_مع');

async function build(src) {
  const bytes = Uint8Array.from(host.callFunctionExternally(compileWasm, [src]));
  const printed = [];
  const { instance } = await WebAssembly.instantiate(bytes, { 'بيئة': { 'اطبع_رقم': n => printed.push(n) } });
  return { ex: instance.exports, printed, bytes };
}
let pass = 0, fail = 0;
const check = (name, got, want) => { if (JSON.stringify(got) === JSON.stringify(want)) pass++; else { fail++; console.log('اختلاف:', name, 'الناتج', got, 'المتوقع', want); } };
const fib = n => n < 2 ? n : fib(n - 1) + fib(n - 2);
const gcd = (a, b) => b === 0 ? a : gcd(b, a % b);
(async () => {
  let m = await build('صدّر دالة fib(ن) { إذا (ن < ٢) { ارجع ن }\n ارجع fib(ن - ١) + fib(ن - ٢) }');
  check('fib', [0,1,2,10,20].map(m.ex.fib), [0,1,2,10,20].map(fib));
  m = await build('صدّر دالة gcd(أ، ب) { إذا (ب == ٠) { ارجع أ }\n ارجع gcd(ب، أ % ب) }');
  check('gcd', [m.ex.gcd(48, 18), m.ex.gcd(17, 5), m.ex.gcd(100, 75)], [gcd(48,18), gcd(17,5), gcd(100,75)]);
  m = await build('صدّر دالة مجموع(ن) { متغير س = ٠\n من_أجل (ي من ١ إلى ن) { س = س + ي }\n ارجع س }');
  check('مجموع', [m.ex.مجموع(10), m.ex.مجموع(100)], [55, 5050]);
  m = await build('صدّر دالة ف(ن) { متغير س = ٠\n متغير ي = ٠\n طالما (ي < ن) { ي = ي + ١\n إذا (ي % ٢ == ٠) { أكمل }\n إذا (ي > ٦٠) { توقف }\n س = س + ي }\n ارجع س }');
  { let s = 0; for (let i = 1; i <= 100; i++) { if (i % 2 === 0) continue; if (i > 60) break; s += i; } check('توقف/أكمل', m.ex.ف(100), s); }
  m = await build('صدّر دالة ف(أ، ب) { إذا (أ > ٠ و ب > ٠) { ارجع ١ }\n إذا (أ > ٠ أو ب > ٠) { ارجع ٢ }\n ارجع ٣ }');
  check('و/أو', [m.ex.ف(1,1), m.ex.ف(1,0), m.ex.ف(0,0)], [1,2,3]);
  m = await build('صدّر دالة ف(س) { ارجع -س }\nصدّر دالة ز(س) { ارجع ليس س }');
  check('سالب/ليس', [m.ex.ف(5), m.ex.ف(-7), m.ex.ز(0), m.ex.ز(3)], [-5, 7, 1, 0]);
  m = await build('صدّر دالة ف() { خزّن(٨، ١٢٣٤)\n خزّن_بايت(١٦، ٢٦٠)\n ارجع حمّل(٨) + حمّل_بايت(١٦) }');
  check('ذاكرة', m.ex.ف(), 1234 + 4);
  m = await build('صدّر دالة ف(س) { ارجع بتّ_و(س، ٢٥٥) + بتّ_أو(١، ٢) + بتّ_خاص(٥، ١) + يسار(١، ٤) + يمين(-١٦، ٢) + يمين_موجب(-١، ٢٨) }');
  check('بتّات', m.ex.ف(0x1ff), (0x1ff & 255) + (1|2) + (5^1) + (1<<4) + (-16>>2) + (-1>>>28));
  m = await build('صدّر دالة ف() { من_أجل (ي من ٣ إلى ١ بخطوة -١) { اطبع_رقم(ي) }\n ارجع ٠ }');
  m.ex.ف(); check('خطوة سالبة', m.printed, [3, 2, 1]);
  m = await build('صدّر دالة ف(أ، ب) { ارجع أ / ب }');
  let trapped = false; try { m.ex.ف(1, 0); } catch (e) { trapped = true; }
  check('قسمة على صفر', trapped, true);
  m = await build('صدّر دالة غرب(ن) { من_أجل (ي من ٠ إلى ن) { خزّن_بايت(ي، ١) }\n خزّن_بايت(٠، ٠)\n خزّن_بايت(١، ٠)\n من_أجل (ي من ٢ إلى ن) { إذا (حمّل_بايت(ي) == ١) { متغير ك = ي * ي\n طالما (ك <= ن) { خزّن_بايت(ك، ٠)\n ك = ك + ي } } }\n متغير ع = ٠\n من_أجل (ي من ٠ إلى ن) { ع = ع + حمّل_بايت(ي) }\n ارجع ع }');
  check('غربال', m.ex.غرب(1000), 168);
  m = await build('متغير عدّاد = ٠\nمتغير قمة = ١٠٢٤\nمتغير سالب = -٥\nصدّر دالة زد() { عدّاد = عدّاد + ١\n ارجع عدّاد }\nصدّر دالة س() { ارجع سالب }');
  check('عامة', [m.ex.زد(), m.ex.زد(), m.ex.زد(), m.ex.س()], [1, 2, 3, -5]);
  // مخصِّص ذاكرة (كومة بسيطة مع قائمة حرة بأحجام مضبوطة) مكتوب بضاد-نواة
  m = await build(`متغير قمة = ١٠٢٤
متغير حرة = ٠
دالة خصّص(ن) {
    ن = بتّ_و(ن + ٧، -٨)
    متغير ص = حرة
    متغير سابق = ٠
    طالما (ص != ٠) {
        إذا (حمّل(ص) == ن) {
            إذا (سابق == ٠) { حرة = حمّل(ص + ٤) } وإلا { خزّن(سابق + ٤، حمّل(ص + ٤)) }
            ارجع ص + ٨
        }
        سابق = ص
        ص = حمّل(ص + ٤)
    }
    ص = قمة
    قمة = قمة + ن + ٨
    خزّن(ص، ن)
    ارجع ص + ٨
}
دالة حرّر(م) {
    متغير ك = م - ٨
    خزّن(ك + ٤، حرة)
    حرة = ك
}
صدّر دالة اختبر() {
    متغير أ = خصّص(١٣)
    متغير ب = خصّص(١٣)
    خزّن(أ، ٧)
    خزّن(ب، ٩)
    حرّر(أ)
    متغير ج = خصّص(١٠)
    إذا (ج != أ) { ارجع -١ }
    إذا (حمّل(ب) != ٩) { ارجع -٢ }
    إذا (بتّ_و(ب، ٧) != ٠) { ارجع -٣ }
    متغير د = خصّص(١٠٠)
    إذا (د <= ب) { ارجع -٤ }
    ارجع ١
}`);
  check('مخصِّص', m.ex.اختبر(), 1);
  // ---- مكتبة التشغيل (selfhost/نواة-تشغيل.dhad): نصوص وقوائم وخرائط فوق المخصِّص ----
  const lib = fs.readFileSync(path.join(dir, 'نواة-تشغيل.dhad'), 'utf8');
  const buildLib = async src => { const bytes = Uint8Array.from(host.callFunctionExternally(compileWithLib, [lib, src])); const printed = []; const { instance } = await WebAssembly.instantiate(bytes, { 'بيئة': { 'اطبع_رقم': n => printed.push(n) } }); return { ex: instance.exports, printed }; };
  const libSrc = `صدّر دالة قوائم(ن) { متغير ق = قائمة_جديدة()
    من_أجل (ي من ١ إلى ن) { قائمة_أضف(ق، ي * ٣) }
    متغير م = ٠
    من_أجل (ي من ٠ إلى قائمة_طول(ق) - ١) { م = م + قائمة_احصل(ق، ي) }
    ارجع م + قائمة_انزع(ق) }
صدّر دالة نصوص() { متغير أ = نص_من_عدد(-١٢٣٤)
    متغير ب = نص_دمج(أ، نص_من_عدد(٠))
    اطبع_رقم(نص_طول(ب))
    اطبع_رقم(نص_بايت(ب، ٠))
    اطبع_رقم(نص_يساوي(ب، نص_دمج(نص_من_عدد(-١٢٣٤)، نص_من_عدد(٠))))
    اطبع_رقم(نص_يساوي(أ، ب))
    ارجع نص_تجزئة(أ) }
صدّر دالة عشري(ع) { متغير ن = نص_من_عدد(ع)
    متغير ر = ٠
    من_أجل (ي من ٠ إلى نص_طول(ن) - 1) { ر = ر * ٣١ + نص_بايت(ن، ي) }
    ارجع ر }
صدّر دالة خرائط_عددية(ن) { متغير م = خريطة_جديدة(٠)
    من_أجل (ي من ١ إلى ن) { خريطة_ضع(م، ي * ١٧، ي) }
    من_أجل (ي من ١ إلى ن) { إذا (ي % ٣ == ٠) { خريطة_احذف(م، ي * ١٧) } }
    من_أجل (ي من ١ إلى ن) { خريطة_ضع(م، ي * ١٧ + ١، -ي) }
    متغير مجموع = خريطة_عدد(م)
    من_أجل (ي من ١ إلى ن) { مجموع = مجموع + خريطة_احصل(م، ي * ١٧، ٠) + خريطة_احصل(م، ي * ١٧ + ١، ٠) + خريطة_يحوي(م، ي * ١٧ + ٢) }
    ارجع مجموع }
صدّر دالة خرائط_نصية(ن) { متغير م = خريطة_جديدة(١)
    من_أجل (ي من ١ إلى ن) { خريطة_ضع(م، نص_من_عدد(ي)، ي * ٢) }
    متغير مجموع = ٠
    من_أجل (ي من ١ إلى ن) { مجموع = مجموع + خريطة_احصل(م، نص_من_عدد(ي)، -١) }
    ارجع مجموع + خريطة_عدد(م) * ١٠٠٠٠٠٠ + خريطة_احصل(م، نص_من_عدد(ن + ١)، ٧) }
صدّر دالة ضغط() { متغير مجموع = ٠
    من_أجل (ي من ١ إلى ٢٠٠٠) { متغير ق = قائمة_جديدة()
        من_أجل (ك من ١ إلى ١٠٠) { قائمة_أضف(ق، ك) }
        مجموع = مجموع + قائمة_احصل(ق، ٩٩)
        حرّر(حمّل(ق + ٨))
        حرّر(ق) }
    ارجع حجم_ذاكرة() }`;
  m = await buildLib(libSrc);
  check('قوائم', m.ex.قوائم(10000), (() => { let s = 0; for (let i = 1; i <= 10000; i++) s += i * 3; return s + 30000; })());
  { const r = m.ex.نصوص(); const fnv = s => { let h = 2166136261 | 0; for (const c of Buffer.from(s)) { h = Math.imul(h ^ c, 16777619); } return h; };
    check('نصوص', [m.printed, r], [[6, 45, 1, 0], fnv('-1234')]); }
  { const j = n => { const s = String(n); let r = 0; for (const c of Buffer.from(s)) r = (Math.imul(r, 31) + c) | 0; return r; };
    check('نص من عدد', [0, 7, -7, 2147483647, -2147483648, 100, 1000000].map(m.ex.عشري), [0, 7, -7, 2147483647, -2147483648, 100, 1000000].map(j)); }
  { const N = 3000; let cnt = 0, tot = 0; const mp = new Map(); for (let i = 1; i <= N; i++) mp.set(i * 17, i); for (let i = 1; i <= N; i++) if (i % 3 === 0) mp.delete(i * 17); for (let i = 1; i <= N; i++) mp.set(i * 17 + 1, -i); tot = mp.size; for (let i = 1; i <= N; i++) { tot += (mp.get(i * 17) ?? 0) + (mp.get(i * 17 + 1) ?? 0) + (mp.has(i * 17 + 2) ? 1 : 0); }
    check('خرائط عددية (نمو وحذف)', m.ex.خرائط_عددية(N), tot); }
  { const N = 2000; check('خرائط نصية', m.ex.خرائط_نصية(N), (N * (N + 1)) + N * 1000000 + 7); }
  { const m2 = await buildLib(libSrc); const pages = m2.ex.ضغط(); check('إعادة استعمال الذاكرة (لا تسرّب)', pages <= 2, true); }
  // خطأ مصدر
  let err = ''; try { host.callFunctionExternally(compileWasm, ['دالة ف() { ارجع س }']); } catch (e) { err = e.message; }
  check('خطأ متغير غير معرّف', /غير معرّف/.test(err), true);
  console.log(`pass ${pass} fail ${fail}`);
  process.exit(fail ? 1 : 0);
})();
