const fs = require('fs'), path = require('path'), F = require('../site/assets/nawa.fiqh.js'), { load } = require('../tools/shari/rules/ask.js');
const d = JSON.parse(fs.readFileSync(path.join(__dirname, '../site/assets/fiqh/rules.json'), 'utf8')), ix = F._build(d);
const q = 'حكم الماء المشمس', a = F._search(ix, q, 3), b = load().search(q, { limit: 8, school: 'shafii' });
console.log(F._format(a).slice(0, 300));
if (!/المشمس/.test(a[0].quote) || !b.some(x => x.src.page === a[0].page && x.src.book === a[0].book)) { console.error('FAIL: browser index differs from node index'); process.exit(1); }
if (!F.wants('ابحث في الفقه الشافعي: حكم الماء المشمس') || F.wants('ما حكم الماء المشمس') || F.wants('شكّل: ماء')) { console.error('FAIL routing'); process.exit(1); }
const need = ['المسح على الخفين', 'بيع الغرر', 'نصاب الزكاة']; for (const n of need) if (!F._search(ix, n, 1).length) { console.error('FAIL empty', n); process.exit(1); }
console.log('PASS');
