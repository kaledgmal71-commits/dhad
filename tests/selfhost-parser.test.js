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
  'متغير أ = ٢ ** ٣ ** ٢ + -٢ ** ٢ - ٢ ** -١\nمتغير ب = ٧ // ٢ * ٣ // ٤ % ٥\nمتغير ج = ٥ & ٣ | ٤ ^ ٧ & ~٦',
  'متغير د = ١ << ٢ + ٣ >> ١ < ٨ | ٢ == ٣\nإذا (س & ١ == ١ و ص | ٢ في ق) { اطبع(~س ** ٢) }',
  'متغير هـ = ق[٢ ** ٣ // ٢ & ٧]\nاطبع(-ق[٠] ** ٢، ليس س ** ٢، انتظر ف() ** ٢)',
  'متغير أ = س ? ١ : ٢\nمتغير ب = س ? ص ? ١ : ٢ : ٣\nمتغير ج = أ ?? ب ?? ٣\nمتغير د = س > ١ و ص ? ق[٠] : {"ك": ٢}',
  'متغير م = أ?.ب\nمتغير ن = أ?.ب.ج?.د(١، ٢)\nمتغير ه = أ?.["ك"]?.[٠]\nمتغير و = أ?.(٣)\nدالة ز(ص = س ? ١ : ٢) { ارجع ص }',
  'اطبع(س ? ٠ : ١، س ?? ٢ + ٣، (أ ?? ب)?.ج، أ ? ب ?? ج : د ?? هـ)',
  'متغير أ = ١ < ٢ < ٣\nمتغير ب = أ > ب >= ج <= د\nمتغير ج = س ليس في ق\nمتغير د = س هو "رقم" و ص ليس في [١] و ٣ < س < ٥',
  'متغير ه = س\nهو = ٥\nاطبع(هو، س هو "نص"، ليس (س هو "قائمة")، ١ < ٢ في [صحيح]، أ ليس في ب ليس في ج)',
  'ثابت أ = ١\nثابت [ب، ج] = [٢، ٣]\nثابت {د، ه: و} = خ\nصدّر ثابت ز = ٤\nدالة ف() { ثابت ح = ٥\n ارجع ح }',
  'ثابت\nأ = ٢\nثابت أ\nثابت ب',
  '# dhad: english\nvar t = 0\nfor (i from 1 to 5) { t += i }\nprint(t)\nfunction f(n) { if (n <= 1) { return 1 } return n * f(n - 1) }',
  '# dhad: english\ntry { throw("x") } catch (e) { print(e) } finally { print(1) }\nclass A extends B { function constructor(n) { this.n = n } }\nconst z = [1] is "list"',
  '# dhad: arabic\nvar a = 1\nfor (i from 1 to 3) { }',
  'متغير constructor = ١\nمتغير toString = constructor\nمتغير خ = {"valueOf": hasOwnProperty}',
  'متغير أ = ١\n(٢)\nمتغير ب = أ\n-٢\n[١، ٢]\nأ + ب\n+ ٣',
  ';;; اطبع(١);; إذا (صحيح) { ; اطبع(٢) ; } ; دالة ف() { ;; }',
  'متغير خ = {\n"أ": ١\n- ٢،\n"ب": [١\n+ ٢]\n}\nف(١\n(٢)\n[٣])\nع(دالة() {\nأ\n(٢)\n})',
  'متغير ن = قالب"س{أ}"\n(٢)\nقالب"ج"\n-١',
  'متغير أ = ٣\nأ **= ٢\nأ //= ٢\nأ &= ٦\nأ |= ١\nأ ^= ٣\nأ <<= ٢\nأ >>= ١\nأ ??= ٥\nأ += ١',
  'متغير ق = [١]\nق[٠] **= ٢\nق[٠] ??= ٣\nأ، ب = ب، أ\nق[٠]، ق[١] = ق[١]، ق[٠]\nأ، ب، ج = ١، ٢، ٣',
  'أ، ب = ١\nأ، ٥ = ١، ٢\nأ، ب\nأ، ب = ١، ٢، ٣\nدالة ف() { أ، ب = ب، أ }\nثابت ز = ١\nز، ك = ك، ز',
  'أ&=ب|=ج^=د<<=ه>>=و??=ز**=ح//=ط<=ي>=ك<<ل>>م',
  'ثابت أ = ١\nأ = ٢\nأ += ٣\nأ++\nدالة ف() { أ = ٥ }',
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
    if (a === b) pass++; else { fail++; if (fail <= 5) { let d = 0; while (d < a.length && a[d] === b[d]) d++; console.log('اختلاف في', c.n, JSON.stringify(c.t).slice(0,300), '\n  الأصل:', a.slice(Math.max(0, d - 60), d + 200), '\n  ضاد :', b.slice(Math.max(0, d - 60), d + 200)); } }
  });
}
console.log(`pass ${pass} fail ${fail} (منها ${okCount} تحليلًا ناجحًا والباقي أخطاء متطابقة)`);
process.exit(fail ? 1 : 0);
