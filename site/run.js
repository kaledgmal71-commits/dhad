// تشغيل شيفرة ضاد عبر المحرك الحقيقي: نحمّل front+compiler+vm في سياق واحد كما يفعل المتصفح.
const fs = require('fs'), path = require('path'), nodevm = require('vm');
const root = path.join(__dirname, '..');
const src = ['front.js', 'compiler.js', 'vm.js'].map(f => fs.readFileSync(path.join(root, f), 'utf8')).join('\n;\n');
const ctx = nodevm.createContext({ console, performance, setTimeout });
nodevm.runInContext(src + '\n;this.__api={parse,compile,VM,KEYWORDS,tokenize};', ctx);
const api = ctx.__api;
function run(code, opts = {}) {
  const out = [];
  try {
    const c = api.compile(api.parse(code));
    const files = opts.files || null;
    const o = { ...opts }; delete o.files;
    const vm = new api.VM({ maxSteps: 150000000, onPrint: l => out.push(l), onSaveFile: () => {}, onInput: () => 'ضاد', ...(files ? { readModule: p => (Object.prototype.hasOwnProperty.call(files, p) ? files[p] : null) } : {}), ...o });
    vm.run(c.mainChunkIndex, c.functionChunks);
    return { ok: true, out, steps: vm.steps };
  } catch (e) { return { ok: false, out, error: e.message }; }
}
function builtins() { const vm = new api.VM({}); return [...(vm.globals ? vm.globals.keys() : [])]; }
module.exports = { run, api, builtins };
if (require.main === module) { const r = run(fs.readFileSync(process.argv[2], 'utf8')); console.log(r.out.join('\n')); if (!r.ok) console.log('ERR', r.error); }
