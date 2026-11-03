// يزامن جدول الكلمات الإنجليزية (english-table.json، المصدر الوحيد) إلى المرمِّز الأصلي (front.js) ومرمِّز ضاد (selfhost/مرمز.dhad)
// بين علامتي <english-table> … </english-table>. يُشغَّل بعد أي تعديل على الجدول؛ واختبار syntax-english يتحقق من التطابق.
const fs = require('fs'), path = require('path');
const root = path.join(__dirname, '..');
const table = JSON.parse(fs.readFileSync(path.join(root, 'english-table.json'), 'utf8'));
const entries = Object.entries(table);
const js = 'const ENGLISH_WORDS = {\n' + entries.map(([k, v]) => `  ${JSON.stringify(k)}: ${JSON.stringify(v)},`).join('\n') + '\n};';
const dh = 'متغير كلمات_إنجليزية = {\n' + entries.map(([k, v]) => `    ${JSON.stringify(k)}: ${JSON.stringify(v)}`).join('،\n') + '\n}';
function patch(file, open, close, body) {
  const p = path.join(root, file); let s = fs.readFileSync(p, 'utf8');
  const a = s.indexOf(open), b = s.indexOf(close);
  if (a < 0 || b < 0) throw new Error('علامات الجدول غير موجودة في ' + file);
  s = s.slice(0, a + open.length) + '\n' + body + '\n' + s.slice(b);
  fs.writeFileSync(p, s);
}
patch('front.js', '// <english-table>', '// </english-table>', js);
patch('selfhost/مرمز.dhad', '# <english-table>', '# </english-table>', dh);
console.log('جدول الكلمات الإنجليزية:', entries.length, 'مدخلًا');
