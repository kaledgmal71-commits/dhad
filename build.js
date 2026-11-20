const fs = require("fs");
const path = require("path");

function build(shellFile, replacements, outFile) {
  let content = fs.readFileSync(shellFile, "utf8");
  for (const [key, file] of Object.entries(replacements)) {
    const piece = fs.readFileSync(file, "utf8");
    if (/<\/script/i.test(piece)) throw new Error(file + ": يحوي </script حرفيًّا فيكسر الصفحة التي تضمّنه — اكتبه <\\/script داخل النص");
    content = content.split(key).join(piece);
  }
  fs.mkdirSync(path.dirname(outFile), { recursive: true });
  fs.writeFileSync(outFile, content);
  console.log("Built", outFile, "-", content.length, "bytes");
}

build(
  "editor_shell.html",
  {
    __CSS__: "editor.css",
    __FRONT__: "front.js",
    __COMPILER__: "compiler.js",
    __VM__: "vm.js",
    __MONACO__: "monaco_setup.js",
    __HIGHLIGHTER__: "highlighter.js",
    __AUTOCOMPLETE__: "autocomplete.js",
    __FALLBACK__: "fallback_editor.js",
    __CLOUD__: "cloud.js",
    __TEMPLATES__: "templates.js",
    __UI__: "editor_ui.js",
    __LAB__: "smart_editor.js",
  },
  "dist/index.html"
);

fs.mkdirSync("dist", { recursive: true });
fs.copyFileSync("manifest.json", "dist/manifest.json");
console.log("Copied manifest.json");
fs.mkdirSync("dist/model-test", { recursive: true });
fs.copyFileSync("model-test/index.html", "dist/model-test/index.html");

build(
  "guide_shell.html",
  {
    __CSS__: "guide.css",
    __ENGINE__: "front.js",
    __HIGHLIGHTER__: "highlighter.js",
  },
  "dist/guide.html"
);
