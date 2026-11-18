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
