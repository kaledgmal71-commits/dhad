// مُشكِّل نواة: Transformer ثنائي الاتجاه على الحروف (مدرَّب من الصفر على نصوص الحديث المشكولة)، يعمل في المتصفح بلا خادم.
// الأوزان: /assets/dia/dia.json + dia.bin (int8 لكل عمود للمصفوفات وfloat16 للباقي). الاستعمال: NawaDia.run(نص) ← وعد بالنص المشكول.
(function (root) {
  'use strict';
  var M = null, loading = null;
  function f16(u) { var s = (u & 0x8000) ? -1 : 1, e = (u >> 10) & 31, f = u & 1023; if (e === 0) return s * Math.pow(2, -14) * (f / 1024); if (e === 31) return f ? NaN : s * Infinity; return s * Math.pow(2, e - 15) * (1 + f / 1024); }
  function build(meta, buf) {
    var P = {}, dv = new DataView(buf);
    meta.tensors.forEach(function (t) {
      var n = t.s.reduce(function (a, b) { return a * b; }, 1), a = new Float32Array(n), i;
      if (t.t === 'q') { var cols = t.s[1], sc = new Float32Array(buf.slice(t.so, t.so + 4 * cols)), q = new Int8Array(buf, t.o, n); for (i = 0; i < n; i++) a[i] = q[i] * sc[i % cols]; }
      else { for (i = 0; i < n; i++) a[i] = f16(dv.getUint16(t.o + 2 * i, true)); }
      P[t.n] = a;
    });
    var c = meta.cfg, T = c.maxlen, d = c.d, pe = new Float32Array(T * d);
    for (var p = 0; p < T; p++) for (var k = 0; k < d / 2; k++) { var ang = p / Math.pow(10000, 2 * k / d); pe[p * d + 2 * k] = Math.sin(ang); pe[p * d + 2 * k + 1] = Math.cos(ang); }
    var idx = {}; for (var j = 0; j < meta.letters.length; j++) idx[meta.letters[j]] = j + 2;
    return { cfg: c, P: P, pe: pe, idx: idx, classes: meta.classes };
  }
  function ln(x, g, b, T, d) {
    var o = new Float32Array(T * d);
    for (var t = 0; t < T; t++) {
      var s = 0, i; for (i = 0; i < d; i++) s += x[t * d + i]; var mu = s / d, v = 0;
      for (i = 0; i < d; i++) { var z = x[t * d + i] - mu; v += z * z; }
      var r = 1 / Math.sqrt(v / d + 1e-5); for (i = 0; i < d; i++) o[t * d + i] = (x[t * d + i] - mu) * r * g[i] + b[i];
    }
    return o;
  }
  function mm(x, W, bias, T, din, dout) {   // x:(T,din) · W:(din,dout) + bias
    var o = new Float32Array(T * dout), t, i, j;
    for (t = 0; t < T; t++) {
      var ro = t * dout, rx = t * din; for (j = 0; j < dout; j++) o[ro + j] = bias[j];
      for (i = 0; i < din; i++) { var xv = x[rx + i]; if (xv === 0) continue; var rw = i * dout; for (j = 0; j < dout; j++) o[ro + j] += xv * W[rw + j]; }
    }
    return o;
  }
  function forward(m, ids) {   // ids: Int32Array بطول maxlen (حشو 0 بلا قناع، كما في التدريب)
    var c = m.cfg, P = m.P, T = c.maxlen, d = c.d, h = c.heads, dk = d / h, ff = c.ff, x = new Float32Array(T * d), sq = Math.sqrt(d), t, i, l;
    for (t = 0; t < T; t++) for (i = 0; i < d; i++) x[t * d + i] = P.E[ids[t] * d + i] * sq + m.pe[t * d + i];
    for (l = 0; l < c.layers; l++) {
      var xn = ln(x, P['ln1g' + l], P['ln1b' + l], T, d), q = mm(xn, P['q' + l], P['bq' + l], T, d, d), k = mm(xn, P['k' + l], P['bk' + l], T, d, d), v = mm(xn, P['v' + l], P['bv' + l], T, d, d);
      var om = new Float32Array(T * d), sc = new Float32Array(T), hh;
      for (hh = 0; hh < h; hh++) for (t = 0; t < T; t++) {
        var mx = -1e30, u, e;
        for (u = 0; u < T; u++) { var s = 0; for (e = 0; e < dk; e++) s += q[t * d + hh * dk + e] * k[u * d + hh * dk + e]; s /= Math.sqrt(dk); sc[u] = s; if (s > mx) mx = s; }
        var z = 0; for (u = 0; u < T; u++) { sc[u] = Math.exp(sc[u] - mx); z += sc[u]; }
        for (e = 0; e < dk; e++) { var a = 0; for (u = 0; u < T; u++) a += sc[u] * v[u * d + hh * dk + e]; om[t * d + hh * dk + e] = a / z; }
      }
      var ao = mm(om, P['o' + l], P['bo' + l], T, d, d), x1 = new Float32Array(T * d); for (i = 0; i < x1.length; i++) x1[i] = x[i] + ao[i];
      var xn2 = ln(x1, P['ln2g' + l], P['ln2b' + l], T, d), u1 = mm(xn2, P['f1' + l], P['bf1' + l], T, d, ff);
      for (i = 0; i < u1.length; i++) { var w = u1[i]; u1[i] = 0.5 * w * (1 + Math.tanh(0.7978845608 * (w + 0.044715 * w * w * w))); }
      var f2 = mm(u1, P['f2' + l], P['bf2' + l], T, ff, d); for (i = 0; i < x.length; i++) x[i] = x1[i] + f2[i];
    }
    var xf = ln(x, P.lnf_g, P.lnf_b, T, d), nc = c.classes, z = mm(xf, P.Wo_, P.bo_, T, d, nc), out = new Int32Array(T);
    for (t = 0; t < T; t++) { var bi = 0, bv = -1e30; for (i = 0; i < nc; i++) if (z[t * nc + i] > bv) { bv = z[t * nc + i]; bi = i; } out[t] = bi; }
    return out;
  }
  function predict(m, X, onProgress) {   // نافذة منزلقة بخطوة T/2 وأقرب موضع لمنتصف النافذة (مطابقة dia_train.predict)
    var T = m.cfg.maxlen, stride = T >> 1, n = X.length, out = new Int32Array(n), best = new Float64Array(n).fill(-Infinity), starts = [], s;
    for (s = 0; s < Math.max(1, n - T + stride); s += stride) starts.push(s);
    for (var w = 0; w < starts.length; w++) {
      s = starts[w]; var ids = new Int32Array(T), L = Math.min(T, n - s), i; for (i = 0; i < L; i++) ids[i] = X[s + i];
      var row = forward(m, ids);
      for (i = 0; i < L; i++) { var sc = (s === 0 && i < (T >> 1)) ? 1e9 - 0 : -Math.abs(i - T / 2); if (sc > best[s + i]) { out[s + i] = row[i]; best[s + i] = sc; } }
      if (onProgress) onProgress((w + 1) / starts.length);
    }
    return out;
  }
  var MARKS = /[ً-ْٰـ]/g;
  function diacritize(m, text, onProgress) {
    var clean = text.replace(MARKS, ''), X = [], map = [], prevSep = true, i;
    for (i = 0; i < clean.length; i++) {
      var ch = clean[i], id = m.idx[ch];
      if (id) { X.push(id); map.push(i); prevSep = false; } else { if (!prevSep) { X.push(1); map.push(-1); } prevSep = true; }
    }
    var Y = predict(m, X, onProgress), cls = {}; for (i = 0; i < X.length; i++) if (map[i] >= 0 && Y[i] > 0) cls[map[i]] = m.classes[Y[i]];
    var out = ''; for (i = 0; i < clean.length; i++) out += clean[i] + (cls[i] || '');
    return out;
  }
  function load(base) {
    if (M) return Promise.resolve(M);
    if (loading) return loading;
    base = base || '/assets/dia/';
    loading = Promise.all([fetch(base + 'dia.json').then(function (r) { return r.json(); }), fetch(base + 'dia.bin').then(function (r) { return r.arrayBuffer(); })]).then(function (a) { M = build(a[0], a[1]); return M; });
    return loading;
  }
  var CMD = /^\s*(?:من فضلك\s+)?(?:شكّل|شَكِّل|شكل|تشكيل|اضبط التشكيل|ضع التشكيل على|ضع التشكيل في|اضبط تشكيل|شكّلها|شكلها)\s*(?:هذا النص|النص التالي|الجملة|الآتي|التالي)?\s*[:：\-–—]?\s*([\s\S]*)$/;
  function wants(t) { var m = CMD.exec(t || ''); return !!(m && /[ء-ي]{2,}/.test(m[1]) && m[1].replace(/\s/g, '').length >= 3); }
  function run(t, onProgress) {
    var m = CMD.exec(t), body = (m ? m[1] : t).trim();
    if (body.length > 600) body = body.slice(0, 600);
    return load().then(function (mod) { return new Promise(function (res) { setTimeout(function () { res(diacritize(mod, body, onProgress)); }, 20); }); });
  }
  var api = { wants: wants, run: run, load: load, _build: build, _diacritize: diacritize, _predict: predict };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.NawaDia = api;
})(typeof window !== 'undefined' ? window : globalThis);
