// سجلّ الاستقلال: يعدّ أسطر ضاد مقابل أسطر اللغات الأخرى في المشروع ويطبع النسبة. يُشغَّل: node tools/independence.js
const fs = require('fs'), path = require('path');
const root = path.join(__dirname, '..');
const skip = new Set(['node_modules', '.git', 'site', 'api']);
const rows = { 'ضاد (.dhad)': 0, 'جافاسكربت: المحرك': 0, 'جافاسكربت: الأدوات': 0, 'جافاسكربت: الاختبارات': 0 };
const engine = new Set(['front.js', 'compiler.js', 'vm.js', 'dhad.js', 'fs_node.js']);
function lines(f) {
  let t = fs.readFileSync(f, 'utf8');
  // لا نحسب نصوص ضاد المضمّنة في vm.js بين علامتي STDLIB لأنها ضاد لا جافاسكربت
  t = t.replace(/\/\/ <STDLIB>[\s\S]*?\/\/ <\/STDLIB>/g, '');
  return t.split('\n').filter(l => l.trim()).length;
}
(function walk(d, rel) {
  for (const n of fs.readdirSync(d)) {
    if (skip.has(n)) continue;
    const f = path.join(d, n), r = path.join(rel, n);
    if (fs.statSync(f).isDirectory()) { walk(f, r); continue; }
    if (n.endsWith('.dhad')) rows['ضاد (.dhad)'] += lines(f);
    else if (n.endsWith('.js')) {
      if (r.startsWith('tests')) rows['جافاسكربت: الاختبارات'] += lines(f);
      else if (r.startsWith('tools')) rows['جافاسكربت: الأدوات'] += lines(f);
      else if (engine.has(r)) rows['جافاسكربت: المحرك'] += lines(f);
    }
  }
})(root, '');
const prod = rows['ضاد (.dhad)'], eng = rows['جافاسكربت: المحرك'];
for (const [k, v] of Object.entries(rows)) console.log(k.padEnd(26), String(v).padStart(7));
console.log('\nنسبة ضاد من (ضاد + المحرك):', (100 * prod / (prod + eng)).toFixed(1) + '%');
console.log('الجسور المقبولة: ربط المتصفح (DOM)، النظام (الملفات)، والوقت. ما عداها في المحرك هدفه الانتقال إلى ضاد (الاستضافة الذاتية).');
