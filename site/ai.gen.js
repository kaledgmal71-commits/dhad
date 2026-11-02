// بنية الذكاء الاصطناعي في موقع ضاد: مدوّنة تدريب موثَّقة بالتنفيذ، معيار قياس، مرجع آلي للغة، تعريف أداة للوكلاء.
// كل سجل هنا نُفِّذ بمحرك ضاد أثناء البناء؛ فلا يدخل المدوّنة مثال يفشل، ولا يدخل المعيار تحدٍّ لا يجتازه حلّه المرجعي.
const G = require('./gen.js');
const { R, SITE, DIST, ROOT, fs, path, write, dict, examples, lessons, problems } = G;
const crypto = require('crypto');
const challenges = require('./content/challenges.js');
const sheets = require('./content/sheets.js').concat(require('./content/sheets4.js'), require('./content/sheets2.js'), require('./content/sheets3.js'));
const { grade } = require('./grader.js');
const strip = h => String(h).replace(/<[^>]+>/g, '').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim();
const engineHash = crypto.createHash('sha256').update(['front.js', 'compiler.js', 'vm.js'].map(f => fs.readFileSync(path.join(ROOT, f), 'utf8')).join('\n')).digest('hex').slice(0, 12);

const records = []; const seen = new Set();
function add(rec, runOpts) {
  const key = rec.code + '\u0000' + JSON.stringify(rec.files || null);
  if (seen.has(key)) return; seen.add(key);
  const r = R.run(rec.code, runOpts || {});
  const wantErr = !!rec.expect_error;
  if (r.ok === wantErr) { problems.push(`المدوّنة ${rec.id}: ${wantErr ? 'كان يُفترض أن يفشل' : r.error}`); return; }
  rec.output = r.out.join('\n');
  if (!r.ok) { rec.error = r.error; }
  rec.status = r.ok ? 'ok' : 'error';
  records.push(rec);
}
// ١) الأمثلة
for (const e of examples) add({ id: 'example/' + e.id, source: 'example', topic: e.cat, title: e.title, instruction: `${e.title}: ${strip(e.desc)}`, code: e.code, url: `/examples/#${e.id}` });
// ٢) المعجم
for (const d of dict) if (d.ex) add({ id: 'dict/' + d.w, source: 'dictionary', topic: d.kind, title: d.w, instruction: `اكتب برنامجًا بضاد يستعمل «${d.w}» (${d.sig}). ${strip(d.d)}`, code: d.ex, ...(d.files ? { files: d.files } : {}), signature: d.sig, url: `/dictionary/#${d.w}` }, d.files ? { files: d.files } : {});
// ٣) الدروس
for (const l of lessons) add({ id: 'lesson/' + l.id, source: 'lesson', topic: l.level, title: l.title, instruction: `${l.title}: ${l.goal} ${l.points.join(' ')}`, code: l.code, ...(l.expectError ? { expect_error: true } : {}), url: `/learn/${l.id}/` });
// ٤) الشروحات: كل مثال برمجي مع عنوان قسمه والفقرة التي سبقته
for (const s of sheets) for (const row of s.rows) for (const cell of row) { let last = '';
  for (const p of cell.c) {
    if (p.t === 'p') last = strip(p.x);
    if (p.t === 'code' && !p.fs) add({ id: `explain/${s.id}/${records.length}`, source: 'explain', topic: s.title, title: cell.h, instruction: `${s.title} — ${cell.h}. ${last}`.slice(0, 600), code: p.src, ...(p.files ? { files: p.files } : {}), ...(p.err ? { expect_error: true } : {}), url: `/explain/${s.id}/` }, p.files ? { files: p.files } : {});
    if (p.t === 'code' && p.fs) { // أمثلة الملفات: نظام ملفات افتراضي
      add({ id: `explain/${s.id}/${records.length}`, source: 'explain', topic: s.title, title: cell.h, instruction: `${s.title} — ${cell.h}. ${last}`.slice(0, 600), code: p.src, virtual_fs: p.fs, ...(p.err ? { expect_error: true } : {}), url: `/explain/${s.id}/` }, { fs: new R.api.MemoryFS(p.fs) });
    }
  } }
