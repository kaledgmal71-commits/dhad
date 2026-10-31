// الاستيراد في النواة المكتوبة بضاد: نعيد استعمال حالات tests/modules.test.js ونقارن النواة بالآلة الأصلية (مخرجات وأخطاء)،
// وحالات تستعمل المكتبات القياسية (ضاد/…) بالنواة.
const fs = require('fs'), path = require('path');
const { viaKernel, viaNative } = require('./selfhost-machine.test.js');
const src = fs.readFileSync(path.join(__dirname, 'modules.test.js'), 'utf8');
const body = src.slice(src.indexOf('// basic'), src.lastIndexOf("console.log('pass'"));
const cases = [];
const t = (name, code, files) => cases.push([name, code, files || {}]);
new Function('t', 'R', body.replace(/const r=R\.run[^\n]*\n/, ''))(t, { run() { return { ok: false, error: '' }; } });
// حالات المكتبات القياسية
const std = (name, code) => cases.push([name, code, {}]);
std('نصوص', 'متغير ن = استورد("ضاد/نصوص")\nاطبع(ن.قصّ("  س  "))');
std('أعداد', 'متغير ع = استورد("ضاد/أعداد")\nاطبع(طول(مفاتيح(ع)) > ٠)');
std('جسون', 'متغير ج = استورد("ضاد/جسون")\nاطبع(ج.اكتب({"أ": [١، ٢]}، ٠))');
std('تعابير', 'متغير ت = استورد("ضاد/تعابير")\nاطبع(ت.يوجد(ت.ابنِ("[أ-ي]+")، "مرحبا"))');
std('تعابير: خطأ منسوب للمستخدم', 'متغير ت = استورد("ضاد/تعابير")\nت.ابنِ("(")');
std('تاريخ', 'متغير د = استورد("ضاد/تاريخ")\nاطبع(طول(مفاتيح(د)) > ٠)');
std('مسارات', 'متغير م = استورد("ضاد/مسارات")\nاطبع(طول(مفاتيح(م)) > ٠)');
// اختبار التداخل: النواة بضاد تشغّل المرمز والمحلل والمترجم المكتوبة بضاد (نحو ٣٠٠٠ سطر) لتصرّف برنامجًا
const sf = {}; for (const n of ['مرمز', 'محلل', 'مترجم']) sf[n + '.dhad'] = fs.readFileSync(path.join(__dirname, '../selfhost', n + '.dhad'), 'utf8');
cases.push(['النواة تشغّل المصرِّف المكتوب بضاد', 'متغير م = استورد("محلل")\nمتغير ك = استورد("مترجم")\nمتغير ب = ك.صرّف(م.حلّل("دالة ف(أ) { ارجع أ * ٢ }\\nاطبع(ف(٢١))"))\nاطبع(طول(ب["functionChunks"]))\nمن_أجل (ت في ب["functionChunks"][٠]["code"]) { اطبع(ت["op"]) }', sf]);
let pass = 0, fail = 0;
for (const [name, code, files] of cases) {
  const a = viaNative(code, files), b = viaKernel(code, files);
  const sa = JSON.stringify(a), sb = JSON.stringify(b);
  if (sa === sb) pass++; else { fail++; console.log('اختلاف:', name, '\n  الأصل:', sa.slice(0, 300), '\n  النواة:', sb.slice(0, 300)); }
}
console.log(`pass ${pass} fail ${fail} من ${cases.length} حالة استيراد`);
process.exit(fail ? 1 : 0);
