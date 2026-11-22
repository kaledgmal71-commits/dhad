'use strict';
// مُدقّق الاقتباس: كل نص بين «» أو "" يُنسب إلى صفحة بصيغة [[book:vN:pM]] يجب أن يرد حرفيًّا (بعد التطبيع) في تلك الصفحة
// أو في الصفحة التي تليها (لاقتباس عابر للصفحات).
const { normalizeAr } = require('./normalize');

const CITE = /\[\[([^\]\s:]+):v(\d+):p(\d+)\]\]/;
// اقتباس متبوع (بعد مسافة اختيارية) بإحالة
const QUOTE = /[«"]([^»"]+)[»"]\s*(\[\[[^\]]+\]\])?/g;

function verify(answer, getPage, opts = {}) {
  const minWords = opts.minWords || 3;
  const results = [];
  let m;
  QUOTE.lastIndex = 0;
  while ((m = QUOTE.exec(answer))) {
    const q = normalizeAr(m[1]);
    if (q.split(' ').filter(Boolean).length < minWords) continue; // قصير: ليس اقتباسًا موثَّقًا
    const c = m[2] && m[2].match(CITE);
    if (!c) { results.push({ quote: m[1], ok: false, reason: 'اقتباس بلا إحالة' }); continue; }
    const [, book, vol, page] = c;
    const p = getPage(book, +vol, +page);
    if (p == null) { results.push({ quote: m[1], ok: false, reason: 'صفحة غير موجودة: ' + c[0] }); continue; }
    const next = getPage(book, +vol, +page + 1);
    const hay = normalizeAr(p) + ' ' + (next ? normalizeAr(next) : '');
    const ok = (' ' + hay + ' ').includes(' ' + q + ' ');
    results.push({ quote: m[1], cite: c[0], ok, reason: ok ? 'مطابق' : 'النص غير موجود في الصفحة المنسوب إليها' });
  }
  return { ok: results.every(r => r.ok), count: results.length, results };
}
module.exports = { verify };
