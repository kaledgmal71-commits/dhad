// اختبار انحدار للفحص الساكن في المتحقق: تظليل الدوال الجاهزة والكلمات المحجوزة يُرفض، والشيفرة السليمة تمر.
const { spawnSync } = require('child_process'), fs = require('fs'), os = require('os'), path = require('path');
const tp = path.join(os.tmpdir(), 'lint-task.json'); fs.writeFileSync(tp, JSON.stringify({ id: 'x', prompt: '', tests: 'اطبع(ف(٢))', expected: '٢' }));
const run = c => JSON.parse(spawnSync('node', ['tools/builder/verify.js', tp], { input: c, encoding: 'utf8' }).stdout);
const cases = [
  ['دالة ف(ن) { ارجع ن }', true],
  ['دالة ف(ن) { متغير نص = "" \n ارجع ن }', false],
  ['دالة ف(ن) { متغير من = ١ \n ارجع ن }', false],
  ['دالة ف(طول) { ارجع طول }', false],
  ['دالة ف(ن) { من_أجل (في في [١]) { } \n ارجع ن }', false],
];
let bad = 0;
for (const [c, ok] of cases) { const r = run(c); if (r.ok !== ok) { bad++; console.error('فشل:', c, JSON.stringify(r)); } }
if (bad) process.exit(1); console.log('ok');
