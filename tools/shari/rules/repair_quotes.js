'use strict';
// يصلح اقتباسات المستخرِج: يحدّد أقرب مقطع حرفي في الصفحة (أو التي تليها) ويستبدل به الاقتباس.
// node repair_quotes.js in.jsonl out.jsonl book=src.txt   — ما لا يبلغ تشابه ٧٠٪ يُسقَط ويُسجَّل.
const fs = require('fs');
const { normalizeAr } = require('../normalize');
const { loadPages } = require('./pages_iti');
const [inF, outF, map] = process.argv.slice(2);
const [bk, file] = map.split('=');
const pages = loadPages(file);
const toks = s => s.split(/\s+/).filter(Boolean).map(w => [w, normalizeAr(w)]).filter(t => t[1]);
const out = []; let fixed = 0, same = 0, drop = 0;
for (const ln of fs.readFileSync(inF, 'utf8').split('\n').filter(Boolean)) {
  let r; try { r = JSON.parse(ln); } catch { drop++; continue; }
  const s = r.src, v = s.vol || 1;
  const ks = [...pages.keys()].filter(k => { const p = +k.split(':')[1]; return p >= s.page - 4 && p <= s.page + 4; });
  const raw = ks.flatMap(k => toks(pages.get(k)).map(t => [...t, +k.split(':')[1]]));
  const q = toks(s.quote).map(t => t[1]);
  if (!q.length || !raw.length) { drop++; console.log('drop', r.id); continue; }
  const n = raw.map(t => t[1]).join(' ');
  const at = n.indexOf(q.join(' '));
  if (at >= 0) { r.src.page = raw[n.slice(0, at).split(' ').filter(Boolean).length][2]; same++; out.push(r); continue; }
  const qs = new Set(q); let best = null;
  const L = q.length;
  for (let i = 0; i < raw.length; i++) {
    for (const len of [L, L + 3, Math.max(3, L - 3)]) {
      const w = raw.slice(i, i + len); if (w.length < Math.min(len, 3)) continue;
      const hit = w.filter(t => qs.has(t[1])).length;
      const sc = hit / Math.max(L, w.length);
      if (!best || sc > best.sc) best = { sc, w };
    }
  }
  if (!best || best.sc < 0.7) { drop++; console.log('drop', r.id, best ? best.sc.toFixed(2) : ''); continue; }
  // قصّ حواف النافذة غير المطابقة
  let w = best.w; while (w.length && !qs.has(w[0][1])) w = w.slice(1); while (w.length && !qs.has(w[w.length - 1][1])) w = w.slice(0, -1);
  if (w.length < 4) { drop++; console.log('drop', r.id, 'short'); continue; }
  r.src.quote = w.map(t => t[0]).join(' '); r.src.page = w[0][2]; r.src.repaired = true; fixed++; out.push(r);
}
fs.writeFileSync(outF, out.map(r => JSON.stringify(r)).join('\n') + '\n');
console.log(`سليم ${same} · مُصلَح ${fixed} · مُسقَط ${drop}`);
