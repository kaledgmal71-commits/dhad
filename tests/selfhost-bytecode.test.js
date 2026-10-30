// المرحلة ٥: ملف البايتكود المخزَّن (selfhost/bytecode.json)
const fs = require('fs'), path = require('path'), nodevm = require('vm'), cp = require('child_process');
const root = path.join(__dirname, '..');
const { makeFrontend, loadCache } = require('../selfhost/boot.js');
const src = ['front.js', 'compiler.js', 'vm.js'].map(f => fs.readFileSync(path.join(root, f), 'utf8')).join('\n;\n');
const ctx = nodevm.createContext({ console, performance, setTimeout });
nodevm.runInContext(src + '\n;this.__api={parse,compile,VM,srcHash,STDLIB_SOURCES};', ctx);
const api = ctx.__api;
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) pass++; else { fail++; console.log('فشل:', m); } };

// ١) الملف مطابق للمصادر الحالية (إعادة البناء تعطي البايتات نفسها)
const r = cp.spawnSync('node', [path.join(root, 'tools/build_bytecode.js'), '--check'], { encoding: 'utf8' });
ok(r.status === 0, 'الملف المخزَّن قديم أو ليس نقطة ثابتة: ' + r.stdout);

// ٢) الإقلاع من الملف وحده: لا parse ولا compile
const cache = loadCache();
ok(cache && cache.version === 1, 'الملف غير موجود');
const fe = makeFrontend({ VM: api.VM, srcHash: api.srcHash }, { cache });
ok(fe.usedJsCompiler === false, 'استُعمل مصرِّف JS رغم وجود الملف');
const c = fe('اطبع(١ + ٢)');
const out = []; const vm = new api.VM({ frontend: fe, precompiled: fe.precompiled, onPrint: l => out.push(l) });
vm.run(c.mainChunkIndex, c.functionChunks);
ok(out.join() === '٣', 'تشغيل برنامج بسيط: ' + out);

// ٣) بايتكود المكتبات القياسية الجاهز يعطي النتيجة نفسها كالترجمة المباشرة
for (const lib of Object.keys(api.STDLIB_SOURCES)) {
  ok(fe.precompiled.has(lib), 'المكتبة غير مخزَّنة: ' + lib);
  const code = 'متغير م = استورد("' + lib + '")\nاطبع(طول(مفاتيح(م)))';
  const a = [], b = [];
  const c1 = api.compile(api.parse(code)); const v1 = new api.VM({ onPrint: l => a.push(l) }); v1.run(c1.mainChunkIndex, c1.functionChunks);
  const c2 = fe(code); const v2 = new api.VM({ frontend: fe, precompiled: fe.precompiled, onPrint: l => b.push(l) }); v2.run(c2.mainChunkIndex, c2.functionChunks);
  ok(a.join() === b.join(), 'اختلاف نتيجة استيراد ' + lib + ': ' + a + ' / ' + b);
}

// ٤) مخزَّن قديم (مصدر تغيّر) يُهمل ولا يُستعمل: نغيّر بصمة وحدة فيُعاد ترجمتها من المصدر
const stale = JSON.parse(JSON.stringify(cache));
stale.entries['ضاد/نصوص'].hash = 'قديم';
stale.entries['ضاد/نصوص'].functionChunks = [];
const fe3 = makeFrontend({ VM: api.VM, srcHash: api.srcHash }, { cache });
const vm3 = new api.VM({ frontend: fe3, precompiled: new Map(Object.entries(stale.entries).filter(([k]) => k.startsWith('ضاد/'))), onPrint: l => out.push(l) });
const c3 = fe3('متغير ن = استورد("ضاد/نصوص")\nاطبع(ن.قصّ("  س  "))');
let err = null; try { vm3.run(c3.mainChunkIndex, c3.functionChunks); } catch (e) { err = e; }
ok(!err, 'المخزَّن القديم لم يُهمل: ' + (err && err.message));

// ٥) إن فُقد الملف ولا مصرِّف احتياطي يفشل الإقلاع برسالة واضحة
let msg = ''; try { makeFrontend({ VM: api.VM, srcHash: api.srcHash }, { cache: null }); } catch (e) { msg = e.message; }
ok(/build_bytecode/.test(msg), 'رسالة الفقد: ' + msg);

console.log(`pass ${pass} fail ${fail}`);
process.exit(fail ? 1 : 0);