// ٤ب) مدوّنة الصياغة: أمثلة الميزات الجديدة وأزواج خطأ←إصلاح (كل زوج: يفشل الخاطئ وينجح المصحَّح)
const syn = require('./content/syntax-corpus.js');
for (const e of syn.examples) add({ id: 'syntax/' + e.id, source: 'syntax', topic: 'الصياغة', title: e.title, instruction: e.instruction, code: e.code });
for (const f of syn.fixes) {
  const okFix = R.run(f.fixed);
  if (!okFix.ok) { problems.push(`مدوّنة الصياغة ${f.id}: المصحَّح يفشل: ${okFix.error}`); continue; }
  add({ id: 'syntax/' + f.id, source: 'syntax-fix', topic: 'خطأ←إصلاح', title: f.instruction, instruction: f.instruction, code: f.bad, expect_error: true, fixed_code: f.fixed, fixed_output: okFix.out.join('\n'), explanation: f.why });
}
records.forEach((r, i) => { r.n = i + 1; });
const jl = a => a.map(x => JSON.stringify(x)).join('\n') + '\n';
write('ai/dhad-corpus.jsonl', jl(records.map(r => ({ ...r, engine: engineHash, verified: true, lang: 'ar', language: 'dhad' }))));
write('ai/dhad-sft.jsonl', jl(records.filter(r => r.status === 'ok').map(r => ({ messages: [{ role: 'user', content: r.instruction }, { role: 'assistant', content: '```dhad\n' + r.code + '\n```' + (r.output ? '\n\nالمخرجات:\n```\n' + r.output + '\n```' : '') }], meta: { id: r.id, source: r.source, topic: r.topic, verified: true } })).concat(records.filter(r => r.source === 'syntax-fix').map(r => ({ messages: [{ role: 'user', content: r.instruction + '\n\n```dhad\n' + r.code + '\n```\n\nرسالة الخطأ: ' + r.error }, { role: 'assistant', content: r.explanation + '\n\n```dhad\n' + r.fixed_code + '\n```' + (r.fixed_output ? '\n\nالمخرجات:\n```\n' + r.fixed_output + '\n```' : '') }], meta: { id: r.id, source: r.source, topic: r.topic, verified: true, kind: 'error_fix' } })))));

// ٥) معيار القياس: تحدّيات الدروس بلا حلولها (حلولها داخل الواجهة فقط)، ويُشترط أن يجتاز كل حلٍّ مرجعي اختباراته
const benchmark = []; const solutions = {};
for (const l of lessons) { const c = challenges[l.id]; if (!c) continue;
  const run = code => R.run(code);
  const g = grade(c, c.solution, run);
  if (!g.ok) { problems.push(`المعيار ${l.id}: الحل المرجعي لا يجتاز اختباراته: ${g.message}`); continue; }
  const bad = grade(c, c.starter, run); if (bad.ok && !c.error && (c.tests || []).length) problems.push(`المعيار ${l.id}: الكود المبدئي يجتاز الاختبارات وحده`);
  benchmark.push({ id: l.id, level: l.level, title: l.title, task: c.task, starter: c.starter, tests: c.tests || [], must: c.must || [], mustNot: c.mustNot || [], error: c.error || '', hint: c.hint });
  solutions[l.id] = c.solution; }
write('ai/dhad-benchmark.json', JSON.stringify({ name: 'ضاد-معيار', version: engineHash, description: 'تحدّيات برمجة بالعربية بلغة ضاد، يُقاس بها نموذج بتمرير كوده إلى /api/run بالفعل grade. كل تحدٍّ فُحص أن حله المرجعي يجتاز اختباراته وأن كوده المبدئي لا يجتازها.', count: benchmark.length, challenges: benchmark }, null, 1));

