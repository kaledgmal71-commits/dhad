// الوضع الديناميكي: ضاد الكاملة (قيم موسومة، نصوص حرفية، قوائم وخرائط، حلقات) تُصرَّف إلى WebAssembly بمصرِّف مكتوب بضاد،
// ثم يُقارَن الناتج بآلة ضاد الأصلية على البرنامج نفسه.
const fs = require('fs'), path = require('path');
const R = require('../site/run.js'); const api = R.api;
const dir = path.join(__dirname, '../selfhost');
const files = {};
for (const n of ['مرمز', 'محلل', 'وازم']) files[n + '.dhad'] = fs.readFileSync(path.join(dir, n + '.dhad'), 'utf8');
const host = new api.VM({ maxSteps: 1e15, maxMs: 1e12, onPrint: () => {}, readModule: p => (files[p] !== undefined ? files[p] : null) });
const boot = api.compile(api.parse('استورد("وازم")')); host.run(boot.mainChunkIndex, boot.functionChunks);
const compileDyn = host.modules.get('وازم.dhad').exports.get('صرّف_ديناميكي_مع');
const lib = ['نواة-تشغيل', 'نواة-أعداد', 'نواة-قيم', 'نواة-مدمجات'].map(n => fs.readFileSync(path.join(dir, n + '.dhad'), 'utf8')).join('\n');
let pass = 0, fail = 0;
const check = (name, got, want) => { if (JSON.stringify(got) === JSON.stringify(want)) pass++; else { fail++; console.log('اختلاف:', name, 'الناتج', got, 'المتوقع', want); } };

// يشغّل المصدر في الآلة الأصلية ويرجع المخارج (قائمة أسطر)
const runRef = src => { const out = []; const c = api.compile(api.parse(src)); const vm = new api.VM({ maxSteps: 5e7, maxMs: 20000, onPrint: l => out.push(String(l)) }); vm.run(c.mainChunkIndex, c.functionChunks); return out; };
// يصرّف المصدر الديناميكي ويستدعي الصادر «رئيسي» ويرجع ما طُبع بـ اطبع (أعداد صغيرة)
async function runWasm(src) {
  const bytes = Uint8Array.from(host.callFunctionExternally(compileDyn, [lib, src]));
  const printed = [];
  const { instance } = await WebAssembly.instantiate(bytes, { 'بيئة': { 'اطبع_رقم': n => printed.push(n) } });
  if (instance.exports.__تهيئة) instance.exports.__تهيئة();
  instance.exports.رئيسي();
  return { printed, ex: instance.exports };
}
// برنامج واحد بصيغة ضاد صالحة للآلتين: يطبع أعدادًا صحيحة فقط (ما بعد المقارنة بالمرجع)
const cases = [
  ['حساب وشرط', 'صدّر دالة رئيسي() { اطبع(١ + ٢ * ٣)\n اطبع(١٠ - ١٢)\n اطبع(٧ % ٣)\n اطبع(٨ / ٢)\n إذا (٣ > ٢) { اطبع(١) } وإلا { اطبع(٠) }\n إذا (١ == ٢) { اطبع(١) } وإلا { اطبع(٠) } }'],
  ['حلقة طالما ومن_أجل', 'صدّر دالة رئيسي() { متغير م = ٠\n من_أجل (ع من ١ إلى ١٠) { م = م + ع }\n اطبع(م)\n متغير ك = ٥\n طالما (ك > ٠) { ك = ك - ١\n إذا (ك == ٢) { توقف } }\n اطبع(ك)\n من_أجل (ي من ١٠ إلى ٧ بخطوة -٢) { اطبع(ي) } }'],
  ['دوال وتكرار', 'دالة عاملي(ن) { إذا (ن <= ١) { ارجع ١ }\n ارجع ن * عاملي(ن - ١) }\nدالة فيب(ن) { إذا (ن < ٢) { ارجع ن }\n ارجع فيب(ن - ١) + فيب(ن - ٢) }\nصدّر دالة رئيسي() { اطبع(عاملي(٥))\n اطبع(فيب(١٥))\n اطبع(عاملي(١٠)) }'],
  ['قوائم', 'صدّر دالة رئيسي() { متغير ق = [١، ٢، ٣]\n أضف(ق، ٤)\n اطبع(طول(ق))\n اطبع(ق[٠] + ق[-١])\n ق[١] = ٩٠\n اطبع(ق[١])\n متغير م = ٠\n من_أجل (ي من ٠ إلى طول(ق) - ١) { م = م + ق[ي] }\n اطبع(م)\n اطبع(انزع(ق))\n اطبع(طول(ق)) }'],
  ['خرائط ونصوص حرفية', 'صدّر دالة رئيسي() { متغير خ = {"أ": ١، "ب": ٢}\n خ["ج"] = ٣\n اطبع(خ["أ"] + خ["ب"] + خ["ج"])\n اطبع(طول(خ))\n اطبع(طول("مرحبا بالعالم"))\n اطبع(طول("سلام" + "!" + "م"))\n إذا (خ["غير"] == لاشيء) { اطبع(٧) }\n إذا ("أب" == "أ" + "ب") { اطبع(٨) } }'],
  ['منطق مختصر وقيم', 'دالة ث() { ارجع ٥ }\nصدّر دالة رئيسي() { اطبع(٠ أو ٧)\n اطبع(٣ و ٤)\n اطبع(٠ و ٤)\n اطبع(ليس ٠ و ١)\n اطبع(ث() أو ٩)\n اطبع(-ث()) }'],
  ['عامة وتهيئة', 'متغير عدّاد = ٥\nمتغير قائمة_عامة = [١، ٢]\nدالة زد() { عدّاد = عدّاد + ١\n أضف(قائمة_عامة، عدّاد) }\nصدّر دالة رئيسي() { زد()\n زد()\n اطبع(عدّاد)\n اطبع(طول(قائمة_عامة))\n اطبع(قائمة_عامة[٣]) }'],
  ['أعداد كبيرة وعشرية', 'صدّر دالة رئيسي() { إذا (١٠٧٣٧٤١٨٢٣ + ١ == ١٠٧٣٧٤١٨٢٤) { اطبع(١) }\n إذا (٣٢٧٦٨ * ٣٢٧٦٨ == ١٠٧٣٧٤١٨٢٤) { اطبع(٢) }\n اطبع(٧ / ٢ * ٢)\n إذا (٠٫١ + ٠٫٢ == ٠٫٣) { اطبع(٣) } وإلا { اطبع(٤) }\n اطبع(١٠٠٠٠٠ * ١٠٠٠٠٠ / ١٠٠٠٠٠)\n إذا (٠٫٥ + ٠٫٥ == ١) { اطبع(٥) }\n اطبع(٢٠٠٠٠٠٠٠٠٠ - ١٩٩٩٩٩٩٩٩٩) }'],
];
(async () => {
  for (const [name, src] of cases) {
    let want, got;
    try { want = runRef(src.replace('صدّر دالة رئيسي', 'دالة رئيسي') + '\nرئيسي()').map(l => l.replace(/[٠-٩]/g, d => '٠١٢٣٤٥٦٧٨٩'.indexOf(d))); } catch (e) { want = 'مرجع: ' + e.message; }
    try { got = (await runWasm(src)).printed.map(String); } catch (e) { got = 'wasm: ' + e.message; }
    check(name, got, want);
  }
  console.log(`pass ${pass} fail ${fail}`);
  process.exit(fail ? 1 : 0);
})();
