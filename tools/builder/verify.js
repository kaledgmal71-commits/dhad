// مُتحقِّق ناتج النموذج: يشغّل (الشيفرة المرشَّحة + اختبارات المهمة) بمحرك ضاد الحقيقي ويقارن المخرجات بالمتوقع.
// الاستعمال: node verify.js <task.json> < candidate.dhad   → JSON {ok, reason, out}
const fs = require('fs'), path = require('path');
const R = require(path.join(__dirname, '..', '..', 'site', 'run.js'));
const task = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
let cand = fs.readFileSync(0, 'utf8');
const m = cand.match(/```[^\n]*\n([\s\S]*?)```/); if (m) cand = m[1];
// فحص ساكن قبل التشغيل: يرفض أسماء المتغيرات والمعاملات المطابقة لكلمة محجوزة أو دالة جاهزة (تظليلها يُعطّل الاستدعاء)، ويرفض رموز الشيفرة المتبقية.
const dict = require(path.join(__dirname, '..', '..', 'site', 'content', 'dict.js'));
const RESERVED = new Set(['من', 'إلى', 'في', 'و', 'أو', 'ليس', 'هو', 'صحيح', 'خطأ', 'لاشيء', 'دالة', 'ارجع', 'إذا', 'وإلا', 'طالما', 'متغير', 'ثابت', 'صنف', 'يرث']);
const BUILTIN = new Set(dict.filter(d => d.kind === 'دالة جاهزة').map(d => d.w));
function lint(code) {
  if (/`/.test(code)) return 'الشيفرة تحوي الرمز ` خارج كتلة الشيفرة؛ أعد كتلة واحدة سليمة.';
  const c = code.replace(/"(?:[^"\\\n]|\\.)*"/g, '""').replace(/#.*$/gm, '');
  const names = [];
  for (const m of c.matchAll(/(?:متغير|ثابت)\s+([^\s=،,()]+)/g)) names.push(m[1]);
  for (const m of c.matchAll(/من_أجل\s*\(\s*([^\s)]+)\s+(?:في|من)\s/g)) names.push(m[1]);
  for (const m of c.matchAll(/دالة\s*[^\s(]*\(([^)]*)\)/g)) for (const p of m[1].split(/[،,]/)) if (p.trim()) names.push(p.trim());
  for (const n of names) {
    if (RESERVED.has(n)) return `الاسم «${n}» كلمة محجوزة في ضاد ولا يصلح اسمًا لمتغير أو معامل؛ اختر اسمًا آخر.`;
    if (BUILTIN.has(n)) return `الاسم «${n}» دالة جاهزة في ضاد؛ تسميته لمتغير أو معامل تعطّل استدعاء الدالة. اختر اسمًا آخر.`;
  }
  return '';
}
const bad = lint(cand);
if (bad) { process.stdout.write(JSON.stringify({ ok: false, reason: 'فحص ساكن: ' + bad, out: [] })); process.exit(0); }
const r = R.run(cand + '\n' + task.tests, { maxSteps: 2e7 });
let res;
if (!r.ok) res = { ok: false, reason: 'خطأ: ' + r.error, out: r.out };
else {
  const got = r.out.join('\n').trim(), want = task.expected.trim();
  res = got === want ? { ok: true, reason: 'نجح', out: r.out } : { ok: false, reason: 'المخرجات المتوقعة:\n' + want + '\nالفعلية:\n' + got, out: r.out };
}
process.stdout.write(JSON.stringify(res));
