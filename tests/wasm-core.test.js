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
  // ---- جامع النفايات ----
  const gcSrc = `صدّر دالة حيّ(ن) {
    # قائمة مترابطة من ن عقدة [قيمة، تالي] مجذَّرة، مع نفايات كثيرة بينها
    متغير رأس = ٠
    ادفع_جذر(٠)
    من_أجل (ي من ١ إلى ن) {
        متغير عقدة = خصّص(٨)
        خزّن(عقدة، ي)
        خزّن(عقدة + ٤، رأس)
        رأس = عقدة
        خزّن(جذور - ٤، رأس)
        نص_جديد(٥٠)
        قائمة_جديدة()
    }
    متغير محرَّر = جمع_النفايات()
    متغير مجموع = ٠
    متغير ع = رأس
    طالما (ع != ٠) { مجموع = مجموع + حمّل(ع)\n ع = حمّل(ع + ٤) }
    ارجع مجموع * ١٠ + (محرَّر > ٠)
}
صدّر دالة إعادة() {
    متغير أ = خصّص(٣٢)
    ادفع_جذر(٠)
    متغير ب = خصّص(٣٢)
    خزّن(جذور - ٤، ب)
    جمع_النفايات()
    متغير ج = خصّص(٣٢)
    ارجع (ج == أ) * ١٠ + (ج != ب)
}
صدّر دالة دوّامة() {
    # ٢٠٠٠ دورة من البيانات المؤقتة الكبيرة مع جمع كل ٥٠ دورة وخريطة دائمة مجذَّرة
    متغير خ = خريطة_جديدة(٠)
    ادفع_جذر(خ)
    من_أجل (ي من ١ إلى ١٠٠) { خريطة_ضع(خ، ي، ي * ٢) }
    من_أجل (ي من ١ إلى ٢٠٠٠) {
        متغير ق = قائمة_جديدة()
        من_أجل (ك من ١ إلى ٢٠٠) { قائمة_أضف(ق، ك) }
        نص_جديد(١٠٠٠)
        إذا (ي % ٥٠ == ٠) { جمع_النفايات() }
    }
    متغير مجموع = ٠
    من_أجل (ي من ١ إلى ١٠٠) { مجموع = مجموع + خريطة_احصل(خ، ي، ٠) }
    ارجع مجموع * ١٠٠ + حجم_ذاكرة()
}`;
  { const n = 3000; m = await buildLib(gcSrc); check('جامع: بيانات حيّة سليمة', m.ex.حيّ(n), (n * (n + 1) / 2) * 10 + 1); }
  m = await buildLib(gcSrc); check('جامع: كتلة غير مجذَّرة تُعاد، والمجذَّرة تبقى', m.ex.إعادة(), 11);
  m = await buildLib(gcSrc); { const r = m.ex.دوّامة(); check('جامع: دوّامة (محتوى الخريطة سليم)', Math.floor(r / 100), 10100); check('جامع: الذاكرة محدودة', r % 100 <= 3, true); }
  // ---- أعداد f64 (صناديق في الذاكرة) ----
  m = await build(`صدّر دالة عشرية() {
    # ٠٫١ + ٠٫١ + ... (عشر مرات) وتمرير النتيجة بالمقارنة مع ١
    ف٦٤_ثابت(١٦، ١٠٦٩١٢٨٠٨٩، -١٧١٧٩٨٦٩١٨)
    ف٦٤_من_صحيح(٢٤، ٠)
    من_أجل (ي من ١ إلى ١٠) { ف٦٤_جمع(٢٤، ٢٤، ١٦) }
    ف٦٤_من_صحيح(٣٢، ١)
    ارجع ف٦٤_يساوي(٢٤، ٣٢) * ١٠ + ف٦٤_أكبر(٢٤، ٣٢)
}
صدّر دالة حسابات(أ، ب) {
    ف٦٤_من_صحيح(١٦، أ)
    ف٦٤_من_صحيح(٢٤، ب)
    ف٦٤_قسمة(٣٢، ١٦، ٢٤)
    ف٦٤_أرضية(٤٠، ٣٢)
    ف٦٤_سالب(٤٨، ٣٢)
    ف٦٤_قصّ(٥٦، ٤٨)
    ارجع ف٦٤_إلى_صحيح(٤٠) * ١٠٠٠ + ف٦٤_إلى_صحيح(٥٦) * ١٠ + ف٦٤_هل_صحيح(٣٢)
}
صدّر دالة جذر(ع) {
    ف٦٤_من_صحيح(١٦، ع)
    ف٦٤_جذر(٢٤، ١٦)
    ف٦٤_ضرب(٣٢، ٢٤، ٢٤)
    ارجع ف٦٤_إلى_صحيح(٣٢) + ف٦٤_أصغر_أو_يساوي(٢٤، ٢٤) * ١٠٠٠٠
}
صدّر دالة نان() {
    ف٦٤_من_صحيح(١٦، ٠)
    ف٦٤_قسمة(٢٤، ١٦، ١٦)
    ارجع ف٦٤_يساوي(٢٤، ٢٤) * ١٠ + ف٦٤_لا_يساوي(٢٤، ٢٤)
}`);
  check('f64: 0.1×10 ≠ 1 (دقة IEEE)', m.ex.عشرية(), (() => { let s = 0; for (let i = 0; i < 10; i++) s += 0.1; return (s === 1 ? 10 : 0) + (s > 1 ? 1 : 0); })());
  check('f64: قسمة وأرضية وقصّ وهل_صحيح', [m.ex.حسابات(7, 2), m.ex.حسابات(-7, 2), m.ex.حسابات(8, 2)], [[7, 2], [-7, 2], [8, 2]].map(([a, b]) => Math.floor(a / b) * 1000 + Math.trunc(-(a / b)) * 10 + (Number.isInteger(a / b) ? 1 : 0)));
  check('f64: جذر وضرب ومقارنة', [m.ex.جذر(144), m.ex.جذر(2)], [Math.trunc(Math.sqrt(144) * Math.sqrt(144)) + 10000, Math.trunc(Math.sqrt(2) * Math.sqrt(2)) + 10000]);
  check('f64: NaN لا يساوي نفسه ويخالفها', m.ex.نان(), (NaN === NaN ? 10 : 0) + (NaN !== NaN ? 1 : 0));
  // ---- أعداد: باقي القسمة والتحويل إلى نص ----
  const numLib = fs.readFileSync(path.join(dir, 'نواة-أعداد.dhad'), 'utf8');
  const buildNum = async src => { const bytes = Uint8Array.from(host.callFunctionExternally(compileWithLib, [lib + '\n' + numLib, src])); const { instance } = await WebAssembly.instantiate(bytes, { 'بيئة': { 'اطبع_رقم': () => {} } }); return instance.exports; };
  const nx = await buildNum(`صدّر دالة نص_عدد(منخفض، مرتفع) { ف٦٤_ثابت(١٢٨، مرتفع، منخفض)\n ارجع عدد_إلى_نص(١٢٨) }
صدّر دالة باقي(ملأ، مرتأ، ملب، مرتب) { ف٦٤_ثابت(١٣٦، مرتأ، ملأ)\n ف٦٤_ثابت(١٤٤، مرتب، ملب)\n ف٦٤_باقي(١٥٢، ١٣٦، ١٤٤)\n ارجع حمّل(١٥٢) }
صدّر دالة باقي_عالٍ() { ارجع حمّل(١٥٦) }
صدّر دالة حلّل(نص) { ارجع نص_إلى_عدد(نص، ١٦٠) }
صدّر دالة منخفض() { ارجع حمّل(١٦٠) }
صدّر دالة مرتفع() { ارجع حمّل(١٦٤) }
صدّر دالة أنشئ_نصًا(ن) { ارجع نص_جديد(ن) }`);
  const dv = new DataView(new ArrayBuffer(8));
  const parts = x => { dv.setFloat64(0, x, true); return [dv.getInt32(0, true), dv.getInt32(4, true)]; };
  const readStr = p => { const mem = new Uint8Array(nx.ذاكرة.buffer); const n = new Int32Array(nx.ذاكرة.buffer)[p / 4]; return Buffer.from(mem.slice(p + 4, p + 4 + n)).toString(); };
  const str = x => readStr(nx.نص_عدد(...parts(x)));
  const sample = [0, 1, -1, 0.1, 0.2, 0.3, 0.1 + 0.2, 1 / 3, 2 / 3, 123.456, -123.456, 1e21, 1e-7, 123456789012345680000, 1e300, 5e-324, 1.7976931348623157e308, 2 ** 53, 2 ** 52, 2 ** 60, 0.000001, 0.0000001, 100, 1234567.891, NaN, Infinity, -Infinity, 4.35, 0.5, 2.5, 1e22, 9007199254740993, 4.9e-324, 2.2250738585072014e-308, 1.2345678901234567e-5, 15, 1e15, 1e16, 1e20, 123e-20];
  let bad = [];
  for (const x of sample) { const got = str(x), want = String(x); if (got !== want) bad.push([x, got, want]); }
  check('عدد→نص: عيّنات حدّية', bad.slice(0, 5), []);
  { let s = 1234567, rnd = () => (s = (Math.imul(s, 1103515245) + 12345) >>> 0) / 4294967296; const badr = []; const bits = new DataView(new ArrayBuffer(8));
    for (let i = 0; i < 1500; i++) { bits.setUint32(0, Math.floor(rnd() * 4294967296)); bits.setUint32(4, Math.floor(rnd() * 4294967296)); const x = bits.getFloat64(0); if (!Number.isFinite(x)) continue; const got = str(x), want = String(x); if (got !== want) badr.push([x, got, want]); }
    for (let i = 0; i < 1500; i++) { const x = (rnd() - 0.5) * Math.pow(10, Math.floor(rnd() * 30 - 12)); const got = str(x), want = String(x); if (got !== want) badr.push([x, got, want]); }
    check('عدد→نص: ٣٠٠٠ عدد عشوائي مقابل String', badr.slice(0, 5), []); }
  {
    const rem = (a, b) => { const [al, ah] = parts(a), [bl, bh] = parts(b); const lo = nx.باقي(al, ah, bl, bh), hi = nx.باقي_عالٍ(); dv.setInt32(0, lo, true); dv.setInt32(4, hi, true); return dv.getFloat64(0, true); };
    const pairs = [[7, 2], [-7, 2], [7, -2], [5.5, 2], [0.3, 0.1], [1e300, 3], [1e-300, 7e-5], [10, 0], [NaN, 2], [Infinity, 2], [5, Infinity], [-0, 5], [0, 5], [2 ** 60 + 12345, 10], [123456.789, 0.001], [1, 1e-300], [5e-324, 3], [-9.5, 4]];
    let s = 99, rnd = () => (s = (Math.imul(s, 1103515245) + 12345) >>> 0) / 4294967296;
    for (let i = 0; i < 800; i++) pairs.push([(rnd() - 0.5) * Math.pow(10, Math.floor(rnd() * 40 - 15)), (rnd() - 0.5) * Math.pow(10, Math.floor(rnd() * 30 - 12))]);
    const badm = []; for (const [a, b] of pairs) { const g = rem(a, b), w = a % b; if (!(Object.is(g, w) || (Number.isNaN(g) && Number.isNaN(w)))) badm.push([a, b, g, w]); }
    check('f64: باقي القسمة مطابق لـ % في JS (٨١٨ زوجًا)', badm.slice(0, 5), []); }
  { const parse = s => { const b = Buffer.from(s); const p = nx.أنشئ_نصًا(b.length); new Uint8Array(nx.ذاكرة.buffer).set(b, p + 4); const ok = nx.حلّل(p); if (!ok) return 'فشل'; dv.setInt32(0, nx.منخفض(), true); dv.setInt32(4, nx.مرتفع(), true); return dv.getFloat64(0, true); };
    const same = (a, b) => (typeof a === 'number' && (Object.is(a, b) || (Number.isNaN(a) && Number.isNaN(b))));
    const strs = ['0', '-0', '1', '0.1', '0.2', '0.30000000000000004', '123.456', '1e21', '1e22', '1e23', '5e-324', '2.4703282292062327e-324', '2.4703282292062328e-324', '1e-400', '1e400', '1.7976931348623157e308', '1.7976931348623159e308', '9007199254740993', '9007199254740992', '9007199254740995', '4.35', '0.000001', '1234567890123456789012345678901234567890', '.5', '5.', '1E5', '-1.5e-7', 'Infinity', '-Infinity', '2.2250738585072011e-308', '2.2250738585072014e-308', '0.0000000000000000000000000000000000001', '00012.5000', '1e+5', '123456789012345678901234567890e-10'];
    const badp = []; for (const x of strs) { const g = parse(x), w = Number(x); if (!same(g, w)) badp.push([x, g, w]); }
    check('نص→عدد: عيّنات حدّية', badp.slice(0, 5), []);
    let s = 4242, rnd = () => (s = (Math.imul(s, 1103515245) + 12345) >>> 0) / 4294967296; const badr = []; const bits = new DataView(new ArrayBuffer(8));
    for (let i = 0; i < 1500; i++) { bits.setUint32(0, Math.floor(rnd() * 4294967296)); bits.setUint32(4, Math.floor(rnd() * 4294967296)); const x = bits.getFloat64(0); if (!Number.isFinite(x)) continue; const sx = String(x); const g = parse(sx); if (!same(g, x)) badr.push([sx, g, x]); }
    for (let i = 0; i < 1500; i++) { let d = ''; const nd = 1 + Math.floor(rnd() * 25); for (let k = 0; k < nd; k++) d += Math.floor(rnd() * 10); const sx = d + (rnd() < 0.5 ? '.' + Math.floor(rnd() * 1e9) : '') + 'e' + Math.floor(rnd() * 700 - 350); const g = parse(sx), w = Number(sx); if (!same(g, w)) badr.push([sx, g, w]); }
    check('نص→عدد: ٣٠٠٠ نص عشوائي مقابل Number (إرجاع دائري وأسس واسعة)', badr.slice(0, 5), []);
    check('نص→عدد: نصوص غير صالحة تفشل', ['', 'abc', '1e', '1.2.3', '--1', 'e5'].map(parse), ['فشل', 'فشل', 'فشل', 'فشل', 'فشل', 'فشل']); }
  // خطأ مصدر
  let err = ''; try { host.callFunctionExternally(compileWasm, ['دالة ف() { ارجع س }']); } catch (e) { err = e.message; }
  check('خطأ متغير غير معرّف', /غير معرّف/.test(err), true);
  console.log(`pass ${pass} fail ${fail}`);
  process.exit(fail ? 1 : 0);
})();
