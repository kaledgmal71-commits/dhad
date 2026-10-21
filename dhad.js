#!/usr/bin/env node
// أداة سطر الأوامر: node dhad.js ملف.dhad
// تحمّل المحرك الحقيقي (front + compiler + vm) في سياق واحد كما يفعل المتصفح.
const fs = require("fs"), path = require("path"), nodevm = require("vm");

const HELP = `ضاد — تشغيل الملفات خارج المتصفح

الاستعمال:
  node dhad.js ملف.dhad        تشغيل ملف
  node dhad.js -e "اطبع(١)"    تشغيل شيفرة مكتوبة مباشرة
  node dhad.js --help          هذه الرسالة

يُرجع رمز خروج ٠ عند النجاح و١ عند وجود خطأ، فيصلح للسكربتات.`;

function loadEngine() {
  const src = ["front.js", "compiler.js", "vm.js"].map((f) => fs.readFileSync(path.join(__dirname, f), "utf8")).join("\n;\n");
  const ctx = nodevm.createContext({ console, performance, setTimeout });
  nodevm.runInContext(src + "\n;this.__api={parse,compile,VM};", ctx);
  return ctx.__api;
}

// قراءة سطر من الإدخال القياسي بشكل متزامن (لدالة ادخل)
function readLine() {
  const one = Buffer.alloc(1);
  const bytes = [];
  for (;;) {
    let n = 0;
    try { n = fs.readSync(0, one, 0, 1, null); } catch (e) { if (e.code === "EAGAIN") continue; if (e.code === "EOF") break; throw e; }
    if (n === 0 || one[0] === 10) break;
    if (one[0] !== 13) bytes.push(one[0]);
  }
  return Buffer.from(bytes).toString("utf8");   // نفكّ الترميز بعد جمع البايتات كي لا تتمزق الحروف العربية
}

function main(argv) {
  if (!argv.length || argv[0] === "--help" || argv[0] === "-h") { console.log(HELP); return argv.length ? 0 : 1; }
  let code, root = process.cwd(), mainPath = "main.dhad";
  if (argv[0] === "-e") {
    if (argv[1] === undefined) { console.error("الخيار -e يحتاج شيفرة بعده"); return 1; }
    code = argv[1];
  } else {
    try { code = fs.readFileSync(argv[0], "utf8"); }
    catch (e) { console.error("تعذّر فتح الملف: " + argv[0]); return 1; }
    root = path.dirname(path.resolve(argv[0])); mainPath = path.basename(argv[0]);
  }
  const api = loadEngine();
  try {
    const c = api.compile(api.parse(code));
    const vm = new api.VM({
      onPrint: (l) => console.log(l),
      onSaveFile: (name, text) => fs.writeFileSync(path.basename(String(name)), String(text)),
      onInput: (q) => { if (q) process.stdout.write(q + " "); return readLine(); },
      mainPath,
      // الاستيراد يقرأ من مجلد الملف الرئيسي ومجلداته الفرعية فقط
      readModule: (p) => {
        const full = path.resolve(root, p);
        if (full !== root && !full.startsWith(root + path.sep)) return null;
        try { return fs.statSync(full).isFile() ? fs.readFileSync(full, "utf8") : null; } catch (e) { return null; }
      },
    });
    vm.run(c.mainChunkIndex, c.functionChunks);
    return 0;
  } catch (e) { console.error("خطأ: " + e.message); return 1; }
}

process.exitCode = main(process.argv.slice(2));
