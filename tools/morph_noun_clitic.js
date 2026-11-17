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
  for (const [e, ref] of POSS) { const s = strip(e); if (rest.endsWith(s) && rest.length > s.length + 1) { const stem = rest.slice(0, -s.length); out.push({ stem, enc: [e, ref] }); if (/تُ$|تِ$|تَ$/.test(stem)) out.push({ stem: strip(stem.slice(0, -2) + 'ةُ'), enc: [e, ref] }); } }
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
