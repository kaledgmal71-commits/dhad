'use strict';
// خط الترييض الآلي: نص كتاب → قواعد بنيوية (if/then/except/disputed/basis) باقتباس حرفي، بلا نموذج خارجي.
// node extract_rules.js <book-id> <kind-default> <file> [out.jsonl]
const fs = require('fs');
const { normalizeAr } = require('../normalize');
const { loadPages } = require('./pages_iti');
const { sentences, detect } = require('./extract');

const DALIL = /^(?:و)?(?:لما روى|لما روي|لقوله تعالى|لقول النبي|لقوله صلى|لقوله عليه|لان |ولنا|لما روت|لحديث|لقوله )/;
const EXCEPT = /(?:^| )(?:الا|إلا|اِلَّا|الا ان|إلا أن)(?= )(.{3,160})/;
const NAMES = /قال (?:ابو|أبو|الشافعي|مالك|احمد|أحمد|داود|ابن|اصحابنا|أصحابنا|بعض اصحابنا|بعض أصحابنا|المزني|الربيع)[^،:.]{0,40}/g;
const words = (s, n) => s.split(/\s+/).slice(0, n).join(' ');

const CLEAN = t => t.replace(/\bms\d+\b/g, ' ').replace(/PageV\d+P\d+/g, ' ').replace(/\b\d{1,4}\]/g, ' ').replace(/\d+\s*(?=[ء-ي])/g, m => m).replace(/\s+/g, ' ').trim();
const BASIS_AT = /\s(?:لأن|لانه|لأنه|ولأن|ولأنه|ولان|ولانه|لما روى|لما روي|لما روت|لقوله|لقول|للخبر|لحديث|لقوله تعالى)(?=\s)/;
const ISSUE = /(?:قولان|قولين|وجهان|وجهين|ثلاثة أقوال|ثلاثه اقوال|ثلاثة أوجه|اختلف|اختلفوا)/;
const BRANCH = /^(?:و)?(?:أحدهما|احدهما|الثاني|والثاني|أحدها|احدها|الثالث|والثالث|الآخر|والآخر|والاخر|الأول|الاول|وأحدهما|وأحدها)(?![ء-ي])/;
const COND = /^(?:و)?(?:إن|ان|إذا|اذا|من|فإن|فان|وان|ولو|لو)\s+(.{4,140}?)\s+((?:فإنه|فانه|فإن|فان|ففيه|لم|لا|يجب|يجوز|يلزم|يصح|يستحب|يكره|يحرم|فلا|فله|فهو|فهي|وجب|جاز|بطل|سقط|كان).+)$/;
const splitBasis = s => { const m = BASIS_AT.exec(s); return m && m.index > 14 ? [s.slice(0, m.index).trim(), s.slice(m.index).trim()] : [s, '']; };

