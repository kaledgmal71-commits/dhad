(function () {
  var $ = function (s) { return document.querySelector(s); };
  var ls = function (k, v) { try { if (v === undefined) return localStorage.getItem(k); localStorage.setItem(k, v); } catch (e) { return null; } };
  var el = function (tag, cls, txt) { var d = document.createElement(tag); if (cls) d.className = cls; if (txt !== undefined) d.textContent = txt; return d; };

  // السمة
  var cur = ls('dhad.site.theme'); if (cur) document.documentElement.setAttribute('data-theme', cur);
  $('#theme').onclick = function () {
    var d = document.documentElement, dark = d.getAttribute('data-theme') === 'dark' || (!d.getAttribute('data-theme') && matchMedia('(prefers-color-scheme:dark)').matches);
    var n = dark ? 'light' : 'dark'; d.setAttribute('data-theme', n); ls('dhad.site.theme', n);
  };

  // ===== عامل نواة =====
  var worker = new Worker('/assets/nawa.worker.js'), seq = 0, pend = {};
  worker.onmessage = function (e) { var m = e.data, p = pend[m.id]; if (!p) return; delete pend[m.id]; if (m.ok) p.res(m.r); else p.rej(new Error(m.e)); };
  worker.onerror = function (e) { Object.keys(pend).forEach(function (k) { pend[k].rej(new Error(e.message || 'خطأ في العامل')); delete pend[k]; }); };
  function call(a, x, y) { return new Promise(function (res, rej) { var id = ++seq; pend[id] = { res: res, rej: rej }; worker.postMessage({ id: id, a: a, x: x, y: y }); }); }
  var ready = call('تهيئة');
  ready.then(restoreDocs, function () {});

  // ===== ملفات المستخدم (تُحفظ في المتصفح فقط) =====
  var docs = {}, idb = null, queue = Promise.resolve();
  function openDB() {
    return new Promise(function (res) {
      try { var r = indexedDB.open('nawa', 2); r.onupgradeneeded = function () { var d = r.result; if (!d.objectStoreNames.contains('docs')) d.createObjectStore('docs', { keyPath: 'name' }); if (!d.objectStoreNames.contains('handles')) d.createObjectStore('handles', { keyPath: 'name' }); }; r.onsuccess = function () { res(r.result); }; r.onerror = function () { res(null); }; } catch (e) { res(null); }
    });
  }
  function dbDo(mode, fn, store) { return openDB().then(function (db) { if (!db) return null; return new Promise(function (res) { var tx = db.transaction(store || 'docs', mode), st = tx.objectStore(store || 'docs'), q = fn(st); tx.oncomplete = function () { res(q && q.result); }; tx.onerror = function () { res(null); }; }); }); }
  // الربط (link): مكتبة دائمة تُحفظ في المتصفح وتُفهرس تلقائيًا؛ الإرفاق (attach): ملف عابر للمحادثة الحالية يُحلَّل كاملًا
  var fileMode = 'attach';
  function sendDoc(name, r, mode) { var base = mode === 'attach' ? 'مرفق' : 'مستند'; return call(r.kind === 'docx' ? base + '_docx' : r.kind === 'html' ? base + '_html' : base, name, r.content); }
  // الربط كموصّل: مراجع للملفات لا نسخ لمحتواها. لا يُقرأ ملف ولا يُفهرَس عند الربط؛ يُجلب عند الحاجة وحدها، كما يُجلب ملف من مستودع.
  var linked = {};
  function saveNames() { try { ls('nawa.linkNames', JSON.stringify(Object.keys(linked).slice(0, 3000))); } catch (e) {} }
  function syncLinked() { saveNames(); call('عدد_مربوط', Object.keys(linked).length).catch(function () {}); lastSel = null; }
  function addLinked(path, size, ref) { linked[path] = { size: size, file: ref.file, fh: ref.fh }; docs['link:' + path] = { name: path, mode: 'link', state: 'ok', size: size }; }
  function supportedName(n) { return !!window.NawaFiles.supported[window.NawaFiles.ext(n)]; }
  function walkDir(dh, base, st) {
    var run = (async function rec(d, pre) {
      for await (var en of d.entries()) {
        if (st.n >= 5000) return;
        var nm = en[0], h = en[1];
        if (h.kind === 'directory') await rec(h, pre + nm + '/');
        else if (supportedName(nm)) { var pth = (pre + nm).replace(/#/g, '＃'); st.n++; addLinked(pth, 0, { fh: h }); }
      }
    })(dh, base + '/');
    return run;
  }
  function useHandle(h, rec) {
    var st = { n: 0 }; delete docs['link:' + rec.name + '/'];
    return walkDir(h, h.name, st).then(function () { syncLinked(); renderDocs(); });
  }
  function restoreDocs() {
    // محتوى مخزَّن بنسخ قديمة: لا يحتفظ الربط بمحتوى بعد الآن
    dbDo('readwrite', function (st) { return st.clear(); });
    var names = []; try { names = JSON.parse(ls('nawa.linkNames') || '[]'); } catch (e) {}
    return dbDo('readonly', function (st) { return st.getAll(); }, 'handles').then(function (hs) {
      (hs || []).forEach(function (rec) {
        var h = rec.handle; if (!h || !h.queryPermission) return;
        h.queryPermission({ mode: 'read' }).then(function (p) {
          if (p === 'granted') return useHandle(h, rec);
          docs['link:' + rec.name + '/'] = { name: rec.name + '/', mode: 'link', state: 'bad', note: 'مجلد مربوط — يحتاج إذن الوصول', size: 0, grant: function () { return h.requestPermission({ mode: 'read' }).then(function (q) { if (q === 'granted') return useHandle(h, rec); }); } };
          renderDocs();
        }).catch(function () {});
      });
      if (!(hs && hs.length)) names.forEach(function (n) { if (!linked[n]) docs['link:' + n] = { name: n, mode: 'link', state: 'bad', note: 'أعد اختيار المجلد لاستئناف الوصول', size: 0 }; });
      renderDocs();
    });
  }
  function pickDir() {
    fileMode = 'link';
    if (!window.showDirectoryPicker) { $('#dirIn').click(); return; }
    window.showDirectoryPicker({ mode: 'read' }).then(function (h) {
      var rec = { name: h.name, handle: h };
      dbDo('readwrite', function (st) { return st.put(rec); }, 'handles');
      return useHandle(h, rec);
    }).catch(function () {});
  }
  // جلب ما يخص المهمة من الملفات المربوطة: يُقرأ من المصدر عند الحاجة ويُسلَّم للجلسة، ثم تُفرَّغ مكتبتها عند اختلاف المهمة
  var lastSel = null, rcache = {}, rorder = [];
  function normQ(t) { return String(t).replace(/[ً-ْـ]/g, '').replace(/[أإآ]/g, 'ا').replace(/ى/g, 'ي').replace(/ة/g, 'ه').toLowerCase(); }
  var STOP = {}; 'ابحث اريد اكتب ملفاتي ملفي الملفات مكتبتي المكتبه هذا هذه عن على الي الذي التي ماذا كيف هل لماذا اين متى اعطني اذكر حلل لخص اشرح وضح ثم ايضا كل بعض'.split(' ').forEach(function (w) { STOP[w] = 1; });
  function qTokens(t) { return normQ(t).split(/[^ء-غف-يa-z0-9]+/).map(function (w) { return w.replace(/^(وال|بال|لل|ال)/, ''); }).filter(function (w) { return w.length >= 3 && !STOP[w]; }); }
  function readLinked(p) {
    if (rcache[p]) return Promise.resolve(rcache[p]);
    var e = linked[p]; if (!e) return Promise.resolve(null);
    return Promise.resolve(e.file || e.fh.getFile()).then(function (f) { e.size = f.size; return window.NawaFiles.read(f); }).then(function (r) {
      if (r.content.length > 600000) r.content = r.content.slice(0, 600000);
      rcache[p] = r; rorder.push(p); if (rorder.length > 12) delete rcache[rorder.shift()]; return r;
    }, function () { return null; });
  }
  async function prepareLinked(q) {
    var paths = Object.keys(linked); if (!paths.length) return;
    var toks = qTokens(q), sel = [];
    if (toks.length && !/^(السلام|مرحبا|اهلا|شكرا|من انت|ما انت|عرف)/.test(normQ(q).trim())) {
      var sc = paths.map(function (p) { var np = normQ(p), s = 0; toks.forEach(function (t) { if (np.indexOf(t) >= 0) s += 5; }); return { p: p, s: s }; }).sort(function (a, b) { return b.s - a.s; });
      var t0 = Date.now(), n = 0;
      for (var i = 0; i < sc.length && n < 40 && Date.now() - t0 < 6000; i++) {
        var it = sc[i], r = await readLinked(it.p); n++; if (!r) continue;
        var low = normQ(r.content), hits = 0;
        toks.forEach(function (t) { var k = low.indexOf(t); while (k >= 0 && hits < 200) { hits++; k = low.indexOf(t, k + t.length); } });
        it.s += hits; it.r = r;
      }
      sel = sc.filter(function (x) { return x.s > 0 && x.r; }).slice(0, 5);
    }
    var key = sel.map(function (x) { return x.p; }).join('|');
    if (key === lastSel) return;
    lastSel = key; await call('صفّر_المكتبة');
    for (var j = 0; j < sel.length; j++) await sendDoc(sel[j].p, sel[j].r, 'link');
  }
  function ingest(file, quiet, mode) {
    var name = (file.webkitRelativePath || file.name).replace(/#/g, '＃'), k = mode + ':' + name;
    if (!window.NawaFiles.supported[window.NawaFiles.ext(file.name)] && quiet) return;
    if (mode === 'link') {
      if (!supportedName(file.name)) { docs[k] = { name: name, mode: mode, state: 'bad', size: file.size, note: 'صيغة غير مدعومة بعد' }; renderDocs(); return; }
      addLinked(name, file.size, { file: file }); syncLinked(); renderDocs(); return;
    }
    docs[k] = { name: name, mode: mode, state: 'busy', size: file.size }; renderDocs();
    queue = queue.then(function () {
      return window.NawaFiles.read(file).then(function (r) {
        return sendDoc(name, r, mode);
      }).then(function (res) { docs[k] = { name: name, mode: mode, state: 'ok', chunks: res['مقاطع'], size: file.size }; },
        function (err) {
          var m = String(err && err.message);
          docs[k] = { name: name, mode: mode, state: 'bad', size: file.size, note: m === 'unsupported' ? 'صيغة غير مدعومة بعد' : m === 'large' ? 'الملف أكبر من الحد' : 'تعذّرت القراءة' };
        }).then(renderDocs);
    });
  }
  function removeDoc(k) {
    var d = docs[k]; if (!d) return;
    delete docs[k]; renderDocs();
    if (d.mode === 'link') { delete linked[d.name]; delete rcache[d.name]; syncLinked(); return; }
    queue = queue.then(function () { return call('إزالة_مرفق', d.name).catch(function () {}); });
  }
  function clearAttached() {
    Object.keys(docs).forEach(function (k) { if (docs[k].mode === 'attach') delete docs[k]; });
    renderDocs(); queue = queue.then(function () { return call('صفّر_المرفقات').catch(function () {}); });
  }
  function kb(n) { return n > 1048576 ? (n / 1048576).toFixed(1) + ' م.ب' : Math.max(1, Math.round(n / 1024)) + ' ك.ب'; }
  function renderDocs() {
    var names = Object.keys(docs), box = $('#files'); box.innerHTML = '';
    var shown = 0, more = 0;
    names.forEach(function (n) {
      if (docs[n].mode === 'link' && docs[n].state === 'ok' && ++shown > 30) { more++; return; }
      var d = docs[n], r = el('div', 'fr'), t = el('div', 't'), b = el('b', '', d.name), s = el('span', d.state === 'bad' ? 'bad' : '', d.state === 'busy' ? 'تُفهرَس الآن…' : d.state === 'ok' ? (d.mode === 'attach' ? kb(d.size) + ' · ' + d.chunks + ' مقطعًا · مرفق' : (d.size ? kb(d.size) + ' · ' : '') + 'مربوط، يُقرأ عند الحاجة') : d.note);
      t.appendChild(b); t.appendChild(s); r.appendChild(t);
      if (d.grant) { var gb = el('button', '', 'منح الوصول'); gb.onclick = function () { d.grant(); }; r.appendChild(gb); }
      var x = el('button', '', '×'); x.title = 'إزالة'; x.onclick = function () { removeDoc(n); }; r.appendChild(x); box.appendChild(r);
    });
    if (more) { var mr = el('div', 'fr'), mt = el('div', 't'); mt.appendChild(el('span', '', 'و' + more + ' ملفًا مربوطًا آخر')); mr.appendChild(mt); box.appendChild(mr); }
    var a = $('#attached'); a.innerHTML = '';
    var ok = names.filter(function (n) { return docs[n].state !== 'bad'; }), linked = 0, linkBusy = false;
    ok.forEach(function (n) {
      var d = docs[n];
      if (d.mode === 'attach') {
        var c = el('span', 'att' + (d.state === 'busy' ? ' busy' : '')), nm = el('b', '', d.name.length > 26 ? d.name.slice(0, 24) + '…' : d.name), x = el('i', 'x', '×');
        c.title = d.name; x.title = 'إزالة'; x.onclick = function (e) { e.stopPropagation(); removeDoc(n); };
        c.appendChild(nm); c.appendChild(x); c.onclick = openConn; a.appendChild(c);
      } else { linked++; if (d.state === 'busy') linkBusy = true; }
    });
    if (linked) { var s = el('span', 'att' + (linkBusy ? ' busy' : '')); s.innerHTML = 'المكتبة <b></b> ملف'; s.querySelector('b').textContent = linked; s.onclick = openConn; a.appendChild(s); }
  }
  function take(list, quiet, mode) { [].slice.call(list).forEach(function (f) { ingest(f, quiet, mode); }); }

  // ===== أدوات عرض =====
  var IC = {
    copy: '<svg viewBox="0 0 24 24"><rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V6a2 2 0 0 1 2-2h9"/></svg>',
    up: '<svg viewBox="0 0 24 24"><path d="M7 11v9H4v-9zM7 11l4-8a2 2 0 0 1 2 2v4h6a2 2 0 0 1 2 2l-1.5 7a2 2 0 0 1-2 1.6H7"/></svg>',
    down: '<svg viewBox="0 0 24 24"><path d="M7 13V4H4v9zM7 13l4 8a2 2 0 0 0 2-2v-4h6a2 2 0 0 0 2-2l-1.5-7A2 2 0 0 0 17.5 4H7"/></svg>',
    save: '<svg viewBox="0 0 24 24"><path d="M12 4v11m0 0l-4-4m4 4l4-4M5 19h14"/></svg>',
    path: '<svg viewBox="0 0 24 24"><circle cx="6" cy="6" r="2"/><circle cx="18" cy="12" r="2"/><circle cx="6" cy="18" r="2"/><path d="M8 6h5a3 3 0 0 1 3 3v1M8 18h5a3 3 0 0 0 3-3v-1"/></svg>',
    edit: '<svg viewBox="0 0 24 24"><path d="M4 20h4L19 9a2.8 2.8 0 0 0-4-4L4 16z"/></svg>',
    down2: '<svg viewBox="0 0 24 24"><path d="M12 5v14m0 0l-6-6m6 6l6-6"/></svg>',
    menu: '<svg viewBox="0 0 24 24"><path d="M4 7h16M4 12h16M4 17h10"/></svg>',
    stop: '<svg viewBox="0 0 24 24"><rect x="6" y="6" width="12" height="12" rx="2" fill="currentColor"/></svg>',
    retry: '<svg viewBox="0 0 24 24"><path d="M20 12a8 8 0 1 1-2.6-5.9M20 4v5h-5"/></svg>',
    gear: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"/><path d="M12 3v2m0 14v2M3 12h2m14 0h2M5.6 5.6 7 7m10 10 1.4 1.4M18.4 5.6 17 7M7 17l-1.4 1.4"/></svg>',
    ghost: '<svg viewBox="0 0 24 24"><path d="M5 21V11a7 7 0 0 1 14 0v10l-3-2-2 2-2-2-2 2-2-2z"/><circle cx="9.5" cy="11" r=".8" fill="currentColor"/><circle cx="14.5" cy="11" r=".8" fill="currentColor"/></svg>'
  };
  function ibtn(icon, label, cls) { var b = el('button', cls || ''); b.type = 'button'; b.innerHTML = icon + (label ? '<span></span>' : ''); if (label) b.lastChild.textContent = label; b.title = label || ''; return b; }
  function flash(b, txt) { var sp = b.querySelector('span'); if (!sp) return; var o = sp.textContent; sp.textContent = txt; setTimeout(function () { sp.textContent = o; }, 1300); }
  function copyText(t) { try { return navigator.clipboard.writeText(t); } catch (e) { return Promise.reject(e); } }
  // نص بسيط منسَّق: قوائم «- » و«• »، **غامق**، `شيفرة`، وأسوار ```
  function inline(parent, txt) {
    var re = /(\*\*[^*]+\*\*|`[^`]+`)/g, last = 0, m;
    while ((m = re.exec(txt))) {
      if (m.index > last) parent.appendChild(document.createTextNode(txt.slice(last, m.index)));
      var tok = m[0];
      if (tok.charAt(0) === '*') { var b = el('b', '', tok.slice(2, -2)); parent.appendChild(b); } else { parent.appendChild(el('code', '', tok.slice(1, -1))); }
      last = m.index + tok.length;
    }
    if (last < txt.length) parent.appendChild(document.createTextNode(txt.slice(last)));
  }
  function rich(text) {
    var box = el('div'), lines = String(text || '').split('\n'), i = 0, list = null, para = [];
    function flushPara() { if (para.length) { var p = el('p'); inline(p, para.join('\n')); box.appendChild(p); para = []; } }
    while (i < lines.length) {
      var ln = lines[i];
      if (/^```/.test(ln)) {
        flushPara(); list = null; var code = []; i++;
        while (i < lines.length && !/^```/.test(lines[i])) { code.push(lines[i]); i++; }
        i++; box.appendChild(codeBlock(code.join('\n'), null, true)); continue;
      }
      var m = /^(\s*)([-•])\s+(.*)$/.exec(ln);
      if (m) {
        flushPara();
        if (!list) { list = el('ul'); box.appendChild(list); }
        var li = el('li'); if (m[1].length >= 2) li.className = 'sub'; inline(li, m[3]); list.appendChild(li);
      } else if (ln.trim() === '') { flushPara(); list = null; }
      else { list = null; para.push(ln); }
      i++;
    }
    flushPara(); return box;
  }

  // ===== المحادثة =====
  var sendIc = $('#send').innerHTML, curPending = null, reqId = 0, tempMode = false;
  var inp = $('#in'), send = $('#send'), col = $('#col'), scroll = $('#scroll'), hist = $('#hist'), hero = $('#hero'), busyAsk = false;
  var convs = [], curConv = null;
  try { convs = JSON.parse(ls('nawa.convs') || '[]'); } catch (e) { convs = []; }
  function saveConvs() { try { ls('nawa.convs', JSON.stringify(convs.filter(function (c) { return !c.temp; }).slice(0, 30))); } catch (e) {} }
  function grow() { inp.style.height = 'auto'; inp.style.height = Math.min(inp.scrollHeight, 200) + 'px'; send.disabled = !busyAsk && !inp.value.trim(); if (send.classList.contains('stop') !== busyAsk) { send.classList.toggle('stop', busyAsk); send.innerHTML = busyAsk ? IC.stop : sendIc; send.setAttribute('aria-label', busyAsk ? 'إيقاف' : 'إرسال'); } }
  inp.addEventListener('input', grow);
  inp.addEventListener('keydown', function (e) { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); go(); } });
  send.onclick = function () { if (busyAsk) stopAsk(); else go(); };
  document.querySelectorAll('.chip').forEach(function (c) { c.onclick = function () { inp.value = c.dataset.q || c.textContent; grow(); inp.focus(); }; });

  var editIdx = null;
  function msg(role, node, idx) {
    var d = el('div', 'msg ' + (role === 'u' ? 'u' : 'a')), av = el('div', 'av', role === 'u' ? 'أ' : 'ن'), tx = el('div', 'tx');
    if (idx !== undefined) d.dataset.i = idx;
    if (typeof node === 'string') tx.textContent = node; else tx.appendChild(node);
    d.appendChild(av); d.appendChild(tx);
    if (role === 'u' && idx !== undefined) {
      var eb = ibtn(IC.edit, '', 'medit'); eb.title = 'تعديل الرسالة'; eb.setAttribute('aria-label', 'تعديل الرسالة');
      eb.onclick = function () { startEdit(idx, tx.textContent); }; d.appendChild(eb);
    }
    col.appendChild(d); scroll.scrollTop = scroll.scrollHeight; return d;
  }
  function startEdit(idx, text) { editIdx = idx; inp.value = text; inp.placeholder = 'عدّل رسالتك ثم أرسلها'; grow(); inp.focus(); }
  function cancelEdit() { editIdx = null; inp.placeholder = 'اكتب طلبك هنا'; }
  function hideHero() { if (hero) { hero.remove(); hero = null; $('#chips').style.display = 'none'; } }
  function urlFor(id) {
    var p = String(id).split('/');
    if (p[0] === 'lesson') return '/learn/' + p[1] + '/';
    if (p[0] === 'explain') return '/explain/' + p[1] + '/';
    if (p[0] === 'example') return '/examples/#' + p[1];
    if (p[0] === 'dict') return '/dictionary/';
    return null;
  }
  function codeBlock(code, source, plain) {
    var w = el('div', 'cb'), bar = el('div', 'bar'), pre = el('pre'), out = el('div', 'out');
    var v = el('span', plain ? '' : 'v', plain ? 'شيفرة' : '✓ جُرِّب فأعاد الناتج المتوقع'); bar.appendChild(v); bar.appendChild(el('span', 'sp'));
    var run = el('button', '', 'شغّل'), cp = el('button', '', 'نسخ'), ed = el('a', '', 'افتح في المحرر');
    ed.href = '/editor/?code=' + encodeURIComponent(code); ed.target = '_blank'; ed.rel = 'noopener';
    run.onclick = function () { call('شغّل', code).then(function (r) { out.className = 'out' + (r.ok ? '' : ' err'); out.textContent = r.out.join('\n') + (r.ok ? '' : (r.out.length ? '\n' : '') + '✗ ' + r.error); out.style.display = 'block'; }); };
    cp.onclick = function () { try { navigator.clipboard.writeText(code); cp.textContent = 'نُسخ'; setTimeout(function () { cp.textContent = 'نسخ'; }, 1200); } catch (e) {} };
    bar.appendChild(run); bar.appendChild(cp); bar.appendChild(ed);
    pre.textContent = code; out.style.display = 'none'; w.appendChild(bar); w.appendChild(pre); w.appendChild(out); return w;
  }
  function answer(r) {
    var box = el('div'), n = r['نتائج'] || {}, any = false;
    if (r['بادئة']) box.appendChild(el('p', '', r['بادئة']));
    var syn = n['توليف'];
    if (syn && syn['وُجد']) { any = true; box.appendChild(codeBlock(syn['شيفرة'], syn['مصدر'])); if (urlFor(syn['مصدر'])) { var s1 = el('div', 'srcline', 'المصدر: '), a1 = el('a', '', syn['مصدر']); a1.href = urlFor(syn['مصدر']); s1.appendChild(a1); box.appendChild(s1); } }
    else if (syn) { any = true; box.appendChild(el('p', '', 'لم أجد برنامجًا موثوقًا يطابق الوصف. صِف المطلوب بكلمات أخرى، أو افتح المحرر وجرّب.')); }
    var ex = n['تنفيذ'];
    if (ex) { any = true; var w = el('div', 'cb'), o = el('div', 'out' + (ex['ناجح'] ? '' : ' err')); o.textContent = ex['ناجح'] ? ex['مخرجات'].join('\n') : '✗ ' + ex['خطأ']; w.appendChild(o); box.appendChild(w); }
    var dg = n['تشخيص'];
    if (dg) {
      any = true; var d = el('div', 'diag'); d.appendChild(el('p', '', dg['تفسير']));
      if (dg['نص_السطر']) { var c = el('code', '', 'السطر ' + dg['سطر'] + ': ' + dg['نص_السطر']); d.appendChild(c); }
      d.appendChild(el('p', '', dg['اقتراح'])); box.appendChild(d);
    }
    var pas = n['مستندات'];
    if (pas && pas.length) { any = true; box.appendChild(el('h4', '', 'من ملفاتك')); pas.forEach(function (p) { var q = el('div', 'pas'); q.appendChild(el('b', '', String(p['معرف']).split('#')[0])); q.appendChild(el('span', '', p['مقتطف'] || p['عنوان'])); box.appendChild(q); }); }
    var src = n['استرجاع'];
    if (src && src.length && !(syn && syn['وُجد'])) {
      var links = src.filter(function (s) { return urlFor(s['معرف']); });
      if (links.length) { any = true; box.appendChild(el('h4', '', 'من معرفة الموقع')); var sc = el('div', 'src'); links.forEach(function (s) { var a = el('a', '', s['عنوان']); a.href = urlFor(s['معرف']); sc.appendChild(a); }); box.appendChild(sc); }
    }
    if (!any) { if (r['بادئة'] && box.firstChild && box.firstChild.tagName === 'P') box.removeChild(box.firstChild); box.appendChild(rich(r['رد'])); }
    box.appendChild(actions(r, box));
    return box;
  }
  // إجراءات الإجابة: نسخ، تقييم، حفظ، والمسار الذي مرّت به المحركات
  // نص الإجابة بفواصل الأسطر الصحيحة (بدل innerText لعقدة غير معروضة)
  function textOf(n) {
    if (n.nodeType === 3) return n.nodeValue;
    if (n.nodeType !== 1) return '';
    var c = n.classList;
    if (c && (c.contains('acts') || c.contains('trace') || c.contains('out'))) return '';
    var t = n.tagName, inner = [].slice.call(n.childNodes).map(textOf).join('');
    if (t === 'LI') return (c.contains('sub') ? '  • ' : '- ') + inner + '\n';
    if (t === 'P' || t === 'UL' || t === 'H4') return inner.replace(/\n+$/, '') + '\n\n';
    if (t === 'PRE') return '```\n' + inner + '\n```\n\n';
    if (c && (c.contains('pas') || c.contains('diag') || c.contains('srcline'))) return inner.replace(/\n+$/, '') + '\n\n';
    if (t === 'BUTTON' || t === 'A' && c.contains('x')) return t === 'A' ? inner : '';
    return inner;
  }
  function plainOf(box) { return textOf(box).replace(/\n{3,}/g, '\n\n').trim(); }
  function entryOf(r) { return curConv && curConv.msgs.filter(function (m) { return m.res === r; })[0]; }
  function actions(r, box) {
    var a = el('div', 'acts'), cp = ibtn(IC.copy, 'نسخ'), up = ibtn(IC.up, ''), dn = ibtn(IC.down, ''), ex = ibtn(IC.save, 'حفظ المحادثة'), tr = ibtn(IC.path, 'المسار');
    up.title = 'إجابة مفيدة'; dn.title = 'إجابة غير مفيدة';
    var en = entryOf(r); if (en && en.fb) (en.fb === 1 ? up : dn).classList.add('on');
    cp.onclick = function () { copyText(plainOf(box)).then(function () { flash(cp, 'نُسخ'); }, function () { flash(cp, 'تعذّر'); }); };
    function vote(v, b, o) { return function () { var e = entryOf(r) || en; if (!e) return; e.fb = e.fb === v ? 0 : v; b.classList.toggle('on', e.fb === v); o.classList.remove('on'); saveConvs(); }; }
    up.onclick = vote(1, up, dn); dn.onclick = vote(-1, dn, up);
    ex.onclick = exportConv;
    var steps = (r['خطة'] || []), tb = null;
    tr.onclick = function () {
      if (tb) { tb.remove(); tb = null; tr.classList.remove('on'); return; }
      tb = el('div', 'trace'); tr.classList.add('on');
      if (!steps.length) tb.appendChild(el('div', 'ts', 'لم تُشغَّل محركات لهذا الطلب.'));
      steps.forEach(function (s) { var d = el('div', 'ts'); d.appendChild(el('b', '', s['محرك'])); d.appendChild(el('span', 's', s['حالة'])); if (s['تفصيل']) d.appendChild(el('em', '', s['تفصيل'])); tb.appendChild(d); });
      box.appendChild(tb);
    };
    [cp, up, dn, ex, tr].forEach(function (b) { a.appendChild(b); });
    return a;
  }
  function exportConv() {
    if (!curConv) return;
    var out = ['# ' + curConv.title, ''];
    curConv.msgs.forEach(function (m) { if (m.role === 'u') out.push('**أنا:** ' + m.text, ''); else out.push('**نواة:** ' + (m.txt || (m.res && m.res['رد']) || m.text || ''), ''); });
    var blob = new Blob([out.join('\n')], { type: 'text/markdown;charset=utf-8' }), a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = 'محادثة-نواة.md'; document.body.appendChild(a); a.click(); a.remove(); setTimeout(function () { URL.revokeObjectURL(a.href); }, 2000);
  }
  function go() {
    var t = inp.value.trim(); if (!t || busyAsk) return;
    hideHero();
    if (!curConv) { curConv = { id: Date.now(), title: t.slice(0, 48), msgs: [], temp: tempMode }; if (curProj) curConv.proj = Number(curProj); if (!tempMode) convs.unshift(curConv); }
    if (editIdx !== null) {
      var at = editIdx; cancelEdit();
      [].slice.call(col.querySelectorAll('.msg')).forEach(function (n) { if (Number(n.dataset.i) >= at) n.remove(); });
      curConv.msgs.length = at;
    }
    msg('u', t, curConv.msgs.length); inp.value = ''; busyAsk = true; grow();
    curConv.msgs.push({ role: 'u', text: t });
    var dots = el('div', 'dots'); dots.innerHTML = '<i></i><i></i><i></i>'; var pending = msg('a', dots, curConv.msgs.length), my = ++reqId; curPending = pending;
    col.querySelectorAll('.sugg,.acts .rt').forEach(function (n) { n.remove(); });
    ready.then(function () { return prepareLinked(t).catch(function () {}); }).then(function () { return call('اسأل', t); }).then(function (r) {
      if (my !== reqId) return 'x';
      var en = { role: 'a', res: r }; curConv.msgs.push(en);
      var node = answer(r); pending.querySelector('.tx').replaceChildren(node); en.txt = plainOf(node); addExtras(r, node, t, curConv.msgs.length - 2); if (SET.autotrace) { var trb = node.querySelectorAll('.acts button'); if (trb.length) trb[trb.length - 1].click(); }
    }, function (err) {
      if (my !== reqId) return 'x';
      pending.querySelector('.tx').replaceChildren(el('p', '', 'تعذّر إتمام الطلب: ' + (err && err.message ? err.message : ''))); curConv.msgs.push({ role: 'a', text: 'تعذّر إتمام الطلب' });
    }).then(function (x) { if (x === 'x') return; busyAsk = false; curPending = null; grow(); saveConvs(); renderHist(); scroll.scrollTop = scroll.scrollHeight; });
  }
  var hq = '', hlist = null;
  function renderHist() {
    if (!hlist) {
      hist.innerHTML = '<h6>المحادثات</h6>';
      var si = el('input', 'hsearch'); si.type = 'search'; si.placeholder = 'بحث في المحادثات'; si.setAttribute('aria-label', 'بحث في المحادثات');
      si.oninput = function () { hq = si.value.trim(); renderHist(); }; hist.appendChild(si);
      hlist = el('div', 'hlist'); hist.appendChild(hlist);
    }
    hlist.innerHTML = '';
    var list = convs.filter(function (c) { return !hq || c.title.indexOf(hq) >= 0 || c.msgs.some(function (m) { return (m.text || m.txt || '').indexOf(hq) >= 0; }); });
    list.sort(function (x, y) { return (y.pin ? 1 : 0) - (x.pin ? 1 : 0); });
    if (!list.length) { hlist.appendChild(el('div', 'none', convs.length ? 'لا نتائج' : 'لا محادثات بعد')); return; }
    list.forEach(function (c) {
      var row = el('div', 'hi' + (curConv && curConv.id === c.id ? ' on' : '')), b = el('button', '', (c.pin ? '📌 ' : '') + c.title);
      if (c.proj) { var pj = (projects || []).filter(function (x) { return x.id === c.proj; })[0]; if (pj) b.title = pj.name; }
      b.onclick = function () { openConv(c); };
      var acts = el('span', 'hx'), pn = el('button', '', c.pin ? 'إلغاء التثبيت' : 'تثبيت'), rn = el('button', '', 'إعادة تسمية'), dl = el('button', '', 'حذف');
      pn.onclick = function (e) { e.stopPropagation(); c.pin = !c.pin; saveConvs(); renderHist(); };
      rn.onclick = function (e) { e.stopPropagation(); var n = prompt('اسم المحادثة', c.title); if (n && n.trim()) { c.title = n.trim().slice(0, 60); saveConvs(); renderHist(); } };
      dl.onclick = function (e) {
        e.stopPropagation(); if (!confirm('حذف هذه المحادثة؟')) return;
        convs = convs.filter(function (x) { return x !== c; }); saveConvs();
        if (curConv === c) $('#newchat').click(); else renderHist();
      };
      [pn, rn, dl].forEach(function (x) { acts.appendChild(x); }); row.appendChild(b); row.appendChild(acts); hlist.appendChild(row);
    });
  }
  function openConv(c) {
    curConv = c; col.innerHTML = ''; hero = null; $('#chips').style.display = 'none';
    c.msgs.forEach(function (m, i) { if (m.role === 'u') msg('u', m.text, i); else msg('a', m.res ? answer(m.res) : m.text, i); });
    cancelEdit(); renderHist(); $('.side').classList.remove('open');
  }
  $('#newchat').onclick = function () {
    curConv = null; col.innerHTML = ''; clearAttached(); queue = queue.then(function () { return call('صفّر_السياق').catch(function () {}); });
    hero = el('div', 'hero'); hero.id = 'hero'; hero.innerHTML = '<div class="mark">ن</div><h1>ماذا تريد أن تبني اليوم؟</h1>'; col.appendChild(hero);
    $('#chips').style.display = ''; renderHist(); inp.focus();
  };
  renderHist();

  // زر الانتقال إلى آخر الحديث
  var tb = ibtn(IC.down2, '', 'tobottom'); tb.setAttribute('aria-label', 'إلى آخر المحادثة'); tb.hidden = true; $('.ws').appendChild(tb);
  tb.onclick = function () { scroll.scrollTo({ top: scroll.scrollHeight, behavior: 'smooth' }); };
  scroll.addEventListener('scroll', function () { tb.hidden = scroll.scrollHeight - scroll.scrollTop - scroll.clientHeight < 240; });
  // سجل المحادثات على الشاشات الضيقة
  var hb = ibtn(IC.menu, '', 'hbtn'); hb.setAttribute('aria-label', 'المحادثات'); $('.ws').appendChild(hb);
  var bd = el('div', 'bd'); document.body.appendChild(bd);
  function drawer(on) { $('.side').classList.toggle('open', on); bd.classList.toggle('open', on); }
  hb.onclick = function () { drawer(!$('.side').classList.contains('open')); }; bd.onclick = function () { drawer(false); };
  // اختصارات لوحة المفاتيح
  document.addEventListener('keydown', function (e) {
    var typing = /^(INPUT|TEXTAREA)$/.test((e.target.tagName || '')), mod = e.ctrlKey || e.metaKey;
    if (mod && e.key.toLowerCase() === 'k') { e.preventDefault(); $('#newchat').click(); drawer(false); }
    else if (e.key === 'Escape') { $('#menu').classList.remove('open'); $('#ov').classList.remove('open'); $('#sov').classList.remove('open'); $('#pov').classList.remove('open'); drawer(false); if (editIdx !== null) { cancelEdit(); inp.value = ''; grow(); } }
    else if (e.key === '/' && !typing && !mod) { e.preventDefault(); inp.focus(); }
    else if (e.key === 'ArrowUp' && e.target === inp && !inp.value && curConv) {
      for (var i = curConv.msgs.length - 1; i >= 0; i--) if (curConv.msgs[i].role === 'u') { e.preventDefault(); startEdit(i, curConv.msgs[i].text); break; }
    }
  });

  // ===== قائمة + والموصّلات =====
  var menu = $('#menu');
  $('#plus').onclick = function (e) { e.stopPropagation(); menu.classList.toggle('open'); };
  document.addEventListener('click', function () { menu.classList.remove('open'); });
  menu.querySelectorAll('button').forEach(function (b) { b.onclick = function () { var a = b.dataset.act; if (a === 'files') { fileMode = 'attach'; $('#fileIn').click(); } else if (a === 'folder') { pickDir(); } else openConn(); }; });
  function openConn() { $('#ov').classList.add('open'); }
  $('#openConn').onclick = openConn;
  $('#closeConn').onclick = function () { $('#ov').classList.remove('open'); };
  $('#ov').onclick = function (e) { if (e.target === this) this.classList.remove('open'); };
  $('#pickFiles').onclick = function () { fileMode = 'link'; $('#fileIn').click(); };
  $('#pickFolder').onclick = pickDir;
  $('#fileIn').onchange = function () { take(this.files, false, fileMode); this.value = ''; };
  $('#dirIn').onchange = function () { take(this.files, true, 'link'); this.value = ''; };
  var drop = $('#drop');
  ['dragenter', 'dragover'].forEach(function (ev) { drop.addEventListener(ev, function (e) { e.preventDefault(); drop.classList.add('over'); }); });
  ['dragleave', 'drop'].forEach(function (ev) { drop.addEventListener(ev, function (e) { e.preventDefault(); drop.classList.remove('over'); }); });
  drop.addEventListener('drop', function (e) { take(e.dataTransfer.files, false, 'link'); });
  // إفلات الملفات في أي مكان من الصفحة
  window.addEventListener('dragover', function (e) { e.preventDefault(); });
  window.addEventListener('drop', function (e) { if (e.target.closest && e.target.closest('#drop')) return; e.preventDefault(); if (e.dataTransfer && e.dataTransfer.files.length) take(e.dataTransfer.files, false, 'attach'); });

  // ===== إيقاف، إعادة المحاولة، اقتراحات المتابعة =====
  function stopAsk() {
    if (!busyAsk) return;
    reqId++; busyAsk = false;
    if (curPending) { curPending.querySelector('.tx').replaceChildren(el('p', '', 'أُوقف الطلب.')); curPending = null; }
    if (curConv) curConv.msgs.push({ role: 'a', text: 'أُوقف الطلب.' });
    grow(); saveConvs();
  }
  function addExtras(r, node, t, uidx) {
    var a = node.querySelector('.acts');
    if (a) { var rt = ibtn(IC.retry, 'إعادة'); rt.classList.add('rt'); rt.onclick = function () { if (busyAsk) return; editIdx = uidx; inp.value = t; go(); }; a.insertBefore(rt, a.firstChild); }
    var n = r['نتائج'] || {}, qs = [], syn = n['توليف'];
    if (syn && syn['وُجد']) { qs.push('شغّله'); qs.push('اشرح الكود'); }
    else if ((n['استرجاع'] && n['استرجاع'].length) || (n['مستندات'] && n['مستندات'].length)) { qs.push('المزيد'); }
    if (r['نوع'] === 'حوار' && !qs.length) { qs = ['اكتب لي برنامج الأعداد الأولية', 'اشرح لي الإغلاقات']; }
    if (!qs.length) return;
    var w = el('div', 'sugg'); qs.forEach(function (q) { var b = el('button', '', q); b.type = 'button'; b.onclick = function () { if (busyAsk) return; inp.value = q; go(); }; w.appendChild(b); });
    node.appendChild(w);
  }

  // ===== الشريط الجانبي: المشاريع والآثار والمهارات والموصّلات، وأسفله الإعدادات =====
  var SET = {}; try { SET = JSON.parse(ls('nawa.set') || '{}'); } catch (e) {}
  function saveSet() { ls('nawa.set', JSON.stringify(SET)); }
  var zoom = Number(ls('nawa.zoom') || 1) || 1; col.style.zoom = zoom;
  var projects = []; try { projects = JSON.parse(ls('nawa.projects') || '[]'); } catch (e) {}
  var curProj = ls('nawa.curProj') || '';
  function saveProj() { ls('nawa.projects', JSON.stringify(projects)); ls('nawa.curProj', curProj); }
  var IC2 = {
    proj: '<svg viewBox="0 0 24 24"><path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></svg>',
    art: '<svg viewBox="0 0 24 24"><path d="M8 7 3 12l5 5M16 7l5 5-5 5M14 4l-4 16"/></svg>',
    skill: '<svg viewBox="0 0 24 24"><path d="M12 3l2.6 5.6 6 .7-4.5 4.1 1.2 6L12 16.5 6.7 19.4l1.2-6L3.4 9.3l6-.7z"/></svg>',
    conn: '<svg viewBox="0 0 24 24"><path d="M9 7V3m6 4V3M7 11h10v3a5 5 0 0 1-10 0v-3zM12 19v2"/></svg>'
  };
  var pov = el('div', 'ov'), pd = el('div', 'dlg'), pt = el('h2'), pb = el('div', 'body sbody'), pc = el('button', 'ibtn', 'إغلاق');
  pov.id = 'pov'; pd.setAttribute('role', 'dialog'); pd.setAttribute('aria-modal', 'true');
  var ph = el('header'); ph.appendChild(pt); ph.appendChild(pc); pd.appendChild(ph); pd.appendChild(pb); pov.appendChild(pd); document.body.appendChild(pov);
  pc.onclick = function () { pov.classList.remove('open'); }; pov.onclick = function (e) { if (e.target === pov) pov.classList.remove('open'); };
  function openPanel(title, render) { pt.textContent = title; pb.innerHTML = ''; render(pb); pov.classList.add('open'); drawer(false); }
  function item(titleTxt, sub, actions) { var r = el('div', 'prow'), t = el('div', 't'); t.appendChild(el('b', '', titleTxt)); if (sub) t.appendChild(el('span', '', sub)); r.appendChild(t); (actions || []).forEach(function (a) { var b = el('button', 'ibtn', a[0]); b.type = 'button'; b.onclick = a[1]; r.appendChild(b); }); return r; }
  function empty(txt) { return el('div', 'none', txt); }

  function openProjects() {
    openPanel('المشاريع', function (b) {
      var add = el('button', 'ibtn', 'مشروع جديد'); add.type = 'button';
      add.onclick = function () { var n = prompt('اسم المشروع'); if (!n || !n.trim()) return; projects.unshift({ id: Date.now(), name: n.trim().slice(0, 50), notes: '' }); saveProj(); openProjects(); renderHist(); };
      b.appendChild(add);
      if (!projects.length) b.appendChild(empty('لا مشاريع بعد'));
      projects.forEach(function (pr) {
        var n = convs.filter(function (c) { return c.proj === pr.id; }).length;
        b.appendChild(item(pr.name + (curProj == pr.id ? ' · نشط' : ''), n + ' محادثة' + (pr.notes ? ' — ' + pr.notes : ''), [
          [curProj == pr.id ? 'إلغاء التنشيط' : 'تنشيط', function () { curProj = curProj == pr.id ? '' : String(pr.id); saveProj(); renderHist(); openProjects(); }],
          ['ملاحظات', function () { var t = prompt('ملاحظات المشروع', pr.notes || ''); if (t !== null) { pr.notes = t.trim().slice(0, 200); saveProj(); openProjects(); } }],
          ['حذف', function () { if (!confirm('حذف المشروع؟ تبقى محادثاته.')) return; projects = projects.filter(function (x) { return x !== pr; }); convs.forEach(function (c) { if (c.proj == pr.id) delete c.proj; }); if (curProj == pr.id) curProj = ''; saveProj(); saveConvs(); openProjects(); renderHist(); }]
        ]));
      });
    });
  }
  function artifactsList() {
    var out = [];
    convs.forEach(function (c) { c.msgs.forEach(function (m) { var sy = m.res && m.res['نتائج'] && m.res['نتائج']['توليف']; if (sy && sy['وُجد']) out.push({ conv: c, src: sy['مصدر'], code: sy['شيفرة'] }); }); });
    return out;
  }
  function openArtifacts() {
    openPanel('الآثار', function (b) {
      var list = artifactsList();
      if (!list.length) b.appendChild(empty('البرامج التي تكتبها نواة وتتحقق منها تُجمع هنا'));
      list.forEach(function (a, i) {
        var r = item(a.src.split('/').pop(), a.conv.title, [['نسخ', function () { copyText(a.code); }], ['المحرر', function () { window.open('/editor/?code=' + encodeURIComponent(a.code), '_blank', 'noopener'); }], ['المحادثة', function () { pov.classList.remove('open'); openConv(a.conv); }]]);
        var pre = el('pre', 'aprev'); pre.textContent = a.code.split('\n').slice(0, 6).join('\n'); r.appendChild(pre); b.appendChild(r);
      });
    });
  }
  var SKILLS = [
    ['كتابة برنامج', 'يوفّق برنامجًا موثَّقًا لوصفك ويتحقق منه بالتشغيل قبل أن يعرضه', 'اكتب لي برنامج الأعداد الأولية'],
    ['تشغيل وتشخيص', 'يشغّل شيفرتك في بيئة معزولة ويشخّص الخطأ ويقترح الإصلاح', 'لماذا لا يعمل هذا؟ اطبع(عدادد)'],
    ['شرح اللغة', 'يشرح المفاهيم من الدروس والشروحات والمعجم', 'اشرح لي الإغلاقات'],
    ['تحليل ملف', 'يقيس ملفًا مرفقًا ويستخرج بنيته وأبرز مصطلحاته', 'حلل هذا الملف'],
    ['البحث في الملفات', 'يجلب من ملفاتك المربوطة ما يخص سؤالك', 'ابحث في ملفاتي']
  ];
  function openSkills() {
    openPanel('المهارات', function (b) {
      SKILLS.forEach(function (k) { b.appendChild(item(k[0], k[1], [['جرّب', function () { pov.classList.remove('open'); inp.value = k[2]; grow(); inp.focus(); }]])); });
    });
  }
  var nav = el('div', 'snav');
  [['المشاريع', IC2.proj, openProjects], ['الآثار', IC2.art, openArtifacts], ['المهارات', IC2.skill, openSkills], ['الموصّلات', IC2.conn, function () { drawer(false); openConn(); }]].forEach(function (x) { var b = ibtn(x[1], x[0]); b.onclick = x[2]; nav.appendChild(b); });
  $('.side').insertBefore(nav, hist);

  var foot = el('div', 'sfoot'), tmp = ibtn(IC.ghost, 'محادثة مؤقتة'), st = ibtn(IC.gear, 'الإعدادات');
  tmp.onclick = function () { tempMode = !tempMode; tmp.classList.toggle('on', tempMode); $('#newchat').click(); drawer(false); };
  foot.appendChild(tmp); foot.appendChild(st); $('.side').appendChild(foot);

  // الإعدادات: أقسام مرتبة، وفي كل قسم صفوف بأدوات تحكم من جنسها (مفتاح، اختيار، قائمة)
  function toggle(on, fn) { var t = el('button', 'tg' + (on ? ' on' : '')); t.type = 'button'; t.setAttribute('role', 'switch'); t.setAttribute('aria-checked', on ? 'true' : 'false'); t.appendChild(el('i')); t.onclick = function () { on = !on; t.classList.toggle('on', on); t.setAttribute('aria-checked', on ? 'true' : 'false'); fn(on); }; return t; }
  function seg(opts, cur, fn) { var w = el('span', 'seg'); opts.forEach(function (o) { var x = el('button', 'ibtn' + (o[1] === cur ? ' on' : ''), o[0]); x.type = 'button'; x.onclick = function () { [].slice.call(w.children).forEach(function (c) { c.classList.remove('on'); }); x.classList.add('on'); fn(o[1]); }; w.appendChild(x); }); return w; }
  function srow(label, node, hint) { var r = el('div', 'srow'), t = el('div', 't'); t.appendChild(el('b', '', label)); if (hint) t.appendChild(el('span', '', hint)); r.appendChild(t); r.appendChild(node); return r; }
  function act(txt, fn) { var b = el('button', 'ibtn', txt); b.type = 'button'; b.onclick = fn; return b; }
  var SECTIONS = [
    ['عام', function (b) {
      b.appendChild(srow('حجم الخط', seg([['صغير', 0.9], ['عادي', 1], ['كبير', 1.15]], zoom, function (v) { zoom = v; col.style.zoom = v; ls('nawa.zoom', String(v)); })));
      var th = ls('dhad.site.theme') || 'auto';
      b.appendChild(srow('السمة', seg([['تلقائي', 'auto'], ['فاتح', 'light'], ['داكن', 'dark']], th, function (v) { if (v === 'auto') { document.documentElement.removeAttribute('data-theme'); try { localStorage.removeItem('dhad.site.theme'); } catch (e) {} } else { document.documentElement.setAttribute('data-theme', v); ls('dhad.site.theme', v); } })));
      b.appendChild(srow('الإرسال بمفتاح Enter', toggle(SET.enter !== false, function (v) { SET.enter = v; saveSet(); }), 'وإلا فبالزر، ويكون Enter سطرًا جديدًا'));
      b.appendChild(srow('إظهار المسار تلقائيًا', toggle(!!SET.autotrace, function (v) { SET.autotrace = v; saveSet(); }), 'يفتح خطوات المحركات تحت كل إجابة'));
    }],
    ['الذاكرة', function (b) {
      var nm = convs.filter(function (c) { return !c.temp; }).length, nf = (JSON.parse(ls('nawa.linkNames') || '[]')).length;
      b.appendChild(srow('المحادثات المحفوظة', el('span', 'val', String(nm)), 'تُحفظ في هذا المتصفح وحده'));
      b.appendChild(srow('الملفات المربوطة', el('span', 'val', String(Object.keys(linked).length || nf)), 'مراجع لا نسخ؛ يُقرأ الملف عند الحاجة'));
      b.appendChild(srow('الآثار المحفوظة', el('span', 'val', String(artifactsList().length)), 'برامج وُلّفت وتحقق منها'));
      b.appendChild(srow('نسيان كل شيء', act('نسيان', function () { if (!confirm('مسح المحادثات والمشاريع وسياق الجلسة؟')) return; convs = []; projects = []; curProj = ''; saveConvs(); saveProj(); $('#newchat').click(); SECTIONS[1][1](b2()); })));
    }],
    ['الموصّلات', function (b) {
      b.appendChild(srow('ربط مجلد أو ملفات', act('فتح', function () { sov.classList.remove('open'); openConn(); }), 'يبقى الوصول إلى مكانها دون نسخها هنا'));
      b.appendChild(srow('إزالة كل الروابط', act('إزالة', function () { if (!confirm('إزالة كل الملفات المربوطة؟')) return; Object.keys(docs).forEach(function (k) { if (docs[k].mode === 'link') removeDoc(k); }); try { localStorage.removeItem('nawa.linkNames'); } catch (e) {} dbDo('readwrite', function (x) { return x.clear(); }, 'handles'); })));
    }],
    ['البيانات', function (b) {
      b.appendChild(srow('تصدير كل المحادثات', act('تصدير', function () {
        var out = []; convs.forEach(function (c) { out.push('# ' + c.title, ''); c.msgs.forEach(function (m) { out.push((m.role === 'u' ? '**أنا:** ' : '**نواة:** ') + (m.text || m.txt || ''), ''); }); });
        var bl = new Blob([out.join('\n')], { type: 'text/markdown;charset=utf-8' }), a = document.createElement('a'); a.href = URL.createObjectURL(bl); a.download = 'كل-محادثات-نواة.md'; document.body.appendChild(a); a.click(); a.remove();
      })));
      b.appendChild(srow('مسح كل المحادثات', act('مسح', function () { if (!confirm('مسح كل المحادثات المحفوظة؟')) return; convs = []; saveConvs(); $('#newchat').click(); })));
    }],
    ['الاختصارات', function (b) {
      [['Ctrl+K', 'محادثة جديدة'], ['/', 'الانتقال إلى الكتابة'], ['↑', 'تعديل آخر رسالة'], ['Esc', 'إغلاق']].forEach(function (k) { var v = el('kbd', '', k[0]); b.appendChild(srow(k[1], v)); });
    }]
  ];
  var sov = el('div', 'ov'), sd = el('div', 'dlg sets'); sov.id = 'sov'; sd.setAttribute('role', 'dialog'); sd.setAttribute('aria-modal', 'true');
  sd.innerHTML = '<header><h2>الإعدادات</h2><button class="ibtn" id="sclose">إغلاق</button></header><div class="stabs"></div><div class="body sbody"></div>';
  sov.appendChild(sd); document.body.appendChild(sov);
  function b2() { var b = sd.querySelector('.sbody'); b.innerHTML = ''; return b; }
  function showSection(i) {
    var tabs = sd.querySelector('.stabs'); tabs.innerHTML = '';
    SECTIONS.forEach(function (sx, k) { var t = el('button', k === i ? 'on' : '', sx[0]); t.type = 'button'; t.onclick = function () { showSection(k); }; tabs.appendChild(t); });
    SECTIONS[i][1](b2());
  }
  st.onclick = function () { showSection(0); sov.classList.add('open'); drawer(false); };
  sd.querySelector('#sclose').onclick = function () { sov.classList.remove('open'); };
  sov.onclick = function (e) { if (e.target === sov) sov.classList.remove('open'); };
  // Enter يرسل أو يسطّر بحسب الإعداد؛ والمشروع النشط يضم المحادثة الجديدة
  inp.addEventListener('keydown', function (e) { if (e.key === 'Enter' && !e.shiftKey && SET.enter === false) { e.stopImmediatePropagation(); } }, true);

  // ===== تثبيت التطبيق =====
  var deferred = null, ib = $('#install');
  window.addEventListener('beforeinstallprompt', function (e) { e.preventDefault(); deferred = e; ib.hidden = false; });
  window.addEventListener('appinstalled', function () { ib.hidden = true; deferred = null; });
  ib.onclick = function () { if (!deferred) return; deferred.prompt(); deferred.userChoice.then(function () { deferred = null; ib.hidden = true; }); };
  if ('serviceWorker' in navigator) { try { navigator.serviceWorker.register('/nawa/sw.js', { scope: '/nawa/' }); } catch (e) {} }
})();
