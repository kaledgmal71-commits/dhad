// بند ١-١١: الصياغة الإنجليزية الاختيارية (# dhad: english) وتحويل المصدر بين العرضين. المطابقة مع مرمز/محلل ضاد في selfhost-lexer/parser.
const fs = require('fs'), path = require('path');
const R = require('../site/run.js'); const api = R.api;
const F = require('../front.js');
let pass = 0, fail = 0;
const check = (n, g, w) => { if (JSON.stringify(g) === JSON.stringify(w)) pass++; else { fail++; console.log('اختلاف:', n, g, w); } };
const run = src => { try { const c = api.compile(api.parse(src)); const o = []; const vm = new api.VM({ maxSteps: 1e6, maxMs: 2000, onPrint: l => o.push(String(l)) }); vm.run(c.mainChunkIndex, c.functionChunks); return o.join('|'); } catch (e) { return 'ERR ' + e.message; } };
// ١) التنفيذ
check('أساسي', run('# dhad: english\nvar t = 0\nfor (i from 1 to 5) { t = t + i }\nprint(t)'), '١٥');
check('دالة وشرط', run('# dhad: english\nfunction f(n) { if (n <= 1) { return 1 } else { return n * f(n - 1) } }\nprint(f(5))'), '١٢٠');
check('منطقي وفراغ', run('# dhad: english\nprint(true and not false, null)'), 'صحيح لاشيء');
check('حاول', run('# dhad: english\ntry { throw("x") } catch (e) { print("c") } finally { print("f") }'), 'c|f');
check('صنف', run('# dhad: english\nclass A { function constructor(n) { this.n = n } function g() { return this.n } }\nclass B extends A { function constructor(n) { super(n) } }\nprint(B(4).g())'), '٤');
check('ثابت وهو', run('# dhad: english\nconst x = [1]\nprint(x is "قائمة")'), 'صحيح');
check('مدمجات', run('# dhad: english\nprint(length([1, 2, 3]), max(3, 9), sqrt(16))'), '٣ ٩ ٤');
check('نص خام وقالب', run('# dhad: english\nvar a = 5\nprint(raw"a\\b", template"v={a + 1}", template"{max(a, 7)}")'), 'a\\b v=٦ ٧');
check('تفعيل ضاد', run('# ضاد: english\nprint(1)'), '١');
check('بعد أسطر فارغة', run('\n\n  # dhad: english\nprint(2)'), '٢');
check('الإنجليزية لا تعمل بلا تفعيل', run('print(1)').startsWith('ERR'), true);
check('التفعيل في غير الأول لا يفعّل', run('var a = 1\n# dhad: english\nprint(2)').startsWith('ERR'), true);
check('الافتراضي لا يتأثر (معرّف لاتيني باسم كلمة)', run('متغير max = ٣\nاطبع(max)'), '٣');
check('وضع عربي صريح لا يغيّر شيئًا', run('# dhad: arabic\nاطبع(1)'), '١');
// ٢) تحويل المصدر
const en = '# dhad: english\nvar a = [1, 2]\nfor (i from 1 to 3) { print(length(a) + i) } # تعليق with var\nprint("var for")\nprint(template"x={max(1, 2)} for")\n';
const ar = F.convertSource(en, 'arabic');
check('إلى العربية', ar, 'متغير a = [1, 2]\nمن_أجل (i من 1 إلى 3) { اطبع(طول(a) + i) } # تعليق with var\nاطبع("var for")\nاطبع(قالب"x={الأكبر(1, 2)} for")\n'.replace(/^/, ''));
check('العودة للإنجليزية بالهوية', F.convertSource(ar, 'english'), en);
// سطر التفعيل في العرض الإنجليزي هو السطر ١ فأرقام الأسطر في الأخطاء تزيد ١ (أرقامًا حقيقية في الملف المعروض)
const shiftBack = t => t.replace(/السطر (\d+)/g, (m, d) => 'السطر ' + (d - 1));
check('نفس الناتج في العرضين', run(en), run(ar));
check('عربي بلا تفعيل يبقى كما هو عند الطلب العربي', F.convertSource('اطبع(1)', 'arabic'), 'اطبع(1)');
let err = ''; try { F.convertSource('متغير max = ١\nاطبع(max)', 'english'); } catch (e) { err = e.message; }
check('تصادم معرّف لاتيني', /تتصادم.*max/.test(err), true);
// ٣) كل برامج المطابقة: عربي→إنجليزي→عربي بالهوية وبنفس الناتج
let ok = 0, total = 0;
for (const [name, code] of require('./machine-cases.js')) {
  let e; try { e = F.convertSource(code, 'english'); } catch (x) { continue; }
  total++;
  const back = F.convertSource(e, 'arabic');
  if (back !== code) { fail++; console.log('عودة غير مطابقة:', name); continue; }
  if (shiftBack(run(e)) !== run(code)) { fail++; console.log('ناتج مختلف:', name); continue; }
  ok++;
}
check('برامج المطابقة المحوَّلة', ok === total && total > 30, true);
// ٤) تطابق الجدول بين المصدر (english-table.json) وfront.js ومرمز.dhad
const table = JSON.parse(fs.readFileSync(path.join(__dirname, '../english-table.json'), 'utf8'));
check('جدول front.js', F.ENGLISH_WORDS, table);
const dh = fs.readFileSync(path.join(__dirname, '../selfhost/مرمز.dhad'), 'utf8');
const body = dh.slice(dh.indexOf('# <english-table>'), dh.indexOf('# </english-table>'));
check('جدول مرمز.dhad', Object.entries(table).every(([k, v]) => body.includes(JSON.stringify(k) + ': ' + JSON.stringify(v))), true);
check('عدد مداخل مرمز.dhad', (body.match(/^ {4}"/gm) || []).length, Object.keys(table).length);
console.log(`pass ${pass} fail ${fail}`); process.exit(fail ? 1 : 0);
