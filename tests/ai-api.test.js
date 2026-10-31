// واجهة الوكلاء (api/run.js): تنفيذ، تحقق، تحليل، تقييم تحدّيات المعيار، حدود الأمان. تحتاج dist/ مبنيًّا (node build.js && node site/pages.gen.js).
const path = require('path');
process.env.DHAD_ENGINE_FILE = path.join(__dirname, '../dist/assets/engine.api.js');
process.env.DHAD_BENCH_FILE = path.join(__dirname, '../dist/ai/dhad-benchmark.json');
const handler = require('../api/run.js');
const challenges = require('../site/content/challenges.js');
let pass = 0, fail = 0;
const check = (n, got, want) => { if (JSON.stringify(got) === JSON.stringify(want)) pass++; else { fail++; console.log('اختلاف:', n, '\n  الناتج', JSON.stringify(got).slice(0, 300), '\n  المتوقع', JSON.stringify(want).slice(0, 300)); } };
let ipN = 0;
async function call(method, body, ip) {
  const res = { h: {}, code: 0, body: null, setHeader(k, v) { this.h[k] = v; }, status(c) { this.code = c; return this; }, json(b) { this.body = b; return this; }, end() { return this; } };
  await handler({ method, body, headers: { 'x-forwarded-for': ip || ('10.0.0.' + (++ipN)), host: 'x.test' } }, res);
  return res;
}
(async () => {
  let r = await call('GET'); check('GET', [r.code, !!r.body.usage], [200, true]);
  r = await call('OPTIONS'); check('OPTIONS', r.code, 204);
  r = await call('PUT', {}); check('PUT', r.code, 405);
  r = await call('POST', { code: 'متغير م = ٠\nمن_أجل (ع من ١ إلى ٣) { م = م + ع }\nاطبع(م)' }); check('run', [r.code, r.body.ok, r.body.output], [200, true, ['٦']]);
  r = await call('POST', { code: 'اطبع(مجهول(١))' }); check('run: خطأ بالعربية', [r.body.ok, /السطر 1/.test(r.body.error)], [false, true]);
  r = await call('POST', { code: 'متغير ن = استورد("ضاد/نصوص")\nاطبع(ن.قصّ("  س  "))' }); check('run: مكتبة قياسية', r.body.output, ['س']);
  r = await call('POST', { code: 'متغير أ = استورد("أدوات")\nاطبع(أ.ضعف(٤))', files: { 'أدوات.dhad': 'صدّر دالة ضعف(س) { ارجع س * ٢ }' } }); check('run: ملفات', r.body.output, ['٨']);
  r = await call('POST', { action: 'check', code: 'دالة (' }); check('check سيئ', [r.body.ok, typeof r.body.error], [false, 'string']);
  r = await call('POST', { action: 'check', code: 'اطبع(١)' }); check('check جيد', r.body.ok, true);
  r = await call('POST', { action: 'analyze', code: 'متغير س = ١ + ٢' }); check('analyze', [r.body.ok, r.body.ast.statements[0].kind], [true, 'VarDecl']);
  r = await call('POST', { action: 'analyze', code: 'متغير = ' }); check('analyze خطأ', r.body.ok, false);
  // المعيار: كل حلٍّ مرجعي يجتاز، وكود مبدئي/فارغ لا يجتاز
  let allPass = true, noneStarter = true, n = 0;
  for (const id of Object.keys(challenges)) {
    const g = await call('POST', { action: 'grade', challenge_id: id, code: challenges[id].solution });
    if (g.code === 400) continue; n++; // تحدّيات ليست في المعيار (لا درس لها) تُتجاوز
    if (!g.body.passed) { allPass = false; console.log('لم يجتز:', id, g.body.message); }
    const b = await call('POST', { action: 'grade', challenge_id: id, code: '# فارغ' }); if (b.body.passed) noneStarter = false;
  }
  check('المعيار: كل الحلول المرجعية تجتاز', [allPass, n >= 15], [true, true]);
  check('المعيار: الكود الفارغ لا يجتاز', noneStarter, true);
  r = await call('POST', { action: 'grade', challenge_id: 'hello', code: 'اطبع("خطأ")' }); check('grade: حل خاطئ', [r.body.passed, /المتوقع/.test(r.body.message)], [false, true]);
  r = await call('POST', { action: 'grade', challenge_id: 'لا_يوجد', code: 'اطبع(١)' }); check('grade: معرّف مجهول', r.code, 400);
  // حدود
  r = await call('POST', {}); check('بلا code', r.code, 400);
  r = await call('POST', { code: 'x'.repeat(20001) }); check('كود طويل', r.code, 400);
  r = await call('POST', { code: 'اطبع(١)', files: { a: 5 } }); check('files سيئ', r.code, 400);
  r = await call('POST', { code: 'اطبع(١)', action: 'ما' }); check('action مجهول', r.code, 400);
  const t0 = Date.now(); r = await call('POST', { code: 'طالما (صحيح) { }' }); check('حلقة لا نهائية تنتهي بخطأ', [r.body.ok, Date.now() - t0 < 6000], [false, true]);
  r = await call('POST', { code: 'من_أجل (ع من ١ إلى ٢٠٠٠٠) { اطبع("س" * ١) }' }); check('خطأ نوع داخل حلقة', r.body.ok, false);
  r = await call('POST', { code: 'متغير ن = "ا"\nمن_أجل (ع من ١ إلى ٢٠٠٠٠) { اطبع("أأأأأأأأأأأأأأأأأأأأأأأأأأأأأأأأأأأأأأأأأأأأأأأأأأأأأأأأأأأأأأأأأأأ") }' }); check('إغراق المخرجات يقطع', [r.body.ok, /المخرجات أطول/.test(r.body.error || '')], [false, true]);
  // عزل: لا وصول لمقابض المضيف
  r = await call('POST', { code: 'اطبع(process)' }); check('لا process', r.body.ok, false);
  // تقييد المعدل
  let last; for (let i = 0; i < 32; i++) last = await call('POST', { code: 'اطبع(١)' }, '9.9.9.9'); check('تقييد ٣٠ طلبًا في الدقيقة', last.code, 429);
  console.log(`pass ${pass} fail ${fail}`); process.exit(fail ? 1 : 0);
})();
