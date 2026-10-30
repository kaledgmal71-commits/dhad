// الإقلاع الذاتي: واجهة ضاد الأمامية (مرمز ← محلل ← مترجم، المكتوبة بضاد) تعمل من البايتكود الناتج عنها
// فوق آلة ضاد الافتراضية نفسها، وتستبدل front.js وcompiler.js في ترجمة أي نص. النواة (الآلة الافتراضية) تبقى جافاسكربت.
// الاستعمال: const fe = makeFrontend(api); new VM({ frontend: fe })  حيث api = {VM, parse, compile}
const fs = require('fs'), path = require('path');
const MODS = ['مرمز', 'محلل', 'مترجم'];

function toPlain(v) {
  const tag = Object.prototype.toString.call(v);
  if (tag === '[object Map]') { const o = {}; for (const [k, x] of v) o[k] = toPlain(x); return o; }
  if (tag === '[object Array]') return Array.from(v, toPlain);
  return v;
}

function makeFrontend(api, opts = {}) {
  const dir = opts.dir || __dirname;
  const pre = new Map();
  for (const n of MODS) pre.set(n + '.dhad', api.compile(api.parse(fs.readFileSync(path.join(dir, n + '.dhad'), 'utf8'))));
  const vm = new api.VM({ maxSteps: 1e15, maxMs: 1e12, precompiled: pre, readModule: (p) => (pre.has(p) ? '' : null), onPrint: () => {} });
  const boot = api.compile(api.parse('استورد("محلل")\nاستورد("مترجم")'));
  vm.run(boot.mainChunkIndex, boot.functionChunks);
  const analyze = vm.modules.get('محلل.dhad').exports.get('حلّل');
  const lower = vm.modules.get('مترجم.dhad').exports.get('صرّف');
  const strip = (m) => m.replace(/^(محلل|مترجم|مرمز)، السطر \d+: /, '');
  // ذاكرة ترجمة: النص نفسه لا يُترجَم مرتين (المكتبات القياسية تُستورد في كل تشغيل)
  const memo = new Map();
  return function frontend(src) {
    const hit = memo.get(src);
    if (hit) return hit instanceof Error ? (() => { throw hit; })() : { mainChunkIndex: hit.mainChunkIndex, exportNames: hit.exportNames, functionChunks: hit.functionChunks.map((c) => ({ ...c })) };
    let tree, out;
    try {
      tree = vm.callFunctionExternally(analyze, [src]);
      out = vm.callFunctionExternally(lower, [tree]);
    } catch (e) { const er = new Error(strip(e.message)); memo.set(src, er); throw er; }
    const r = toPlain(out); if (!r || !r.functionChunks) throw new Error("مخرج غير متوقع: " + JSON.stringify(r).slice(0,200));
    for (const c of r.functionChunks) { c.constants = c.constants; if (c.isAsync === undefined) delete c.isAsync; }
    memo.set(src, r);
    return { mainChunkIndex: r.mainChunkIndex, exportNames: r.exportNames, functionChunks: r.functionChunks.map((c) => ({ ...c })) };
  };
}
module.exports = { makeFrontend };
