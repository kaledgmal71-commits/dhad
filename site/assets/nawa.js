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
      try { var r = indexedDB.open('nawa', 1); r.onupgradeneeded = function () { r.result.createObjectStore('docs', { keyPath: 'name' }); }; r.onsuccess = function () { res(r.result); }; r.onerror = function () { res(null); }; } catch (e) { res(null); }
    });
  }
  function dbDo(mode, fn) { return openDB().then(function (db) { if (!db) return null; return new Promise(function (res) { var tx = db.transaction('docs', mode), st = tx.objectStore('docs'), q = fn(st); tx.oncomplete = function () { res(q && q.result); }; tx.onerror = function () { res(null); }; }); }); }
  // الربط (link): مكتبة دائمة تُحفظ في المتصفح وتُفهرس تلقائيًا؛ الإرفاق (attach): ملف عابر للمحادثة الحالية يُحلَّل كاملًا
  var fileMode = 'attach';
  function sendDoc(name, r, mode) { var base = mode === 'attach' ? 'مرفق' : 'مستند'; return call(r.kind === 'docx' ? base + '_docx' : r.kind === 'html' ? base + '_html' : base, name, r.content); }
  function restoreDocs() {
    return dbDo('readonly', function (st) { return st.getAll(); }).then(function (all) {
      (all || []).forEach(function (d) { docs['link:' + d.name] = { name: d.name, mode: 'link', state: 'busy', size: d.size }; });
      renderDocs();
      (all || []).forEach(function (d) {
        var k = 'link:' + d.name;
        queue = queue.then(function () { return sendDoc(d.name, d, 'link').then(function (res) { docs[k] = { name: d.name, mode: 'link', state: 'ok', chunks: res['مقاطع'], size: d.size }; }, function () { docs[k] = { name: d.name, mode: 'link', state: 'bad', note: 'تعذّرت الفهرسة', size: d.size }; }).then(renderDocs); });
      });
    });
  }
  function ingest(file, quiet, mode) {
    var name = (file.webkitRelativePath || file.name).replace(/#/g, '＃'), k = mode + ':' + name;
    if (!window.NawaFiles.supported[window.NawaFiles.ext(file.name)] && quiet) return;
    docs[k] = { name: name, mode: mode, state: 'busy', size: file.size }; renderDocs();
    queue = queue.then(function () {
      return window.NawaFiles.read(file).then(function (r) {
        if (mode === 'link') dbDo('readwrite', function (st) { return st.put({ name: name, kind: r.kind, content: r.content, size: file.size }); });
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
    if (d.mode === 'link') dbDo('readwrite', function (st) { return st.delete(d.name); });
    queue = queue.then(function () { return call(d.mode === 'attach' ? 'إزالة_مرفق' : 'إزالة', d.name).catch(function () {}); });
  }
  function clearAttached() {
    Object.keys(docs).forEach(function (k) { if (docs[k].mode === 'attach') delete docs[k]; });
    renderDocs(); queue = queue.then(function () { return call('صفّر_المرفقات').catch(function () {}); });
  }
  function kb(n) { return n > 1048576 ? (n / 1048576).toFixed(1) + ' م.ب' : Math.max(1, Math.round(n / 1024)) + ' ك.ب'; }
  function renderDocs() {
    var names = Object.keys(docs), box = $('#files'); box.innerHTML = '';
    names.forEach(function (n) {
      var d = docs[n], r = el('div', 'fr'), t = el('div', 't'), b = el('b', '', d.name), s = el('span', d.state === 'bad' ? 'bad' : '', d.state === 'busy' ? 'تُفهرَس الآن…' : d.state === 'ok' ? kb(d.size) + ' · ' + d.chunks + ' مقطعًا · ' + (d.mode === 'attach' ? 'مرفق' : 'مربوط') : d.note);
      t.appendChild(b); t.appendChild(s); r.appendChild(t);
      var x = el('button', '', '×'); x.title = 'إزالة'; x.onclick = function () { removeDoc(n); }; r.appendChild(x); box.appendChild(r);
    });
    var a = $('#attached'); a.innerHTML = '';
    var ok = names.filter(function (n) { return docs[n].state !== 'bad'; }), busy = names.some(function (n) { return docs[n].state === 'busy'; });
    if (ok.length) { var s = el('span', 'att' + (busy ? ' busy' : '')); s.innerHTML = '<b></b> ملف'; s.firstChild.textContent = ok.length; s.onclick = openConn; a.appendChild(s); }
  }
  function take(list, quiet, mode) { [].slice.call(list).forEach(function (f) { ingest(f, quiet, mode); }); }

  // ===== المحادثة =====
  var inp = $('#in'), send = $('#send'), col = $('#col'), scroll = $('#scroll'), hist = $('#hist'), hero = $('#hero'), busyAsk = false;
  var convs = [], curConv = null;
  try { convs = JSON.parse(ls('nawa.convs') || '[]'); } catch (e) { convs = []; }
  function saveConvs() { try { ls('nawa.convs', JSON.stringify(convs.slice(0, 30))); } catch (e) {} }
  function grow() { inp.style.height = 'auto'; inp.style.height = Math.min(inp.scrollHeight, 200) + 'px'; send.disabled = busyAsk || !inp.value.trim(); }
  inp.addEventListener('input', grow);
  inp.addEventListener('keydown', function (e) { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); go(); } });
  send.onclick = go;
  document.querySelectorAll('.chip').forEach(function (c) { c.onclick = function () { inp.value = c.dataset.q || c.textContent; grow(); inp.focus(); }; });

  function msg(role, node) {
    var d = el('div', 'msg ' + (role === 'u' ? 'u' : 'a')), av = el('div', 'av', role === 'u' ? 'أ' : 'ن'), tx = el('div', 'tx');
    if (typeof node === 'string') tx.textContent = node; else tx.appendChild(node);
    d.appendChild(av); d.appendChild(tx); col.appendChild(d); scroll.scrollTop = scroll.scrollHeight; return d;
  }
  function hideHero() { if (hero) { hero.remove(); hero = null; $('#chips').style.display = 'none'; } }
  function urlFor(id) {
    var p = String(id).split('/');
    if (p[0] === 'lesson') return '/learn/' + p[1] + '/';
    if (p[0] === 'explain') return '/explain/' + p[1] + '/';
    if (p[0] === 'example') return '/examples/#' + p[1];
    if (p[0] === 'dict') return '/dictionary/';
    return null;
  }
  function codeBlock(code, source) {
    var w = el('div', 'cb'), bar = el('div', 'bar'), pre = el('pre'), out = el('div', 'out');
    var v = el('span', 'v', '✓ جُرِّب فأعاد الناتج المتوقع'); bar.appendChild(v); bar.appendChild(el('span', 'sp'));
    var run = el('button', '', 'شغّل'), cp = el('button', '', 'نسخ'), ed = el('a', '', 'افتح في المحرر');
    ed.href = '/editor/?code=' + encodeURIComponent(code); ed.target = '_blank'; ed.rel = 'noopener';
    run.onclick = function () { call('شغّل', code).then(function (r) { out.className = 'out' + (r.ok ? '' : ' err'); out.textContent = r.out.join('\n') + (r.ok ? '' : (r.out.length ? '\n' : '') + '✗ ' + r.error); out.style.display = 'block'; }); };
    cp.onclick = function () { try { navigator.clipboard.writeText(code); cp.textContent = 'نُسخ'; setTimeout(function () { cp.textContent = 'نسخ'; }, 1200); } catch (e) {} };
    bar.appendChild(run); bar.appendChild(cp); bar.appendChild(ed);
    pre.textContent = code; out.style.display = 'none'; w.appendChild(bar); w.appendChild(pre); w.appendChild(out); return w;
  }
  function answer(r) {
    var box = el('div'), n = r['نتائج'] || {}, any = false;
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
    if (!any) box.appendChild(el('p', '', r['رد']));
    return box;
  }
  function go() {
    var t = inp.value.trim(); if (!t || busyAsk) return;
    hideHero(); msg('u', t); inp.value = ''; busyAsk = true; grow();
    if (!curConv) { curConv = { id: Date.now(), title: t.slice(0, 48), msgs: [] }; convs.unshift(curConv); }
    curConv.msgs.push({ role: 'u', text: t });
    var dots = el('div', 'dots'); dots.innerHTML = '<i></i><i></i><i></i>'; var pending = msg('a', dots);
    ready.then(function () { return call('اسأل', t); }).then(function (r) {
      pending.querySelector('.tx').replaceChildren(answer(r)); curConv.msgs.push({ role: 'a', res: r });
    }, function (err) {
      pending.querySelector('.tx').replaceChildren(el('p', '', 'تعذّر إتمام الطلب: ' + (err && err.message ? err.message : ''))); curConv.msgs.push({ role: 'a', text: 'تعذّر إتمام الطلب' });
    }).then(function () { busyAsk = false; grow(); saveConvs(); renderHist(); scroll.scrollTop = scroll.scrollHeight; });
  }
  function renderHist() {
    hist.innerHTML = '<h6>المحادثات</h6>';
    if (!convs.length) { hist.appendChild(el('div', 'none', 'لا محادثات بعد')); return; }
    convs.forEach(function (c) { var b = el('button', curConv && curConv.id === c.id ? 'on' : '', c.title); b.onclick = function () { openConv(c); }; hist.appendChild(b); });
  }
  function openConv(c) {
    curConv = c; col.innerHTML = ''; hero = null; $('#chips').style.display = 'none';
    c.msgs.forEach(function (m) { if (m.role === 'u') msg('u', m.text); else msg('a', m.res ? answer(m.res) : m.text); });
    renderHist();
  }
  $('#newchat').onclick = function () {
    curConv = null; col.innerHTML = ''; clearAttached();
    hero = el('div', 'hero'); hero.id = 'hero'; hero.innerHTML = '<div class="mark">ن</div><h1>ماذا تريد أن تبني اليوم؟</h1>'; col.appendChild(hero);
    $('#chips').style.display = ''; renderHist(); inp.focus();
  };
  renderHist();

  // ===== قائمة + والموصّلات =====
  var menu = $('#menu');
  $('#plus').onclick = function (e) { e.stopPropagation(); menu.classList.toggle('open'); };
  document.addEventListener('click', function () { menu.classList.remove('open'); });
  menu.querySelectorAll('button').forEach(function (b) { b.onclick = function () { var a = b.dataset.act; if (a === 'files') { fileMode = 'attach'; $('#fileIn').click(); } else if (a === 'folder') { fileMode = 'link'; $('#dirIn').click(); } else openConn(); }; });
  function openConn() { $('#ov').classList.add('open'); }
  $('#openConn').onclick = openConn;
  $('#closeConn').onclick = function () { $('#ov').classList.remove('open'); };
  $('#ov').onclick = function (e) { if (e.target === this) this.classList.remove('open'); };
  $('#pickFiles').onclick = function () { fileMode = 'link'; $('#fileIn').click(); };
  $('#pickFolder').onclick = function () { fileMode = 'link'; $('#dirIn').click(); };
  $('#fileIn').onchange = function () { take(this.files, false, fileMode); this.value = ''; };
  $('#dirIn').onchange = function () { take(this.files, true, 'link'); this.value = ''; };
  var drop = $('#drop');
  ['dragenter', 'dragover'].forEach(function (ev) { drop.addEventListener(ev, function (e) { e.preventDefault(); drop.classList.add('over'); }); });
  ['dragleave', 'drop'].forEach(function (ev) { drop.addEventListener(ev, function (e) { e.preventDefault(); drop.classList.remove('over'); }); });
  drop.addEventListener('drop', function (e) { take(e.dataTransfer.files, false, 'link'); });
  // إفلات الملفات في أي مكان من الصفحة
  window.addEventListener('dragover', function (e) { e.preventDefault(); });
  window.addEventListener('drop', function (e) { if (e.target.closest && e.target.closest('#drop')) return; e.preventDefault(); if (e.dataTransfer && e.dataTransfer.files.length) take(e.dataTransfer.files, false, 'attach'); });

  // ===== تثبيت التطبيق =====
  var deferred = null, ib = $('#install');
  window.addEventListener('beforeinstallprompt', function (e) { e.preventDefault(); deferred = e; ib.hidden = false; });
  window.addEventListener('appinstalled', function () { ib.hidden = true; deferred = null; });
  ib.onclick = function () { if (!deferred) return; deferred.prompt(); deferred.userChoice.then(function () { deferred = null; ib.hidden = true; }); };
  if ('serviceWorker' in navigator) { try { navigator.serviceWorker.register('/nawa/sw.js', { scope: '/nawa/' }); } catch (e) {} }
})();
