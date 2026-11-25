// يختبر أن المُشكِّل في JS يطابق مخرجات النموذج المرجعي (من التصدير) ويشكّل جملة معروفة.
const fs = require('fs'), path = require('path'), D = require('../site/assets/nawa.dia.js');
const dir = path.join(__dirname, '../site/assets/dia'), meta = JSON.parse(fs.readFileSync(dir + '/dia.json', 'utf8'));
const bin = fs.readFileSync(dir + '/dia.bin'), buf = bin.buffer.slice(bin.byteOffset, bin.byteOffset + bin.length);
const ref = JSON.parse(fs.readFileSync(dir + '/ref.json', 'utf8')), m = D._build(meta, buf);
// ref.y أُخذ من تنبؤ على نص أطول، فالنوافذ بعد ~190 تختلف سياقاً؛ نقارن أول 190 فقط
const t0 = Date.now(), y = D._predict(m, Int32Array.from(ref.x)); let ok = 0, tot = 0;
for (let i = 0; i < 190; i++) if (ref.x[i] > 1) { tot++; if (y[i] === ref.y[i]) ok++; }
console.log('agreement', (ok / tot).toFixed(4), 'letters', tot, 'ms', Date.now() - t0);
if (ok / tot < 0.99) { console.error('FAIL agreement'); process.exit(1); }
const out = D._diacritize(m, 'إنما الأعمال بالنيات');
console.log(out);
if (out.replace(/[ً-ْ]/g, '') !== 'إنما الأعمال بالنيات' || out.length <= 20) { console.error('FAIL text'); process.exit(1); }
console.log('wants', D.wants('شكّل: إنما الأعمال بالنيات'), D.wants('ما حكم الصلاة'));
if (!D.wants('شكّل: إنما الأعمال بالنيات') || D.wants('ما حكم الصلاة')) process.exit(1);
console.log('PASS');
