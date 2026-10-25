// يدمج ملفات stdlib/*.dhad داخل vm.js بين العلامتين <STDLIB> و </STDLIB> (شغّله بعد أي تعديل على المكتبة)
const fs = require('fs'), path = require('path');
const dir = path.join(__dirname, '..', 'stdlib');
const parts = [];
for (const f of fs.readdirSync(dir).filter(f => f.endsWith('.dhad')).sort()) {
  const src = fs.readFileSync(path.join(dir, f), 'utf8');
  if (/[`\\]|\$\{/.test(src)) throw new Error(f + ': يمنع الحرف ` أو \\ أو ${ في ملفات المكتبة');
  parts.push('  ' + JSON.stringify('ضاد/' + f.replace(/\.dhad$/, '')) + ': `' + src + '`');
}
const vmPath = path.join(__dirname, '..', 'vm.js');
let vm = fs.readFileSync(vmPath, 'utf8');
const re = /\/\/ <STDLIB>[\s\S]*?\/\/ <\/STDLIB>/;
if (!re.test(vm)) throw new Error('علامات STDLIB غير موجودة في vm.js');
vm = vm.replace(re, () => '// <STDLIB>\nconst STDLIB_SOURCES = {\n' + parts.join(',\n') + '\n};\n// </STDLIB>');
fs.writeFileSync(vmPath, vm);
console.log('embedded', parts.length, 'module(s)');
