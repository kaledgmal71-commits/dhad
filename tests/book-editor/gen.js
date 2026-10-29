// مولّد نصوص كتب اصطناعية تشبه نواتج OCR لكتاب في التراجم، لاختبار التحليل الآلي تفاضليًا
module.exports = function makeGen(seed0) {
  let seed = seed0;
  const rnd = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; };
  const pick = a => a[Math.floor(rnd() * a.length)];
  const chance = p => rnd() < p;
  const ri = (a, b) => a + Math.floor(rnd() * (b - a + 1));
  const first = ['أبان', 'محمد', 'أحمد', 'يحيى', 'عبد الله', 'إبراهيم', 'سعيد', 'خالد', 'عمر', 'الحسن', 'علي', 'مالك', 'أبو بكر', 'ابن أبي ليلى', 'عثمان', 'سفيان', 'جابر', 'الحارث'];
  const mid = ['بن', 'بن', 'بن', 'ابن', 'أبو', 'أبي', 'ابو'];
  const last = ['تغلب', 'عياش', 'أبي', 'مسلم', 'حيان', 'عبد الرحمن', 'سعد', 'عمرو', 'زيد', 'عطية', 'يزيد', 'الأشعث', 'المنذر'];
  const words = ['الكتاب', 'ذكر', 'رجل', 'الحديث', 'كثير', 'وهم', 'الخطأ', 'عن', 'الثقات', 'يخالف', 'الأثبات', 'أهل', 'العلم', 'قوم', 'البصرة', 'الكوفة', 'مات', 'سنة', 'مائة', 'روى', 'عنه', 'شيخ', 'سمع', 'من', 'في', 'على', 'هذا', 'ما', 'لا', 'ثم', 'قد', 'كان', 'وكان', 'له', 'أخبار', 'منكرة', 'لا يجوز', 'الاحتجاج', 'به', 'إذا', 'انفرد', 'بالأخبار'];
  const nxs = ['من أهل البصرة', 'كنيته أبو محمد', 'يروي عن أنس', 'يروى عن الحسن', 'كان يخطئ', 'كانت له أخبار', 'مولى بني هاشم', 'بصري', 'كوفي', 'مدني', 'شيخ يروي عن', 'ممن يقلب الأخبار', 'وهو الذي روى', 'أبو عبد الله', 'ابن عم', 'قاضي الكوفة', 'واسطي', 'من ولد عمرو', 'من تيم', 'والد فلان'];
  const isnads = ['حدثنا', 'أخبرنا', 'أخبرني', 'حدثني', 'سمعت', 'أنبأنا', 'وحدثنا', 'وأخبرنا', 'حدثناه'];
  const imams = ['يحيى بن معين', 'أحمد بن حنبل', 'شعبة', 'مالك', 'ابن المبارك', 'البخاري', 'أبا زرعة', 'الدارقطني', 'ابن عدي', 'عفان', 'أبو حاتم', 'ابن حبان', 'وكيع', 'النسائي'];
  const jarh = ['كذاب', 'ضعيف', 'ثقة', 'ليس بشيء', 'متروك', 'منكر الحديث', 'لا بأس به', 'صدوق', 'لين', 'يضع', 'لا يحتج به', 'ساقط'];
  const foot = ['تذكرة الحفاظ', 'لسان الميزان', 'الجرح والتعديل', 'تهذيب الكمال', 'ميزان الاعتدال', 'للعقيلي', 'سؤالات', 'التاريخ الكبير', 'تاريخ بغداد'];
  const digitsA = '٠١٢٣٤٥٦٧٨٩', digitsP = '۰۱۲۳۴۵۶۷۸۹';
  const num = () => { const n = ri(1, 9999), s = String(n); const t = rnd(); return t < .5 ? s : t < .8 ? [...s].map(d => digitsA[d]).join('') : [...s].map(d => digitsP[d]).join(''); };
  const diac = s => chance(.12) ? [...s].map(c => chance(.3) ? c + pick(['َ', 'ُ', 'ِ', 'ّ', 'ْ', 'ـ']) : c).join('') : s;
  const noise = s => { if (!chance(.2)) return s; return s.split(' ').map(w => chance(.08) ? w + pick(['»', '|', '“', '”', '*', '#', '©', '،', '.', ':', '؛']) : w).join(' '); };
  const name = () => { let n = pick(first); for (let i = ri(0, 2); i >= 0; i--) n += ' ' + pick(mid) + ' ' + pick(last); return n; };
  const sentence = (n) => { const w = []; for (let i = 0; i < n; i++) w.push(pick(words)); return w.join(' '); };
  const salawat = () => pick(['رسول الله ﷺ', 'النبي ﷺ', 'رسول الله كلة', 'النبي كية', 'النبى كل', 'رسول الله صلى الله عليه وسلم', 'النبي كفة']);
  const isnadLine = () => {
    let s = pick(isnads) + ' ' + name() + (chance(.5) ? ' قال ' : ': ') + pick(isnads) + ' ' + name() + ' عن ' + name();
    if (chance(.6)) s += ' عن ' + salawat() + ' قال: ' + sentence(ri(3, 12));
    else if (chance(.5)) s += ' قال: ' + sentence(ri(3, 10));
    if (chance(.3)) s += '.';
    return s;
  };
  const jarhLine = () => pick(['قال ', 'سمعت ', 'يقول ']) + pick(imams) + (chance(.5) ? ': ' : ' ') + pick(['سمعت يحيى بن معين يقول: ', 'قال: كان ', '', '']) + pick(jarh) + (chance(.3) ? '.' : '');
  const headLine = () => {
    const t = rnd();
    if (t < .45) return num() + ' - ' + diac(name());
    if (t < .6) return num() + ' ' + name();
    if (t < .75) return name();
    if (t < .82) return pick(['-', '– ', '— ']) + name() + pick(['”', '"', '*', '؟']) + ' ' + sentence(ri(2, 6));
    if (t < .88) return pick(['|', '/', '+', '']) + num() + pick(['', '|']) + ' ' + name();
    if (t < .94) return name() + pick(['.', '،', ':']) + ' ' + sentence(2);
    return pick(first) + ' ' + sentence(ri(1, 3));
  };
  const bodyLine = () => {
    const t = rnd();
    if (t < .17) return pick(nxs) + ' ' + sentence(ri(1, 6));
    if (t < .42) return isnadLine();
    if (t < .52) return jarhLine();
    if (t < .60) return sentence(ri(3, 9)) + '.';
    if (t < .66) return pick(['(', '[', ')', '©']) + pick(['', ' ', '٣', '12', '(']) + ' ' + pick(foot) + ' ' + pick(['', num() + '/' + num(), '(' + num() + '/' + num() + ')']);
    if (t < .70) return num();
    if (t < .73) return pick(['', ' ', '   ', '‏', '‫']);
    if (t < .77) return sentence(ri(0, 2));
    if (t < .80) return pick(['ر', 'م', '—', '* * *', '٣٤']);
    return sentence(ri(5, 14));
  };
  const line = () => {
    let l = chance(.12) ? headLine() : bodyLine();
    l = noise(l);
    if (chance(.04)) l += pick(['‎', '‏', '؜', ' ']);
    if (chance(.03)) l = '  ' + l;
    if (chance(.02)) l = '‏' + l;
    return l;
  };
  // كتاب: عدة تراجم، كل ترجمة عنوان ثم أسطر، مع مقدمة وحواشٍ في نهاية الصفحات
  const book = () => {
    const lines = [];
    if (chance(.6)) for (let i = ri(1, 5); i > 0; i--) lines.push(sentence(ri(4, 10)));
    const nt = ri(1, 7);
    for (let t = 0; t < nt; t++) {
      lines.push(chance(.7) ? num() + ' - ' + name() : headLine());
      lines.push(chance(.8) ? pick(nxs) + ' ' + sentence(ri(0, 4)) : bodyLine());
      for (let i = ri(2, 14); i > 0; i--) lines.push(chance(.35) ? line() : (chance(.5) ? isnadLine() : (chance(.5) ? jarhLine() : bodyLine())));
    }
    const pages = [];
    let i = 0;
    while (i < lines.length) { const n = ri(5, 30); let pg = lines.slice(i, i + n); if (chance(.6)) { for (let k = ri(1, 3); k > 0; k--) pg.push(pick(['(' + ri(1, 9) + ') ', '(', '© ', '[ ']) + pick(foot) + ' ' + ri(1, 9) + '/' + ri(10, 99)); } pages.push(pg.join('\n')); i += n; }
    if (!pages.length) pages.push('');
    return pages;
  };
  const opts = () => ({ مقدمة: chance(.5), حواشي: chance(.5), تنظيف: chance(.5), صفحتان: chance(.5) });
  return { book, opts, rnd };
};
