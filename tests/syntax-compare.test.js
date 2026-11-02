// بند ١-٧ من سجل النواقص: مقارنات متسلسلة، وعامل «ليس في»، وعامل «هو» للنوع.
const R = require('../site/run.js'); const api = R.api;
let pass = 0, fail = 0;
const check = (n, g, w) => { if (JSON.stringify(g) === JSON.stringify(w)) pass++; else { fail++; console.log('اختلاف:', n, g, w); } };
const run = src => { try { const c = api.compile(api.parse(src)); const o = []; const vm = new api.VM({ maxSteps: 1e6, maxMs: 2000, onPrint: l => o.push(String(l)) }); vm.run(c.mainChunkIndex, c.functionChunks); return o.join('|'); } catch (e) { return 'ERR ' + e.message; } };
const t = (e, w) => check(e, run('اطبع(' + e + ')'), w);
t('١ < ٢ < ٣', 'صحيح'); t('١ < ٣ < ٢', 'خطأ'); t('٣ > ٢ >= ٢ > ١', 'صحيح'); t('٣ > ٢ >= ٢ > ٢', 'خطأ'); t('١ <= ١ <= ١', 'صحيح'); t('٥ < ٣ < ١٠٠', 'خطأ');
check('الأوسط يُحسب مرة واحدة والبقية تتوقف', run('دالة أ(ع) { اطبع("زرت" + ع)\n ارجع ع }\nاطبع(أ(١) < أ(٥) < أ(٣) < أ(٩))'), 'زرت١|زرت٥|زرت٣|خطأ');
check('كل الأطراف تُحسب عند الصدق', run('دالة أ(ع) { اطبع(ع)\n ارجع ع }\nاطبع(أ(١) < أ(٢) < أ(٣))'), '١|٢|٣|صحيح');
t('٣ ليس في [١، ٢]', 'صحيح'); t('٢ ليس في [١، ٢]', 'خطأ'); t('"ب" ليس في "أبج"', 'خطأ'); t('٥ ليس في {"أ": ١}', 'صحيح');
t('٥ هو "رقم"', 'صحيح'); t('"س" هو "رقم"', 'خطأ'); t('"س" هو "نص"', 'صحيح'); t('لاشيء هو "لاشيء"', 'صحيح'); t('[] هو "قائمة"', 'صحيح'); t('{} هو "خريطة"', 'صحيح'); t('٣ هو "رقم" و ٢ < ٣ < ٤', 'صحيح');
t('١ < ٢ في [صحيح]', 'صحيح');
check('هو على سطر جديد متغير عادي', run('متغير س = ٥\nمتغير هو = ٧\nهو = ٨\nاطبع(هو)'), '٨');
check('هو بلا نص نوع', run('اطبع(٥ هو ٥)').startsWith('ERR'), true);
console.log(`pass ${pass} fail ${fail}`); process.exit(fail ? 1 : 0);
