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

const BOOT_SRC = 'استورد("محلل")\nاستورد("مترجم")';
const CACHE_FILE = path.join(__dirname, 'bytecode.json');

// يقرأ ملف البايتكود المخزَّن إن وُجد (يُبنى بـ tools/build_bytecode.js)
function loadCache(file) {
  try { return JSON.parse(fs.readFileSync(file || CACHE_FILE, 'utf8')); } catch (e) { return null; }
}

// api = {VM, srcHash, [parse, compile]}. إن وُجد ملف بايتكود صالح لمصادر الواجهة الثلاثة فلا يُستعمل parse/compile إطلاقًا.
function makeFrontend(api, opts = {}) {
  const dir = opts.dir || __dirname;
  const cache = opts.cache === undefined ? loadCache() : opts.cache;
  const entries = (cache && cache.entries) || {};
  const pre = new Map();                       // المفاتيح كما تراها الآلة: ما صلح من المخزَّن
  const srcs = {};
  for (const n of MODS) srcs[n + '.dhad'] = fs.readFileSync(path.join(dir, n + '.dhad'), 'utf8');
  const fresh = (key, src) => { const e = entries[key]; return e && e.hash === api.srcHash(src) ? e : null; };
  let usedJs = false;
  const seed = (key, src) => {
    const e = fresh(key, src);
    if (e) return e;
    if (!api.parse || !api.compile) throw new Error('بايتكود «' + key + '» مفقود أو قديم ولا مصرِّف احتياطيًا: شغّل tools/build_bytecode.js');
    usedJs = true;
    const c = api.compile(api.parse(src));
    return { hash: api.srcHash(src), mainChunkIndex: c.mainChunkIndex, exportNames: c.exportNames, functionChunks: c.functionChunks };
  };
  for (const k of Object.keys(srcs)) pre.set(k, seed(k, srcs[k]));
  const boot = seed('@boot', BOOT_SRC);
  // بقية المخزَّن (المكتبات القياسية) تُتاح للآلات التي تنفّذ برامج المستخدم
  const stdPre = new Map();
  for (const k of Object.keys(entries)) if (k.startsWith('ضاد/')) stdPre.set(k, entries[k]);
  pre.set('@boot', boot);
  const vm = new api.VM({ maxSteps: 1e15, maxMs: 1e12, precompiled: pre, readModule: (p) => (Object.prototype.hasOwnProperty.call(srcs, p) ? srcs[p] : (p === '@boot' ? BOOT_SRC : null)), onPrint: () => {} });
  vm.run(boot.mainChunkIndex, boot.functionChunks);
  const analyze = vm.modules.get('محلل.dhad').exports.get('حلّل');
  const lower = vm.modules.get('مترجم.dhad').exports.get('صرّف');
  const strip = (m) => m.replace(/^(محلل|مترجم|مرمز)، السطر \d+: /, '');
  // ذاكرة ترجمة: النص نفسه لا يُترجَم مرتين (المكتبات القياسية تُستورد في كل تشغيل)
  const memo = new Map();
  const frontend = function frontend(src) {
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
  frontend.precompiled = stdPre;           // بايتكود المكتبات القياسية الجاهز (يُمرَّر خيار precompiled للآلة)
  frontend.usedJsCompiler = usedJs;        // هل احتجنا مصرِّف JS لإقلاع الواجهة؟ (false حين يكفي الملف المخزَّن)
  return frontend;
}
module.exports = { makeFrontend, loadCache, BOOT_SRC, CACHE_FILE, MODS };
