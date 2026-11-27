// الاستدلال المقيَّد بقواعد اللغة: مُحلِّل ضاد نفسه يصير «قناعًا» على ما يُكتب بعد.
// الفكرة: بادئة الشيفرة «قابلة للإكمال» إن كان خطأ التحليل عند نهاية المدخل لا قبلها (النهاية تُطلب فقط).
// فيصير كل مُحلِّل نزولي مرجعًا لمعرفة الرموز المسموحة التالية بلا كتابة قواعد منفصلة تنحرف عن المحرك.
const fs = require('fs'), path = require('path'), vm = require('vm');
function loadApi(file) {
  const ctx = vm.createContext({ performance, setTimeout, console: { log() {}, error() {}, warn() {} } });
  vm.runInContext(fs.readFileSync(file || path.join(__dirname, '..', 'dist', 'assets', 'engine.api.js'), 'utf8'), ctx, { timeout: 8000 });
  return ctx.__api;
}
function make(api) {
  // 'complete' = برنامج تام | 'viable' = بادئة تقبل الإكمال | 'dead' = لا إكمال يُصلحها
  function state(src) {
    try { api.parse(src); return 'complete'; }
    catch (e) { return /نهاية الكود/.test(String(e.message)) ? 'viable' : 'dead'; }
  }
  function allowed(prefix, vocab) { return vocab.filter(t => state(prefix + (prefix ? ' ' : '') + t) !== 'dead'); }
  return { state, allowed };
}
// مفردات التوليد: كلمات اللغة المحجوزة + علامات الترقيم والعوامل + أسماء الدوال الجاهزة + ممثّلات لأصناف الرموز.
function vocabOf(api, builtins) {
  const kw = Object.keys(api.KEYWORDS || {});
  const punct = ['(', ')', '{', '}', '[', ']', '،', ':', '.', '=', '+', '-', '*', '/', '%', '==', '!=', '<', '>', '<=', '>=', '+=', '**', '//'];
  return [...new Set([...kw, ...punct, ...builtins, 'س', 'ص', 'ق', '١', '٢', '"ن"'])];
}
module.exports = { loadApi, make, vocabOf };
