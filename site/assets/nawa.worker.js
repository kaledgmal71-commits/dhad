// عامل نواة: يشغّل جلسة نواة (المكتوبة بضاد) بمحرك ضاد نفسه بعيدًا عن واجهة الصفحة.
importScripts('/assets/engine.api.js');
var api = self.__api, vm = null;
function conv(v) {
  if (v === null || v === undefined) return null;
  if (Object.prototype.toString.call(v) === '[object Map]') { var o = {}; v.forEach(function (x, k) { o[k] = conv(x); }); return o; }
  if (Array.isArray(v)) return v.map(conv);
  if (typeof v === 'object' && v.constructor && v.constructor.name === 'Set') return Array.from(v).map(conv);
  if (typeof v === 'function') return null;
  return v;
}
function boot() {
  if (vm) return;
  var c = api.compile(api.parse('استورد("ضاد/نواة_جلسة")'));
  vm = new api.VM({ maxSteps: 1e9, maxMs: 60000, onPrint: function () {}, onSaveFile: function () {} });
  vm.run(c.mainChunkIndex, c.functionChunks);
}
function run(code) {
  var out = [];
  try {
    var c = api.compile(api.parse(code));
    var m = new api.VM({ maxSteps: 20000000, maxMs: 4000, onPrint: function (l) { out.push(l); }, onSaveFile: function () {} });
    m.run(c.mainChunkIndex, c.functionChunks);
    return { ok: true, out: out };
  } catch (e) { return { ok: false, out: out, error: e.message }; }
}
var LIM = { 'تهيئة': { maxSteps: 4e9, maxMs: 180000 }, 'اسأل': { maxSteps: 3e9, maxMs: 60000 } };
self.onmessage = function (e) {
  var m = e.data;
  Promise.resolve().then(function () {
    if (m.a === 'شغّل') return run(m.x);
    boot();
    if (m.a === 'تهيئة') {
      return fetch('/nawa/base.json').then(function (r) { return r.text(); }).then(function (t) {
        return conv(vm.callHost(['تهيئة', t, null], LIM['تهيئة']));
      });
    }
    return conv(vm.callHost([m.a, m.x === undefined ? null : m.x, m.y === undefined ? null : m.y], LIM[m.a] || { maxSteps: 4e9, maxMs: 600000 }));
  }).then(function (r) { self.postMessage({ id: m.id, ok: true, r: r }); },
          function (err) { self.postMessage({ id: m.id, ok: false, e: String((err && err.message) || err) }); });
};
