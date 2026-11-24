'use strict';
// مستخرِج آلي للقواعد: تقطيع الجمل ثم كشف الجمل الحاكمة بمؤشرات الخطاب الأصولي (بلا نموذج خارجي).
// node extract.js book=src.txt [gold.jsonl] → يطبع ما وجد ويقيس مقابل المرجع الذهبي إن وُجد.
const fs = require('fs');
const { normalizeAr } = require('../normalize');
const { loadPages } = require('./pages_iti');
const CUES = {
  hukm: /(?<![ء-ي])(لا يجوز|يجوز|لا يصح|يصح|يجب|لا يجب|واجب|حرام|يحرم|مكروه|مباح|يكره|يستحب|مندوب|يبطل|فاسد|باطل|يسقط|يثبت|لا يثبت|يقتضي|لا يقتضي|يدل على|لا يدل|حجه|ليس بحجه|يخصص|لا يخصص|ينسخ|لا ينسخ|يحمل على|يعم|لا يعم)(?![ء-ي])/,
  nisba: /(?<![ء-ي])(قال اصحابنا|وقال اصحابنا|وقال ابو حنيفه|وقالت المعتزله|وقال مالك|وقال احمد|وقال داود|وقال الشافعي|وقالت الحنفيه|وقال بعض اصحابنا|وقال بعضهم|وقال بعض|وقال قوم|عندنا|ومن اصحابنا|وذهب)(?![ء-ي])/,
  dalil: /(?<![ء-ي])(والدليل|ودليلنا|دليلنا|الدليل على|لان|والحجه|فان قيل|قيل له|والجواب)(?![ء-ي])/,
  hadd: /(?<![ء-ي])(حد[ء-ي]*|هو عباره عن|هي عباره عن|فهو|فهي|معناه|فاما .{1,40} فهو)(?![ء-ي])/,
  khilaf: /(?<![ء-ي])(اختلف|اختلفوا|فيه وجهان|فيه قولان|وجهان|قولان|على قولين|على وجهين)(?![ء-ي])/,
};
function sentences(text) { return text.split(/(?<=[.؟!:])\s+|\s{2,}/).map(s => s.trim()).filter(s => s.split(/\s+/).length >= 4); }
function detect(sent) { const n = normalizeAr(sent), hit = []; for (const k in CUES) if (CUES[k].test(n)) hit.push(k); return hit; }
function run(file) {
  const out = [];
  for (const [k, t] of loadPages(file)) for (const s of sentences(t)) { const h = detect(s); if (h.length) out.push({ page: +k.split(':')[1], sent: s, cues: h }); }
  return out;
}
module.exports = { run, detect, sentences };
if (require.main === module) {
  const [map, goldF] = process.argv.slice(2); const file = map.split('=')[1];
  const cands = run(file);
  console.log('جمل مرشَّحة', cands.length);
  if (goldF) {
    const gold = fs.readFileSync(goldF, 'utf8').split('\n').filter(Boolean).map(JSON.parse);
    const gp = new Set(gold.map(g => g.src.page)); const lo = Math.min(...gp), hi = Math.max(...gp);
    const cn = cands.map(c => normalizeAr(c.sent));
    let hit = 0; const miss = [];
    for (const g of gold) { const q = normalizeAr(g.src.quote).split(' ').slice(0, 6).join(' ');
      if (cn.some(c => c.includes(q)) || cn.some(c => normalizeAr(g.src.quote).includes(c.slice(0, 40)))) hit++; else miss.push(g.src.quote.slice(0, 70)); }
    const inRange = cands.filter(c => c.page >= lo && c.page <= hi);
    const gn = gold.map(g => normalizeAr(g.src.quote));
    const prec = inRange.filter(c => gn.some(q => q.includes(normalizeAr(c.sent).slice(0, 30)) || normalizeAr(c.sent).includes(q.split(' ').slice(0, 6).join(' ')))).length;
    console.log(`استدعاء ${hit}/${gold.length} = ${(100 * hit / gold.length).toFixed(0)}% · دقة تقريبية في الصفحات ${lo}-${hi}: ${prec}/${inRange.length}`);
    console.log('فائتة (عينة):', miss.slice(0, 8));
  }
}
