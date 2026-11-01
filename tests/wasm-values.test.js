// طبقة القيم الموسومة (selfhost/نواة-قيم.dhad) فوق ضاد-نواة: حساب وتوحيد ونصوص وقوائم وخرائط مرتبة وجامع نفايات،
// مقارنةً بمراجع JS (Number وMap) على عيّنات حدّية وعشوائية.
const fs = require('fs'), path = require('path');
const R = require('../site/run.js'); const api = R.api;
const dir = path.join(__dirname, '../selfhost');
const files = {};
for (const n of ['مرمز', 'محلل', 'وازم']) files[n + '.dhad'] = fs.readFileSync(path.join(dir, n + '.dhad'), 'utf8');
const host = new api.VM({ maxSteps: 1e15, maxMs: 1e12, onPrint: () => {}, readModule: p => (files[p] !== undefined ? files[p] : null) });
const boot = api.compile(api.parse('استورد("وازم")')); host.run(boot.mainChunkIndex, boot.functionChunks);
const compileWithLib = host.modules.get('وازم.dhad').exports.get('صرّف_نواة_مع');
const lib = ['نواة-تشغيل', 'نواة-أعداد', 'نواة-قيم'].map(n => fs.readFileSync(path.join(dir, n + '.dhad'), 'utf8')).join('\n');
let pass = 0, fail = 0;
const check = (name, got, want) => { if (JSON.stringify(got) === JSON.stringify(want)) pass++; else { fail++; console.log('اختلاف:', name, 'الناتج', got, 'المتوقع', want); } };
const SRC = `
متغير نوع_ناتج = ٠
متغير ناتج_ل = ٠
متغير ناتج_ح = ٠
متغير خ = ٠
دالة _سجّل(ق) {
    إذا (بتّ_و(ق، ١) == ١) { نوع_ناتج = ٠
        ف٦٤_من_صحيح(٣٠٠، يمين(ق، ١)) } وإلا { نوع_ناتج = ١
        ف٦٤_نسخ(٣٠٠، ق + ٨) }
    ناتج_ل = حمّل(٣٠٠)
    ناتج_ح = حمّل(٣٠٤)
    ارجع ٠
}
صدّر دالة ثنائي(رمز، أل، أح، بل، بح) {
    متغير أ = ق_من_بتّات(أل، أح)
    متغير ب = ق_من_بتّات(بل، بح)
    متغير ر = ٠
    إذا (رمز == ١) { ر = ق_جمع(أ، ب) }
    إذا (رمز == ٢) { ر = ق_طرح(أ، ب) }
    إذا (رمز == ٣) { ر = ق_ضرب(أ، ب) }
    إذا (رمز == ٤) { ر = ق_قسمة(أ، ب) }
    إذا (رمز == ٥) { ر = ق_باقي(أ، ب) }
    إذا (رمز == ٦) { ر = ق_صغير(ق_أصغر(أ، ب)) }
    إذا (رمز == ٧) { ر = ق_صغير(ق_أصغر_أو_يساوي(أ، ب)) }
    إذا (رمز == ٨) { ر = ق_صغير(ق_يساوي(أ، ب)) }
    إذا (رمز == ٩) { ر = ق_سالب(أ) }
    إذا (رمز == ١٠) { ر = ق_صغير(ق_صدق(أ)) }
    _سجّل(ر)
    ارجع نوع_ناتج
}
صدّر دالة ناتج_ل_() { ارجع ناتج_ل }
صدّر دالة ناتج_ح_() { ارجع ناتج_ح }
# نص ← عدد ← نص
صدّر دالة دوران(ل، ح) {
    متغير أ = ق_من_بتّات(ل، ح)
    متغير ن = ق_إلى_نص(أ)
    متغير ب = ق_من_نص(ن)
    _سجّل(ب)
    ارجع ق_نص_طول(ن)
}
صدّر دالة نص_جديد_(ن) { متغير ص = ق_نص_جديد(ن)
    ارجع ص }
صدّر دالة نصوص() {
    متغير أ = ق_إلى_نص(ق_صغير(-١٢٣))
    متغير ب = ق_إلى_نص(ق_صغير(٤٥٠))
    متغير ج = ق_نص_دمج(أ، ب)
    اطبع_رقم(ق_نص_طول(ج))
    من_أجل (ي من ٠ إلى ق_نص_طول(ج) - ١) { اطبع_رقم(ق_نص_بايت(ج، ي)) }
    اطبع_رقم(ق_يساوي(ج، ق_نص_دمج(ق_إلى_نص(ق_صغير(-١٢٣))، ق_إلى_نص(ق_صغير(٤٥٠)))))
    اطبع_رقم(ق_يساوي(ج، أ))
    اطبع_رقم(ق_نص_بايت(ق_نص_جزء(ج، ٣، ٥)، ٠))
    ارجع ٠
}
صدّر دالة خريطة_جديدة_() { خ = ق_خريطة_جديدة()
    ارجع ٠ }
دالة _مفتاح(نوع، ل، ح) {
    إذا (نوع == ٠) { ارجع ق_من_بتّات(ل، ح) }
    ارجع ق_إلى_نص(ق_صغير(ل))
}
صدّر دالة خ_ضع(نوع، ل، ح، قيمة) { ق_خريطة_ضع(خ، _مفتاح(نوع، ل، ح)، ق_صغير(قيمة))
    ارجع ق_خريطة_عدد(خ) }
صدّر دالة خ_احصل(نوع، ل، ح) { ارجع ق_خريطة_احصل(خ، _مفتاح(نوع، ل، ح)، ق_صغير(-١)) }
صدّر دالة خ_احذف(نوع، ل، ح) { ارجع ق_خريطة_احذف(خ، _مفتاح(نوع، ل، ح)) }
صدّر دالة خ_يحوي(نوع، ل، ح) { ارجع ق_خريطة_يحوي(خ، _مفتاح(نوع، ل، ح)) }
صدّر دالة خ_عدد() { ارجع ق_خريطة_عدد(خ) }
# قيم الخريطة بالترتيب (القيم أعداد صغيرة)، مع -٩٩٩ إن صادفنا ثقبًا فهي لا تظهر
صدّر دالة خ_ترتيب_قيم() {
    متغير ن = ٠
    من_أجل (ي من ٠ إلى ق_خريطة_مواضع(خ) - ١) {
        إذا (ق_خريطة_مفتاح_في(خ، ي) != ٦) { اطبع_رقم(يمين(ق_خريطة_قيمة_في(خ، ي)، ١))
            ن = ن + ١ }
    }
    ارجع ن
}
صدّر دالة خ_نظّف() {
    ادفع_جذر(خ)
    متغير م = جمع_النفايات()
    ارجع م
}
صدّر دالة قائمة_اختبار(ن) {
    متغير ق = ق_قائمة_جديدة()
    ادفع_جذر(ق)
    من_أجل (ي من ١ إلى ن) { ق_قائمة_أضف(ق، ق_صغير(ي * ٣)) }
    متغير م = ٠
    من_أجل (ي من ٠ إلى ق_قائمة_طول(ق) - ١) { م = م + يمين(ق_قائمة_احصل(ق، ي)، ١) }
    ارجع م + يمين(ق_قائمة_انزع(ق)، ١)
}
صدّر دالة نوع_من(ن) {
    إذا (ن == ٠) { ارجع ق_نوع(٠) }
    إذا (ن == ١) { ارجع ق_نوع(ق_صغير(٥)) }
    إذا (ن == ٢) { ارجع ق_نوع(٤) }
    إذا (ن == ٣) { ارجع ق_نوع(ق_من_بتّات(٠، ١٠٧٢٦٩٣٢٤٨)) }
    إذا (ن == ٤) { ارجع ق_نوع(ق_نص_جديد(٢)) }
    إذا (ن == ٥) { ارجع ق_نوع(ق_قائمة_جديدة()) }
    ارجع ق_نوع(ق_خريطة_جديدة())
}
`;
(async () => {
  const bytes = Uint8Array.from(host.callFunctionExternally(compileWithLib, [lib, SRC]));
  const printed = [];
  const { instance } = await WebAssembly.instantiate(bytes, { 'بيئة': { 'اطبع_رقم': n => printed.push(n) } });
  const ex = instance.exports;
  const dv = new DataView(new ArrayBuffer(8));
  const parts = x => { dv.setFloat64(0, x, true); return [dv.getInt32(0, true), dv.getInt32(4, true)]; };
  const SMALL = 2 ** 30;
  const resultNum = () => { const k = ex.ناتج_ل_(), h = ex.ناتج_ح_(); dv.setInt32(0, k, true); dv.setInt32(4, h, true); return dv.getFloat64(0, true); };
  const op = (code, a, b) => { const [al, ah] = parts(a), [bl, bh] = parts(b); const kind = ex.ثنائي(code, al, ah, bl, bh); return { kind, v: resultNum() }; };
  const same = (g, w) => Object.is(g, w) || (Number.isNaN(g) && Number.isNaN(w));
  const canon = (x, kind) => { // التوحيد: صغير فقط إذا صحيح في المدى وليس -٠
    const should = Number.isInteger(x) && x >= -SMALL && x < SMALL && !Object.is(x, -0); return should ? kind === 0 : kind === 1; };
  const nums = [0, -0, 1, -1, 2, 3, 7, -7, 0.5, -0.5, 0.1, 0.2, 1e9, -1e9, 2 ** 30 - 1, 2 ** 30, -(2 ** 30), 2 ** 30 + 1, 2 ** 31, 2 ** 53, 1e300, -1e300, 5e-324, NaN, Infinity, -Infinity, 46340, 46341, 65536, 1 << 15, 123456.789];
  let s = 777, rnd = () => (s = (Math.imul(s, 1103515245) + 12345) >>> 0) / 4294967296;
  for (let i = 0; i < 300; i++) nums.push(Math.floor((rnd() - 0.5) * 2 ** (1 + Math.floor(rnd() * 34))));
  for (let i = 0; i < 100; i++) nums.push((rnd() - 0.5) * 10 ** Math.floor(rnd() * 12));
  const ops = { 1: (a, b) => a + b, 2: (a, b) => a - b, 3: (a, b) => a * b, 4: (a, b) => a / b, 5: (a, b) => a % b, 9: a => -a };
  const bad = [], badc = [];
  for (const c of [1, 2, 3, 4, 5, 9]) {
    const pairs = []; for (let i = 0; i < 400; i++) pairs.push([nums[Math.floor(rnd() * nums.length)], nums[Math.floor(rnd() * nums.length)]]);
    for (const x of [0, -0, 1, -1, 5, 2 ** 30 - 1, -(2 ** 30)]) for (const y of [0, -0, 1, -1, 3, 2 ** 30 - 1, 46341]) pairs.push([x, y]);
    for (const [a, b] of pairs) { const w = ops[c](a, b), r = op(c, a, b); if (!same(r.v, w)) bad.push([c, a, b, r.v, w]); else if (!canon(w, r.kind)) badc.push([c, a, b, r.kind, w]); }
  }
  check('حساب موسوم: + − × ÷ % وسالب مطابق لـ JS (حدود الوحدة الصغيرة و-٠ وNaN)', bad.slice(0, 5), []);
  check('توحيد النتائج: صغير إن وُجد صحيحًا في المدى وإلا عشري', badc.slice(0, 5), []);
  const badcmp = [];
  for (let i = 0; i < 1500; i++) { const a = nums[Math.floor(rnd() * nums.length)], b = nums[Math.floor(rnd() * nums.length)];
    const t = [[6, a < b], [7, a <= b], [8, a === b || (a === 0 && b === 0)]]; for (const [c, w] of t) { const r = op(c, a, b); if (r.v !== (w ? 1 : 0)) badcmp.push([c, a, b, r.v, w]); } }
  check('مقارنة: أصغر وأصغر_أو_يساوي ويساوي (NaN لا يساوي نفسه، ٠ = -٠)', badcmp.slice(0, 5), []);
  const badt = []; for (const a of nums) { const r = op(10, a, 0); if (r.v !== (a !== 0 ? 1 : 0)) badt.push([a, r.v]); }
  check('الصدق: الصفر و-٠ كذب وما عداه (و NaN) صدق', badt.slice(0, 5), []);
  const badr = []; for (const a of nums) { if (!Number.isFinite(a)) continue; const [l, h] = parts(a); const len = ex.دوران(l, h), r = { v: resultNum() }; const want = Number(String(a)); if (!(same(r.v, want) || (Object.is(a, -0) && r.v === 0))) badr.push([a, String(a), r.v]); if (len !== String(a).length) badr.push([a, 'طول', len, String(a).length]); }
  check('عدد → نص → عدد (ق_إلى_نص ثم ق_من_نص) مطابق لـ String وNumber', badr.slice(0, 5), []);
  check('الأنواع', [0, 1, 2, 3, 4, 5, 6].map(ex.نوع_من), [0, 1, 2, 1, 3, 4, 5]);
  printed.length = 0; ex.نصوص();
  const txt = Buffer.from('-123450'); check('نصوص موسومة: دمج وطول وبايتات ومساواة وجزء', printed, [7, ...txt, 1, 0, txt[3]]);
  check('قوائم موسومة', ex.قائمة_اختبار(200), (() => { let m = 0; for (let i = 1; i <= 200; i++) m += i * 3; return m + 200 * 3; })());
  // ---- خرائط مرتبة مقابل Map ----
  ex.خريطة_جديدة_(); const model = new Map();
  const keyOf = (t, v) => t === 0 ? 'n' + (Object.is(v, -0) ? 0 : v) : 's' + v;
  const pool = []; for (let i = 0; i < 60; i++) pool.push([0, i]); for (let i = 0; i < 20; i++) pool.push([0, i + 0.5]); pool.push([0, -0], [0, 2 ** 40], [0, 1e300], [0, -(2 ** 30)]); for (let i = 0; i < 60; i++) pool.push([1, i]);
  const mbad = [];
  for (let step = 0; step < 4000; step++) {
    const [t, v] = pool[Math.floor(rnd() * pool.length)]; const [l, h] = t === 0 ? parts(v) : [v, 0]; const k = keyOf(t, v); const r = rnd();
    if (r < 0.45) { const val = Math.floor(rnd() * 1000); const n = ex.خ_ضع(t, l, h, val); model.set(k, val); if (n !== model.size) mbad.push(['ضع', k, n, model.size]); }
    else if (r < 0.7) { const got = ex.خ_احصل(t, l, h), want = model.has(k) ? model.get(k) * 2 + 1 : -1 * 2 + 1; if (got !== want) mbad.push(['احصل', k, got, want]); }
    else if (r < 0.9) { const g = ex.خ_احذف(t, l, h), w = model.delete(k) ? 1 : 0; if (g !== w) mbad.push(['احذف', k, g, w]); }
    else { if (ex.خ_يحوي(t, l, h) !== (model.has(k) ? 1 : 0)) mbad.push(['يحوي', k]); }
    if (step % 400 === 399) { ex.خ_نظّف(); printed.length = 0; const n = ex.خ_ترتيب_قيم(); const got = printed.slice(); const want = [...model.values()]; if (n !== model.size || JSON.stringify(got) !== JSON.stringify(want)) mbad.push(['ترتيب', step, got.length, want.length]); }
  }
  check('خريطة موسومة مرتبة: ٤٠٠٠ عملية عشوائية (مفاتيح عددية/عشرية/نصية، حذف، ضغط، جامع نفايات) مقابل Map', mbad.slice(0, 5), []);
  console.log(`pass ${pass} fail ${fail}`);
  process.exit(fail ? 1 : 0);
})();
