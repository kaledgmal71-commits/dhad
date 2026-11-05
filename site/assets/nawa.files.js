// قراءة ملفات المستخدم في المتصفح: النص مباشرة، وdocx وepub بفك الضغط بواجهة المتصفح (DecompressionStream)،
// وتُسلَّم الحمولة الخام إلى جلسة نواة (ضاد) لاستخراج النص منها وفهرستها.
(function (root) {
  function u16(b, o) { return b[o] | (b[o + 1] << 8); }
  function u32(b, o) { return (b[o] | (b[o + 1] << 8) | (b[o + 2] << 16) | (b[o + 3] << 24)) >>> 0; }
  function inflateRaw(bytes) {
    var ds = new DecompressionStream('deflate-raw');
    var w = ds.writable.getWriter(); w.write(bytes); w.close();
    return new Response(ds.readable).arrayBuffer().then(function (b) { return new Uint8Array(b); });
  }
  // يقرأ فهرس zip من الدليل المركزي ويعيد {اسم: مدخل}
  function zipEntries(buf) {
    var b = new Uint8Array(buf), i = b.length - 22, found = -1;
    for (; i >= Math.max(0, b.length - 65557); i--) { if (u32(b, i) === 0x06054b50) { found = i; break; } }
    if (found < 0) throw new Error('ليس ملف zip صالحًا');
    var n = u16(b, found + 10), off = u32(b, found + 16), out = {}, td = new TextDecoder('utf-8');
    for (var k = 0; k < n; k++) {
      if (u32(b, off) !== 0x02014b50) break;
      var method = u16(b, off + 10), csize = u32(b, off + 20), nlen = u16(b, off + 28), elen = u16(b, off + 30), clen = u16(b, off + 32), lh = u32(b, off + 42);
      var name = td.decode(b.subarray(off + 46, off + 46 + nlen));
      out[name] = { method: method, csize: csize, lh: lh };
      off += 46 + nlen + elen + clen;
    }
    return { b: b, entries: out };
  }
  function entryBytes(z, e) {
    var b = z.b, lh = e.lh, nlen = u16(b, lh + 26), elen = u16(b, lh + 28), start = lh + 30 + nlen + elen;
    var data = b.subarray(start, start + e.csize);
    if (e.method === 0) return Promise.resolve(data);
    if (e.method === 8) return inflateRaw(data);
    return Promise.reject(new Error('طريقة ضغط غير مدعومة'));
  }
  function entryText(z, name) {
    var e = z.entries[name]; if (!e) return Promise.resolve(null);
    return entryBytes(z, e).then(function (d) { return new TextDecoder('utf-8').decode(d); });
  }
  function ext(name) { var m = /\.([^.]+)$/.exec(name || ''); return m ? m[1].toLowerCase() : ''; }
  var SUPPORTED = { txt: 1, md: 1, markdown: 1, csv: 1, json: 1, html: 1, htm: 1, xhtml: 1, docx: 1, epub: 1 };
  // يعيد وعدًا بـ {نوع: 'نص'|'docx'|'html', محتوى} أو يرفض برسالة
  function read(file) {
    var e = ext(file.name);
    if (!SUPPORTED[e]) return Promise.reject(new Error('unsupported'));
    if (file.size > 40 * 1024 * 1024) return Promise.reject(new Error('large'));
    if (e === 'docx') {
      return file.arrayBuffer().then(function (buf) { var z = zipEntries(buf); return entryText(z, 'word/document.xml'); })
        .then(function (xml) { if (xml === null) throw new Error('bad'); return { kind: 'docx', content: xml }; });
    }
    if (e === 'epub') {
      return file.arrayBuffer().then(function (buf) {
        var z = zipEntries(buf), names = Object.keys(z.entries).filter(function (n) { return /\.(x?html?)$/i.test(n) && !/(^|\/)(nav|toc)\./i.test(n); }).sort();
        return Promise.all(names.map(function (n) { return entryText(z, n); }));
      }).then(function (parts) { return { kind: 'html', content: parts.join('\n') }; });
    }
    return file.text().then(function (t) { return (e === 'html' || e === 'htm' || e === 'xhtml') ? { kind: 'html', content: t } : { kind: 'text', content: t }; });
  }
  root.NawaFiles = { read: read, zipEntries: zipEntries, entryText: entryText, ext: ext, supported: SUPPORTED };
  if (typeof module !== 'undefined') module.exports = root.NawaFiles;
})(typeof window !== 'undefined' ? window : globalThis);
