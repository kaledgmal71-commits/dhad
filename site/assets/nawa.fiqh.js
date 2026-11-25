// بحث في الفقه الشافعي: فهرس BM25 بتطبيع عربي على ~٢٠ ألف نص مستخرج آليًّا من سبعة كتب، يعيد النص الحرفي وموضعه (كتاب/جزء/صفحة).
// لا يولّد كلامًا ولا يفتي؛ يعرض نصوص المصنفين كما هي. المصدر النصي: OpenITI (CC BY-NC-SA).
(function (root) {
  'use strict';
  var NAMES = { hawi: 'الحاوي الكبير — الماوردي', muhadhdhab: 'المهذب — الشيرازي', luma: 'اللمع — الشيرازي', tabsira: 'التبصرة — الشيرازي', tanbih: 'التنبيه — الشيرازي', iqna: 'الإقناع — الماوردي', jadal: 'الجدل' };
  var norm = function (s) { return String(s || '').normalize('NFKC').replace(/[ً-ٰٟـ]/g, '').replace(/[إأآٱ]/g, 'ا').replace(/ى/g, 'ي').replace(/ؤ/g, 'و').replace(/ئ/g, 'ي').replace(/ة/g, 'ه'); };
  var tok = function (s) { return (norm(s).match(/[ء-ي0-9]+/g) || []).map(function (t) { return t.replace(/^(?:وال|فال|بال|لل|ال|و|ف|ب|ل)(?=.{3,})/, ''); }); };
  var STOP = {}; 'من في على عن الي الى ان انه هو هي ما لا لم اذا او ثم قد كان ذلك هذا التي الذي فيه به لو كل بين'.split(' ').forEach(function (w) { STOP[w] = 1; });
  var IDX = null, loading = null;
  function build(data) {
    var post = {}, len = new Float32Array(data.rows.length), tot = 0;
    data.rows.forEach(function (r, i) { var tf = {}; tok(r[0]).forEach(function (t) { if (STOP[t]) return; tf[t] = (tf[t] || 0) + 1; len[i]++; }); tot += len[i]; for (var t in tf) (post[t] || (post[t] = [])).push([i, tf[t]]); });
    return { data: data, post: post, len: len, avg: tot / (data.rows.length || 1) };
  }
  function search(ix, q, limit) {
    var terms = {}, N = ix.data.rows.length, sc = {}, k1 = 1.2, b = 0.75;
    tok(q).forEach(function (t) { if (!STOP[t]) terms[t] = 1; });
    Object.keys(terms).forEach(function (t) { var p = ix.post[t]; if (!p) return; var idf = Math.log(1 + (N - p.length + .5) / (p.length + .5)); p.forEach(function (e) { sc[e[0]] = (sc[e[0]] || 0) + idf * e[1] * (k1 + 1) / (e[1] + k1 * (1 - b + b * ix.len[e[0]] / ix.avg)); }); });
    return Object.keys(sc).map(function (i) { return [+i, sc[i]]; }).sort(function (a, c) { return c[1] - a[1]; }).slice(0, limit || 4).map(function (x) { var r = ix.data.rows[x[0]]; return { quote: r[0], book: ix.data.books[r[1]], vol: r[2], page: r[3], score: x[1] }; });
  }
  var CMD = /^\s*(?:من فضلك\s+)?(?:(?:ابحث|بحث|فتّش|فتش)\s+(?:لي\s+)?(?:في|عن)\s+(?:الفقه|الفقه الشافعي|كتب الشافعية|نصوص الشافعية)|(?:نصوص|نص)\s+(?:الشافعية|الفقه الشافعي)\s+(?:في|عن)|عند الشافعية|في المذهب الشافعي)\s*[:：\-–—]?\s*([\s\S]*)$/;
  function wants(t) { var m = CMD.exec(t || ''); return !!(m && tok(m[1]).length >= 1); }
  function load(base) { if (IDX) return Promise.resolve(IDX); if (loading) return loading; loading = fetch((base || '/assets/fiqh/') + 'rules.json').then(function (r) { return r.json(); }).then(function (d) { IDX = build(d); return IDX; }); return loading; }
  function format(res) {
    if (!res.length) return 'لم أجد في الكتب المفهرسة نصًّا مطابقًا لهذا الطلب.';
    return res.map(function (r, i) { return (i + 1) + '. «' + r.quote.replace(/^##\s*\|?\s*/, '') + '»\n— ' + (NAMES[r.book] || r.book) + '، ج' + r.vol + ' ص' + r.page; }).join('\n\n') + '\n\nنصوص حرفية من الكتب كما وردت دون استنتاج؛ المصدر النصي OpenITI (CC BY-NC-SA).';
  }
  function run(t) { var m = CMD.exec(t), q = m ? m[1] : t; return load().then(function (ix) { return format(search(ix, q, 4)); }); }
  var api = { wants: wants, run: run, load: load, _build: build, _search: search, _format: format };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.NawaFiqh = api;
})(typeof window !== 'undefined' ? window : globalThis);
