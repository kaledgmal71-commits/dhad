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
    const ans = [...M.analyze(stem), ...C.analyze(stem)].map(a => ({ ...a, حالة: 'رفع/ماضٍ' }));
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
