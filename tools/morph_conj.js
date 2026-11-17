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
module.exports = { PRONOUNS, PAST_SOUND, conjugate, analyze };
if (require.main === module) { const w = process.argv[2]; console.log(JSON.stringify(analyze(w), null, 1)); }
