'use strict';
const assert = require('assert');
const fs = require('fs');
const { normalizeAr } = require('../tools/shari/normalize');
const { parse } = require('../tools/shari/pages');
const { verify } = require('../tools/shari/verify_quotes');

assert.strictEqual(normalizeAr('إِنَّمَا الأَعْمَالُ بِالنِّيَّاتِ'), 'انما الاعمال بالنيات');
assert.strictEqual(normalizeAr('رَحْمَةٌ، وَمَدْرَسَى'), 'رحمه ومدرسي');

const sample = '######OpenITI#\n#META# x\n#META#Header#End#\n# أول نص في الصفحة الأولى PageV01P001\n# ثم صفحة ثانية فيها «لا تقبل صلاة بغير طهور» PageV01P002 \n~~وبداية ثالثة PageV01P003\n';
const pages = parse(sample);
assert.deepStrictEqual(pages.map(p => p.page), [1, 2, 3]);
assert.ok(pages[1].text.includes('لا تقبل صلاة بغير طهور'));

const get = (b, v, p) => { const x = pages.find(q => q.vol === v && q.page === p); return x ? x.text : null; };
let r = verify('قال «لا تُقبَلُ صلاةٌ بغيرِ طَهورٍ» [[T:v1:p2]]', get);
assert.ok(r.ok, JSON.stringify(r));
r = verify('قال «لا تقبل صلاة بغير وضوء أبدا» [[T:v1:p2]]', get);
assert.ok(!r.ok && r.results[0].reason.includes('غير موجود'));
r = verify('قال «لا تقبل صلاة بغير طهور»', get);
assert.ok(!r.ok && r.results[0].reason.includes('بلا إحالة'));
r = verify('قال «لا تقبل صلاة بغير طهور» [[T:v1:p9]]', get);
assert.ok(!r.ok && r.results[0].reason.includes('غير موجودة'));

// بيانات حقيقية إن وُجدت (ترمذي الجامع من OpenITI)
const real = '/home/claude/openiti/0300ah/data/0279Tirmidhi/0279Tirmidhi.Sunan/0279Tirmidhi.Sunan.Shamela0001435-ara1';
if (fs.existsSync(real)) {
  const ps = parse(fs.readFileSync(real, 'utf8'));
  assert.ok(ps.length > 100, 'pages ' + ps.length);
  const g = (b, v, p) => { const x = ps.find(q => q.vol === v && q.page === p); return x ? x.text : null; };
  const pg = ps.find(p => p.text.includes('مفتاح الصلاة الطهور'));
  assert.ok(pg, 'real hadith found');
  assert.ok(verify(`«مفتاح الصلاة الطهور وتحريمها التكبير» [[T:v${pg.vol}:p${pg.page}]]`, g).ok);
  assert.ok(!verify(`«مفتاح الصلاة الصيام وتحريمها التكبير» [[T:v${pg.vol}:p${pg.page}]]`, g).ok);
}
console.log('shari ok');
