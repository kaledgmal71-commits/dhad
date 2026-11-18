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
