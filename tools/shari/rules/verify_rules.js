'use strict';
// node verify_rules.js rules.jsonl book=src.txt [book2=src2.txt]  → يطبع ما لا يطابق ويخرج بـ١ إن وُجد
const fs = require('fs');
const { normalizeAr } = require('../normalize');
const { loadPages } = require('./pages_iti');
const [rulesFile, ...maps] = process.argv.slice(2);
const books = Object.fromEntries(maps.map(a => { const [k, f] = a.split('='); const p = loadPages(f); const n = new Map([...p].map(([k2, v]) => [k2, normalizeAr(v)])); return [k, n]; }));
let ok = 0, bad = 0;
for (const ln of fs.readFileSync(rulesFile, 'utf8').split('\n').filter(Boolean)) {
  let r; try { r = JSON.parse(ln); } catch { bad++; console.log('JSON غير صالح:', ln.slice(0, 80)); continue; }
  const s = r.src || {}, pg = books[s.book];
  const q = normalizeAr(s.quote || '');
  const fail = why => { bad++; console.log(`✗ ${r.id}: ${why}`); };
  if (!pg) { fail('كتاب غير معروف ' + s.book); continue; }
  if (!r.then || !r.kind || !r.school) { fail('حقول ناقصة'); continue; }
  if (q.split(' ').length < 3) { fail('اقتباس قصير'); continue; }
  const ks = [...pg.keys()], i = ks.indexOf(`${s.vol || 1}:${s.page}`);
  const here = i < 0 ? '' : pg.get(ks[i]), next = i < 0 ? '' : (pg.get(ks[i + 1]) || '');
  if ((here + ' ' + next).includes(q)) ok++; else fail('الاقتباس لا يطابق الصفحة ' + s.page);
}
console.log(`مطابق ${ok} · مرفوض ${bad}`);
process.exit(bad ? 1 : 0);
