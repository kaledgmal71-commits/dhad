// اختبار ضاد/تعابير مقابل RegExp الحقيقي في Node (المرجع المستقل: يُستعمل هنا للاختبار فقط ولا يدخل المكتبة)
const R = require('../site/run.js');
let seed = +process.argv[3] || 12345;
const rnd = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; };
const pick = a => a[Math.floor(rnd() * a.length)];
const chance = p => rnd() < p;
// ---------- مولّد أنماط عشوائية ----------
let groups = 0;
function atom(d) {
  const r = rnd();
  if (r < 0.34) return pick(['a', 'b', 'c', 'ب', '-', '1', 'A', ' ', 'a', 'b']);
  if (r < 0.40) return '.';
  if (r < 0.50) return pick(['[abc]', '[^a]', '[a-c]', '[^b-c1]', '[a-cA-C]', '[ب1]', '[\\d-]', '[\\s\\w]', '[^\\d]', '[-a]', '[a\\-c]', '\\w', '\\W', '\\d', '\\D', '\\s', '\\S']);
  if (r < 0.55) return pick(['^', '$', '\\b', '\\B']);
  if (d <= 0) return pick(['a', 'b']);
  if (r < 0.75) { groups++; return '(' + alt(d - 1) + ')'; }
  if (r < 0.82) return '(?:' + alt(d - 1) + ')';
  if (r < 0.86) return pick(['(?=', '(?!']) + alt(d - 1) + ')';
  if (r < 0.88) return pick(['(?<=', '(?<!']) + alt(d - 1) + ')';
  if (r < 0.93 && groups > 0) return '\\' + (1 + Math.floor(rnd() * groups));
  if (r < 0.96) { groups++; return '(?<n' + groups + '>' + alt(d - 1) + ')'; }
  return pick(['a', 'b', 'c']);
}
function quant(a) {
  if (/^(\^|\$|\\b|\\B|\(\?<?[=!])/.test(a)) return a;
  if (!chance(0.4)) return a;
  const q = pick(['*', '+', '?', '{1,2}', '{2}', '{0,}', '{2,}', '{0,1}', '*', '+']);
  return a + q + (chance(0.3) ? '?' : '');
}
function seq(d) { let n = 1 + Math.floor(rnd() * 4), s = ''; for (let i = 0; i < n; i++) s += quant(atom(d)); return s; }
function alt(d) { let n = chance(0.3) ? 2 + Math.floor(rnd() * 2) : 1, p = []; for (let i = 0; i < n; i++) p.push(seq(d)); return p.join('|'); }
function genCase() {
  groups = 0;
  const pat = alt(2);
  const flags = pick(['', '', '', 'i', 'm', 's', 'im', 'is', 'ims']);
  const ns = 3 + Math.floor(rnd() * 3), subs = [];
  for (let i = 0; i < ns; i++) { let n = Math.floor(rnd() * 13), s = ''; for (let j = 0; j < n; j++) s += pick(['a', 'b', 'c', 'A', 'B', '1', ' ', '-', '\n', 'ب', '_', 'a', 'b', 'ab', '\r']); subs.push(s); }
  return { pat, flags, subs };
}
// ---------- المرجع ----------
const sg = (m) => m ? [m.index, m.index + m[0].length, ...[...m].slice(1).map(x => x === undefined ? '~' : JSON.stringify(x))].join(',') : 'N';
function ref(c, s) {
  let re;
  try { re = new RegExp(c.pat, c.flags + 'g'); } catch (e) { return 'ERR'; }
  const out = [];
  re.lastIndex = 0; out.push(sg(re.exec(s)));
  const all = []; re.lastIndex = 0; let m;
  while ((m = re.exec(s))) { all.push(m.index + '-' + (m.index + m[0].length)); if (m[0] === '') re.lastIndex++; if (all.length > 50) break; }
  out.push(all.join(' '));
  const re2 = new RegExp(c.pat, c.flags + 'g');
  out.push(JSON.stringify(s.replace(re2, '<$&|$1>')));
  out.push(JSON.stringify(s.split(new RegExp(c.pat, c.flags))));
  { const f = new RegExp('(?:' + c.pat + ')(?![^])', c.flags.replace(/[gy]/g, '') + 'y'); f.lastIndex = 0; out.push(f.test(s) ? 'T' : 'F'); }
  return out.join(' ## ');
}
// ---------- ترميز نصوص ضاد ----------
function dq(s) {
  let o = '"', parts = [];
  for (const ch of s) {
    const c = ch.codePointAt(0);
    if (ch === '\\') o += '\\\\'; else if (ch === '"') o += '\\"'; else if (ch === '\n') o += '\\n'; else if (ch === '\t') o += '\\t';
    else if (c < 32 || c === 0x2028 || c === 0x2029 || c === 0xa0 || c === 0xfeff) { o += '" + حرف(' + c + ') + "'; }
    else o += ch;
  }
  return o + '"';
}
const DH_SIG = `
دالة _ج(م) {
    إذا (م == لاشيء) { ارجع "N" }
    متغير ق = [نص_برمجي(م["بداية"])، نص_برمجي(م["نهاية"])]
    من_أجل (ك في م["مجموعات"]) {
        إذا (ك == لاشيء) { أضف(ق، "~") } وإلا { أضف(ق، ج.اكتب(ك)) }
    }
    ارجع اربط(ق، ",")
}
`;
function runBatch(cases) {
  let src = 'متغير ت = استورد("ضاد/تعابير")\nمتغير ج = استورد("ضاد/جسون")\n' + DH_SIG + 'دالة جرّب(ن، أع، قائمة) {\n    متغير ر = لاشيء\n    حاول { ر = ت.ابنِ(ن، أع) } التقط (خ) { اطبع("ERR"); ارجع لاشيء }\n    من_أجل (س في قائمة) {\n        متغير خ١ = []\n        أضف(خ١، _ج(ت.ابحث(ر، س)))\n        متغير كل = []\n        من_أجل (م في ت.ابحث_الكل(ر، س)) { أضف(كل، نص_برمجي(م["بداية"]) + "-" + نص_برمجي(م["نهاية"])) }\n        أضف(خ١، اربط(كل، " "))\n        أضف(خ١، ج.اكتب(ت.استبدل_الكل(ر، س، "<$&|$1>")))\n        أضف(خ١، ج.اكتب(ت.افصل(ر، س)))\n        إذا (ت.يطابق_كله(ر، س)) { أضف(خ١، "T") } وإلا { أضف(خ١، "F") }\n        اطبع(اربط(خ١، " ## "))\n    }\n}\n';
  cases.forEach(c => { src += 'جرّب(' + dq(c.pat) + '، ' + dq(c.flags) + '، [' + c.subs.map(dq).join('، ') + '])\n'; });
  return R.run(src);
}

let pass = 0, fail = 0;
const fails = [];
function check(cases) {
  const r = runBatch(cases);
  if (!r.ok) { fail += cases.length; fails.push('تعطّل الدفعة: ' + r.error + ' | آخر مخرجات: ' + r.out.slice(-1)); return; }
  let li = 0;
  for (const c of cases) {
    const isErr = ref(c, c.subs[0]) === 'ERR';
    const n = isErr ? 1 : c.subs.length;
    const got = r.out.slice(li, li + n); li += n;
    let ok = true, msg = '';
    if (isErr) { if (got[0] !== 'ERR') { ok = false; msg = '/' + c.pat + '/' + c.flags + ' كان يجب أن يفشل البناء، حصلنا على ' + got[0]; } }
    else for (let k = 0; k < n; k++) { const want = ref(c, c.subs[k]); if (got[k] !== want) { ok = false; msg = '/' + c.pat + '/' + c.flags + ' على ' + JSON.stringify(c.subs[k]) + '\n   المرجع: ' + want + '\n   ضاد:   ' + got[k]; break; } }
    if (ok) pass++; else { fail++; fails.push(msg); }
  }
  if (li !== r.out.length) { fail++; fails.push('عدد أسطر المخرجات غير متوقع: ' + r.out.length + ' بدل ' + li); }
}
const N = +process.argv[2] || 1500;
const handwritten = [
  ['a', '', ['', 'a', 'baab']], ['', '', ['', 'abc']], ['a*', '', ['baaac', '', 'aaa']], ['a+?', '', ['aaa']], ['(a)|b', '', ['b', 'a']],
  ['^\\s*\\d+\\s*[-–]\\s*(.{3,90})$', '', ['  12 - أبان بن تغلب', '12-ab', '7 - abc']], ['(\\d+)\\.(\\d+)', '', ['v 3.14 and 2.71']],
  ['(a+)+b', '', ['aaaaaaaaaaaaaaab', 'aaaaaaaaaaac']], ['(?:a|ab)(?:c|bcd)', '', ['abcd']], ['(a*)*', '', ['b', 'aa']], ['(a*)+', '', ['b']], ['(z)((a+)?(b+)?(c))*', '', ['zaacbbbcac']],
  ['\\bab\\b', '', ['ab ab', 'cab ab']], ['[^]', '', ['a']], ['x{2,3}', '', ['xxxx']], ['a{,2}', '', ['a{,2}']], ['a{2', '', ['a{2']], ['\\u0061', '', ['a']], ['\\x61+', '', ['aaa']], ['\\cJ', '', ['\n']],
  ['(?<y>\\d{4})-(?<m>\\d\\d)', '', ['on 2026-10 ok']], ['(a)\\1', '', ['aa', 'ab']], ['(a)\\1', 'i', ['aA']], ['\\k<x>(?<x>a)', '', ['a']], ['(?<=a)b', '', ['ab', 'cb']], ['(?<!a)b', '', ['ab', 'cb']], ['(?=a)a', '', ['a']],
  ['^a', 'm', ['b\na']], ['a$', 'm', ['a\nb']], ['.', '', ['\n']], ['.', 's', ['\n']], ['[a-z]+', 'i', ['ABCdef']], ['\\w+', '', ['héllo wörld']], ['[\\u0600-\\u06ff]+', '', ['abc مرحبا def']], ['\\1(a)', '', ['a']], ['a|', '', ['b']]
].map(([pat, flags, subs]) => ({ pat, flags, subs }));
check(handwritten);
for (let i = 0; i < N; i += 100) { const b = []; for (let j = 0; j < Math.min(100, N - i); j++) b.push(genCase()); check(b); }
console.log('pass', pass, 'fail', fail);
fails.slice(0, 12).forEach(f => console.log(f));
process.exit(fail ? 1 : 0);
