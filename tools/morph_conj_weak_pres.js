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