// ٦) المرجع الآلي للغة
const stdlib = Object.entries(R.api.STDLIB_SOURCES).map(([name, src]) => ({ module: name, import: `استورد("${name}")`, functions: [...src.matchAll(/^صدّر دالة (\S+?)\(([^)]*)\)/gm)].map(m => ({ name: m[1], params: m[2].split(/[،,]/).map(x => x.trim()).filter(Boolean) })) }));
const spec = {
  language: 'ضاد (Dhad)', site: SITE, engine: engineHash, direction: 'rtl', file_extension: ['.dhad', '.ضاد'],
  keywords: Object.keys(R.api.KEYWORDS),
  reserved_note: 'و، أو، ليس، من، إلى، في كلمات محجوزة فلا تصلح أسماء متغيرات.',
  numbers: 'أعداد عشرية مضاعفة الدقة؛ الأرقام العربية ٠-٩ واللاتينية 0-9 تُقبل، والفاصلة العشرية العربية ٫ تُقبل في المصدر وتُستعمل في العرض.',
  comments: '# إلى آخر السطر', argument_separator: ['،', ','],
  operators: { arithmetic: ['+', '-', '*', '/', '%'], comparison: ['==', '!=', '<', '>', '<=', '>='], logical: ['و', 'أو', 'ليس'], membership: 'في', compound_assign: ['+=', '-=', '*=', '/=', '%=', '++', '--'] },
  statements: ['متغير س = قيمة', 'إذا (شرط) { } وإلا إذا (شرط) { } وإلا { }', 'طالما (شرط) { }', 'من_أجل (ع من أ إلى ب [بخطوة ن]) { }  (النهاية شاملة)', 'من_أجل (ع في مجموعة) { }', 'دالة اسم(معاملات) { ارجع قيمة }', 'صنف الاسم [يرث الأب] { دالة جديد(...) { } }', 'حاول { } التقط (خ) { } أخيرًا { }', 'استورد("ملف أو ضاد/وحدة")  وصدّر دالة/متغير/صنف', 'غير_متزامنة دالة ... { انتظر وعد }'],
  semantics: ['لكل دورة حلقة بيئتها فتلتقط الإغلاقات قيمة دورتها', 'الفهرسة من ٠ وتقبل السالب (ق[-١])', 'الشرائح ق[أ:ب] نهايتها غير شاملة', 'الأنواع صارمة: "أ" - ١ خطأ، و١ + "٢" خطأ؛ ادمج بـ نص()', 'نطاق المتغير هو الدالة لا الكتلة', 'الزمن في غير_متزامنة افتراضي (نم لا تنتظر فعلًا)'],
  builtins: dict.map(d => ({ name: d.w, kind: d.kind, english: d.en || null, signature: d.sig, description: strip(d.d), example: d.ex || null })),
  stdlib,
  not_available: ['شبكة', 'مناطق زمنية IANA', 'تخزين دائم', 'تشفير', 'مدير حزم', 'حقول خاصة للأصناف', 'مولّدات', 'معاملات متغيرة العدد'],
  endpoints: { run: SITE + '/api/run', tool_definition: SITE + '/ai/agent-tool.json', openapi: SITE + '/ai/openapi.json', corpus: SITE + '/ai/dhad-corpus.jsonl', sft: SITE + '/ai/dhad-sft.jsonl', benchmark: SITE + '/ai/dhad-benchmark.json', llms: SITE + '/llms-full.txt' }
};
write('ai/dhad-spec.json', JSON.stringify(spec, null, 1));

// ٧) تعريف الأداة والواجهة للوكلاء
const toolDef = {
  name: 'dhad_run', description: 'ينفّذ شيفرة بلغة ضاد (لغة برمجة عربية) في صندوق آمن بحدّ زمني وحدّ خطوات، ويعيد المخرجات أو رسالة الخطأ بالعربية. استعمله لتتحقق من كل شيفرة تكتبها قبل تسليمها: اكتب ← نفّذ ← أصلح. action: run للتنفيذ، check للتحقق النحوي دون تنفيذ، analyze لشجرة الصياغة AST، grade لفحص حل تحدٍّ من المعيار.',
  input_schema: { type: 'object', properties: { action: { type: 'string', enum: ['run', 'check', 'analyze', 'grade'], default: 'run' }, code: { type: 'string', description: 'شيفرة ضاد', maxLength: 20000 }, files: { type: 'object', additionalProperties: { type: 'string' }, description: 'ملفات إضافية للاستيراد، الاسم ← المحتوى' }, challenge_id: { type: 'string', description: 'معرّف تحدٍّ من المعيار (مع action=grade)' } }, required: ['code'] },
  endpoint: { method: 'POST', url: SITE + '/api/run', content_type: 'application/json' }
};
write('ai/agent-tool.json', JSON.stringify(toolDef, null, 1));
write('ai/openapi.json', JSON.stringify({ openapi: '3.0.3', info: { title: 'واجهة ضاد للوكلاء', version: engineHash, description: 'تنفيذ شيفرة ضاد والتحقق منها وتحليلها وفحص تحدّيات المعيار.' }, servers: [{ url: SITE }],
  paths: { '/api/run': { post: { operationId: 'dhadRun', summary: 'نفّذ أو افحص أو حلّل أو قيّم شيفرة ضاد', requestBody: { required: true, content: { 'application/json': { schema: toolDef.input_schema } } },
    responses: { 200: { description: 'النتيجة', content: { 'application/json': { schema: { type: 'object', properties: { ok: { type: 'boolean' }, output: { type: 'array', items: { type: 'string' } }, error: { type: 'string' }, steps: { type: 'integer' }, ast: { type: 'object' }, passed: { type: 'boolean' }, message: { type: 'string' } } } } } }, 400: { description: 'طلب غير صالح' }, 429: { description: 'طلبات كثيرة' } } } } } }, null, 1));
module.exports = { count: records.length, ok: records.filter(r => r.status === 'ok').length, errors: records.filter(r => r.status === 'error').length, sft: records.filter(r => r.status === 'ok').length, bench: benchmark.length, engineHash, builtins: dict.length, modules: stdlib.length, solutions, spec, toolDef };
