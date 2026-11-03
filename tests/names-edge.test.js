// انحدار: معرّفات لاتينية بأسماء خصائص Object (constructor وtoString وvalueOf وhasOwnProperty وproto) كانت تلتقطها جداول المرمِّز فتتعطل.
const R = require('../site/run.js'); const api = R.api;
let pass = 0, fail = 0;
const check = (n, g, w) => { if (JSON.stringify(g) === JSON.stringify(w)) pass++; else { fail++; console.log('اختلاف:', n, g, w); } };
const run = src => { try { const c = api.compile(api.parse(src)); const o = []; const vm = new api.VM({ maxSteps: 1e6, maxMs: 2000, onPrint: l => o.push(String(l)) }); vm.run(c.mainChunkIndex, c.functionChunks); return o.join('|'); } catch (e) { return 'ERR ' + e.message; } };
check('متغيرات', run('متغير constructor = ٣\nمتغير toString = ٤\nمتغير valueOf = constructor + toString\nاطبع(valueOf)'), '٧');
check('دالة ومعامل', run('متغير hasOwnProperty = ١\nمتغير __proto__ = ٢\nدالة constructor(toString) { ارجع toString + hasOwnProperty + __proto__ }\nاطبع(constructor(٣))'), '٦');
check('مفاتيح خريطة', run('متغير م = {"__proto__": ٥، "constructor": ٦}\nاطبع(م["__proto__"]، م["constructor"])'), '٥ ٦');
check('صنف', run('صنف س { دالة جديد(valueOf) { هذا.valueOf = valueOf } دالة toString() { ارجع هذا.valueOf } }\nاطبع(س(٧).toString())'), '٧');
console.log(`pass ${pass} fail ${fail}`); process.exit(fail ? 1 : 0);
