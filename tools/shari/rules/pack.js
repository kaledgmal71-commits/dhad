// يحزم الاقتباسات الحرفية ومواضعها لعرضها في المتصفح: node pack.js ← site/assets/fiqh/rules.json
const fs = require('fs'), path = require('path'), { load } = require('./ask.js');
const I = load(), books = [], rows = [];
for (const r of I.rules) { let b = books.indexOf(r.src.book); if (b < 0) b = books.push(r.src.book) - 1; rows.push([r.src.quote, b, r.src.vol, r.src.page, r.school === 'shafii' ? 0 : 1]); }
const out = path.join(__dirname, '../../../site/assets/fiqh'); fs.mkdirSync(out, { recursive: true });
fs.writeFileSync(path.join(out, 'rules.json'), JSON.stringify({ books, rows }));
console.log(rows.length, fs.statSync(path.join(out, 'rules.json')).size);
