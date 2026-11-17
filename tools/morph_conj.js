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
      if (pat && PAST_SOUND(pat)) out.push({ ...a, ضمير: pron, اللاحقة: suf });
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
