// نقطة ثابتة: الواجهة الأمامية المكتوبة بضاد (مشغَّلة من بايتكودها) تترجم مصدرها هي نفسه إلى البايتكود نفسه الذي تنتجه واجهة جافاسكربت.
// ثم تترجم الناتج مرة ثانية فيثبت: ترجمة ضاد بضاد = ترجمة جافاسكربت لها، لكل ملف في المشروع.
const fs = require('fs'), path = require('path');
const R = require('../site/run.js');
const { makeFrontend } = require('../selfhost/boot.js');
const fe = makeFrontend(R.api);
function canon(v) { if (Array.isArray(v)) return v.map(canon); if (v && typeof v === 'object') { const o = {}; for (const k of Object.keys(v).sort()) if (v[k] !== undefined) o[k] = canon(v[k]); return o; } return v; }
function files(d, out = []) { for (const n of fs.readdirSync(d)) { if (n === 'node_modules' || n === '.git') continue; const f = path.join(d, n); if (fs.statSync(f).isDirectory()) files(f, out); else if (n.endsWith('.dhad')) out.push(f); } return out; }
let pass = 0, fail = 0;
for (const f of files(path.join(__dirname, '..'))) {
  const src = fs.readFileSync(f, 'utf8');
  let a, b;
  try { const x = R.api.compile(R.api.parse(src)); a = JSON.stringify(canon(JSON.parse(JSON.stringify(x)))); } catch (e) { a = 'ERR ' + e.message; }
  try { b = JSON.stringify(canon(JSON.parse(JSON.stringify(fe(src))))); } catch (e) { b = 'ERR ' + e.message; }
  if (a === b) pass++; else { fail++; console.log('اختلاف في', f); }
}
console.log(`pass ${pass} fail ${fail}`);
process.exit(fail ? 1 : 0);
