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
