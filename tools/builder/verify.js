// مُتحقِّق ناتج النموذج: يشغّل (الشيفرة المرشَّحة + اختبارات المهمة) بمحرك ضاد الحقيقي ويقارن المخرجات بالمتوقع.
// الاستعمال: node verify.js <task.json> < candidate.dhad   → JSON {ok, reason, out}
const fs = require('fs'), path = require('path');
const R = require(path.join(__dirname, '..', '..', 'site', 'run.js'));
const task = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
let cand = fs.readFileSync(0, 'utf8');
const m = cand.match(/```[^\n]*\n([\s\S]*?)```/); if (m) cand = m[1];
const r = R.run(cand + '\n' + task.tests, { maxSteps: 2e7 });
let res;
if (!r.ok) res = { ok: false, reason: 'خطأ: ' + r.error, out: r.out };
else {
  const got = r.out.join('\n').trim(), want = task.expected.trim();
  res = got === want ? { ok: true, reason: 'نجح', out: r.out } : { ok: false, reason: 'المخرجات المتوقعة:\n' + want + '\nالفعلية:\n' + got, out: r.out };
}
process.stdout.write(JSON.stringify(res));
