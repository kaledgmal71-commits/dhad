// مشغّل تطبيقات نواة: يتحقق من المشروع بالمحيط (ضاد) ويحزمه ويشغّله في إطار معزول بلا وصول إلى الصفحة الأم،
// ويمنح التطبيق جسرًا واحدًا: window.nawa.call(خدمة، مدخلات) و save/load. لا يعبر شيء غير الخدمات المعلنة في بيان المشروع.
(function () {
  var BRIDGE = '(function(){var p={},n=0;window.addEventListener("message",function(e){var m=e.data;if(!m||m.t!=="r")return;var q=p[m.id];if(!q)return;delete p[m.id];m.ok?q.res(m.v):q.rej(new Error(m.e))});function c(a,x){return new Promise(function(res,rej){var id=++n;p[id]={res:res,rej:rej};parent.postMessage({t:"c",id:id,a:a,x:x},"*")})}window.nawa={call:function(s,i){return c("svc",{s:s,i:i})},save:function(k,v){return c("set",{k:k,v:v})},load:function(k){return c("get",{k:k})}};window.addEventListener("error",function(e){parent.postMessage({t:"e",m:String(e.message)},"*")});window.addEventListener("unhandledrejection",function(e){parent.postMessage({t:"e",m:String(e.reason)},"*")});window.addEventListener("DOMContentLoaded",function(){parent.postMessage({t:"ready"},"*")})})();';
  function lsGet(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function lsSet(k, v) { try { localStorage.setItem(k, v); return true; } catch (e) { return false; } }

  // core: {call(action, arg)} (نواة_جلسة). project: {name, files:{path:text}}. host: عنصر يُضاف إليه الإطار.
  function run(core, project, host, opts) {
    opts = opts || {};
    return core.call('مشروع_تحقق', JSON.stringify(project.files)).then(function (v) {
      if (!v['سليم']) { var err = new Error('مشروع غير سليم: ' + (v['أخطاء'] || []).join(' | ')); err.errors = v['أخطاء']; throw err; }
      var allowed = [];
      try { allowed = JSON.parse(project.files['نواة.json'] || '{}').خدمات || []; } catch (e) {}
      return core.call('مشروع_احزم', JSON.stringify(project.files)).then(function (html) {
        var frame = document.createElement('iframe');
        frame.setAttribute('sandbox', 'allow-scripts');
        frame.style.cssText = 'border:0;width:100%;height:100%;background:#fff';
        var errors = [], ready = false, ns = 'nawa.app.' + project.name + '.';
        var doc = html.replace(/<head[^>]*>/i, function (m) { return m + '<script>' + BRIDGE + '<\/script>'; });
        if (doc === html) doc = '<script>' + BRIDGE + '<\/script>' + html;
        function reply(id, ok, v, e) { frame.contentWindow.postMessage({ t: 'r', id: id, ok: ok, v: v, e: e }, '*'); }
        function onMsg(ev) {
          if (ev.source !== frame.contentWindow) return;
          var m = ev.data; if (!m) return;
          if (m.t === 'ready') ready = true;
          else if (m.t === 'e') errors.push(m.m);
          else if (m.t === 'c') {
            if (m.a === 'svc') {
              if (allowed.indexOf(m.x.s) < 0) return reply(m.id, false, null, 'خدمة غير معلنة في البيان: ' + m.x.s);
              core.call('خدمة', JSON.stringify({ 'اسم': m.x.s, 'مدخل': m.x.i || {} })).then(function (r) { if (r['ناجح']) reply(m.id, true, r['نتيجة']); else reply(m.id, false, null, r['سبب']); }, function (e) { reply(m.id, false, null, String(e.message || e)); });
            } else if (m.a === 'set') { lsSet(ns + m.x.k, JSON.stringify(m.x.v)) ? reply(m.id, true, true) : reply(m.id, false, null, 'التخزين غير متاح'); }
            else if (m.a === 'get') { var raw = lsGet(ns + m.x.k); reply(m.id, true, raw === null ? null : JSON.parse(raw)); }
          }
        }
        window.addEventListener('message', onMsg);
        frame.srcdoc = doc;
        host.appendChild(frame);
        return new Promise(function (res) {
          var t0 = Date.now(), iv = setInterval(function () {
            if (ready || Date.now() - t0 > (opts.timeout || 4000)) {
              clearInterval(iv);
              setTimeout(function () { res({ ok: ready && !errors.length, ready: ready, errors: errors, frame: frame, destroy: function () { window.removeEventListener('message', onMsg); frame.remove(); } }); }, opts.settle || 500);
            }
          }, 50);
        });
      });
    });
  }
  window.NawaApp = { run: run };
})();
