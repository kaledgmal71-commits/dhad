// اختبار تفاضلي: المحلّل المكتوب بضاد (selfhost/محلل.dhad) مقابل parse في front.js
// ملفات المشروع كلها + مقاطع منها + طفرات (حذف/تكرار/تبديل) تنتج أخطاء عميقة. الاستعمال: node tests/selfhost-parser.test.js [عدد_الطفرات] [بذرة]
const fs = require('fs'), path = require('path');
const R = require('../site/run.js');
const { parse } = require('../front.js');
const MODS = { 'مرمز': fs.readFileSync(path.join(__dirname, '../selfhost/مرمز.dhad'), 'utf8'), 'محلل': fs.readFileSync(path.join(__dirname, '../selfhost/محلل.dhad'), 'utf8') };
const N = +process.argv[2] || 400, SEED = +process.argv[3] || 1;
let s = SEED >>> 0; const rnd = () => (s = (s * 1664525 + 1013904223) >>> 0) / 4294967296;
const ri = n => Math.floor(rnd() * n);
function dq(t) {
  let o = '"';
  for (const ch of t) {
    const c = ch.codePointAt(0);
    if (ch === '\\') o += '\\\\'; else if (ch === '"') o += '\\"'; else if (ch === '\n') o += '\\n'; else if (ch === '\t') o += '\\t';
    else if (c < 32 || c === 0x2028 || c === 0x2029 || c === 0xa0 || c === 0xfeff || (c >= 0x200b && c <= 0x200f) || (c >= 0x202a && c <= 0x202e) || c === 0x061c) o += '" + حرف(' + c + ') + "';
    else if (c > 0xffff) { const h = 0xd800 + ((c - 0x10000) >> 10), l = 0xdc00 + ((c - 0x10000) & 0x3ff); o += '" + حرف(' + h + ') + حرف(' + l + ') + "'; }
    else o += ch;
  }
  return o + '"';
}
function files(d, out = []) {
  for (const n of fs.readdirSync(d)) {
    if (n === 'node_modules' || n === '.git') continue;
    const f = path.join(d, n);
    if (fs.statSync(f).isDirectory()) files(f, out); else if (n.endsWith('.dhad')) out.push(f);
  }
  return out;
}
// أمثلة نحوية تغطي الصنف والتفكيك وغير_متزامنة وصدّر وغيرها
const snippets = [
  'صنف أ { دالة جديد(س) { هذا.س = س } دالة ق() { ارجع هذا.س } }\nصنف ب يرث أ { دالة ق() { ارجع الأب(١) } }',
  'متغير [أ، ب، ...ج] = [١،٢،٣،٤]\nمتغير {اسم، عمر: ع، س: [ي، ك]} = خ',
  'من_أجل ([أ، ب] في ق) { اطبع(أ) }\nمن_أجل ({ا، ب: ج} في ق) { اطبع(ج) }',
  'صدّر دالة ف(أ، ب = ٥) { ارجع أ + ب }\nصدّر متغير س = ١\nصدّر غير_متزامنة دالة ز() { ارجع انتظر ف() }',
  'غير_متزامنة دالة ز() { متغير ت = غير_متزامنة دالة() { ارجع ١ }\n ارجع انتظر ت() }',
  'حاول { أطلق_خطأ("ك") } التقط (خ) { اطبع(خ) } أخيرًا { اطبع(١) }\nحاول { ١ } أخيرا { ٢ }',
  'متغير ق = [١،٢،٣]\nاطبع(ق[١:]، ق[:٢]، ق[١:٢]، ق[:])\nس += ١\nس++\nق[٠] -= ٣\nإذا (س في ق و ليس ص) { توقف } وإلا إذا (ع) { أكمل } وإلا { ارجع }',
  'من_أجل (ي من ١ إلى ١٠ بخطوة ٢) { طالما (صحيح) { توقف } }\nمتغير خ = {"أ": ١، ب: ٢، ٣: ٤}\nمتغير ن = ٣٫١٤ + 1.2.3 + .5',
];
const cases = [];
const fl = files(path.join(__dirname, '..'));
for (const f of fl) cases.push({ n: f.split('/').slice(-2).join('/'), t: fs.readFileSync(f, 'utf8') });
snippets.forEach((t, i) => cases.push({ n: 'مثال' + i, t }));
const pool = fl.map(f => fs.readFileSync(f, 'utf8')).concat(snippets);
function mutate() {
  const src = pool[ri(pool.length)], lines = src.split('\n');
  const a = ri(lines.length), len = 1 + ri(Math.min(15, lines.length - a));
  let t = lines.slice(a, a + len).join('\n');
  const k = 1 + ri(3);
  for (let i = 0; i < k && t.length; i++) {
    const p = ri(t.length), m = ri(5);
    if (m === 0) t = t.slice(0, p) + t.slice(p + 1 + ri(4));
    else if (m === 1) t = t.slice(0, p) + t.slice(p, p + 1 + ri(6)) + t.slice(p);
    else if (m === 2) { const q = ri(t.length); const arr = [...t]; [arr[p], arr[q]] = [arr[q], arr[p]]; t = arr.join(''); }
    else if (m === 3) t = t.slice(0, p) + ['(', ')', '{', '}', '[', ']', ',', '،', ':', '=', '.', 'إذا', 'دالة', 'في', 'من_أجل', 'صنف', 'صدّر', 'متغير', 'انتظر', '...'][ri(20)] + t.slice(p);
    else t = t.slice(0, p);
  }
  return t;
}
for (let i = 0; i < N; i++) cases.push({ n: 'طفرة' + i, t: mutate() });
function canon(v) { if (Array.isArray(v)) return v.map(canon); if (v && typeof v === 'object') { const o = {}; for (const k of Object.keys(v).sort()) if (v[k] !== undefined) o[k] = canon(v[k]); return o; } return v; }
// الرسالة بلا «السطر» يسبقها المحرك بموضع الوحدة؛ نسقطها للمقارنة
const strip = v => (v && typeof v.err === 'string') ? { err: v.err.replace(/^محلل، السطر \d+: /, '') } : v;
function ref(t) { try { return { ok: canon(JSON.parse(JSON.stringify(parse(t)))) }; } catch (e) { return { err: e.message }; } }
let pass = 0, fail = 0, okCount = 0;
const B = 12;
for (let i = 0; i < cases.length; i += B) {
  const chunk = cases.slice(i, i + B);
  const src = 'متغير م = استورد("محلل")\nمتغير ج = استورد("ضاد/جسون")\nمتغير ن = [' + chunk.map(c => dq(c.t)).join('،') + ']\nمتغير خ = []\nمن_أجل (س في ن) {\n حاول { أضف(خ، {"ok": م.حلّل(س)}) } التقط (ع) { أضف(خ، {"err": ع}) }\n}\nاطبع(ج.اكتب(خ، ٠))\n';
  const r = R.run(src, { files: MODS, maxMs: 1200000, maxSteps: 8e9 });
  if (!r.ok) { fail += chunk.length; console.log('تعطّل التشغيل:', r.error); continue; }
  let got; try { got = JSON.parse(r.out[0]); } catch (e) { fail += chunk.length; console.log('ناتج غير JSON', r.out[0].slice(0, 200)); continue; }
  chunk.forEach((c, k) => {
    const want = ref(c.t), g = strip(canon(got[k]));
    if (want.ok) okCount++;
    const a = JSON.stringify(want), b = JSON.stringify(g);
    if (a === b) pass++; else { fail++; if (fail <= 5) { let d = 0; while (d < a.length && a[d] === b[d]) d++; console.log('اختلاف في', c.n, '\n  الأصل:', a.slice(Math.max(0, d - 60), d + 200), '\n  ضاد :', b.slice(Math.max(0, d - 60), d + 200)); } }
  });
}
console.log(`pass ${pass} fail ${fail} (منها ${okCount} تحليلًا ناجحًا والباقي أخطاء متطابقة)`);
process.exit(fail ? 1 : 0);
