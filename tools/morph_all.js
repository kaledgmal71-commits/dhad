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
