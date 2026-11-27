// محرك تشغيل نواة الخاص (جافاسكربت صرف، يعمل في المتصفح وNode): قراءة nwt، توليد بذاكرة مفاتيح/قيم، تجزئة BPE بايتية. لا اعتماد على مكتبة أو خادم.
(function (root) {
  function readNwt(buf) {
    var dv = new DataView(buf), hl = dv.getUint32(0, true), hdr = JSON.parse(new TextDecoder().decode(new Uint8Array(buf, 4, hl))), base = 4 + hl, W = {};
    hdr.tensors.forEach(function (t) { var n = t.bytes / (t.dtype === 'i8' ? 1 : 4); W[t.name] = { shape: t.shape, data: t.dtype === 'i8' ? new Int8Array(buf, base + t.offset, n) : new Float32Array(buf, base + t.offset, n) }; });
    return { cfg: hdr.cfg, W: W };
  }
  // y[r] = sum_c W[r,c] x[c]  (W صفوفها r؛ int8 بمقياس لكل صف)
  function matvec(w, sc, rows, cols, x, y) {
    for (var r = 0; r < rows; r++) { var s = 0, o = r * cols; for (var c = 0; c < cols; c++) s += w[o + c] * x[c]; y[r] = sc ? s * sc[r] : s; }
  }
  function Model(nwt) {
    var c = nwt.cfg, W = nwt.W, d = c.d, L = c.L, H = c.H, hd = d / H, V = c.V, T = c.T, hid = W['blocks.0.g.weight'].shape[0];
    var inv = new Float32Array(hd / 2); for (var i = 0; i < hd / 2; i++) inv[i] = Math.pow(10000, -2 * i / hd);
    function lin(name) { var t = W[name], s = W[name + '.scale']; return { w: t.data, s: s ? s.data : null, r: t.shape[0], c: t.shape[1] }; }
    var B = []; for (var l = 0; l < L; l++) { var p = 'blocks.' + l + '.'; B.push({ n1: W[p + 'n1.w'].data, n2: W[p + 'n2.w'].data, qkv: lin(p + 'qkv.weight'), o: lin(p + 'o.weight'), g: lin(p + 'g.weight'), u: lin(p + 'u.weight'), dn: lin(p + 'dn.weight') }); }
    var emb = lin('emb.weight'), nf = W['nf.w'].data;
    function newState() { var K = [], Vv = []; for (var l = 0; l < L; l++) { K.push(new Float32Array(T * d)); Vv.push(new Float32Array(T * d)); } return { K: K, V: Vv, pos: 0 }; }
    var h = new Float32Array(d), t1 = new Float32Array(d), qkv = new Float32Array(3 * d), ao = new Float32Array(d), tmp = new Float32Array(d), g = new Float32Array(hid), u = new Float32Array(hid), lg = new Float32Array(V), att = new Float32Array(T);
    function rms(x, w, out) { var s = 0, i; for (i = 0; i < d; i++) s += x[i] * x[i]; var r = 1 / Math.sqrt(s / d + 1e-6); for (i = 0; i < d; i++) out[i] = x[i] * r * w[i]; }
    function rope(a, off, pos) { for (var i = 0; i < hd / 2; i++) { var an = pos * inv[i], cs = Math.cos(an), sn = Math.sin(an), x1 = a[off + 2 * i], x2 = a[off + 2 * i + 1]; a[off + 2 * i] = x1 * cs - x2 * sn; a[off + 2 * i + 1] = x1 * sn + x2 * cs; } }
    // يغذّي رمزًا واحدًا ويعيد لوجِتات الرمز التالي (مصفوفة مشتركة تُعاد كتابتها)
    function step(st, id) {
      var pos = st.pos, i, l, hh, j; if (pos >= T) throw new Error('تجاوز طول السياق');
      for (i = 0; i < d; i++) h[i] = emb.s ? emb.w[id * d + i] * emb.s[id] : emb.w[id * d + i];
      for (l = 0; l < L; l++) {
        var b = B[l]; rms(h, b.n1, t1); matvec(b.qkv.w, b.qkv.s, 3 * d, d, t1, qkv);
        for (hh = 0; hh < H; hh++) { rope(qkv, hh * hd, pos); rope(qkv, d + hh * hd, pos); }
        st.K[l].set(qkv.subarray(d, 2 * d), pos * d); st.V[l].set(qkv.subarray(2 * d, 3 * d), pos * d);
        for (hh = 0; hh < H; hh++) {
          var mx = -1e30, q0 = hh * hd, sc = 1 / Math.sqrt(hd);
          for (j = 0; j <= pos; j++) { var s = 0, ko = j * d + hh * hd; for (i = 0; i < hd; i++) s += qkv[q0 + i] * st.K[l][ko + i]; att[j] = s * sc; if (att[j] > mx) mx = att[j]; }
          var z = 0; for (j = 0; j <= pos; j++) { att[j] = Math.exp(att[j] - mx); z += att[j]; }
          for (i = 0; i < hd; i++) ao[q0 + i] = 0;
          for (j = 0; j <= pos; j++) { var p2 = att[j] / z, vo = j * d + hh * hd; for (i = 0; i < hd; i++) ao[q0 + i] += p2 * st.V[l][vo + i]; }
        }
        matvec(b.o.w, b.o.s, d, d, ao, tmp); for (i = 0; i < d; i++) h[i] += tmp[i];
        rms(h, b.n2, t1); matvec(b.g.w, b.g.s, hid, d, t1, g); matvec(b.u.w, b.u.s, hid, d, t1, u);
        for (i = 0; i < hid; i++) g[i] = g[i] / (1 + Math.exp(-g[i])) * u[i];
        matvec(b.dn.w, b.dn.s, d, hid, g, tmp); for (i = 0; i < d; i++) h[i] += tmp[i];
      }
      rms(h, nf, t1); matvec(emb.w, emb.s, V, d, t1, lg); st.pos++; return lg;
    }
    return { cfg: c, newState: newState, step: step, hidden: hid };
  }
  // BPE بايتي (GPT-2): tokenizer.json من مكتبة tokenizers
  function bytesToUnicode() { var bs = [], i; for (i = 33; i <= 126; i++) bs.push(i); for (i = 161; i <= 172; i++) bs.push(i); for (i = 174; i <= 255; i++) bs.push(i); var cs = bs.slice(), n = 0; for (i = 0; i < 256; i++) if (bs.indexOf(i) < 0) { bs.push(i); cs.push(256 + n); n++; } var m = {}, r = {}; for (i = 0; i < bs.length; i++) { m[bs[i]] = String.fromCharCode(cs[i]); r[String.fromCharCode(cs[i])] = bs[i]; } return { enc: m, dec: r }; }
  function Tokenizer(tj) {
    var voc = tj.model.vocab, merges = tj.model.merges, rank = {}, bu = bytesToUnicode(), id2t = [], cache = {};
    Object.keys(voc).forEach(function (t) { id2t[voc[t]] = t; });
    merges.forEach(function (m, i) { rank[Array.isArray(m) ? m.join(' ') : m] = i; });
    var RE = /'s|'t|'re|'ve|'m|'ll|'d| ?\p{L}+| ?\p{N}+| ?[^\s\p{L}\p{N}]+|\s+(?!\S)|\s+/gu;
    function bpe(w) {
      if (cache[w]) return cache[w]; var p = Array.from(w);
      for (;;) { var best = -1, bi = 1e18; for (var i = 0; i < p.length - 1; i++) { var r = rank[p[i] + ' ' + p[i + 1]]; if (r !== undefined && r < bi) { bi = r; best = i; } } if (best < 0) break; p.splice(best, 2, p[best] + p[best + 1]); }
      return (cache[w] = p);
    }
    function encode(text) {
      var ids = [], m, enc = new TextEncoder(); RE.lastIndex = 0;
      while ((m = RE.exec(text)) !== null) { var s = ''; enc.encode(m[0]).forEach(function (b) { s += bu.enc[b]; }); bpe(s).forEach(function (t) { var v = voc[t]; if (v !== undefined) ids.push(v); }); }
      return ids;
    }
    function decode(ids) { var by = []; ids.forEach(function (i) { var t = id2t[i]; if (t === undefined) return; Array.from(t).forEach(function (ch) { if (bu.dec[ch] !== undefined) by.push(bu.dec[ch]); }); }); return new TextDecoder('utf-8', { fatal: false }).decode(new Uint8Array(by)); }
    return { encode: encode, decode: decode, eos: voc['<eos>'] };
  }
  function sample(lg, temp, topk, rnd) {
    var V = lg.length, idx = new Array(V), i; for (i = 0; i < V; i++) idx[i] = i;
    idx.sort(function (a, b) { return lg[b] - lg[a]; }); idx.length = Math.min(topk || 20, V);
    var mx = lg[idx[0]], ws = idx.map(function (k) { return Math.exp((lg[k] - mx) / (temp || 0.8)); }), z = ws.reduce(function (a, b) { return a + b; }, 0), r = rnd() * z;
    for (i = 0; i < idx.length; i++) { r -= ws[i]; if (r <= 0) return idx[i]; } return idx[idx.length - 1];
  }
  function generate(model, tok, prompt, o) {
    o = o || {}; var st = model.newState(), ids = tok.encode(prompt), lg, i, out = [], rnd = o.rnd || Math.random;
    for (i = 0; i < ids.length; i++) lg = model.step(st, ids[i]);
    for (i = 0; i < (o.max || 100); i++) { var nx = sample(lg, o.temp, o.topk, rnd); if (nx === tok.eos) break; out.push(nx); if (o.onToken) o.onToken(tok.decode(out)); if (st.pos >= model.cfg.T) break; lg = model.step(st, nx); }
    return tok.decode(out);
  }
  root.NawaLM = { readNwt: readNwt, Model: Model, Tokenizer: Tokenizer, generate: generate };
  if (typeof module !== 'undefined') module.exports = root.NawaLM;
})(typeof window !== 'undefined' ? window : globalThis);
