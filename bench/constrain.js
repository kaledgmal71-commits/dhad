// يقيس: هل يصير المُحلِّل قناعًا ينتج برامج صحيحة نحويًّا بالبناء؟ (مقابل توليد حر عشوائي بنفس الطول)
const { loadApi, make, vocabOf } = require('../tools/constrain.js');
const dict = require('../site/content/dict.js');
const api = loadApi(), C = make(api);
const builtins = dict.filter(d => d.kind === 'دالة جاهزة').map(d => d.w).slice(0, 40);
const vocab = vocabOf(api, builtins);
let seed = 7; const rnd = () => (seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296;
const pick = a => a[Math.floor(rnd() * a.length)];
const N = +process.env.N || 200, MAXT = 60;
let reached = 0, parseOk = 0, compileOk = 0, free = 0, len = 0, steps = 0, t0 = Date.now(), stuck = 0;
for (let i = 0; i < N; i++) {
  let p = '', done = false;
  for (let t = 0; t < MAXT; t++) {
    const ok = C.allowed(p, vocab); steps++;
    if (!ok.length) { stuck++; break; }
    let c = pick(ok);
    if (t >= 12) { const fin = ok.filter(w => C.state(p + (p ? ' ' : '') + w) === 'complete'); if (fin.length) c = pick(fin); }
    p += (p ? ' ' : '') + c;
    if (C.state(p) === 'complete' && p.trim() && t > 3 && rnd() < Math.min(1, 0.35 + t / 40)) { done = true; break; }
  }
  if (!done && C.state(p) === 'complete') reached++;
  if (done) { parseOk++; len += p.split(' ').length; try { api.compile(api.parse(p)); compileOk++; } catch (e) {} }
  let f = ''; for (let t = 0; t < 12; t++) f += (f ? ' ' : '') + pick(vocab);
  try { api.parse(f); free++; } catch (e) {}
}
console.log(`مفردات ${vocab.length} | ${N} توليدًا مقيَّدًا: تحليل ناجح ${parseOk} (${(100*parseOk/N).toFixed(0)}٪) | يُترجم ${compileOk} (${(100*compileOk/N).toFixed(0)}٪) | عالق ${stuck} | بلغ حالة تامة دون توقف ${reached} | متوسط الطول ${(len/Math.max(1,parseOk)).toFixed(1)} رمزًا`);
console.log(`حر بلا قناع (١٢ رمزًا عشوائيًّا): تحليل ناجح ${free} من ${N} (${(100*free/N).toFixed(0)}٪)`);
console.log(`${((Date.now()-t0)/steps).toFixed(2)} م.ث لكل خطوة قناع (${steps} خطوة)`);
