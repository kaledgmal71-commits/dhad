// مولَّد بـ tools/bundle_morph.js — لا يُعدَّل يدويًّا
(function () {
 var defs = {}, cache = {};
 function req(n) { n = n.replace(/^\.\//, '').replace(/\.js$/, ''); if (cache[n]) return cache[n].exports; var m = { exports: {} }; cache[n] = m; defs[n](m, m.exports, req); return m.exports; }
 req.main = null;
 defs["atomic_ar"] = function (module, exports, require) {
// ترميز الحرف العربي المشكَّل بنقطة رمزية واحدة (Precomposed Characters) في منطقة الاستخدام الخاص (PUA).
// الفكرة: كل «حرف + علاماته» (بَ، بّ، بًّ، ...) يصير حرفًا مستقلًّا برسمه ومفتاحه، والتحويل عكوس بلا فقد (Lossless).
// القاعدة: decode(encode(s)) === s.normalize('NFC').  الحرف المجرّد بلا علامات يبقى كما هو.
// الاستعمال: node tools/atomic_ar.js "نص مشكَّل"   |   require('./atomic_ar.js')
'use strict';
const PUA_START = 0xE000;

// الحروف القاعدية: ٢٨ حرفًا أساسيًّا + همزة ومقاعدها + الألف المقصورة والتاء المربوطة وألف الوصل
const BASES = [...'ابتثجحخدذرزسشصضطظعغفقكلمنهوي', ...'ءأإؤئآىةٱ'];
// علامات التشكيل وترتيبها القانوني (Canonical_Combining_Class): تنوين 27-29، حركات 30-32، شدّة 33، سكون 34
const FATHA = 'َ', DAMMA = 'ُ', KASRA = 'ِ', SHADDA = 'ّ', SUKUN = 'ْ';
const TFATH = 'ً', TDAMM = 'ٌ', TKASR = 'ٍ';
const CCC = { [TFATH]: 27, [TDAMM]: 28, [TKASR]: 29, [FATHA]: 30, [DAMMA]: 31, [KASRA]: 32, [SHADDA]: 33, [SUKUN]: 34 };
// تركيبات العلامات التي يقبلها الحرف (٣ حركات + سكون + شدّة مع حركة + ٣ تنوين + شدّة مع تنوين = ١٣). لا شدّة وحدها: الشدّة في العربية لا تقع بلا حركة أو تنوين؛ وما كُتب بشدّة وحدها (تشكيل جزئي) يبقى حرفًا + علامة بلا فقد.
const MARK_SETS = [
  FATHA, DAMMA, KASRA, SUKUN,
  FATHA + SHADDA, DAMMA + SHADDA, KASRA + SHADDA,
  TFATH, TDAMM, TKASR,
  TFATH + SHADDA, TDAMM + SHADDA, TKASR + SHADDA,
]; // مخزّنة بالترتيب القانوني (الحركة قبل الشدّة كما في NFD)

const TABLE = new Map();   // «حرف+علامات» → نقطة PUA
const REVERSE = new Map(); // نقطة PUA → «حرف+علامات»
let next = PUA_START;
for (const b of BASES) for (const m of MARK_SETS) {
  const ch = String.fromCodePoint(next++);
  TABLE.set(b + m, ch); REVERSE.set(ch, b + m);
}
const isMark = c => c in CCC;
const sortMarks = s => [...s].sort((a, b) => CCC[a] - CCC[b]).join('');

function encode(text) {
  const t = text.normalize('NFC'); const out = []; const cps = [...t];
  for (let i = 0; i < cps.length; i++) {
    const c = cps[i];
    if (BASES.includes(c)) {
      let j = i + 1, marks = '';
      while (j < cps.length && isMark(cps[j])) marks += cps[j++];
      const key = c + sortMarks(marks);
      if (marks && TABLE.has(key)) { out.push(TABLE.get(key)); i = j - 1; continue; }
    }
    out.push(c);
  }
  return out.join('');
}
function decode(text) { return [...text].map(c => REVERSE.get(c) || c).join(''); }

// ===== صيغة العرض =====
// الخط لا يصل حرفًا ذريًّا بحرف عربي عادي: ينقسم النص إلى مقاطع تشكيل حسب الخط (Script) فيفقد الوصل.
// لذا تُحوَّل الحروف العارية أيضًا إلى نقاط PUA مجاورة (٣٧ نقطة بعد الـ٤٨١) للعرض فقط؛ التخزين والتدريب يبقيان على encode.
const BARE = new Map(), BARE_REV = new Map();
BASES.forEach((b, i) => { const ch = String.fromCodePoint(next + i); BARE.set(b, ch); BARE_REV.set(ch, b); });
const toDisplay = s => [...encode(s)].map(c => BARE.get(c) || c).join('');
const fromDisplay = s => decode([...s].map(c => BARE_REV.get(c) || c).join(''));

const utf8 = s => Buffer.byteLength(s, 'utf8');
const count = s => [...s].length;
module.exports = { BASES, MARK_SETS, TABLE, REVERSE, encode, decode, toDisplay, fromDisplay, utf8, count, PUA_START, size: TABLE.size };

if (require.main === module) {
  const s = process.argv[2];
  if (!s) { console.log('عدد الحروف الذرية:', TABLE.size, '| المدى: U+' + PUA_START.toString(16).toUpperCase() + '..U+' + (next - 1).toString(16).toUpperCase()); process.exit(0); }
  const e = encode(s);
  console.log({ أصل_بايت: utf8(s), ذري_بايت: utf8(e), أصل_رموز: count(s), ذري_رموز: count(e), عكوس: decode(e) === s.normalize('NFC') });
}

 };
 defs["morph_ar"] = function (module, exports, require) {
// الوزن قراءةً مباشرة على الحروف الذرية (نموذج أولي): توليد الصيغ من (جذر × وزن) وتحليلها عكسيًّا بمطابقة وحدات.
// كل وحدة = حرف + علاماته (نقطة ذرية واحدة). القالب يحدد في موضع الفاء والعين واللام «العلامات» المطلوبة،
// والحرف نفسه هو الجذر؛ فالتحليل مطابقة نمط لا استدلال.
// النطاق الحالي: الجذور الثلاثية الصحيحة (بلا حروف علة ولا همزة ولا تضعيف)؛ الأفعال المجردة والمزيدة (٢–١٠)
// بصيغ الغائب المفرد المذكّر والأمر وأهم المشتقات. المعتل والرباعي والإسناد للضمائر واللواصق: مراحل لاحقة.
'use strict';
const A = require('./atomic_ar.js');
const SLOTS = 'فعلق'; // مواضع الجذر: ف ع ل، والقاف للحرف الرابع في الرباعي

// الأوزان: [اسم الوزن، الباب، القالب]. الفاء والعين واللام في القالب مواضع الجذر (لا حروف حرفية).
const PATTERNS = [
  ['فَعَلَ', 'ماضٍ', 'I', 'فَعَلَ'], ['فَعِلَ', 'ماضٍ', 'I', 'فَعِلَ'], ['فَعُلَ', 'ماضٍ', 'I', 'فَعُلَ'],
  ['يَفْعُلُ', 'مضارع', 'I', 'يَفْعُلُ'], ['يَفْعِلُ', 'مضارع', 'I', 'يَفْعِلُ'], ['يَفْعَلُ', 'مضارع', 'I', 'يَفْعَلُ'],
  ['اُفْعُلْ', 'أمر', 'I', 'اُفْعُلْ'], ['اِفْعِلْ', 'أمر', 'I', 'اِفْعِلْ'], ['اِفْعَلْ', 'أمر', 'I', 'اِفْعَلْ'],
  ['فَاعِلٌ', 'اسم فاعل', 'I', 'فَاعِلٌ'], ['مَفْعُولٌ', 'اسم مفعول', 'I', 'مَفْعُولٌ'],
  ['فَعَّلَ', 'ماضٍ', 'II', 'فَعَّلَ'], ['يُفَعِّلُ', 'مضارع', 'II', 'يُفَعِّلُ'], ['فَعِّلْ', 'أمر', 'II', 'فَعِّلْ'],
  ['تَفْعِيلٌ', 'مصدر', 'II', 'تَفْعِيلٌ'], ['مُفَعِّلٌ', 'اسم فاعل', 'II', 'مُفَعِّلٌ'], ['مُفَعَّلٌ', 'اسم مفعول', 'II', 'مُفَعَّلٌ'],
  ['فَاعَلَ', 'ماضٍ', 'III', 'فَاعَلَ'], ['يُفَاعِلُ', 'مضارع', 'III', 'يُفَاعِلُ'], ['فَاعِلْ', 'أمر', 'III', 'فَاعِلْ'],
  ['مُفَاعَلَةٌ', 'مصدر', 'III', 'مُفَاعَلَةٌ'], ['مُفَاعِلٌ', 'اسم فاعل', 'III', 'مُفَاعِلٌ'], ['مُفَاعَلٌ', 'اسم مفعول', 'III', 'مُفَاعَلٌ'],
  ['أَفْعَلَ', 'ماضٍ', 'IV', 'أَفْعَلَ'], ['يُفْعِلُ', 'مضارع', 'IV', 'يُفْعِلُ'], ['أَفْعِلْ', 'أمر', 'IV', 'أَفْعِلْ'],
  ['إِفْعَالٌ', 'مصدر', 'IV', 'إِفْعَالٌ'], ['مُفْعِلٌ', 'اسم فاعل', 'IV', 'مُفْعِلٌ'], ['مُفْعَلٌ', 'اسم مفعول', 'IV', 'مُفْعَلٌ'],
  ['تَفَعَّلَ', 'ماضٍ', 'V', 'تَفَعَّلَ'], ['يَتَفَعَّلُ', 'مضارع', 'V', 'يَتَفَعَّلُ'], ['تَفَعَّلْ', 'أمر', 'V', 'تَفَعَّلْ'],
  ['تَفَعُّلٌ', 'مصدر', 'V', 'تَفَعُّلٌ'], ['مُتَفَعِّلٌ', 'اسم فاعل', 'V', 'مُتَفَعِّلٌ'], ['مُتَفَعَّلٌ', 'اسم مفعول', 'V', 'مُتَفَعَّلٌ'],
  ['تَفَاعَلَ', 'ماضٍ', 'VI', 'تَفَاعَلَ'], ['يَتَفَاعَلُ', 'مضارع', 'VI', 'يَتَفَاعَلُ'], ['تَفَاعَلْ', 'أمر', 'VI', 'تَفَاعَلْ'],
  ['تَفَاعُلٌ', 'مصدر', 'VI', 'تَفَاعُلٌ'], ['مُتَفَاعِلٌ', 'اسم فاعل', 'VI', 'مُتَفَاعِلٌ'], ['مُتَفَاعَلٌ', 'اسم مفعول', 'VI', 'مُتَفَاعَلٌ'],
  ['انْفَعَلَ', 'ماضٍ', 'VII', 'ٱنْفَعَلَ'], ['يَنْفَعِلُ', 'مضارع', 'VII', 'يَنْفَعِلُ'], ['انْفَعِلْ', 'أمر', 'VII', 'ٱنْفَعِلْ'],
  ['انْفِعَالٌ', 'مصدر', 'VII', 'ٱنْفِعَالٌ'], ['مُنْفَعِلٌ', 'اسم فاعل', 'VII', 'مُنْفَعِلٌ'],
  ['افْتَعَلَ', 'ماضٍ', 'VIII', 'ٱفْتَعَلَ'], ['يَفْتَعِلُ', 'مضارع', 'VIII', 'يَفْتَعِلُ'], ['افْتَعِلْ', 'أمر', 'VIII', 'ٱفْتَعِلْ'],
  ['افْتِعَالٌ', 'مصدر', 'VIII', 'ٱفْتِعَالٌ'], ['مُفْتَعِلٌ', 'اسم فاعل', 'VIII', 'مُفْتَعِلٌ'], ['مُفْتَعَلٌ', 'اسم مفعول', 'VIII', 'مُفْتَعَلٌ'],
  ['اسْتَفْعَلَ', 'ماضٍ', 'X', 'ٱسْتَفْعَلَ'], ['يَسْتَفْعِلُ', 'مضارع', 'X', 'يَسْتَفْعِلُ'], ['اسْتَفْعِلْ', 'أمر', 'X', 'ٱسْتَفْعِلْ'],
  ['اسْتِفْعَالٌ', 'مصدر', 'X', 'ٱسْتِفْعَالٌ'], ['مُسْتَفْعِلٌ', 'اسم فاعل', 'X', 'مُسْتَفْعِلٌ'], ['مُسْتَفْعَلٌ', 'اسم مفعول', 'X', 'مُسْتَفْعَلٌ'],
  // أفعال رباعية مزيدة من اسم (ضمن مرجع Arramooz): جذرها الثلاثي بإضافة م/ت/و/ي
  ['مَفْعَلَ', 'ماضٍ', 'اشتقاق من اسم', 'مَفْعَلَ'], ['تَفْعَلَ', 'ماضٍ', 'اشتقاق من اسم', 'تَفْعَلَ'],
  ['فَوْعَلَ', 'ماضٍ', 'اشتقاق من اسم', 'فَوْعَلَ'], ['فَيْعَلَ', 'ماضٍ', 'اشتقاق من اسم', 'فَيْعَلَ'], ['فَعْوَلَ', 'ماضٍ', 'اشتقاق من اسم', 'فَعْوَلَ'],
  // ===== المعتل والمضعّف (الماضي للغائب المفرد المذكر). opts: missing = موضع الجذر غير الظاهر، fill = حروفه الممكنة، dbl = اللام = العين =====
  // الأجوف (العين علة): قَالَ، أَقَامَ، ٱنْقَادَ، ٱخْتَارَ، ٱسْتَقَامَ
  ...[['فَالَ', 'I'], ['أَفَالَ', 'IV'], ['ٱنْفَالَ', 'VII'], ['ٱفْتَالَ', 'VIII'], ['ٱسْتَفَالَ', 'X']].map(([q, b]) => [q, 'ماضٍ أجوف', b, q, { missing: 1, fill: ['و', 'ي'] }]),
  // الناقص (اللام علة): دَعَا، رَمَى، نَسِيَ، ضَحَّى، نَادَى، أَعْطَى، تَمَنَّى، تَعَالَى، ٱنْبَغَى، ٱشْتَرَى، ٱسْتَعْلَى
  ['فَعَا', 'ماضٍ ناقص', 'I', 'فَعَا', { missing: 2, fill: ['و'] }], ['فَعَى', 'ماضٍ ناقص', 'I', 'فَعَى', { missing: 2, fill: ['ي'] }],
  ['فَعِيَ', 'ماضٍ ناقص', 'I', 'فَعِيَ', { missing: 2, fill: ['و', 'ي'] }],
  ...[['فَعَّى', 'II'], ['فَاعَى', 'III'], ['أَفْعَى', 'IV'], ['تَفَعَّى', 'V'], ['تَفَاعَى', 'VI'], ['ٱنْفَعَى', 'VII'], ['ٱفْتَعَى', 'VIII'], ['ٱسْتَفْعَى', 'X']].map(([q, b]) => [q, 'ماضٍ ناقص', b, q, { missing: 2, fill: ['و', 'ي'] }]),
  // المضعّف (العين = اللام): مَدَّ، حَاجَّ، أَحَبَّ، ٱنْفَكَّ، ٱمْتَدَّ، ٱسْتَمَدَّ
  ...[['فَعَّ', 'I'], ['فَاعَّ', 'III'], ['أَفَعَّ', 'IV'], ['ٱنْفَعَّ', 'VII'], ['ٱفْتَعَّ', 'VIII'], ['ٱسْتَفَعَّ', 'X']].map(([q, b]) => [q, 'ماضٍ مضعّف', b, q, { dbl: true }]),
  // المثال في الافتعال (إدغام): ٱتَّصَلَ، ٱتَّخَذَ، ٱتَّسَعَ؛ والمهموز في الإفعال: آمَنَ
  ['ٱتَّعَلَ', 'ماضٍ مثال', 'VIII', 'ٱتَّعَلَ', { missing: 0, fill: ['و', 'ي', 'ء'] }],
  ['آعَلَ', 'ماضٍ مهموز', 'IV', 'آعَلَ', { missing: 0, fill: ['ء'] }],
  // ===== المضارع والأمر والمصدر والمشتقات للمعتل والمضعّف (الغائب المفرد) =====
  ...[['يَفُولُ', ['و']], ['يَفِيلُ', ['ي']], ['يَفَالُ', ['و', 'ي']], ['يُفِيلُ', ['و', 'ي']], ['يَسْتَفِيلُ', ['و', 'ي']], ['فُلْ', ['و']], ['فِلْ', ['ي']], ['فَلْ', ['و', 'ي']], ['فَوْلٌ', ['و']], ['فَيْلٌ', ['ي']], ['إِفَالَةٌ', ['و', 'ي']], ['ٱسْتِفَالَةٌ', ['و', 'ي']], ['فَائِلٌ', ['و', 'ي']], ['مَفُولٌ', ['و']], ['مَفِيلٌ', ['ي']], ['مُفِيلٌ', ['و', 'ي']]].map(([q, f]) => [q, 'أجوف', 'أجوف', q, { missing: 1, fill: f }]),
  ...[['يَفْعُو', ['و']], ['يَفْعِي', ['ي']], ['يَفْعَى', ['و', 'ي']], ['ٱفْعُ', ['و']], ['ٱفْعِ', ['ي']], ['ٱفْعَ', ['و', 'ي']], ['فَاعٍ', ['و', 'ي']], ['مَفْعُوٌّ', ['و']], ['مَفْعِيٌّ', ['ي']], ['يُفَعِّي', ['و', 'ي']], ['يُفَاعِي', ['و', 'ي']], ['يُفْعِي', ['و', 'ي']], ['يَتَفَعَّى', ['و', 'ي']], ['يَتَفَاعَى', ['و', 'ي']], ['يَسْتَفْعِي', ['و', 'ي']]].map(([q, f]) => [q, 'ناقص', 'ناقص', q, { missing: 2, fill: f }]),
  ...[['يَفِعُّ'], ['يَفُعُّ'], ['يَفَعُّ'], ['فِعَّ'], ['فُعَّ'], ['فَعَّ'], ['فَاعٌّ']].map(([q]) => [q, 'مضعّف', 'مضعّف', q, { dbl: true }]),
  // ===== الرباعي: فَعْلَلَ (دَحْرَجَ)، تَفَعْلَلَ (تَدَحْرَجَ)، افْعَنْلَلَ (احْرَنْجَمَ)، افْعَلَلَّ (اقْشَعَرَّ) =====
  ...[['فَعْلَقَ', 'ماضٍ'], ['يُفَعْلِقُ', 'مضارع'], ['فَعْلِقْ', 'أمر'], ['فَعْلَقَةٌ', 'مصدر'], ['فِعْلَاقٌ', 'مصدر'], ['مُفَعْلِقٌ', 'اسم فاعل'], ['مُفَعْلَقٌ', 'اسم مفعول']].map(([q, n]) => [q, n, 'رباعي I', q, { quad: true }]),
  ...[['تَفَعْلَقَ', 'ماضٍ'], ['يَتَفَعْلَقُ', 'مضارع'], ['تَفَعْلَقْ', 'أمر'], ['تَفَعْلُقٌ', 'مصدر'], ['مُتَفَعْلِقٌ', 'اسم فاعل']].map(([q, n]) => [q, n, 'رباعي II', q, { quad: true }]),
  ...[['ٱفْعَنْلَقَ', 'ماضٍ'], ['يَفْعَنْلِقُ', 'مضارع'], ['ٱفْعَنْلِقْ', 'أمر'], ['ٱفْعِنْلَاقٌ', 'مصدر'], ['مُفْعَنْلِقٌ', 'اسم فاعل']].map(([q, n]) => [q, n, 'رباعي III', q, { quad: true }]),
  ...[['ٱفْعَلَقَّ', 'ماضٍ'], ['يَفْعَلِقُّ', 'مضارع'], ['ٱفْعَلِقَّ', 'أمر'], ['ٱفْعِلْقَاقٌ', 'مصدر'], ['مُفْعَلِقٌّ', 'اسم فاعل']].map(([q, n]) => [q, n, 'رباعي IV', q, { quad: true }]),
  // ===== المبني للمجهول (الغائب المفرد): الصحيح يُسنَد بالإسناد العام؛ المعتل والمضعّف نوعه «مجهول ...» فلا تمسّه قواعد إسناد المعلوم =====
  ...[['فُعِلَ', 'I'], ['فُعِّلَ', 'II'], ['فُوعِلَ', 'III'], ['أُفْعِلَ', 'IV'], ['تُفُعِّلَ', 'V'], ['تُفُوعِلَ', 'VI'], ['ٱنْفُعِلَ', 'VII'], ['ٱفْتُعِلَ', 'VIII'], ['ٱسْتُفْعِلَ', 'X']].map(([q, b]) => [q, 'ماضٍ مجهول', b, q]),
  ...[['يُفْعَلُ', 'I/IV'], ['يُفَعَّلُ', 'II'], ['يُفَاعَلُ', 'III'], ['يُتَفَعَّلُ', 'V'], ['يُتَفَاعَلُ', 'VI'], ['يُنْفَعَلُ', 'VII'], ['يُفْتَعَلُ', 'VIII'], ['يُسْتَفْعَلُ', 'X']].map(([q, b]) => [q, 'مضارع مجهول', b, q]),
  ...[['فِيلَ', 'I'], ['أُفِيلَ', 'IV'], ['ٱنْفِيلَ', 'VII'], ['ٱفْتِيلَ', 'VIII'], ['ٱسْتُفِيلَ', 'X']].map(([q, b]) => [q, 'مجهول ماضٍ أجوف', b, q, { missing: 1, fill: ['و', 'ي'] }]),
  ...[['يُفَالُ', 'I/IV'], ['يُنْفَالُ', 'VII'], ['يُفْتَالُ', 'VIII'], ['يُسْتَفَالُ', 'X']].map(([q, b]) => [q, 'مجهول مضارع أجوف', b, q, { missing: 1, fill: ['و', 'ي'] }]),
  ...[['فُعِيَ', 'I'], ['فُعِّيَ', 'II'], ['فُوعِيَ', 'III'], ['أُفْعِيَ', 'IV'], ['ٱفْتُعِيَ', 'VIII'], ['ٱسْتُفْعِيَ', 'X']].map(([q, b]) => [q, 'مجهول ماضٍ ناقص', b, q, { missing: 2, fill: ['و', 'ي'] }]),
  ...[['يُفْعَى', 'I/IV'], ['يُفَعَّى', 'II'], ['يُفَاعَى', 'III'], ['يُتَفَعَّى', 'V'], ['يُتَفَاعَى', 'VI'], ['يُفْتَعَى', 'VIII'], ['يُسْتَفْعَى', 'X']].map(([q, b]) => [q, 'مجهول مضارع ناقص', b, q, { missing: 2, fill: ['و', 'ي'] }]),
  ...[['فُعَّ', 'I'], ['أُفِعَّ', 'IV'], ['ٱسْتُفِعَّ', 'X']].map(([q, b]) => [q, 'مجهول ماضٍ مضعّف', b, q, { dbl: true }]),
  ...[['يُفَعُّ', 'I/IV'], ['يُسْتَفَعُّ', 'X']].map(([q, b]) => [q, 'مجهول مضارع مضعّف', b, q, { dbl: true }]),
  // ===== المثال (فاؤه واو تسقط في المضارع والأمر والمصدر: وَعَدَ ← يَعِدُ، عِدْ، عِدَةٌ) والمجزوم من المعتل والمضعّف والمجهول =====
  ['يَعِلُ', 'مضارع مثال', 'I', 'يَعِلُ', { missing: 0, fill: ['و'] }], ['عِلْ', 'أمر مثال', 'I', 'عِلْ', { missing: 0, fill: ['و'] }], ['عِلَةٌ', 'مصدر مثال', 'I', 'عِلَةٌ', { missing: 0, fill: ['و'] }],
  ['يَتَّعِلُ', 'مضارع مثال', 'VIII', 'يَتَّعِلُ', { missing: 0, fill: ['و', 'ي', 'ء'] }], ['ٱتَّعِلْ', 'أمر مثال', 'VIII', 'ٱتَّعِلْ', { missing: 0, fill: ['و', 'ي', 'ء'] }],
  ['ٱتِّعَالٌ', 'مصدر مثال', 'VIII', 'ٱتِّعَالٌ', { missing: 0, fill: ['و', 'ي', 'ء'] }], ['مُتَّعِلٌ', 'اسم فاعل مثال', 'VIII', 'مُتَّعِلٌ', { missing: 0, fill: ['و', 'ي', 'ء'] }], ['مُتَّعَلٌ', 'اسم مفعول مثال', 'VIII', 'مُتَّعَلٌ', { missing: 0, fill: ['و', 'ي', 'ء'] }],
  ...[['يَفُلْ', ['و']], ['يَفِلْ', ['ي']], ['يَفَلْ', ['و', 'ي']], ['يُفِلْ', ['و', 'ي']], ['يَسْتَفِلْ', ['و', 'ي']], ['يَنْفَلْ', ['و', 'ي']], ['يَفْتَلْ', ['و', 'ي']]].map(([q, f]) => [q, 'مجزوم أجوف', /^يَنْ/.test(q) ? 'VII' : /^يَفْتَ/.test(q) ? 'VIII' : 'مجزوم', q, { missing: 1, fill: f }]),
  ...[['يَفْعُ', ['و']], ['يَفْعِ', ['ي']], ['يَفْعَ', ['و', 'ي']], ['يُفْعِ', ['و', 'ي']], ['يَسْتَفْعِ', ['و', 'ي']], ['يَتَفَعَّ', ['و', 'ي']], ['يُفَعِّ', ['و', 'ي']], ['يُفَاعِ', ['و', 'ي']], ['يَتَفَاعَ', ['و', 'ي']], ['يَنْفَعِ', ['و', 'ي']], ['يَفْتَعِ', ['و', 'ي']]].map(([q, f]) => [q, 'مجزوم ناقص', /^يَنْ/.test(q) ? 'VII' : /^يَفْتَ/.test(q) ? 'VIII' : 'مجزوم', q, { missing: 2, fill: f }]),
  ...[['يَفِعَّ'], ['يَفُعَّ'], ['يَفَعَّ'], ['يُفِعَّ'], ['يَسْتَفِعَّ'], ['يَفْتَعَّ'], ['يَنْفَعَّ'], ['يُفَاعِّ']].map(([q]) => [q, 'مجزوم مضعّف', /^يَنْ/.test(q) ? 'VII' : /^يَفْتَ/.test(q) ? 'VIII' : 'مجزوم', q, { dbl: true }]),
  ['يُفْعَلْ', 'مجزوم مجهول', 'مجزوم', 'يُفْعَلْ'], ['يُفَعَّلْ', 'مجزوم مجهول', 'مجزوم', 'يُفَعَّلْ'], ['يُفَاعَلْ', 'مجزوم مجهول', 'مجزوم', 'يُفَاعَلْ'], ['يُسْتَفْعَلْ', 'مجزوم مجهول', 'مجزوم', 'يُسْتَفْعَلْ'], ['يُفْتَعَلْ', 'مجزوم مجهول', 'مجزوم', 'يُفْتَعَلْ'],
  ['يَفْعَلْ', 'مجزوم', 'مجزوم', 'يَفْعَلْ'], ['يَفْعُلْ', 'مجزوم', 'مجزوم', 'يَفْعُلْ'], ['يَفْعِلْ', 'مجزوم', 'مجزوم', 'يَفْعِلْ'],
].map(([وزن, نوع, باب, قالب, opts]) => ({ وزن, نوع, باب, units: parse(قالب), ...(opts || {}) }));

// وحدة = {ب: الحرف القاعدي، ع: علاماته}. تفكيك النص إلى وحدات ذرية.
function units(text) { return [...A.encode(text)].map(u => { const d = [...A.decode(u)]; return { ب: d[0], ع: d.slice(1).join('') }; }); }
function parse(t) { return units(t).map(u => SLOTS.includes(u.ب) ? { slot: SLOTS.indexOf(u.ب), ع: u.ع } : { lit: u.ب + u.ع }); }
const GLYPH = u => u.ب + u.ع;

// توليد: (جذر ثلاثي، وزن) → كلمة مشكَّلة (بنص عادي) وبصورتها الذرية
function applies(root, pat) {
  const r = [...root];
  if (r.length !== (pat.quad ? 4 : 3)) return false;
  if (pat.dbl) return r[1] === r[2];
  if (pat.missing != null) return pat.fill.includes(r[pat.missing]);
  return true;
}
function generate(root, pat) {
  const r = [...root];
  const s = pat.units.map(u => 'slot' in u ? r[u.slot] + u.ع : u.lit).join('');
  return s.normalize('NFC');
}
// تحليل: كلمة مشكَّلة → كل (جذر، وزن) تطابق وحداتها قالب الوزن
function analyze(word) {
  // ألف الوصل تُكتب في المراجع «اِ»: نجرّب الصورتين (الأمر الثلاثي يبدأ بـ«اِ» فعلًا، والمزيدات بألف وصل)
  const base = word.normalize('NFC'); const seen = new Set(); const all = [];
  // ألف الوصل المجرّدة (ٱ أو ا بلا علامة) قد تقابل اُ أو اِ في قوالب الأمر
  const wasla = /^[ٱا](?![\u064B-\u0652])/.test(base) ? ['اِ', 'اُ', 'ٱ'].map(x => x + base.slice(1)) : [];
  for (const v of [base, base.replace(/^اِ/, 'ٱ'), base.replace(/^اُ/, 'ٱ'), ...wasla]) for (const r of analyze1(v)) { const k = r.جذر + '|' + r.وزن + '|' + r.نوع; if (!seen.has(k)) { seen.add(k); all.push(r); } }
  return all;
}
function analyze1(word, pats = PATTERNS) {
  const w = units(word); const out = [];
  for (const p of pats) {
    if (p.units.length !== w.length) continue;
    let ok = true; const root = ['', '', '', ''];
    for (let i = 0; i < w.length && ok; i++) {
      const t = p.units[i];
      if ('slot' in t) { if (w[i].ع !== t.ع) ok = false; else root[t.slot] = w[i].ب; }
      else if (GLYPH(w[i]) !== t.lit) ok = false;
    }
    if (ok) {
      const cands = [];
      if (p.dbl) { root[2] = root[1]; cands.push(root.join('')); }
      else if (p.missing != null) for (const f of p.fill) { const q = root.slice(); q[p.missing] = f; cands.push(q.join('')); }
      else cands.push(root.slice(0, p.quad ? 4 : 3).join(''));
      for (const جذر of cands) out.push({ جذر, وزن: p.وزن, نوع: p.نوع, باب: p.باب, معتل: /[اويءأإؤئآى]/.test(جذر) || !!p.dbl });
      continue;
    }
    if (false) { const جذر = root.join(''); out.push({ جذر, وزن: p.وزن, نوع: p.نوع, باب: p.باب, معتل: /[اويءأإؤئآى]/.test(جذر) }); }
  }
  return out;
}
const makePattern = (وزن, نوع, باب, قالب, opts) => ({ وزن, نوع, باب, units: parse(قالب), ...(opts || {}) });
module.exports = { PATTERNS, generate, analyze, units, applies, analyzeWith: analyze1, makePattern };

if (require.main === module) {
  const w = process.argv[2];
  if (w) console.log(analyze(w)); else console.log('أوزان:', PATTERNS.length);
}

 };
 defs["morph_conj"] = function (module, exports, require) {
// إسناد الماضي إلى الضمائر على الحروف الذرية: ضمائر الرفع المتصلة بالفعل الماضي الصحيح (غير المعتل وغير المضعّف).
// كل لاحقة تحدد علامة آخر حرف في الساق؛ التحليل: نزع اللاحقة وإعادة الساق إلى الغائب المفرد ثم تحليله بالأوزان.
'use strict';
const M = require('./morph_ar.js');
const A = require('./atomic_ar.js');
const F = 'َ', D = 'ُ', S = 'ْ';
// [الضمير، اللاحقة، علامة آخر حرف في الساق]
const PRONOUNS = [
  ['أنا', 'تُ', S], ['أنتَ', 'تَ', S], ['أنتِ', 'تِ', S], ['هي', 'تْ', F], ['نحن', 'نَا', S],
  ['أنتما', 'تُمَا', S], ['أنتم', 'تُمْ', S], ['أنتنّ', 'تُنَّ', S], ['هما (م)', 'ا', F], ['هما (م)', 'ا', F],
  ['هما (ث)', 'تَا', F], ['هم', 'وا', D], ['هنّ', 'نَ', S],
].filter((p, i, a) => a.findIndex(q => q[1] === p[1]) === i);
// الأجوف والمضعّف يتصرّفان كالصحيح مع الضمائر غير الساكنة (قَالَتْ، مَدَّتْ، قَالُوا)؛ الناقص له قواعده في morph_conj_weak.js
const tailSukun = () => false;
const PAST_SOUND = p => /^ماضٍ/.test(p.نوع) && p.missing == null && !p.dbl;
const strip = s => s.normalize('NFC');
// الغائب المفرد → صيغة مسندة
function conjugate(root, pat, pron) {
  const base = [...strip(M.generate(root, pat))];
  const r = PRONOUNS.find(p => p[0] === pron); if (!r) throw new Error('ضمير غير معروف');
  const last = base.length - 1; // آخر حرف (فتحة) → علامته الجديدة
  const marks = r[2];
  let i = last; while (/[ً-ْ]/.test(base[i])) i--;
  if (marks === S && base.slice(i + 1).join('').includes('ّ')) { // مختوم بشدّة: يُفكّ التضعيف (اقشعرّ ← اقشعررتُ)
    let j = i - 1; while (/[ً-ْ]/.test(base[j])) j--;
    return strip(base.slice(0, j + 1).join('') + S + base[i] + F + base[i] + S + r[1]);
  }
  const sh = base.slice(i + 1).join('').includes('ّ') ? 'ّ' : ''; // الشدّة تبقى مع الفتحة والضمة (اقشعرّت، اقشعرّوا)
  return strip(base.slice(0, i + 1).join('') + marks + sh + r[1]);
}
function analyze(word) {
  const w = strip(word); const out = [];
  for (const [pron, suf, mk] of PRONOUNS) {
    const s = strip(suf); if (!w.endsWith(s)) continue;
    let stem = [...w.slice(0, w.length - s.length)];
    let i = stem.length - 1; const ms = [];
    while (i >= 0 && /[ً-ْ]/.test(stem[i])) ms.unshift(stem[i--]);
    const msj = ms.join(''), shd = msj.endsWith('ّ') && mk !== S;
    if (i < 0 || (shd ? msj.slice(0, -1) : msj) !== mk) continue;
    const bases = [stem.slice(0, i + 1).join('') + F + (shd ? 'ّ' : '')];
    if (mk === S) { // احتمال فكّ التضعيف: ... س ْ ص َ ص ْ ← ... س َ ص َّ
      const st = stem.join('').match(/^(.*[^\u064B-\u0652])ْ(.)َ(.)ْ$/);
      if (st && st[2] === st[3]) bases.push(st[1] + F + st[2] + 'َّ');
    }
    for (const base of bases) for (const a of M.analyze(base)) {
      const pat = M.PATTERNS.find(p => p.وزن === a.وزن && p.نوع === a.نوع);
      if (pat && (PAST_SOUND(pat) || (!tailSukun(pat) && /^ماضٍ/.test(pat.نوع)))) out.push({ ...a, ضمير: pron, اللاحقة: suf });
    }
  }
  return out;
}

// ===== المضارع والأمر المسندان (الفعل الصحيح): تحوّل حرف المضارعة وخاتمة الضمة =====
// [الضمير، حرف المضارعة، علامة آخر حرف، لاحقة بعده]
const PRES = [
  ['أنا', 'أ', 'ُ', ''], ['نحن', 'ن', 'ُ', ''], ['أنتَ/هي', 'ت', 'ُ', ''], ['أنتِ', 'ت', 'ِ', 'ينَ'],
  ['أنتما/هما (ث)', 'ت', 'َ', 'انِ'], ['هما (م)', 'ي', 'َ', 'انِ'], ['أنتم', 'ت', 'ُ', 'ونَ'], ['هم', 'ي', 'ُ', 'ونَ'],
  ['أنتنّ', 'ت', 'ْ', 'نَ'], ['هنّ', 'ي', 'ْ', 'نَ'],
  // منصوب ومجزوم بحذف النون (بعد هذه الصفوف الأولى المرفوعة)
  ['أنتِ', 'ت', 'ِ', 'ي'], ['أنتما/هما (ث)', 'ت', 'َ', 'ا'], ['هما (م)', 'ي', 'َ', 'ا'], ['أنتم', 'ت', 'ُ', 'وا'], ['هم', 'ي', 'ُ', 'وا'],
];
// [الضمير، علامة آخر حرف، لاحقة]
const IMP = [['أنتَ', 'ْ', ''], ['أنتِ', 'ِ', 'ي'], ['أنتما', 'َ', 'ا'], ['أنتم', 'ُ', 'وا'], ['أنتنّ', 'ْ', 'نَ']];
const PRES_SOUND = p => /^مضارع/.test(p.نوع) && p.missing == null && !p.dbl && !String(p.units[p.units.length - 1].ع || '').includes('ّ'); // المختوم بشدّة مؤجَّل
const IMP_SOUND = p => /^أمر/.test(p.نوع) && p.missing == null && !p.dbl && !String(p.units[p.units.length - 1].ع || '').includes('ّ'); // المختوم بشدّة (اقشعرِرْ) يُفكّ؛ مؤجَّل
const MK = /[ً-ْ]/;
function splitLast(chars) { let i = chars.length - 1; while (MK.test(chars[i])) i--; return [chars.slice(0, i + 1), chars.slice(i + 1).join('')]; }
function conjPresent(root, pat, pron) {
  const r = PRES.find(x => x[0] === pron); if (!r) throw new Error('ضمير غير معروف');
  const b = [...strip(M.generate(root, pat))]; // ي + علامة ... آخر + ُ
  const [head, tail] = splitLast(b); if (tail !== 'ُ' || b[0] !== 'ي') throw new Error('ليست صيغة مضارع صحيحة');
  let first = 1; // حرف المضارعة ثم علامته
  const m0 = [b[1]]; // علامة حرف المضارعة (فتحة أو ضمة)
  return strip(r[1] + head.slice(1).join('') + r[2] + r[3]);
}
function conjImperative(root, pat, pron) {
  const r = IMP.find(x => x[0] === pron); if (!r) throw new Error('ضمير غير معروف');
  const [head, tail] = splitLast([...strip(M.generate(root, pat))]); if (tail !== 'ْ') throw new Error('ليست صيغة أمر صحيحة');
  return strip(head.join('') + r[1] + r[2]);
}
function analyzePresent(word) {
  const w = strip(word), out = [];
  for (const [pron, pre, mk, suf] of PRES) {
    const sf = strip(mk + suf); if (!w.endsWith(sf) || w.length <= sf.length + 1) continue;
    const stem = [...w.slice(0, w.length - sf.length)]; // ... آخر حرف بلا علامة
    if (MK.test(stem[stem.length - 1])) continue;
    for (const sub of [pre === 'أ' ? ['أ'] : [pre]][0]) { if (stem[0] !== sub) continue;
      const base = 'ي' + stem.slice(1).join('') + 'ُ';
      for (const a of M.analyze(base)) { const pt = M.PATTERNS.find(p => p.وزن === a.وزن && p.نوع === a.نوع); if (pt && PRES_SOUND(pt)) out.push({ ...a, ضمير: pron, لاحقة: mk + suf }); } }
  }
  return out;
}
function analyzeImperative(word) {
  const w = strip(word), out = [];
  for (const [pron, mk, suf] of IMP) {
    const sf = strip(mk + suf); if (!w.endsWith(sf) || w.length <= sf.length + 1) continue;
    const stem = w.slice(0, w.length - sf.length); if (MK.test(stem[stem.length - 1])) continue;
    for (const a of M.analyze(stem + 'ْ')) { const pt = M.PATTERNS.find(p => p.وزن === a.وزن && p.نوع === a.نوع); if (pt && IMP_SOUND(pt)) out.push({ ...a, ضمير: pron, لاحقة: mk + suf }); }
  }
  return out;
}

const analyzePast = analyze;
function analyzeAll(w) { return [...analyzePast(w), ...analyzePresent(w), ...analyzeImperative(w)]; }
module.exports = { PRONOUNS, PRES, IMP, PAST_SOUND, PRES_SOUND, IMP_SOUND, conjugate, conjPresent, conjImperative, analyzePast, analyzePresent, analyzeImperative, analyze: analyzeAll };
if (require.main === module) { const w = process.argv[2]; console.log(JSON.stringify(analyze(w), null, 1)); }

 };
 defs["morph_conj_weak_pres"] = function (module, exports, require) {
// إسناد المضارع والأمر للمعتل والمضعّف على الحروف الذرية.
// أجوف: يَقُولُونَ ← يَقُلْنَ (يُقصَّر مع نون النسوة)؛ ناقص: يَدْعُو، تَدْعِينَ، يَدْعُوَانِ، يَرْمُونَ، يَخْشَوْنَ؛ مضعّف: يَمُدُّونَ ← يَمْدُدْنَ.
'use strict';
const M = require('./morph_ar.js');
const strip = s => s.normalize('NFC');
const glyph = u => u.ب + u.ع;
const TYPES = ['أجوف', 'ناقص', 'مضعّف'];
const startsY = p => p.units[0] && p.units[0].lit && p.units[0].lit.startsWith('ي');
const isPresW = p => TYPES.includes(p.نوع) && startsY(p) && (p.missing != null || p.dbl);
const IMP_NAMES = new Set(['فُلْ', 'فِلْ', 'فَلْ', 'ٱفْعُ', 'ٱفْعِ', 'ٱفْعَ', 'فِعَّ', 'فُعَّ', 'فَعَّ']);
const isImpW = p => TYPES.includes(p.نوع) && IMP_NAMES.has(p.وزن) && (p.missing != null || p.dbl);
// ضمائر المضارع: [الاسم، حرف المضارعة، فئة]  (فئة: same، fem، dual، pm، pf)
const PP = [['أنا', 'أ', 'same'], ['نحن', 'ن', 'same'], ['أنتَ/هي', 'ت', 'same'], ['أنتِ', 'ت', 'fem'], ['أنتما/هما (ث)', 'ت', 'dual'], ['هما (م)', 'ي', 'dual'], ['أنتم', 'ت', 'pm'], ['هم', 'ي', 'pm'], ['أنتنّ', 'ت', 'pf'], ['هنّ', 'ي', 'pf']];
// ختام الناقص بحسب الفئة: [ختام الغائب] ← ختام الصيغة
const DEF_END = { same: { 'ُو': 'ُو', 'ِي': 'ِي', 'َى': 'َى' }, fem: { 'ُو': 'ِينَ', 'ِي': 'ِينَ', 'َى': 'َيْنَ' }, dual: { 'ُو': 'ُوَانِ', 'ِي': 'ِيَانِ', 'َى': 'َيَانِ' }, pm: { 'ُو': 'ُونَ', 'ِي': 'ُونَ', 'َى': 'َوْنَ' }, pf: { 'ُو': 'ُونَ', 'ِي': 'ِينَ', 'َى': 'َيْنَ' } };
const swapY = (us, pre) => [{ ب: pre, ع: us[0].ع }, ...us.slice(1)];
function conjPresent(root, pat, pron) {
  const r = PP.find(x => x[0] === pron); if (!r) throw new Error('ضمير غير معروف');
  const us = M.units(M.generate(root, pat)); const [, pre, cls] = r;
  if (pat.dbl) { // ي ف ع+ُّ
    const f = us[1], y = us[2];
    if (cls === 'pf') return strip(pre + us[0].ع + f.ب + 'ْ' + y.ب + 'ُ' + y.ب + 'ْنَ');
    const mk = { same: 'ُ', fem: 'ِ', dual: 'َ', pm: 'ُ' }[cls]; const suf = { same: '', fem: 'ينَ', dual: 'انِ', pm: 'ونَ' }[cls];
    return strip(pre + us[0].ع + glyph(f) + y.ب + mk + 'ّ' + suf);
  }
  if (pat.missing === 1) {
    const sw = swapY(us, pre);
    if (cls === 'pf') { const k = sw.findIndex((u, i) => i > 0 && !u.ع && 'وياا'.includes(u.ب)); sw.splice(k, 1); const l = sw[sw.length - 1]; sw[sw.length - 1] = { ب: l.ب, ع: 'ْ' }; return strip(sw.map(glyph).join('') + 'نَ'); }
    const l = sw[sw.length - 1]; const base = sw.slice(0, -1).map(glyph).join('') + l.ب;
    return strip(base + { same: 'ُ', fem: 'ِينَ', dual: 'َانِ', pm: 'ُونَ' }[cls]);
  }
  // ناقص: الختام الحرف المعتل بعد حركة (وقد تتخلله شدّة: يُفَعِّي، يَتَفَعَّى)
  const g = strip(M.generate(root, pat)); const m = g.match(/^(.*?)([ُِ َ])(ّ?)([وىي])$/); if (!m) throw new Error('ختام غير معروف ' + g);
  const end = DEF_END[cls][m[2] + m[4]]; if (!end) throw new Error('ختام غير معروف ' + g);
  return strip(pre + m[1].slice(1) + end[0] + m[3] + end.slice(1));
}
const IMP = [['أنتَ', 'same'], ['أنتِ', 'fem'], ['أنتما', 'dual'], ['أنتم', 'pm'], ['أنتنّ', 'pf']];
function conjImperative(root, pat, pron) {
  const r = IMP.find(x => x[0] === pron); if (!r) throw new Error('ضمير غير معروف'); const cls = r[1];
  const us = M.units(M.generate(root, pat)); const g = strip(M.generate(root, pat));
  if (pat.missing === 1) { // فُلْ: ف+حركة، ل+سكون
    const f = us[0], l = us[1]; const v = f.ع; const L = { 'ُ': 'و', 'ِ': 'ي', 'َ': 'ا' }[v];
    if (cls === 'same') return g;
    if (cls === 'pf') return strip(g + 'نَ');
    return strip(f.ب + v + L + l.ب + { fem: 'ِي', dual: 'َا', pm: 'ُوا' }[cls]);
  }
  if (pat.missing === 2) { // ٱفْعُ، ٱفْعِ، ٱفْعَ
    const k = g.slice(-1); const base = g.slice(0, -1); const kind = { 'ُ': 'ُو', 'ِ': 'ِي', 'َ': 'َى' }[k];
    if (cls === 'same') return g;
    const table = { 'ُ': { fem: 'ِي', dual: 'ُوَا', pm: 'ُوا', pf: 'ُونَ' }, 'ِ': { fem: 'ِي', dual: 'ِيَا', pm: 'ُوا', pf: 'ِينَ' }, 'َ': { fem: 'َيْ', dual: 'َيَا', pm: 'َوْا', pf: 'َيْنَ' } };
    return strip(base + table[k][cls]);
  }
  // مضعّف: فُعَّ ← مُدَّ
  const f = us[0], y = us[1]; const v = f.ع;
  if (cls === 'same') return g;
  if (cls === 'pf') return strip('ٱ' + f.ب + 'ْ' + y.ب + v + y.ب + 'ْنَ');
  return strip(f.ب + v + y.ب + { fem: 'ِّي', dual: 'َّا', pm: 'ُّوا' }[cls]);
}
// ---- التحليل ----
const find = x => M.PATTERNS.find(p => p.وزن === x.وزن && p.نوع === x.نوع);
function analyzePresent(word) {
  const w = strip(word), out = [];
  const push = (base, pron, pred) => { for (const a of M.analyze(strip(base))) { const pt = find(a); if (pt && isPresW(pt) && pred(pt)) out.push({ ...a, ضمير: pron }); } };
  for (const [pron, pre, cls] of PP) {
    if (w[0] !== pre) continue; const rest = w.slice(1);
    // أجوف: ... ل + لاحقة
    const hs = { same: ['ُ'], fem: ['ِينَ'], dual: ['َانِ'], pm: ['ُونَ'] }[cls];
    if (hs) for (const s of hs) if (rest.endsWith(s) && rest.length > s.length) { const stem = rest.slice(0, -s.length); if (!/[ً-ْ]/.test(stem.slice(-1))) push('ي' + stem + 'ُ', pron, p => p.missing === 1); }
    if (cls === 'pf' && rest.endsWith('ْنَ')) { // مقصَّر: يَقُلْنَ ← يَقُولُ ؛ أو مفكوك: يَمْدُدْنَ
      const stem = rest.slice(0, -2); const us = M.units('ي' + stem);
      // أجوف: أدخل حرف العلة بين الفاء واللام
      for (const L of ['و', 'ي', 'ا']) { const u = us.slice(); const l = u.pop(); u.push({ ب: L, ع: '' }, { ب: l.ب, ع: 'ُ' }); push(u.map(glyph).join(''), pron, p => p.missing === 1); }
      const n = us.length; if (n >= 4 && us[n - 1].ع === 'ْ' && us[n - 1].ب === us[n - 2].ب && us[n - 3].ع === 'ْ') for (const v of ['َ', 'ُ', 'ِ']) push(us.slice(0, n - 3).map(glyph).join('') + us[n - 3].ب + v + us[n - 1].ب + 'ُّ', pron, p => p.dbl);
    }
    // مضعّف مع الشدّة
    const ds = cls !== 'pf';
    if (ds) { const tail = { same: 'ُ', fem: 'ِ', dual: 'َ', pm: 'ُ' }[cls] + 'ّ' + { same: '', fem: 'ينَ', dual: 'انِ', pm: 'ونَ' }[cls]; if (rest.endsWith(tail) && rest.length > tail.length) push('ي' + rest.slice(0, -tail.length) + 'ُّ', pron, p => p.dbl); }
    // ناقص
    for (const [e, we] of Object.entries(DEF_END[cls])) for (const sh of ['', 'ّ']) { const w2 = we[0] + sh + we.slice(1), e2 = e[0] + sh + e.slice(1); if (rest.endsWith(w2) && rest.length > w2.length) push('ي' + rest.slice(0, -w2.length) + e2, pron, p => p.missing === 2); }
  }
  return out;
}
function analyzeImperative(word) {
  const w = strip(word), out = [];
  const push = (cand, pron, pred) => { for (const a of M.analyze(strip(cand))) { const pt = find(a); if (pt && isImpW(pt) && pred(pt)) out.push({ ...a, ضمير: pron }); } };
  for (const [pron, cls] of IMP) {
    if (cls === 'same') { push(w, pron, () => true); continue; }
    // أجوف
    const m = cls !== 'pf' && w.match(/^(.)([ُِ َ])([وياا])(.)(ِي|َا|ُوا)$/);
    const sfx = { fem: 'ِي', dual: 'َا', pm: 'ُوا' }[cls];
    if (m && m[5] === sfx) { const v = m[2]; if (({ 'ُ': 'و', 'ِ': 'ي', 'َ': 'ا' })[v] === m[3]) push(m[1] + v + m[4] + 'ْ', pron, p => p.missing === 1); }
    if (cls === 'pf') { const m2 = w.match(/^(.)([ُِ َ])(.)ْنَ$/); if (m2) push(m2[1] + m2[2] + m2[3] + 'ْ', pron, p => p.missing === 1); }
    // ناقص: ٱفْعُ
    const dt = { 'ُ': { fem: 'ِي', dual: 'ُوَا', pm: 'ُوا', pf: 'ُونَ' }, 'ِ': { fem: 'ِي', dual: 'ِيَا', pm: 'ُوا', pf: 'ِينَ' }, 'َ': { fem: 'َيْ', dual: 'َيَا', pm: 'َوْا', pf: 'َيْنَ' } };
    for (const k of ['ُ', 'ِ', 'َ']) { const s = dt[k][cls]; if (w.endsWith(s) && w.length > s.length) push(w.slice(0, -s.length) + k, pron, p => p.missing === 2); }
    // مضعّف
    const ms = { fem: 'ِّي', dual: 'َّا', pm: 'ُّوا' }[cls];
    if (ms && w.endsWith(ms)) { const stem = w.slice(0, -ms.length); push(stem + 'َّ', pron, p => p.dbl); push(stem + 'ُّ', pron, p => p.dbl); push(stem + 'ِّ', pron, p => p.dbl); }
    if (cls === 'pf') { const m3 = w.match(/^ٱ(.)ْ(.)([َُِ])\2ْنَ$/); if (m3) for (const v of ['َ', 'ُ', 'ِ']) { if (v === m3[3]) push(m3[1] + v + m3[2] + 'َّ', pron, p => p.dbl); } }
  }
  return out;
}
module.exports = { isPresW, isImpW, PP, IMP, conjPresent, conjImperative, analyzePresent, analyzeImperative };

 };
 defs["morph_conj_weak"] = function (module, exports, require) {
// إسناد الماضي المعتل والمضعّف إلى الضمائر على الحروف الذرية: أجوف (قُلْتُ)، ناقص (دَعَوْتُ، رَمَتْ)، مضعّف (مَدَدْتُ، مَدُّوا).
// القاعدة: مع ضمائر الرفع الساكنة (تُ، نَا، نَ …) يُقصَّر الأجوف ويُفكّ المضعّف ويُقلب ختام الناقص؛ ومع الباقي تبقى الصيغة.
'use strict';
const M = require('./morph_ar.js'), C = require('./morph_conj.js'), PW = require('./morph_conj_weak_pres.js');
const strip = s => s.normalize('NFC');
const glyph = u => u.ب + u.ع;
const S_PRON = new Set(C.PRONOUNS.filter(r => r[2] === 'ْ').map(r => r[0]));
const SUF = Object.fromEntries(C.PRONOUNS.map(r => [r[0], r[1]]));
const isHollow = p => /^ماضٍ أجوف/.test(p.نوع) && p.missing === 1;
const isDefective = p => /^ماضٍ ناقص/.test(p.نوع) && p.missing === 2;
const isDoubled = p => /^ماضٍ مضعّف/.test(p.نوع) && p.dbl;
const MUNPACK = new Set(['IV', 'X']); // ما يُرجَع فيه السكون إلى فاء الفعل عند فكّ التضعيف (أَحْبَبْتُ، اسْتَمْرَرْتُ)

// ---- أجوف: صيغ مقصَّرة للضمائر الساكنة ----
const SHORT_HOLLOW = [
  ['فُلْ', 'I', ['و'], 'ُ'], ['فِلْ', 'I', ['و', 'ي'], 'ِ'], ['أَفَلْ', 'IV'], ['ٱنْفَلْ', 'VII'], ['ٱفْتَلْ', 'VIII'], ['ٱسْتَفَلْ', 'X'],
].map(([q, b, f, v]) => M.makePattern(q, 'قصير', b, q, { missing: 1, fill: f || ['و', 'ي'], vowel: v }));
function hollowStem(root, pat, vowel) {
  const r = [...root];
  if (pat.باب === 'I') { const v = vowel || (r[1] === 'ي' ? 'ِ' : 'ُ'); return strip(r[0] + v + r[2] + 'ْ'); }
  const us = M.units(M.generate(root, pat)); const k = us.findIndex(u => u.ب === 'ا' && !u.ع); us.splice(k, 1);
  const last = us[us.length - 1]; us[us.length - 1] = { ب: last.ب, ع: 'ْ' };
  return strip(us.map(glyph).join(''));
}
// ---- مضعّف ----
function doubledStem(root, pat) {
  const us = M.units(M.generate(root, pat)); const last = us.pop(), prev = us.pop();
  const pg = MUNPACK.has(pat.باب) ? prev.ب + 'ْ' : glyph(prev);
  return strip(us.map(glyph).join('') + pg + last.ب + 'َ' + last.ب + 'ْ');
}
// ---- ناقص ----
function defectiveForm(g, pron) {
  const kind = g.endsWith('ا') ? 'A' : g.endsWith('ى') ? 'Y' : 'I';
  const cut = g.slice(0, -1), suf = SUF[pron];
  if (S_PRON.has(pron)) return strip(kind === 'A' ? cut + 'وْ' + suf : kind === 'Y' ? cut + 'يْ' + suf : cut + suf);
  if (pron === 'هي') return strip(kind === 'I' ? g + suf : cut + suf);
  if (pron === 'هما (م)') return strip(kind === 'A' ? cut + 'وَا' : kind === 'Y' ? cut + 'يَا' : g + 'ا');
  if (pron === 'هما (ث)') return strip(kind === 'I' ? g + suf : cut + suf);
  if (pron === 'هم') return strip(kind === 'I' ? g.slice(0, -3) + 'ُوا' : cut + 'وْا');
  throw new Error('ضمير غير معروف');
}
function conjugate(root, pat, pron, vowel) {
  if (isHollow(pat)) return S_PRON.has(pron) ? strip(hollowStem(root, pat, vowel) + SUF[pron]) : C.conjugate(root, pat, pron);
  if (isDoubled(pat)) return S_PRON.has(pron) ? strip(doubledStem(root, pat) + SUF[pron]) : C.conjugate(root, pat, pron);
  if (isDefective(pat)) return defectiveForm(strip(M.generate(root, pat)), pron);
  return C.conjugate(root, pat, pron);
}
// ---- التحليل ----
const PAST = x => M.PATTERNS.find(p => p.وزن === x.وزن && p.نوع === x.نوع);
function analyze(word) {
  const w = strip(word), out = [];
  for (const [pron, suf0] of C.PRONOUNS) {
    const suf = strip(suf0); if (!w.endsWith(suf) || w.length <= suf.length + 1) continue;
    const stem = w.slice(0, w.length - suf.length);
    if (S_PRON.has(pron)) {
      for (const a of M.analyzeWith(stem, SHORT_HOLLOW)) {
        const sp = SHORT_HOLLOW.find(p => p.وزن === a.وزن); const orig = M.PATTERNS.find(p => isHollow(p) && p.باب === sp.باب && (sp.باب !== 'I' || true));
        if (a.جذر) out.push({ جذر: a.جذر, وزن: sp.باب === 'I' ? 'فَالَ' : M.PATTERNS.find(p => isHollow(p) && p.باب === sp.باب).وزن, نوع: 'ماضٍ أجوف', باب: sp.باب, معتل: true, ضمير: pron, لاحقة: suf0, حركة_العين: sp.vowel });
      }
      // مضعّف مفكوك: ... س[حركة] ص َ ص ْ
      const us = M.units(stem); const n = us.length;
      if (n >= 3 && us[n - 1].ع === 'ْ' && us[n - 2].ع === 'َ' && us[n - 1].ب === us[n - 2].ب) {
        const head = us.slice(0, n - 2), y = us[n - 1].ب;
        const tryBase = (h, mustUnpack) => { for (const a of M.analyze(strip(h.map(glyph).join('') + y + 'َّ'))) { const pt = PAST(a); if (pt && isDoubled(pt) && MUNPACK.has(pt.باب) === mustUnpack) out.push({ ...a, ضمير: pron, لاحقة: suf0 }); } };
        tryBase(head, false);
        const pv = head[head.length - 1]; if (pv && pv.ع === 'ْ') tryBase([...head.slice(0, -1), { ب: pv.ب, ع: 'َ' }], true);
      }
    }
    // الناقص: إعادة بناء الغائب المفرد
    const cands = [];
    if (S_PRON.has(pron)) { if (stem.endsWith('وْ')) cands.push(stem.slice(0, -2) + 'ا'); if (stem.endsWith('يْ')) cands.push(stem.slice(0, -2) + 'ى'); if (stem.endsWith('ي')) cands.push(stem + 'َ'); }
    else if (pron === 'هي' || pron === 'هما (ث)') { cands.push(stem + 'ا', stem + 'ى'); if (stem.endsWith('يَ')) cands.push(stem); }
    else if (pron === 'هما (م)') { if (stem.endsWith('وَ')) cands.push(stem.slice(0, -2) + 'ا'); if (stem.endsWith('يَ')) { cands.push(stem.slice(0, -2) + 'ى'); cands.push(stem); } }
    else if (pron === 'هم') { if (stem.endsWith('وْ')) cands.push(stem.slice(0, -2) + 'ا', stem.slice(0, -2) + 'ى'); if (stem.endsWith('ُ')) cands.push(stem.slice(0, -1) + 'ِيَ'); }
    for (const c of cands) for (const a of M.analyze(strip(c))) { const pt = PAST(a); if (pt && isDefective(pt)) out.push({ ...a, ضمير: pron, لاحقة: suf0 }); }
  }
  if (w.endsWith('وْا') && w.length > 5) { // واو الجماعة بعد ختام الناقص: دَعَوْا، رَمَوْا
    const stem = w.slice(0, -3);
    for (const c of [stem + 'ا', stem + 'ى']) for (const a of M.analyze(strip(c))) { const pt = PAST(a); if (pt && isDefective(pt)) out.push({ ...a, ضمير: 'هم', لاحقة: 'وْا' }); }
  }
  return out;
}
function analyzeAll(word) {
  const seen = new Set(), out = [];
  for (const a of [...analyze(word), ...C.analyze(word), ...PW.analyzePresent(word), ...PW.analyzeImperative(word)]) { const k = [a.جذر, a.وزن, a.نوع, a.ضمير].join('|'); if (!seen.has(k)) { seen.add(k); out.push(a); } }
  return out;
}
module.exports = { isHollow, isDefective, isDoubled, conjugate, analyze, analyzeAll, S_PRON };
if (require.main === module) console.log(JSON.stringify(analyze(process.argv[2]), null, 1));

 };
 defs["morph_clitic"] = function (module, exports, require) {
// السوابق واللواحق على الحروف الذرية للفعل: سوابق (وَ، فَ، سَ، لِ) ولواحق ضمائر المفعول (هُ، هَا، هُمْ، كَ، نِي، نَا …).
// التحليل: نزع السوابق ثم اللواحق، ثم تحليل الساق بمحلل الأوزان والإسناد؛ الألف بعد واو الجماعة تُستعاد عند نزع اللاحقة.
'use strict';
const M = require('./morph_ar.js'), C = require('./morph_conj_weak.js');
const strip = s => s.normalize('NFC');
// [السابقة، الوظيفة، تُسبق بمضارع فقط؟]
const PROCLITICS = [['وَ', 'عطف', false], ['فَ', 'عطف', false], ['سَ', 'استقبال', true], ['لِ', 'تعليل/أمر', true], ['لَ', 'توكيد', false]];
const ENCLITICS = [['هُ', 'هو'], ['هَا', 'هي'], ['هُمَا', 'هما'], ['هُمْ', 'هم'], ['هُنَّ', 'هنّ'], ['كَ', 'أنتَ'], ['كِ', 'أنتِ'], ['كُمَا', 'أنتما'], ['كُمْ', 'أنتم'], ['كُنَّ', 'أنتنّ'], ['نِي', 'أنا'], ['نَا', 'نحن']];
const isPresent = a => /^مضارع/.test(a.نوع);
function stems(w) { // الساق بعد نزع اللاحقة (مع إعادة الألف)
  const out = [{ stem: w, enc: null }];
  for (const [e, ref] of ENCLITICS) {
    const s = strip(e); if (!w.endsWith(s) || w.length === s.length) continue;
    let st = w.slice(0, w.length - s.length);
    out.push({ stem: st, enc: [e, ref] });
    if (/و$/.test(st)) out.push({ stem: st + 'ا', enc: [e, ref] }); // كَتَبُوهُ ← كَتَبُوا + هُ
  }
  return out;
}
function analyze(word) {
  const w0 = strip(word), res = [];
  const heads = [{ pre: [], rest: w0 }];
  for (const [p, fn, presOnly] of PROCLITICS) { const s = strip(p); if (w0.startsWith(s) && w0.length > s.length) heads.push({ pre: [[p, fn, presOnly]], rest: w0.slice(s.length) });
    for (const [p2, fn2, po2] of PROCLITICS) { const s2 = strip(p2); if (p !== p2 && w0.startsWith(s + s2)) heads.push({ pre: [[p, fn, presOnly], [p2, fn2, po2]], rest: w0.slice(s.length + s2.length) }) } }
  for (const h of heads) for (const { stem, enc } of stems(h.rest)) {
    const ans = [...M.analyze(stem), ...C.analyzeAll(stem)].map(a => ({ ...a, حالة: 'رفع/ماضٍ' }));
    // المضارع منصوبًا ومجزومًا: آخره فتحة أو سكون بدل الضمة
    const m = stem.match(/^(.*[^\u064B-\u0652])([\u064E\u0652])$/);
    if (m) for (const a of M.analyze(m[1] + '\u064F')) if (isPresent(a)) ans.push({ ...a, حالة: m[2] === '\u064E' ? 'نصب' : 'جزم' });
    for (const a of ans) {
      if (h.pre.some(([, , po]) => po) && !isPresent(a)) continue;
      res.push({ ...a, سوابق: h.pre.map(x => x[0]), لاحقة_مفعول: enc ? enc[0] : null });
    }
  }
  return res;
}
function generate(root, pat, { pre = [], enc = null } = {}) {
  let w = strip(M.generate(root, pat));
  if (enc) { const e = ENCLITICS.find(x => x[0] === enc); if (!e) throw new Error('لاحقة غير معروفة'); if (/وا$/.test(w)) w = w.slice(0, -1); w += strip(e[0]); }
  return strip(pre.join('') + w);
}
module.exports = { PROCLITICS, ENCLITICS, analyze, generate };
if (require.main === module) console.log(JSON.stringify(analyze(process.argv[2]), null, 1));

 };
 defs["morph_noun"] = function (module, exports, require) {
// صرف الأسماء على الحروف الذرية: قراءة الوزن (مصادر، مشتقات، صفات، جموع تكسير) من الحروف الظاهرة، ثم نزع الإعراب والتعريف والضمائر.
// القوالب مكتوبة بصورة المرفوع المنوَّن «ٌ» (أو «ُ» للممنوع من الصرف)؛ الفاء والعين واللام (والقاف للرابع) مواضع الجذر.
'use strict';
const M = require('./morph_ar.js');
const strip = s => s.normalize('NFC');
const T = (list, نوع, باب, opts) => list.split(/\s+/).filter(Boolean).map(q => M.makePattern(q, نوع, باب, q, opts || {}));
const NP = [
  // مصادر الثلاثي (سماعية)
  ...T('فَعْلٌ فَعَلٌ فِعْلٌ فُعْلٌ فُعُولٌ فِعَالٌ فَعَالٌ فُعَالٌ فَعِيلٌ فَعُولٌ فَعَالَةٌ فِعَالَةٌ فُعُولَةٌ فُعْلَةٌ فَعْلَةٌ فِعْلَةٌ فَعَلَةٌ فَعِيلَةٌ فُعَالَةٌ فُعْلَانٌ فِعْلَانٌ فَعَلَانٌ فَعْلَانُ فِعِّيلٌ فُعَّالٌ فَعَّالٌ فَعَّالَةٌ فَعْلَلَةٌ أُفْعُولَةٌ أُفْعُولٌ فُعْلُولٌ فِعْلِيلٌ فَعْلُولٌ تَفْعُلَةٌ فِعْلِيَّةٌ فُعُلَةٌ فَعُلَةٌ', 'مصدر/صفة', 'ثلاثي'),
  // صفات وأوزان أخرى
  ...T('فَعِلٌ فَعُلٌ فَاعِلٌ فَاعِلَةٌ فَعِلَةٌ مَفْعُولٌ مَفْعُولَةٌ أَفْعَلُ فَعْلَى فَعْلَاءُ فُعْلَى فُعْلَانُ فَاعُولٌ فَوْعَلٌ فَيْعَلٌ فَعَوْلَلٌ فَيْعُولٌ', 'صفة/اسم', 'ثلاثي'),
  // اسم المكان والزمان والآلة
  ...T('مَفْعَلٌ مَفْعِلٌ مَفْعَلَةٌ مَفْعِلَةٌ مَفْعُلَةٌ مِفْعَلٌ مِفْعَلَةٌ مِفْعَالٌ مِفْعَالَةٌ مُفْعُولٌ مِفْعَلَانٌ', 'مكان/آلة', 'ثلاثي'),
  // مصادر ومشتقات المزيد
  ...T('تَفْعِيلٌ تَفْعِلَةٌ تَفْعَالٌ مُفَاعَلَةٌ إِفْعَالٌ تَفَعُّلٌ تَفَاعُلٌ ٱنْفِعَالٌ ٱفْتِعَالٌ ٱسْتِفْعَالٌ ٱفْعِلَالٌ ٱفْعِيعَالٌ', 'مصدر مزيد', 'مزيد'),
  ...T('مُفَعِّلٌ مُفَعَّلٌ مُفَاعِلٌ مُفَاعَلٌ مُفْعِلٌ مُفْعَلٌ مُتَفَعِّلٌ مُتَفَعَّلٌ مُتَفَاعِلٌ مُتَفَاعَلٌ مُنْفَعِلٌ مُنْفَعَلٌ مُفْتَعِلٌ مُفْتَعَلٌ مُسْتَفْعِلٌ مُسْتَفْعَلٌ مُفْعَلٌّ مُفْعَالٌّ', 'مشتق مزيد', 'مزيد'),
  // الرباعي
  ...T('فَعْلَلَةٌ فِعْلَالٌ فَعْلَلٌ فِعْلَلٌ فُعْلُلٌ فَعْلَلِيلٌ مُفَعْلِلٌ مُفَعْلَلٌ مُتَفَعْلِلٌ تَفَعْلُلٌ ٱفْعِنْلَالٌ ٱفْعِلَالٌّ', 'رباعي', 'رباعي', { quad: true }),
  // جموع التكسير
  ...T('أَفْعُلٌ أَفْعَالٌ أَفْعِلَةٌ فِعْلَةٌ فُعُولٌ فِعَالٌ فِعَلٌ فُعَلٌ فَعَلٌ فَعَلَةٌ فُعَّلٌ فُعَّالٌ فِعْلَانٌ فُعْلَانٌ فُعَلَاءُ أَفْعِلَاءُ فَوَاعِلُ مَفَاعِلُ مَفَاعِيلُ فَعَائِلُ فَعَالِلُ أَفَاعِلُ أَفَاعِيلُ فَعَالِيلُ تَفَاعِيلُ تَفَاعِلُ فَعَالَى فُعَالَى فِعَلَةٌ فُعُلٌ فُعَلَةٌ فَعَالِلَةٌ مَفَاعِلَةٌ فَعْلَى فَعِلَى', 'جمع تكسير', 'جمع'),
  ...T('فَوَاعِلُ مَفَاعِلُ فَعَائِلُ فَعَالِلُ أَفَاعِلُ أَفَاعِيلُ فَعَالِيلُ', 'جمع تكسير رباعي', 'جمع', { quad: true }),
];
// المؤنَّث ‹ـَةٌ› يُشتقّ آليًّا من كل قالب مذكّر منوَّن لا ينتهي بتاء مربوطة (فَاعِلٌ ← فَاعِلَةٌ)
{ const have = new Set(NP.map(p => p.وزن)); const add = [];
  for (const p of NP) { if (!/ٌ$/.test(p.وزن) || /ةٌ$/.test(p.وزن) || /[ىاءي]ٌ$/.test(p.وزن)) continue; const q = p.وزن.replace(/(.)ٌ$/, '$1َةٌ'); if (!have.has(q)) { have.add(q); add.push(M.makePattern(q, p.نوع + ' مؤنث', p.باب, q, { quad: p.quad })); } }
  NP.push(...add); }

// ===== الأسماء المعتلة: أجوف (العين محذوفة/معتلة)، ناقص (اللام)، مثال (الفاء) =====
const WW = (list, missing, fill, نوع, باب) => list.split(/\s+/).filter(Boolean).map(q => M.makePattern(q, نوع, باب, q, { missing, fill }));
const WY = ['و', 'ي'];
NP.push(
  // أجوف: الفاء واللام ظاهرتان
  ...WW('فَوْلٌ فُولٌ فَوَلٌ فُوَالٌ فُولَةٌ فَوْلَةٌ فَوَلَةٌ فُوَلٌ فُوَلَةٌ فُعُولٌ مَفُولٌ مَفُولَةٌ مَفْوَلٌ مَفْوَلَةٌ مَفْوِلٌ مَفُولَةٌ تَفْوِيلٌ تَفَوُّلٌ مُفَوَّلٌ مُفَوِّلٌ فَوَّالٌ فَوْلَى فَوْلَانٌ فَوَلَانٌ أَفْوَالٌ أَفْوِلَةٌ فِوَلٌ فِوَلَةٌ فُوَّالٌ فُوَّلٌ فُوُولٌ فَوْلَاءُ فُوَلَاءُ أَفْوِلَاءُ مُفْتَوِلٌ مُتَفَوِّلٌ', 1, ['و'], 'أجوف واوي', 'أجوف'),
  ...WW('فَيْلٌ فِيلٌ فَيَلٌ فِيَالٌ فِيلَةٌ فَيْلَةٌ فَيَلَةٌ فِيَلٌ فَيَّالٌ فِيلَانٌ فَيْلَانُ أَفْيَالٌ أَفْيِلَةٌ فُيُولٌ فَيْلُولَةٌ مَفِيلٌ مَفِيلَةٌ مَفْيَلٌ مَفْيِلٌ مَفْيَلَةٌ تَفْيِيلٌ تَفَيُّلٌ مُفَيِّلٌ مُفَيَّلٌ فَيَالِيلُ فَيَاعِلُ فِيَلٌ فَيْلَى فَيْلَاءُ', 1, ['ي'], 'أجوف يائي', 'أجوف'),
  ...WW('فَالٌ فَالَةٌ فَالَى فَالَانٌ فَالَاتٌ فِيَالٌ فِيَالَةٌ فُوَالٌ فُيَالٌ فَيَالٌ فَوَالٌ مَفَالٌ مَفَالَةٌ مِفْيَالٌ مِفْوَالٌ مُفَالٌ مُفَالَةٌ مُفِيلٌ مُفِيلَةٌ إِفَالَةٌ ٱسْتِفَالَةٌ ٱنْفِيَالٌ ٱفْتِيَالٌ ٱفْتِيَالَةٌ مُسْتَفِيلٌ مُسْتَفَالٌ مُنْفَالٌ مُنْفَالَةٌ مُفْتَالٌ مُسْتَفَالَةٌ مُنْفَيِلٌ مُفْتَيَلٌ مُتَفَيِّلٌ مُتَفَوِّلٌ', 1, WY, 'أجوف', 'أجوف'),
  ...WW('فَائِلٌ فَائِلَةٌ فَائِلَاتٌ مَفِيلٌ مَفُولٌ فَيِّلٌ فُوَّلٌ فَيِّلٌ فَوَائِلُ فَوَائِيلُ مَفَائِلُ مَفَاوِلُ مَفَايِلُ مَفَاوِيلُ مَفَائِيلُ فَوَاعِيلُ فَيَاعِلُ فَيَاعِيلُ', 1, WY, 'أجوف', 'أجوف'),
  // ناقص: الفاء والعين ظاهرتان (اللام محذوفة أو تحوّلت)
  ...WW('فَاعٍ فَاعِيَةٌ فَاعِيَاتٌ مَفْعِيٌّ مَفْعِيَّةٌ مَفْعُوٌّ مَفْعُوَّةٌ مَفْعًى مَفْعَاةٌ مَفْعِيَةٌ مَفْعُوَّةٌ مِفْعَاةٌ مِفْعًى فُعَاةٌ فَعَاةٌ فِعَاءٌ فَعَاءٌ فُعَاءٌ إِفْعَاءٌ ٱسْتِفْعَاءٌ تَفْعِيَةٌ تَفَعٍّ مُفَعٍّ مُتَفَعٍّ مُفْعٍ مُسْتَفْعٍ مُفَاعٍ مُتَفَاعٍ مُفْتَعٍ مُنْفَعٍ مُفَعًّى مُفْعًى مُفْتَعًى مُسْتَفْعًى مُنْفَعًى مُتَفَعًّى مُتَفَاعًى مُفَاعًى مُسْتَفْعَاةٌ مُفْعَاةٌ مُفْتَعَاةٌ مُفَاعَاةٌ مُفَعَّاةٌ فَوَاعٍ مَفَاعٍ فَعَالٍ أَفْعٍ أَفْعَاءٌ فِعًى فَعًى فُعًى فُعْيَةٌ فَعْوَى فُعْيٌ فَعِيٌّ فَعُوٌّ فَعْيَةٌ فِعْيَةٌ فَعَوَاتٌ فَعَيَاتٌ فُعُوٌّ فُعِيٌّ أَفْعِيَاءُ أَفْعِيَةٌ فُعْلِيٌّ', 2, WY, 'ناقص', 'ناقص'),
  // مثال: الفاء واو/ياء (محذوفة أو ظاهرة)
  ...WW('عِلَةٌ عِلٌ عِلَةٌ تَعِلَةٌ مِيعَالٌ مِيعَلٌ مَوْعِلٌ مَوْعَلٌ مَوْعِلَةٌ مُوعِلٌ مُوعَلٌ مُوعِلَةٌ مُوعَلَةٌ إِيعَالٌ ٱتِّعَالٌ مُتَّعِلٌ مُتَّعَلٌ مُتَّعِلَةٌ ٱسْتِيعَالٌ مُسْتَوْعِلٌ تَوَاعُلٌ مُتَوَاعِلٌ تَوْعِيلٌ تَوَعُّلٌ مُتَوَعِّلٌ مُوَعِّلٌ مُوَاعِلٌ مُوَاعَلَةٌ فِيعَالٌ تَوْعِلَةٌ', 0, ['و', 'ي'], 'مثال', 'مثال'),
);
// ===== الجذر المضعّف (العين = اللام): دمج المثلين =====
{ const dblOf = p => { const us = p.units; const i1 = us.findIndex(u => u.slot === 1); const i2 = us.findIndex(u => u.slot === 2); if (i1 < 0 || i2 !== i1 + 1 || p.quad || p.missing != null) return null;
    const m1 = us[i1].ع, m2 = us[i2].ع, pre = us[i1 - 1];
    const mk = (m) => m; const out = us.slice();
    if (m1 === 'ْ') { out.splice(i1, 2, { slot: 1, ع: m2.replace(/^(.)/, '$1') + 'ّ' }); }
    else if (pre && pre.slot === 0 && pre.ع === 'ْ') { out.splice(i1 - 1, 3, { slot: 0, ع: m1 }, { slot: 1, ع: m2 + 'ّ' }); }
    else if (pre && pre.lit && /ا$/.test(pre.lit) && /^[َُِ]$/.test(m1)) { out.splice(i1, 2, { slot: 1, ع: m2 + 'ّ' }); }
    else if (/^[َُِ]$/.test(m1) && us[i1 - 1] && us[i1 - 1].slot === 0 && /^[َُِ]$/.test(us[i1 - 1].ع) && false) return null;
    else return null;
    return out; };
  const add = []; for (const p of NP.slice()) { const us = dblOf(p); if (!us) continue; add.push({ وزن: p.وزن + ' (مضعّف)', نوع: p.نوع + ' مضعّف', باب: p.باب, units: us, dbl: true }); }
  NP.push(...add); }

// أبنية ممنوعة من الصرف (تنتهي بضمة بلا تنوين في الرفع)
// ---- تطبيع الإعراب: الصيغة المنوّنة ‹ٌ› والصيغة المضمومة ‹ُ› ----
const MARKS = /[ً-ْ]/;
// تنظيف طباعي: تكرار العلامة نفسها (دُخََّالٌ)، وعلامة على ألف المدّ (جَلاَدَةٌ)
const clean = w => strip(strip(w).replace(/([ً-ْ])\1+/g, '$1').replace(/ا[َُِ]/g, 'ا'));
function endingVariants(w) {
  const us = M.units(w); if (!us.length) return [];
  const out = new Set([strip(w)]); const last = us[us.length - 1]; const mk = last.ع;
  const body = us.slice(0, -1).map(u => u.ب + u.ع).join('');
  const withEnd = (b, e) => strip(b + e);
  // تنوين الفتح قبل ألف: ...ً + ا
  if (last.ب === 'ا' && !mk && us.length > 1 && us[us.length - 2].ع === 'ً') { const b = us.slice(0, -2).map(u => u.ب + u.ع).join(''); out.add(withEnd(b, us[us.length - 2].ب + 'ٌ')); }
  const strip1 = last.ع.replace(/[ًٌٍَُِ]/g, '');
  if (/^[ًٌٍَُِ]ّ?$/.test(mk)) { const sh = mk.endsWith('ّ') ? 'ّ' : ''; out.add(withEnd(body, last.ب + 'ٌ' + sh)); out.add(withEnd(body, last.ب + 'ُ' + sh)); if (sh) out.add(withEnd(body, last.ب + 'ٌّ')); }
  // الناقص المعرَّف: ...ِي ← ...ٍ ، ...َى ← ...ً ى
  if (!mk && last.ب === 'ي' && us.length > 1 && us[us.length - 2].ع === 'ِ') { const b = us.slice(0, -2).map(u => u.ب + u.ع).join(''); out.add(withEnd(b, us[us.length - 2].ب + 'ٍ')); }
  if (!mk && (last.ب === 'ى') && us.length > 1 && us[us.length - 2].ع === 'َ') { const b = us.slice(0, -2).map(u => u.ب + u.ع).join(''); out.add(withEnd(b, us[us.length - 2].ب + 'ً') + 'ى'); }
  if (!mk) out.add(strip(w));
  // الممنوع من الصرف في الجر/النصب: ...َ
  return [...out];
}
const waslaVariants = w => { const base = strip(w); const v = [base, base.replace(/^اِ/, 'ٱ'), base.replace(/^اُ/, 'ٱ')]; if (/^[ٱا](?![ً-ْ])/.test(base)) v.push('ٱ' + base.slice(1)); return [...new Set(v)]; };
const HAM = s => s.replace(/[أإؤئآ]/g, 'ء');
// الأساس: نزع المثنى والجمع السالم والنسب ثم ردّ الإعراب
function bases(word) {
  const w = clean(word), out = [{ b: w, ز: null }];
  const us = M.units(w), n = us.length, G = u => u.ب + u.ع, J = (a, e) => strip(a.map(G).join('') + e);
  const prevSet = (k, ع, add) => { const u = us.slice(0, k); if (!u.length) return null; const l = u[u.length - 1]; if (l.ع !== ع) return null; return strip(u.slice(0, -1).map(G).join('') + l.ب + add); };
  // جمع المؤنث السالم: ... َ ا ت + إعراب
  if (n > 3 && us[n - 2].ب === 'ا' && us[n - 1].ب === 'ت' && /^[ًٌٍَُِ]?$/.test(us[n - 1].ع)) { const k = n - 2; const l = us[k - 1]; if (l && l.ع === 'َ') { out.push({ b: strip(us.slice(0, k - 1).map(G).join('') + l.ب + 'َةٌ'), ز: 'جمع مؤنث سالم' }); out.push({ b: strip(us.slice(0, k - 1).map(G).join('') + l.ب + 'ٌ'), ز: 'جمع مؤنث سالم' }); out.push({ b: strip(us.slice(0, k - 1).map(G).join('') + l.ب + 'َةٌ'), ز: 'جمع مؤنث سالم' }); } }
  // المثنى: ... َ ا ن ِ | ... َ ي ْ ن ِ  ، الجمع المذكر: ... ُ و ن َ | ... ِ ي ن َ
  const tail = us.slice(-3).map(G).join(''), tail4 = us.slice(-4).map(G).join('');
  const dual = [['انِ', 'َ', 3], ['انِ', 'َ', 2], ['يْنِ', 'َ', 3], ['ينَ', 'ِ', 3], ['ونَ', 'ُ', 3]];
  for (const suf of ['انِ', 'يْنِ', 'ونَ', 'ينَ']) { const t = strip(suf), x = strip(us.map(G).join('')); if (x.endsWith(t)) { const stem = M.units(x.slice(0, -t.length)); const l = stem[stem.length - 1]; if (l && /^[َُِ]$/.test(l.ع)) out.push({ b: strip(stem.slice(0, -1).map(G).join('') + l.ب + 'ٌ'), ز: 'مثنى/جمع مذكر' }); } }
  // المثنى للمؤنث: ... َ ت َ ا ن ِ | ... َ ت َ ي ْ ن ِ
  for (const suf of ['تَانِ', 'تَيْنِ']) { const t = strip(suf), x = strip(us.map(G).join('')); if (x.endsWith(t)) { const stem = x.slice(0, -t.length); out.push({ b: strip(stem + 'َةٌ'), ز: 'مثنى مؤنث' }); } }
  // النسب: ... ِ يٌّ | ... ِ يَّ ةٌ | ... ِ يَّ اتٌ
  const x = strip(us.map(G).join(''));
  for (const [suf, z] of [['يٌّ', 'نسب'], ['يٍّ', 'نسب'], ['يًّا', 'نسب'], ['يُّ', 'نسب'], ['يَّةٌ', 'مصدر صناعي'], ['يَّةً', 'مصدر صناعي'], ['يَّةٍ', 'مصدر صناعي'], ['يَّةُ', 'مصدر صناعي']]) { const t = strip(suf); if (x.endsWith(t) && x.length > t.length + 2) { const stem = M.units(x.slice(0, -t.length)); const l = stem[stem.length - 1]; if (l && l.ع === 'ِ') { out.push({ b: strip(stem.slice(0, -1).map(G).join('') + l.ب + 'ٌ'), ز: z }); out.push({ b: strip(stem.slice(0, -1).map(G).join('') + l.ب + 'َةٌ'), ز: z }); } } }
  return out;
}
// تساهل مع الكتابة الناقصة: حرف المدّ بلا حركة الحرف السابق (مانٌ ← مَانٌ، فِيلٌ ← فِيلٌ)
function lenientRest(w) { return lenient(w); }
function lenient(word) {
  const us = M.units(clean(word)), vowel = { 'ا': 'َ', 'ي': 'ِ', 'و': 'ُ' }, G = u => u.ب + u.ع; const out = new Set();
  for (const only of [['ا'], ['ا', 'ي', 'و']]) { const v = us.map(u => ({ ...u })); let ch = false;
    for (let i = 1; i < v.length; i++) { const u = v[i]; if (!u.ع && only.includes(u.ب) && v[i - 1].ع === '' && !'اويىءأإؤئآةٱ'.includes(v[i - 1].ب)) { v[i - 1].ع = vowel[u.ب]; ch = true; } }
    if (ch) out.add(strip(v.map(G).join(''))); }
  // همزة أول الكلمة بلا حركة: أَ / إِ
  if (us.length && !us[0].ع && (us[0].ب === 'أ' || us[0].ب === 'إ')) { const base = us.map(u => ({ ...u })); base[0].ع = us[0].ب === 'أ' ? 'َ' : 'ِ'; const a = strip(base.map(G).join('')); out.add(a); for (const x of lenientRest(a)) out.add(x); }
  return [...out];
}
function analyzeBare(word, opts = {}) {
  const r = analyzeExact(word);
  if (opts.exact) return r;
  const seen = new Set(r.map(a => a.جذر + '|' + a.وزن + '|' + (a.ز || ''))), out = r.slice();
  for (const w of lenient(word)) for (const a of analyzeExact(w)) { const k = a.جذر + '|' + a.وزن + '|' + (a.ز || ''); if (!seen.has(k)) { seen.add(k); out.push({ ...a, تقريبي: true }); } }
  return out;
}
function analyzeExact(word) {
  const seen = new Set(), out = [];
  for (const { b, ز } of bases(word)) for (const v of waslaVariants(b)) for (const e of endingVariants(v)) for (const a of M.analyzeWith(e, NP)) {
    const k = a.جذر + '|' + a.وزن + '|' + (ز || ''); if (!seen.has(k)) { seen.add(k); out.push({ ...a, معتل: /[ويءأإؤئآى]/.test(a.جذر), ...(ز ? { ز } : {}) }); }
  }
  return out;
}
module.exports = { NP, analyzeBare, endingVariants, HAM };
if (require.main === module) console.log(JSON.stringify(analyzeBare(process.argv[2]), null, 1));

 };
 defs["morph_noun_clitic"] = function (module, exports, require) {
// سوابق الأسماء ولواحقها على الحروف الذرية: وَ فَ بِ لِ كَ + «ال» (مع إدغام اللام الشمسية) + ضمائر الإضافة (هُ هَا هُمَا هُمْ هُنَّ كَ كِ كُمَا كُمْ كُنَّ ي نَا).
'use strict';
const M = require('./morph_ar.js'), N = require('./morph_noun.js');
const strip = s => s.normalize('NFC');
const SUN = new Set([...'تثدذرزسشصضطظلن']);
const CONJ = ['وَ', 'فَ'], PREP = ['بِ', 'لِ', 'كَ'];
const POSS = [['هُ', 'هو'], ['هَا', 'هي'], ['هُمَا', 'هما'], ['هُمْ', 'هم'], ['هُنَّ', 'هنّ'], ['كَ', 'أنتَ'], ['كِ', 'أنتِ'], ['كُمَا', 'أنتما'], ['كُمْ', 'أنتم'], ['كُنَّ', 'أنتنّ'], ['ي', 'أنا'], ['نَا', 'نحن']];
const G = u => u.ب + u.ع;
// نزع «ال»: الْكَاتِبُ ← كَاتِبٌ ، الشَّمْسُ ← شَمْسٌ (اللام الشمسية: يُنزع التضعيف)
function stripAl(w) {
  const us = M.units(strip(w)); const out = [];
  const a = us[0], l = us[1];
  if (a && l && (a.ب === 'ا' || a.ب === 'ٱ') && l.ب === 'ل' && (l.ع === 'ْ' || l.ع === '') && us.length > 3) {
    const r = us.slice(2); const f = r[0];
    out.push({ w: strip(r.map(G).join('')), sun: false });
    if (f.ع.includes('ّ') && SUN.has(f.ب)) { const g = f.ع.replace('ّ', ''); out.push({ w: strip([{ ب: f.ب, ع: g }, ...r.slice(1)].map(G).join('')), sun: true }); }
  }
  return out;
}
function peel(word) {
  const w0 = strip(word); const heads = [{ pre: [], rest: w0, al: false }];
  const push = (pre, rest, al) => heads.push({ pre, rest, al });
  const steps = [];
  const tryPrefix = (list, h) => { for (const p of list) { const s = strip(p); if (h.rest.startsWith(s) && h.rest.length > s.length + 1) steps.push({ pre: [...h.pre, p], rest: h.rest.slice(s.length), al: h.al }); } };
  // وَ/فَ ثم بِ/لِ/كَ
  const lv1 = []; for (const h of heads) tryPrefix(CONJ, h); heads.push(...steps.splice(0));
  for (const h of heads.slice()) { tryPrefix(PREP, h); } heads.push(...steps.splice(0));
  // «لِلْ» : لِ + ال المحذوفة همزتها (لِلْكَاتِبِ)
  for (const h of heads.slice()) { const m = h.rest.normalize('NFC'); const us = M.units(m); if (h.pre.length && h.pre[h.pre.length - 1] === 'لِ' && false) continue; }
  const out = [];
  for (const h of heads) { out.push({ pre: h.pre, rest: h.rest, al: false }); for (const a of stripAl(h.rest)) out.push({ pre: h.pre, rest: a.w, al: true }); 
    // لِلْ: بعد اللام المكسورة تأتي «لْ» بلا ألف
    const us = M.units(h.rest); if (h.pre[h.pre.length - 1] === 'لِ' || false) { /* لا شيء: اللام الجارّة نُزعت وبقي «لْ» أو «ل» */ }
    { const us3 = M.units(h.rest); if (h.pre[h.pre.length - 1] === 'لِ' && us3.length > 2 && us3[0].ب === 'ل' && !us3[0].ع && us3[1].ع.includes('ّ') && SUN.has(us3[1].ب)) out.push({ pre: h.pre, rest: strip([{ ب: us3[1].ب, ع: us3[1].ع.replace('ّ', '') }, ...us3.slice(2)].map(G).join('')), al: true }); }
    const m = h.rest.match(/^ل(?:ْ)?/); if (h.pre[h.pre.length - 1] === 'لِ' && m) { const us2 = M.units(h.rest); if (us2[0] && us2[0].ب === 'ل' && (us2[0].ع === 'ْ')) { const r = us2.slice(1); out.push({ pre: h.pre, rest: strip(r.map(G).join('')), al: true }); const f = r[0]; if (f && f.ع.includes('ّ') && SUN.has(f.ب)) out.push({ pre: h.pre, rest: strip([{ ب: f.ب, ع: f.ع.replace('ّ', '') }, ...r.slice(1)].map(G).join('')), al: true }); } } }
  return out;
}
function enclitics(rest) { // [{stem, enc}] ؛ ضمير الإضافة يلي حركة الإعراب
  const out = [{ stem: rest, enc: null }];
  const KV = POSS.filter(x => /^هُ/.test(x[0])).map(x => [x[0].replace('ُ', 'ِ'), x[1]]); // هِ هِمَا هِمْ هِنَّ بعد الكسرة (قَوْلِهِ)
  for (const [e, ref] of [...POSS, ...KV]) { const s = strip(e); if (rest.endsWith(s) && rest.length > s.length + 1) { const stem = rest.slice(0, -s.length); out.push({ stem, enc: [e, ref] }); if (/تُ$|تِ$|تَ$/.test(stem)) out.push({ stem: strip(stem.slice(0, -2) + 'ةُ'), enc: [e, ref] }); } }
  return out;
}
function analyze(word) {
  const seen = new Set(), res = [];
  for (const h of peel(word)) for (const { stem, enc } of enclitics(h.rest)) for (const a of N.analyzeBare(stem)) {
    const k = [a.جذر, a.وزن, h.pre.join(''), h.al, enc ? enc[0] : '', a.ز || ''].join('|'); if (seen.has(k)) continue; seen.add(k);
    res.push({ ...a, سوابق: h.pre, تعريف: h.al, لاحقة_إضافة: enc ? enc[0] : null });
  }
  return res;
}
// توليد: صيغة اسمية مرفوعة + سوابق + «ال» + ضمير إضافة
function generate(root, pat, { pre = [], al = false, enc = null } = {}) {
  let us = M.units(strip(M.generate(root, pat))); // مرفوع منوَّن «ٌ» أو مضموم «ُ»
  const lastU = us[us.length - 1];
  if (al || enc) us[us.length - 1] = { ب: lastU.ب, ع: lastU.ع.replace(/[ًٌٍ]/g, 'ُ') };
  if (enc) {
    const e = POSS.find(x => x[0] === enc); if (!e) throw new Error('ضمير غير معروف');
    const l = us[us.length - 1]; if (l.ب === 'ة') us[us.length - 1] = { ب: 'ت', ع: l.ع };
    if (enc === 'ي') { const k = us[us.length - 1]; us[us.length - 1] = { ب: k.ب, ع: 'ِ' }; us.push({ ب: 'ي', ع: '' }); }
    else us.push(...M.units(e[0]));
  }
  let w = us.map(G).join('');
  if (al) {
    const f = us[0], lamOnly = pre.length && pre[pre.length - 1] === 'لِ';
    const body = SUN.has(f.ب) ? [{ ب: f.ب, ع: f.ع + 'ّ' }, ...us.slice(1)].map(G).join('') : null;
    w = (lamOnly ? '' : 'ا') + (SUN.has(f.ب) ? 'ل' + body : 'لْ' + w);
  }
  return strip(pre.join('') + w);
}
module.exports = { analyze, generate, peel, enclitics, stripAl, POSS };
if (require.main === module) console.log(JSON.stringify(analyze(process.argv[2]), null, 1));

 };
 defs["morph_particles"] = function (module, exports, require) {
// الجوامد المغلقة (الحروف والضمائر والأسماء المبنية) على الحروف الذرية: جدول ثابت مكتوب بالتشكيل الكامل، لا يُشتق بوزن.
// التحليل: تطابق تام بعد توحيد النون المشدّدة وحذف التنوين الطارئ؛ ويقبل التشكيل الجزئي (حرف بلا علامة يطابق أي علامة).
'use strict';
const A = require('./atomic_ar.js');
const T = {
  'حرف جر': ['مِنْ', 'إِلَى', 'عَنْ', 'عَلَى', 'فِي', 'بِ', 'لِ', 'كَ', 'حَتَّى', 'مُذْ', 'مُنْذُ', 'رُبَّ', 'خَلَا', 'عَدَا', 'حَاشَا', 'وَ', 'تَ'],
  'حرف عطف': ['وَ', 'فَ', 'ثُمَّ', 'أَوْ', 'أَمْ', 'بَلْ', 'لَكِنْ', 'لَا', 'حَتَّى'],
  'حرف نفي': ['لَا', 'لَمْ', 'لَنْ', 'مَا', 'لَيْسَ', 'إِنْ', 'لَمَّا', 'لَاتَ'],
  'حرف استفهام': ['هَلْ', 'أَ', 'مَنْ', 'مَا', 'مَاذَا', 'مَتَى', 'أَيْنَ', 'كَيْفَ', 'كَمْ', 'أَيَّانَ', 'أَنَّى', 'أَيُّ', 'لِمَاذَا', 'لِمَ'],
  'حرف شرط': ['إِنْ', 'إِذَا', 'لَوْ', 'لَوْلَا', 'لَوْمَا', 'أَمَّا', 'مَنْ', 'مَا', 'مَهْمَا', 'أَيْنَمَا', 'حَيْثُمَا', 'كَيْفَمَا', 'مَتَى'],
  'حرف نصب': ['أَنْ', 'لَنْ', 'كَيْ', 'إِذَنْ'],
  'حرف جزم': ['لَمْ', 'لَمَّا', 'لَا', 'لِ'],
  'حرف مشبّه بالفعل': ['إِنَّ', 'أَنَّ', 'كَأَنَّ', 'لَكِنَّ', 'لَيْتَ', 'لَعَلَّ'],
  'حرف توكيد': ['قَدْ', 'لَقَدْ', 'إِنَّ', 'أَنَّ', 'لَ'],
  'حرف تنفيس': ['سَ', 'سَوْفَ'],
  'حرف نداء': ['يَا', 'أَيَا', 'هَيَا', 'وَا', 'أَيُّهَا', 'أَيَّتُهَا'],
  'حرف جواب': ['نَعَمْ', 'بَلَى', 'أَجَلْ', 'جَيْرِ', 'إِي', 'كَلَّا'],
  'حرف تحضيض': ['هَلَّا', 'أَلَا', 'لَوْلَا', 'لَوْمَا', 'أَلَّا'],
  'حرف مصدري': ['أَنْ', 'أَنَّ', 'مَا', 'كَيْ', 'لَوْ'],
  'حرف استثناء': ['إِلَّا', 'غَيْرَ', 'سِوَى', 'خَلَا', 'عَدَا', 'حَاشَا'],
  'ضمير منفصل': ['أَنَا', 'نَحْنُ', 'أَنْتَ', 'أَنْتِ', 'أَنْتُمَا', 'أَنْتُمْ', 'أَنْتُنَّ', 'هُوَ', 'هِيَ', 'هُمَا', 'هُمْ', 'هُنَّ', 'إِيَّايَ', 'إِيَّاكَ', 'إِيَّاكِ', 'إِيَّاهُ', 'إِيَّاهَا', 'إِيَّانَا', 'إِيَّاكُمْ', 'إِيَّاهُمْ'],
  'اسم إشارة': ['هَذَا', 'هَذِهِ', 'هَذَانِ', 'هَاتَانِ', 'هَؤُلَاءِ', 'ذَلِكَ', 'تِلْكَ', 'ذَانِكَ', 'تَانِكَ', 'أُولَئِكَ', 'هُنَا', 'هُنَاكَ', 'هُنَالِكَ', 'ثَمَّ', 'هَكَذَا', 'ذَاكَ', 'ذَا', 'ذِي', 'تِي', 'تَا'],
  'اسم موصول': ['الَّذِي', 'الَّتِي', 'اللَّذَانِ', 'اللَّتَانِ', 'الَّذِينَ', 'اللَّاتِي', 'اللَّائِي', 'اللَّوَاتِي', 'مَنْ', 'مَا', 'ذُو', 'ذَاتُ', 'أَيُّ'],
  'ظرف': ['إِذْ', 'إِذَا', 'حَيْثُ', 'أَمَامَ', 'خَلْفَ', 'فَوْقَ', 'تَحْتَ', 'بَيْنَ', 'عِنْدَ', 'لَدَى', 'لَدُنْ', 'قَبْلَ', 'بَعْدَ', 'مَعَ', 'دُونَ', 'حَوْلَ', 'وَرَاءَ', 'يَمِينَ', 'شِمَالَ', 'أَثْنَاءَ', 'خِلَالَ', 'عَبْرَ', 'نَحْوَ', 'قُرْبَ', 'أَسْفَلَ', 'أَعْلَى', 'بَيْنَمَا', 'كُلَّمَا', 'لَمَّا', 'مُنْذُ', 'الْآنَ', 'أَمْسِ', 'غَدًا', 'دَائِمًا', 'أَبَدًا', 'قَطُّ', 'عَوْضُ'],
  'أداة': ['كُلُّ', 'بَعْضُ', 'غَيْرُ', 'سِوَى', 'مِثْلُ', 'شِبْهُ', 'نَفْسُ', 'ذَاتُ', 'كِلَا', 'كِلْتَا', 'جَمِيعُ', 'عَامَّةُ', 'أَيْضًا', 'فَقَطْ', 'جِدًّا', 'تَقْرِيبًا', 'حَتْمًا', 'رُبَّمَا', 'لَعَلَّ', 'كَذَلِكَ', 'لَكِنْ', 'أَيْ', 'أَجْمَعُ', 'بَيْدَ', 'إِذًا', 'إِذَنْ', 'عَسَى', 'لَدَيْ'],
  'فعل جامد': ['كَانَ', 'أَصْبَحَ', 'أَضْحَى', 'ظَلَّ', 'بَاتَ', 'صَارَ', 'لَيْسَ', 'مَازَالَ', 'مَابَرِحَ', 'مَافَتِئَ', 'مَاانْفَكَّ', 'مَادَامَ', 'عَسَى', 'كَادَ', 'أَوْشَكَ', 'كَرَبَ', 'نِعْمَ', 'بِئْسَ', 'حَبَّذَا', 'ظَنَّ', 'حَسِبَ', 'خَالَ', 'زَعَمَ', 'رَأَى', 'عَلِمَ', 'وَجَدَ', 'اتَّخَذَ', 'جَعَلَ', 'هَاتِ', 'تَعَالَ', 'هَلُمَّ', 'هَاكَ'],
};
const N = s => A.encode(s.normalize('NFC'));
const strip = s => s.replace(/[ً-ْٰ]/g, '');
// الفهرس: صيغة ذرية كاملة ← فئات؛ ومفتاح بلا تشكيل ← صيغ
const exact = new Map(), bare = new Map();
for (const [cat, list] of Object.entries(T)) for (const w of list) {
  const k = N(w); if (!exact.has(k)) exact.set(k, new Set()); exact.get(k).add(cat);
  const b = strip(w); if (!bare.has(b)) bare.set(b, new Set()); bare.get(b).add(w);
}
const fold = s => s.normalize('NFC').replace(/[آأإٱ]/g, 'ا');
// يطابق الصيغة المدخلة بالجدول: تامّة إن طابقت الشكل بعد توحيد الألفات، وإلا بلا تشكيل (غير مشكَّلة)
function analyze(word) {
  const w = word.normalize('NFC'); const out = [];
  const full = exact.get(N(w)); if (full) for (const c of full) out.push({ نوع: c, شكل: w, ثقة: 'تام' });
  if (!full) {
    const b = strip(w), fb = fold(b);
    if (!/[ً-ْ]/.test(w) || true) for (const [k, forms] of bare) {
      if (fold(k) !== fb) continue;
      for (const f of forms) {
        // التشكيل الجزئي المدخل يجب أن يوافق شكل الجدول حرفًا بحرف
        const cs = [...f.normalize('NFC')], ws = [...w];
        const want = cs.join(''); const ok = isPartial(ws.join(''), want);
        if (!ok) continue;
        for (const [cat, list] of Object.entries(T)) if (list.includes(f)) out.push({ نوع: cat, شكل: f, ثقة: /[ً-ْ]/.test(w) ? 'جزئي' : 'غير مشكَّل' });
      }
    }
  }
  return out;
}
// هل «النص المدخل» (قد يحذف بعض العلامات) مجموعة جزئية من «الشكل الكامل»؟
function isPartial(inp, full) {
  const toU = s => { const r = []; for (const c of [...s]) { if (/[ً-ْٰ]/.test(c) && r.length) r[r.length - 1].m += c; else r.push({ b: c, m: '' }); } return r; };
  const a = toU(inp), b = toU(full); if (a.length !== b.length) return false;
  return a.every((u, i) => fold(u.b) === fold(b[i].b) && (u.m === '' || [...u.m].every(ch => b[i].m.includes(ch))));
}
const all = () => [...exact.keys()].length;
module.exports = { T, analyze, isPartial, size: () => Object.values(T).reduce((n, l) => n + l.length, 0), forms: all };
if (require.main === module) console.log(JSON.stringify(analyze(process.argv[2]), null, 1));

 };
 defs["morph_particles_clitic"] = function (module, exports, require) {
// الجوامد مع سوابقها ولواصقها على الحروف الذرية: (وَ|فَ)? (بِ|لِ|كَ)? + جامد + ضمير متصل. تُولَّد الصيغ السطحية كلها من الجدول ثم تُفهرس.
// القواعد الصوتية: ما قبل الضمير يتغير بحسب آخره (عَلَى←عَلَيْ، مِنْ+ي←مِنِّي، لِ+هُ←لَهُ، هُ←هِ بعد الكسرة أو الياء، مِنْ+مَا←مِمَّا).
'use strict';
const P = require('./morph_particles.js');
const A = require('./atomic_ar.js');
const F = 'َ', D = 'ُ', K = 'ِ', S = 'ْ', SH = 'ّ';
const strip = s => s.replace(/[ً-ْٰ]/g, '');
const fold = s => s.normalize('NFC').replace(/[آأإٱ]/g, 'ا');
const PRO = [['هُ', 'غائب'], ['هَا', 'غائبة'], ['هُمَا', 'غائبان'], ['هُمْ', 'غائبون'], ['هُنَّ', 'غائبات'], ['كَ', 'مخاطب'], ['كِ', 'مخاطبة'], ['كُمَا', 'مخاطبان'], ['كُمْ', 'مخاطبون'], ['كُنَّ', 'مخاطبات'], ['نَا', 'متكلمون'], ['ي', 'متكلم']];
const kasraH = p => /^ه[ُ]/.test(p) ? p.replace('ُ', K) : p; // هُ هُمَا هُمْ هُنَّ ← هِ هِمَا هِمْ هِنَّ
// قبول الضمير المتصل
const ENC_CATS = new Set(['حرف جر', 'ظرف', 'حرف مشبّه بالفعل', 'حرف استثناء', 'حرف توكيد']);
const ENC_BASES = new Set(['مِنْ', 'إِلَى', 'عَنْ', 'عَلَى', 'فِي', 'بِ', 'لِ', 'كَ', 'حَتَّى', 'مُذْ', 'مُنْذُ', 'رُبَّ', 'خَلَا', 'عَدَا', 'حَاشَا', 'سِوَى', 'غَيْرَ', 'لَدَى', 'لَدُنْ', 'مَعَ', 'عِنْدَ', 'بَيْنَ', 'قَبْلَ', 'بَعْدَ', 'فَوْقَ', 'تَحْتَ', 'أَمَامَ', 'خَلْفَ', 'حَوْلَ', 'وَرَاءَ', 'دُونَ', 'نَحْوَ', 'إِنَّ', 'أَنَّ', 'كَأَنَّ', 'لَكِنَّ', 'لَيْتَ', 'لَعَلَّ', 'لَوْلَا', 'قَدْ', 'أَيُّ', 'أَيَّانَ', 'عَسَى', 'كِلَا', 'كِلْتَا', 'جَمِيعُ', 'لَيْسَ', 'كَانَ', 'ظَنَّ', 'لَدَيْ', 'إِذْ', 'إِذَا', 'حَيْثُ']);
// المصدر لا ينتهي بحرف علة هنا: نفصل الأنواع حسب الخاتمة
function withPro(base, pro) {
  const out = []; const b = base.normalize('NFC'); const ch = [...b]; const last = ch[ch.length - 1];
  const end2 = ch.slice(-2).join('');
  const pr = (p, kasraBefore) => (kasraBefore ? kasraH(p) : p);
  for (const [p0, g] of PRO) {
    let stem, kb = false, p = p0;
    if (/ى$/.test(b) || /ىً?$/.test(b)) { // عَلَى إِلَى لَدَى: ← عَلَيْ + هِ ، وللمتكلم عَلَيَّ
      const core = b.replace(/ى$/, 'ي'); if (p0 === 'ي') { out.push([core + 'َّ', g]); continue; } stem = core + S; kb = true; // عَلَيْ
    } else if (/نْ$/.test(b)) { // مِنْ عَنْ لَدُنْ مُنْذُ(لا): مِنْهُ ، مِنِّي ، مِنَّا
      if (p0 === 'ي') { out.push([b.slice(0, -2) + 'نِّي', g]); continue; } if (p0 === 'نَا') { out.push([b.slice(0, -2) + 'نَّا', g]); continue; }
      stem = b; // مِنْ + هُ
    } else if (/[ِ]$/.test(b) || /(^|[^ً-ْ])[بلك]ِ$/.test(b) || /فِي$/.test(b)) { // بِ لِ فِي: بِهِ ، لَهُ ، فِيهِ
      if (/^[بل]ِ$/.test(b) && b === 'لِ') { if (p0 === 'ي') { out.push(['لِي', g]); continue; } out.push(['لَ' + pr(p0, false), g]); continue; }
      if (b === 'بِ' || b === 'كَ') { if (b === 'كَ') { out.push(['كَ' + pr(p0, false), g]); continue; } out.push(['بِ' + (p0 === 'ي' ? 'ي' : pr(p0, true)), g]); continue; }
      if (/فِي$/.test(b)) { if (p0 === 'ي') { out.push(['فِيَّ', g]); continue; } stem = b; kb = true; } else continue;
    } else if (/[َ]$/.test(b) || /ّ$/.test(b) || /ّ[َ]$/.test(b) || /[ْ]$/.test(b) || /[ُ]$/.test(b)) { // مَعَ عِنْدَ إِنَّ ← إِنَّهُ ، للمتكلم: مَعِي ، عِنْدِي ، إِنِّي
      if (p0 === 'ي') { const c = b.replace(/[َُ]$/, ''); out.push([c.replace(/ّ$/, '') + (/ّ$/.test(c) ? 'ِّي' : 'ِي'), g]); if (/ّ$/.test(c)) out.push([c.slice(0, -1) + 'ِّي', g]); continue; }
      if (p0 === 'نَا' && /ّ$/.test(b.replace(/[َُ]$/, ''))) { const c = b.replace(/[َُ]$/, ''); out.push([c + 'َا' === 0 ? '' : c + 'نَا', g]); }
      stem = /[ُ]$/.test(b) ? b.slice(0, -1) + F : b; if (/ْ$/.test(b)) stem = b.slice(0, -1) + F; // قَدْ ← قَدْ؟ (لا لاصق)
    } else continue;
    out.push([stem + pr(p, kb), g]);
  }
  return out;
}
const pref1 = ['', 'وَ', 'فَ'];
const pref2 = ['', 'بِ', 'لِ', 'كَ'];
const BASES_PREF2 = new Set(['أَنْ', 'أَنَّ', 'مَا', 'مَنْ', 'لَا', 'لَوْ', 'إِنْ', 'مَاذَا', 'كَيْفَ', 'كَمْ', 'أَيٍّ', 'أَيُّ', 'هَذَا', 'هَذِهِ', 'ذَلِكَ', 'مِثْلُ', 'كُلُّ', 'بَعْضُ', 'غَيْرُ', 'نَفْسُ', 'أَيْنَ', 'مَتَى', 'لَيْسَ']);
const entries = []; // {form, cat, parts}
const seen = new Set();
const add = (form, cat, parts) => { const k = form.normalize('NFC') + '|' + cat; if (seen.has(k)) return; seen.add(k); entries.push({ form: form.normalize('NFC'), cat, parts }); };
for (const [cat, list] of Object.entries(P.T)) for (const w of list) {
  // سوابق على جامد ينتهي بحرف مستقل فقط من فئات معينة
  for (const a of pref1) {
    if (a && w === 'وَ' || w === 'فَ' || w === 'سَ' || (w.length <= 2 && !/^إِي|يَا|أَ$/.test(w) && a)) continue;
    add(a + w, cat, { سابقة: a, جامد: w });
    if (BASES_PREF2.has(w)) for (const b of pref2) if (b) add(a + b + w, cat, { سابقة: a + b, جامد: w });
    // لِ/بِ + ال: لِلَّذِي بِالَّذِي
    if (/^ال/.test(w)) for (const b of ['بِ', 'لِ', 'كَ']) add(a + (b === 'لِ' ? 'لِ' + w.slice(2).replace(/^([^َُِ])/, '$1') : b + w), cat, { سابقة: a + b, جامد: w });
  }
  if (ENC_BASES.has(w)) for (const a of pref1) for (const [f, g] of withPro(w, PRO)) add(a + f, cat + ' + ضمير متصل', { سابقة: a, جامد: w, ضمير: g });
  // جر + ما/من: مِمَّا، عَمَّا، مِمَّنْ، عَمَّنْ
}
for (const a of pref1) for (const [pre, post, res] of [['مِنْ', 'مَا', 'مِمَّا'], ['عَنْ', 'مَا', 'عَمَّا'], ['مِنْ', 'مَنْ', 'مِمَّنْ'], ['عَنْ', 'مَنْ', 'عَمَّنْ'], ['إِنْ', 'مَا', 'إِمَّا'], ['أَنْ', 'لَا', 'أَلَّا'], ['إِنْ', 'لَا', 'إِلَّا'], ['كُلَّ', 'مَا', 'كُلَّمَا'], ['بَعْدَ', 'مَا', 'بَعْدَمَا'], ['قَبْلَ', 'مَا', 'قَبْلَمَا'], ['حَيْثُ', 'مَا', 'حَيْثُمَا'], ['مِنْ', 'أَنْ', 'مِنْ أَنْ'], ['لَا', 'سِيَّمَا', 'لَاسِيَّمَا'], ['إِنَّ', 'مَا', 'إِنَّمَا'], ['أَنَّ', 'مَا', 'أَنَّمَا'], ['كَ', 'أَنَّ', 'كَأَنَّ'], ['بَيْنَ', 'مَا', 'بَيْنَمَا'], ['رُبَّ', 'مَا', 'رُبَّمَا'], ['لَوْ', 'مَا', 'لَوْمَا'], ['إِذْ', 'مَا', 'إِذْمَا'], ['مَا', 'دَامَ', 'مَادَامَ'], ['ثُمَّ', 'مَا', 'ثُمَّمَا'], ['عَلَى', 'مَا', 'عَلَى مَا']]) add(a + res, 'حرف مركّب', { سابقة: a, جامد: pre + '+' + post });
add('اللَّهُ', 'اسم الجلالة', {}); add('اللَّهِ', 'اسم الجلالة', {}); add('اللَّهَ', 'اسم الجلالة', {}); add('اللَّهُمَّ', 'اسم الجلالة', {}); add('لِلَّهِ', 'اسم الجلالة', {}); add('تَاللَّهِ', 'اسم الجلالة', {});
for (const a of [...pref1, 'وَبِ', 'وَلِ', 'فَبِ', 'فَلِ', 'بِ', 'لِ', 'وَتَ', 'تَ']) for (const c of ['اللَّهُ', 'اللَّهِ', 'اللَّهَ']) add(a + c, 'اسم الجلالة', {});
// الأسماء الخمسة وابن: تتصرف بالحروف ولا تنتظم في أوزان الأسماء الاعتيادية مع الإضافة
for (const [r, forms] of Object.entries({ أب: ['أَبُو', 'أَبِي', 'أَبَا'], أخ: ['أَخُو', 'أَخِي', 'أَخَا'], حم: ['حَمُو', 'حَمِي', 'حَمَا'], ذو: ['ذُو', 'ذِي', 'ذَا'], فم: ['فُو', 'فِي', 'فَا'], ابن: ['ابْنُ', 'ابْنِ', 'ابْنَ', 'بْنُ', 'بْنِ', 'بْنَ'] })) for (const f of forms) for (const a of pref1) add(a + f, 'اسم من الأسماء الخمسة/ابن', { جذر: r });
const idx = new Map();
for (const e of entries) { const k = fold(strip(e.form)); if (!idx.has(k)) idx.set(k, []); idx.get(k).push(e); }
const toU = s => { const r = []; for (const c of [...s]) { if (/[ً-ْٰ]/.test(c) && r.length) r[r.length - 1].m += c; else r.push({ b: c, m: '' }); } return r; };
const partial = (inp, full) => { const a = toU(inp), b = toU(full); if (a.length !== b.length) return false; return a.every((u, i) => fold(u.b) === fold(b[i].b) && (u.m === '' || [...u.m].every(ch => b[i].m.includes(ch)))); };
function analyze(word) {
  const w = word.normalize('NFC').replace(/ـ/g, ''); const c = idx.get(fold(strip(w))); if (!c) return [];
  return c.filter(e => partial(w, e.form)).map(e => ({ نوع: e.cat, شكل: e.form, ...e.parts, ثقة: e.form === w ? 'تام' : 'جزئي' }));
}
module.exports = { analyze, entries: () => entries, size: () => entries.length };
if (require.main === module) { console.log(entries.length); console.log(JSON.stringify(analyze(process.argv[2]), null, 1)); }

 };
 defs["morph_all"] = function (module, exports, require) {
// واجهة موحَّدة للتحليل الصرفي على الحروف الذرية: فعل (إسناد + لواصق)، اسم (أوزان + لواصق)، جامد (حروف وضمائر وإشارة…).
// تُستعمل في صفحة نواة: طلب «ما جذر كلمة …» و«حلّل صرفيًّا …» يُجاب محليًّا من هذه الطبقة.
'use strict';
const V = require('./morph_clitic.js'), N = require('./morph_noun_clitic.js'), P = require('./morph_particles.js'), PC = require('./morph_particles_clitic.js');
const HAR = /[ً-ْٰ]/;
const norm = s => s.replace(/[ً-ْٰـ]/g, '').replace(/[أإآٱ]/g, 'ا').replace(/ى/g, 'ي').replace(/ة/g, 'ه');
const AR = /[ء-ي]/;
function analyzeWord(w) {
  const out = [], seen = new Set();
  const push = (a) => { const k = JSON.stringify([a.kind, a.root, a.pattern, a.type, a.pre, a.enc, a.info]); if (!seen.has(k)) { seen.add(k); out.push(a); } };
  const parts = [...P.analyze(w), ...PC.analyze(w)];
  for (const a of parts) push({ kind: 'جامد', type: a.نوع, base: a.جامد || a.شكل, pre: a.سابقة || '', enc: a.ضمير || '', exact: a.ثقة === 'تام', score: a.ثقة === 'تام' ? 0 : 1 });
  const hasVowel = HAR.test(w);
  for (const a of V.analyze(w)) push({ kind: 'فعل', root: a.جذر, pattern: a.وزن, type: a.نوع, bab: a.باب, who: a.ضمير, mood: a.حالة && a.حالة !== 'رفع/ماضٍ' ? a.حالة : '', pre: (a.سوابق || []).join(''), enc: a.لاحقة_مفعول || '', weak: a.معتل, score: 2 + (a.معتل ? 1 : 0) + ((a.سوابق || []).length + (a.لاحقة_مفعول ? 1 : 0)) * 0.5 });
  for (const a of N.analyze(w)) push({ kind: 'اسم', root: a.جذر, pattern: a.وزن, type: a.نوع, bab: a.باب, pre: (a.سوابق || []).join(''), al: !!a.تعريف, enc: a.لاحقة_إضافة || '', weak: a.معتل, score: 2.2 + (a.معتل ? 1 : 0) + ((a.سوابق || []).length + (a.لاحقة_إضافة ? 1 : 0) + (a.تعريف ? 1 : 0)) * 0.3 });
  out.sort((x, y) => x.score - y.score);
  return out;
}
const SKIP = new Set(['ما', 'هو', 'هي', 'جذر', 'وزن', 'اصل', 'كلمه', 'لفظ', 'لفظه', 'حلل', 'حللي', 'تحليل', 'صرفيا', 'صرفي', 'صرف', 'تصريف', 'الكلمه', 'اللفظه', 'هذه', 'هذا', 'لي', 'من', 'فضلك', 'لو', 'سمحت', 'طيب', 'اريد', 'ان', 'احلل', 'التاليه', 'الاتيه', 'التالي', 'الاتي', 'ماهو', 'ماهي', 'بيان', 'اذكر', 'عين', 'استخرج', 'لكلمه', 'للكلمه', 'اعطني', 'اخبرني', 'قل', 'التحليل', 'الصرفي', 'الصرف', 'صرفي', 'الجذر', 'الوزن', 'جذرها', 'وزنها']);
const NOTFILE = new Set(['ملف', 'الملف', 'النص', 'نص', 'كود', 'الكود', 'شيفره', 'الشيفره', 'البرنامج', 'برنامج', 'المرفق', 'ملفي', 'ملفات', 'الملفات']);
// يعيد قائمة الكلمات المطلوب تحليلها إن كان الطلب طلب تحليل صرفي، وإلا null
function parseRequest(text) {
  const t = String(text).trim(); if (!t) return null;
  const n = norm(t);
  const askRoot = /(^|\s)(جذر|وزن|اصل)\s+(الكلمه|كلمه|لفظه|لفظ)?/.test(n) || /(^|\s)ما\s+(هو\s+)?(جذر|وزن)/.test(n);
  const askAnalyze = /(^|\s)(حلل|حللي|تحليل|احلل|استخرج)(\s|$)/.test(n) && /(صرفي|صرف|كلمه|لفظه)/.test(n);
  const askSarf = /صرفيا|تحليل صرفي|التحليل الصرفي/.test(n);
  if (!(askRoot || askAnalyze || askSarf)) return null;
  const q = t.match(/[«"“]([^»"”]+)[»"”]/);
  let words;
  if (q) words = q[1].split(/[^ء-يً-ْٰٱ]+/).filter(Boolean);
  else {
    const toks = t.split(/[^ء-يً-ْٰٱ]+/).filter(Boolean);
    let i = 0; while (i < toks.length && (SKIP.has(norm(toks[i])) || (!HAR.test(toks[i]) && SKIP.has(norm(toks[i]))))) i++;
    words = toks.slice(i);
  }
  words = words.filter(w => AR.test(w));
  if (!words.length || words.length > 12) return null;
  if (words.length === 1 && NOTFILE.has(norm(words[0]))) return null;
  if (words.some(w => NOTFILE.has(norm(w)))) return null;
  // «حلّل هذه الجملة …» بلا قرينة صرفية صريحة لا تُعدّ طلب صرف
  if (!askRoot && !askSarf && !/كلمه|لفظه/.test(n) && words.length > 1) return null;
  return words;
}
const fmtOne = a => {
  if (a.kind === 'جامد') {
    const s = [a.type + (a.base ? ' — الأصل: «' + a.base + '»' : '')]; if (a.pre) s.push('سابقة: ' + a.pre); if (a.enc) s.push('الضمير المتصل: ' + a.enc); return s.join(' · ');
  }
  const s = [a.kind === 'فعل' ? 'فعل' : 'اسم']; s.push('الجذر: ' + a.root.split('').join(' ')); s.push('الوزن: ' + a.pattern + ' (' + a.type + (a.bab ? '، ' + a.bab : '') + ')');
  if (a.who) s.push('الإسناد: ' + a.who); if (a.mood) s.push('الحالة: ' + a.mood);
  if (a.pre) s.push('السوابق: ' + a.pre); if (a.al) s.push('«ال» التعريف'); if (a.enc) s.push((a.kind === 'فعل' ? 'ضمير المفعول: ' : 'ضمير الإضافة: ') + a.enc);
  return s.join(' · ');
};
function answer(text) {
  const words = parseRequest(text); if (!words) return null;
  const blocks = []; let multi = false;
  for (const w of words) {
    const an = analyzeWord(w);
    if (!an.length) {
      blocks.push('«' + w + '»: لم أتعرف على هذه الصورة. ' + (HAR.test(w) ? 'قد تكون اسمًا خاصًّا أو وزنًا لم أغطِّه بعد.' : 'التحليل يعمل الآن على الكلمة المشكولة؛ أضف التشكيل (مثل «كَتَبَ») فأحلّلها.'));
      continue;
    }
    if (an.length > 1) multi = true;
    const shown = an.slice(0, 4);
    const lines = ['«' + w + '»' + (an.length > 1 ? ' — ' + an.length + ' احتمالات (الأرجح أولًا)' : ''), ...shown.map(a => '- ' + fmtOne(a))];
    if (an.length > shown.length) lines.push('- و' + (an.length - shown.length) + ' غيرها.');
    blocks.push(lines.join('\n'));
  }
  return blocks.join('\n\n') + (multi ? '\n\nالتحليل بالوزن على الحروف الذرية وبلا معجم جذور بعد؛ فيظهر أكثر من احتمال لبعض الكلمات ويحسمه السياق.' : '');
}
module.exports = { analyzeWord, parseRequest, answer };
if (require.main === module) console.log(answer(process.argv.slice(2).join(' ')));

 };
 window.NawaMorph = req("morph_all");
})();