function extract(book, kindDefault, file) {
  const pages = loadPages(file), out = [];
  let n = 0;
  const items = [];
  for (const [k, t] of pages) { const [vol, page] = k.split(':').map(Number); for (const s of sentences(CLEAN(t))) items.push({ vol, page, s: CLEAN(s), ns: normalizeAr(CLEAN(s)) }); }
  const mk = (it, kind) => ({ id: `shafii.${book}.${++n}`, kind, school: 'shafii', if: [], then: [], except: [], disputed: [], basis: '', scope: '', src: { book, vol: it.vol, page: it.page, quote: words(it.s, 40) } });
  const used = new Set();
  const START = /^(?:و|ف)?(?:إن|ان|إذا|اذا|ولو|لو|من|فصل|باب|كتاب|ثم|وأما|واما|فأما|فاما)(?![ء-ي])/;
  for (let i = 0; i < items.length; i++) {
    const it = items[i], { s, ns } = it;
    if (used.has(i) || BRANCH.test(s)) continue; // فرع خلاف: يُضمّ إلى مسألته أدناه
    const cues = detect(s);
    // ١) مسألة خلاف: جملة فيها «قولان/وجهان» تتبعها فروع «أحدهما… والثاني…»
    if (ISSUE.test(s)) {
      const r = mk(it, kindDefault), isQawl = /قولان|قولين|ثلاثة أقوال|ثلاثه اقوال/.test(s);
      const head = s.replace(/\s*[:：]\s*$/, '');
      const c = ns.match(COND);
      r.if = [words(head.replace(/^(?:و)?(?:فإن|فان|وإن|وان|إذا|اذا)\s+/, '').replace(/\s*ففيه.*$/, ''), 24)];
      r.then = [words(head, 40)];
      const inl = s.split(/[:：]/).slice(1).join(':');
      if (inl && /(?:أحدهما|احدهما|أحدها|احدها)/.test(inl)) {
        for (const part of inl.split(/\s+(?=(?:و)?(?:الثاني|الثالث|الآخر|الاخر)(?![ء-ي]))/)) {
          const [v, b] = splitBasis(part.replace(BRANCH, '').replace(/^[\s:،]+/, ''));
          if (v.split(' ').length >= 2) r.disputed.push({ school: isQawl ? 'الشافعي (قول)' : 'أصحابنا (وجه)', view: words(v, 28), basis: words(b, 24) });
        }
      }
      let k = i + 1, got = 0;
      const expected = /ثلاث/.test(s) ? 3 : 2;
      while (r.disputed.length < expected && k < items.length && k <= i + 3 && !/^(?:##|\{|\[|")/.test(items[k].s) && items[k].page - it.page <= 1 && !ISSUE.test(items[k].s) && (BRANCH.test(items[k].s) || (/[:：]\s*$/.test(head + (got ? ':' : s.slice(-1))) || /[:：]\s*$/.test(s)) && !START.test(items[k].s))) {
        used.add(k);
        const [v, b] = splitBasis(items[k].s.replace(BRANCH, '').replace(/^[\s:،]+/, ''));
        r.disputed.push({ school: isQawl ? 'الشافعي (قول)' : 'أصحابنا (وجه)', view: words(v, 28), basis: words(b, 24) }); got++; k++;
      }
      const mm = s.match(/من أصحابنا من قال(.{5,120}?)ومنهم من قال(.{5,120})/);
      if (mm) { r.disputed.push({ school: 'من أصحابنا', view: words(mm[1], 24) }, { school: 'ومنهم', view: words(mm[2], 24) }); }
      if (r.disputed.length) { r.kind = r.kind; out.push(r); }
      continue;
    }
    if (!cues.length || (cues.length === 1 && cues[0] === 'dalil')) continue;
    const kind = cues.includes('hadd') && kindDefault !== 'hukm_furu' ? 'hadd' : (cues.includes('hukm') || cues.includes('khilaf')) ? kindDefault : null;
    if (!kind) continue;
    const r = mk(it, kind);
    const [main, basis] = splitBasis(s);
    const prev = items[i - 1];
    const subjectless = /^(?:و)?(?:لا يجوز|يجوز|لا يجب|يجب|لا يصح|يصح|لا يسقط|يسقط|لا يلزم|يلزم|أنه|انه|لا|يستحب|يكره|يحرم|لم يجب|لم يصح|جاز|وجب)(?![ء-ي])/.test(main);
    if (subjectless && prev && it.page - prev.page <= 1 && prev.s.split(' ').length <= 45 && !detect(prev.s).includes('hukm')) r.subject = words(prev.s.replace(/\s*[:؟?]\s*$/, ''), 30);
    r.basis = words(basis, 30);
    const c = normalizeAr(main).match(COND), c0 = main.match(COND);
    if (r.subject) { r.if = [r.subject]; r.then = [words(main, 40)]; delete r.subject; }
    else if (c0) { r.if = [words(c0[1], 22)]; r.then = [words(c0[2], 30)]; }
    else { const m = ns.match(/^(.{4,120}?)\s+(?:لا يجوز|يجوز|لا يصح|يصح|يجب|لا يجب|يحرم|يكره|يستحب|يبطل|يسقط|فهو|فهي|هو عباره)/); if (m) r.if = [words(m[1], 14)]; r.then = [words(main, 40)]; }
    const ex = normalizeAr(main).match(EXCEPT); if (ex) r.except = [words(ex[1], 18)];
    for (let j = i + 1; j <= i + 2 && j < items.length && !r.basis; j++) { if (items[j].page - it.page > 1) break; if (DALIL.test(items[j].ns)) r.basis = words(items[j].s, 30); }
    out.push(r);
  }
  return out;
}
module.exports = { extract };
if (require.main === module) {
  const [book, kind, file, outF] = process.argv.slice(2);
  const rules = extract(book, kind, file);
  const by = {}; rules.forEach(r => { by[r.kind] = (by[r.kind] || 0) + 1; });
  console.log(book, 'قواعد', rules.length, by, 'بدليل', rules.filter(r => r.basis).length, 'بخلاف منسوب', rules.filter(r => r.disputed.length).length, 'باستثناء', rules.filter(r => r.except.length).length);
  if (outF) fs.writeFileSync(outF, rules.map(r => JSON.stringify(r)).join('\n') + '\n');
}
