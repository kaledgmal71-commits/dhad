#!/usr/bin/env node
// يبني selfhost/bytecode.json: البايتكود الجاهز للواجهة الأمامية (مرمز/محلل/مترجم) وللمكتبات القياسية كلها،
// مترجَمًا بواجهة ضاد نفسها (المكتوبة بضاد). مصرِّف JS لا يُستعمل إلا إن كان الملف مفقودًا أو قديمًا (بذرة أولى).
// ثم يتحقق من النقطة الثابتة: إقلاع الواجهة من الملف وحده (بلا parse/compile) يعيد إنتاج الملف نفسه بالبايت.
// الاستعمال: node tools/build_bytecode.js [--check]   (--check: يتحقق فقط ولا يكتب)
const fs = require('fs'), path = require('path'), nodevm = require('vm');
const root = path.join(__dirname, '..');
const { makeFrontend, loadCache, BOOT_SRC, CACHE_FILE, MODS } = require('../selfhost/boot.js');
const src = ['front.js', 'compiler.js', 'vm.js'].map(f => fs.readFileSync(path.join(root, f), 'utf8')).join('\n;\n');
const ctx = nodevm.createContext({ console, performance, setTimeout });
nodevm.runInContext(src + '\n;this.__api={parse,compile,VM,srcHash,STDLIB_SOURCES};', ctx);
const api = ctx.__api;
const check = process.argv.includes('--check');

const sources = {};
for (const n of MODS) sources[n + '.dhad'] = fs.readFileSync(path.join(root, 'selfhost', n + '.dhad'), 'utf8');
sources['@boot'] = BOOT_SRC;
sources['آلة.dhad'] = fs.readFileSync(path.join(root, 'selfhost', 'آلة.dhad'), 'utf8');
sources['وازم.dhad'] = fs.readFileSync(path.join(root, 'selfhost', 'وازم.dhad'), 'utf8');
for (const k of Object.keys(api.STDLIB_SOURCES).sort()) sources[k] = api.STDLIB_SOURCES[k];

function canon(v) { return JSON.parse(JSON.stringify(v)); }
function build(fe) {
  const entries = {};
  for (const k of Object.keys(sources).sort()) {
    const c = fe(sources[k]);
    entries[k] = { hash: api.srcHash(sources[k]), mainChunkIndex: c.mainChunkIndex, exportNames: c.exportNames, functionChunks: canon(c.functionChunks) };
  }
  return JSON.stringify({ version: 1, entries });
}

const t0 = Date.now();
const old = loadCache();
const fe1 = makeFrontend(api, { cache: old });               // قد يستعمل JS للبذرة إن لم يوجد ملف صالح
console.log('الإقلاع الأول: مصرِّف JS ' + (fe1.usedJsCompiler ? 'استُعمل (بذرة)' : 'لم يُستعمل'));
const text1 = build(fe1);
// الجولة الثانية: واجهة تقلع من الملف الذي أنتجته الجولة الأولى وحده، بلا parse/compile
const fe2 = makeFrontend({ VM: api.VM, srcHash: api.srcHash }, { cache: JSON.parse(text1) });
const text2 = build(fe2);
const fixed = text1 === text2;
console.log('نقطة ثابتة (الواجهة المقلعة من الملف تعيد إنتاجه بالبايت):', fixed ? 'نعم' : 'لا', '— الحجم ' + (text1.length / 1024).toFixed(0) + ' ك.بايت، ' + Object.keys(sources).length + ' وحدة، ' + (Date.now() - t0) + ' مللي ثانية');
if (!fixed) process.exit(1);
if (check) {
  const same = old && JSON.stringify(old) === text1;
  console.log('الملف المحفوظ مطابق للمصادر الحالية:', same ? 'نعم' : 'لا');
  process.exit(same ? 0 : 1);
}
fs.writeFileSync(CACHE_FILE, text1);
console.log('كُتب', path.relative(root, CACHE_FILE));
