// المرحلة ٦: النواة المكتوبة بضاد (selfhost/آلة.dhad) تنفّذ بايتكود المترجم المكتوب بضاد،
// وتُقارَن بالآلة الأصلية (JS) على برامج: المخرجات والأخطاء. الاستعمال: node tests/selfhost-machine.test.js [--bench]
const fs = require('fs'), path = require('path');
const R = require('../site/run.js');
const api = R.api;
const dir = path.join(__dirname, '../selfhost');
const files = {};
for (const n of ['مرمز', 'محلل', 'مترجم', 'آلة']) files[n + '.dhad'] = fs.readFileSync(path.join(dir, n + '.dhad'), 'utf8');

// آلة مضيفة تحمّل الوحدات الأربع مرة واحدة
const host = new api.VM({ maxSteps: 1e15, maxMs: 1e12, onPrint: () => {}, readModule: p => (files[p] !== undefined ? files[p] : null) });
const boot = api.compile(api.parse('استورد("محلل")\nاستورد("مترجم")\nاستورد("آلة")'));
host.run(boot.mainChunkIndex, boot.functionChunks);
const analyze = host.modules.get('محلل.dhad').exports.get('حلّل');
const lower = host.modules.get('مترجم.dhad').exports.get('صرّف');
const exec = host.modules.get('آلة.dhad').exports.get('شغّل');

function norm(m) { return String(m).replace(/^(آلة\.dhad، )?السطر (\d+): /, 'السطر $2: ').replace(/^آلة\.dhad، السطر \d+: /, ''); }
function viaKernel(code) {
  const out = [];
  const guest = new api.VM({ maxSteps: 1e15, onPrint: l => out.push(l), onInput: () => 'ضاد' });
  try {
    const tree = host.callFunctionExternally(analyze, [code]);
    const prog = host.callFunctionExternally(lower, [tree]);
    const G = new guest.globals.constructor(guest.globals); G.set('@كلمات', Object.keys(api.KEYWORDS));
    host.callFunctionExternally(exec, [prog, G]);
    return { out };
  } catch (e) { return { out, err: norm(e.message) }; }
}
function viaNative(code) {
  const r = R.run(code, { maxMs: 60000 });
  return r.ok ? { out: r.out } : { out: r.out, err: norm(r.error) };
}
module.exports = { viaKernel, viaNative };
if (require.main === module) {
  const cases = require('./machine-cases.js').slice();
  // كل برامج الموقع (أمثلة ودروس وتحديات وشروحات) التي تطبع شيئًا
  const seen = new Set();
  const walk = (v, d = 0) => { if (d > 8 || v == null) return; if (typeof v === 'string') { if (v.includes('اطبع(') && v.length < 4000 && !seen.has(v)) { seen.add(v); cases.push(['موقع' + seen.size, v]); } return; } if (typeof v === 'object') for (const k of Object.keys(v)) walk(v[k], d + 1); };
  for (const f of ['examples', 'lessons', 'challenges', 'sheets', 'sheets2', 'sheets3', 'sheets4']) walk(require('../site/content/' + f + '.js'));
  let pass = 0, fail = 0, unsup = 0;
  for (const [name, code] of cases) {
    const a = viaNative(code), b = viaKernel(code);
    const sa = JSON.stringify(a), sb = JSON.stringify(b);
    if (sa === sb) pass++;
    else if (/غير_المتزامنة غير مدعومة|انتظر غير مدعومة/.test(sb)) unsup++;     // غير_متزامنة: لم تُنقل بعد (معلَن)
    else { fail++; console.log('اختلاف:', name, '\n  الأصل:', sa.slice(0, 300), '\n  النواة:', sb.slice(0, 300)); }
  }
  console.log(`pass ${pass} fail ${fail} (غير_متزامنة لم تُنقل بعد: ${unsup}) من ${cases.length} برنامجًا`);
  process.exit(fail ? 1 : 0);
}
