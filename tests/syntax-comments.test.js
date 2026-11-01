// بند ١-١ من سجل النواقص: تعليقات الكتل /* … */ في المنفِّذ الأصلي (والمطابقة مع مرمز ضاد في selfhost-lexer).
const R = require('../site/run.js'); const api = R.api;
let pass = 0, fail = 0;
const check = (n, g, w) => { if (JSON.stringify(g) === JSON.stringify(w)) pass++; else { fail++; console.log('اختلاف:', n, g, w); } };
const run = src => { try { const c = api.compile(api.parse(src)); const o = []; const vm = new api.VM({ maxSteps: 1e6, maxMs: 2000, onPrint: l => o.push(String(l)) }); vm.run(c.mainChunkIndex, c.functionChunks); return o.join('|'); } catch (e) { return 'ERR ' + e.message; } };
check('تعليق سطري قبله شيفرة', run('/* أ */ اطبع(١)'), '١');
check('متعدد الأسطر ويحفظ ترقيم الأسطر للأخطاء', run('اطبع(١) /* أ\nب */\nاطبع(س)'), 'ERR السطر 3: متغير غير معرّف: س');
check('بين رمزين وقسمة سليمة', run('اطبع(٦ /* ج */ / ٣)'), '٢');
check('لا يتداخل: النهاية الأولى تُغلق', run('/* أ /* ب */ اطبع(٧)'), '٧');
check('غير مغلق يعطي خطأ بسطر البداية', run('اطبع(١)\n/* ناقص\nاطبع(٢)'), 'ERR السطر 2: تعليق كتلة غير مغلق (نسيت */)');
check('داخل نص ليس تعليقًا', run('اطبع("/* لا */")'), '/* لا */');
check('تعليق فارغ', run('/**/ اطبع(٤)'), '٤');
check('القسمة بلا نجمة تعمل', run('اطبع(٨ / ٢)'), '٤');
console.log(`pass ${pass} fail ${fail}`); process.exit(fail ? 1 : 0);
