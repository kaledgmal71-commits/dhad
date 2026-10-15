// شروحات ضاد المصوّرة: صفحة واحدة لكل موضوع بنمط ورقة الدفتر. كل شيفرة تُنفَّذ بالمحرك الحقيقي أثناء البناء، وكل جدول يحسب نتائجه منه.
const G = require('./gen.js');
const { emit, esc, AR, crumbs, hl, R, problems } = G;
const sheets = require('./content/sheets.js');
const lessons = require('./content/lessons.js');

const evalOut = (expr, where) => { const r = R.run('اطبع(' + expr + ')'); if (!r.ok) { problems.push(`${where}: ${expr} → ${r.error}`); return '؟'; } return r.out.join(' '); };
// رموز المقارنة داخل نص عربي تنعكس بصريًا (> تظهر <) فنعزلها لتظهر كما تُكتب
const opfix = h => h.replace(/(<[^>]*>)|((?:&lt;|&gt;|[=!])+)/g, (m, tag, op) => tag ? tag : `<span class="ltr">${op}</span>`);
const hlx = c => opfix(hl(c));
const PAL = ['p1', 'p2', 'p3', 'p4', 'p5', 'p6'];

const ART = {
  logo: `<svg viewBox="0 0 120 120" class="art" aria-hidden="true"><rect x="8" y="8" width="104" height="104" rx="26" fill="#9a6b12"/><rect x="8" y="8" width="104" height="104" rx="26" fill="none" stroke="#6f4b08" stroke-width="3"/><text x="60" y="88" font-size="76" font-weight="800" text-anchor="middle" fill="#fff" font-family="Cairo,sans-serif">ض</text></svg>`,
  box: `<svg viewBox="0 0 260 150" class="art" aria-hidden="true"><text x="130" y="18" text-anchor="middle" class="at">القيمة ٢٥</text><path d="M130 26v34" stroke="#2f5fb3" stroke-width="2.5" fill="none"/><path d="M122 52l8 10 8-10" stroke="#2f5fb3" stroke-width="2.5" fill="none"/><polygon points="60,70 200,70 230,56 90,56" fill="#cfe0f7" stroke="#2f5fb3" stroke-width="2.5"/><rect x="60" y="70" width="140" height="66" fill="#8db4ea" stroke="#2f5fb3" stroke-width="2.5"/><polygon points="200,70 230,56 230,122 200,136" fill="#6f9de0" stroke="#2f5fb3" stroke-width="2.5"/><rect x="95" y="88" width="70" height="30" rx="4" fill="#fff" stroke="#2f5fb3" stroke-width="2"/><text x="130" y="110" text-anchor="middle" class="at big">السعر</text></svg>`,
  calc: `<svg viewBox="0 0 150 170" class="art" aria-hidden="true"><rect x="14" y="8" width="122" height="154" rx="14" fill="#6f9de0" stroke="#2f5fb3" stroke-width="3"/><rect x="26" y="20" width="98" height="34" rx="6" fill="#d6e8fa" stroke="#2f5fb3" stroke-width="2"/>${[0, 1, 2, 3].map(r => [0, 1, 2, 3].map(c => `<rect x="${28 + c * 24}" y="${66 + r * 22}" width="18" height="15" rx="3.5" fill="${['#f3b6c0', '#f6dd9a', '#b8e2b5', '#fff'][(r + c) % 4]}" stroke="#2f5fb3" stroke-width="1.5"/>`).join('')).join('')}</svg>`,
  flow: `<svg viewBox="0 0 40 34" class="arr" aria-hidden="true"><path d="M20 2v24" stroke="#2f5fb3" stroke-width="2.5" fill="none"/><path d="M11 18l9 11 9-11" stroke="#2f5fb3" stroke-width="2.5" fill="none" stroke-linejoin="round"/></svg>`,
  decide: `<svg viewBox="0 0 280 170" class="art" aria-hidden="true"><polygon points="140,8 220,52 140,96 60,52" fill="#d6e8fa" stroke="#2f5fb3" stroke-width="2.5"/><text x="140" y="57" text-anchor="middle" class="at">العمر ≥ ١٨ ؟</text><path d="M80 72L40 112" stroke="#2f5fb3" stroke-width="2.5" fill="none"/><path d="M200 72L240 112" stroke="#2f5fb3" stroke-width="2.5" fill="none"/><text x="52" y="88" class="at" font-size="13">نعم</text><text x="214" y="88" class="at" font-size="13">لا</text><rect x="6" y="112" width="88" height="40" rx="8" fill="#bfe6b9" stroke="#2f5fb3" stroke-width="2"/><text x="50" y="138" text-anchor="middle" class="at">بالغ</text><rect x="186" y="112" width="88" height="40" rx="8" fill="#f6bcc6" stroke="#2f5fb3" stroke-width="2"/><text x="230" y="138" text-anchor="middle" class="at">قاصر</text></svg>`,
  cycle: `<svg viewBox="0 0 150 130" class="art" aria-hidden="true"><path d="M110 40a46 40 0 1 0 8 40" fill="none" stroke="#2f5fb3" stroke-width="5" stroke-linecap="round"/><path d="M96 34l18 8 4-20" fill="none" stroke="#2f5fb3" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/><text x="75" y="72" text-anchor="middle" class="at big">كرّر</text></svg>`,
  i_calc: `<svg viewBox="0 0 64 64"><rect x="14" y="6" width="36" height="52" rx="6" fill="#d6e8fa" stroke="#2f5fb3" stroke-width="3"/><rect x="20" y="12" width="24" height="10" rx="2" fill="#fff" stroke="#2f5fb3" stroke-width="2"/><g fill="#2f5fb3"><circle cx="23" cy="31" r="2.6"/><circle cx="32" cy="31" r="2.6"/><circle cx="41" cy="31" r="2.6"/><circle cx="23" cy="41" r="2.6"/><circle cx="32" cy="41" r="2.6"/><circle cx="41" cy="41" r="2.6"/><circle cx="23" cy="50" r="2.6"/><circle cx="32" cy="50" r="2.6"/><circle cx="41" cy="50" r="2.6"/></g></svg>`,
  i_text: `<svg viewBox="0 0 64 64"><rect x="10" y="8" width="44" height="48" rx="6" fill="#fff" stroke="#2f5fb3" stroke-width="3"/><path d="M18 20h28M18 30h28M18 40h18" stroke="#2f5fb3" stroke-width="3.5" stroke-linecap="round"/></svg>`,
  i_list: `<svg viewBox="0 0 64 64"><g fill="#d6e8fa" stroke="#2f5fb3" stroke-width="3"><rect x="8" y="12" width="12" height="10" rx="2"/><rect x="8" y="27" width="12" height="10" rx="2"/><rect x="8" y="42" width="12" height="10" rx="2"/></g><path d="M28 17h28M28 32h28M28 47h28" stroke="#2f5fb3" stroke-width="3.5" stroke-linecap="round"/></svg>`,
  i_win: `<svg viewBox="0 0 64 64"><rect x="6" y="10" width="52" height="44" rx="6" fill="#fff" stroke="#2f5fb3" stroke-width="3"/><path d="M6 22h52" stroke="#2f5fb3" stroke-width="3"/><circle cx="14" cy="16" r="2" fill="#e8627a"/><circle cx="21" cy="16" r="2" fill="#f0b43c"/><circle cx="28" cy="16" r="2" fill="#4fb36a"/><rect x="14" y="30" width="20" height="16" rx="3" fill="#d6e8fa" stroke="#2f5fb3" stroke-width="2.5"/></svg>`,
  i_shield: `<svg viewBox="0 0 64 64"><path d="M32 6l20 8v16c0 14-9 22-20 28C21 52 12 44 12 30V14z" fill="#d6e8fa" stroke="#2f5fb3" stroke-width="3" stroke-linejoin="round"/><path d="M22 32l8 8 13-15" fill="none" stroke="#2f5fb3" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  i_book: `<svg viewBox="0 0 64 64"><path d="M32 14c-6-5-16-6-24-4v38c8-2 18-1 24 4 6-5 16-6 24-4V10c-8-2-18-1-24 4z" fill="#fff" stroke="#2f5fb3" stroke-width="3" stroke-linejoin="round"/><path d="M32 14v38" stroke="#2f5fb3" stroke-width="3"/><path d="M14 22c4-1 8-1 12 1M14 31c4-1 8-1 12 1M38 23c4-2 8-2 12-1M38 32c4-2 8-2 12-1" stroke="#2f5fb3" stroke-width="2.5" fill="none" stroke-linecap="round"/></svg>`,
};

function win(file, src, where, { hideRun = false, err = false } = {}) {
  const r = R.run(src);
  if (err ? r.ok : !r.ok) problems.push(`${where}: ${err ? 'كان يُفترض أن يفشل هذا المثال' : r.error}`);
  const out = esc(r.out.concat(r.ok ? [] : ['✗ ' + r.error]).join('\n'));
  return `<div class="codebox win"><div class="wbar"><i class="d1"></i><i class="d2"></i><i class="d3"></i><b>${esc(file)}</b>${hideRun ? '' : '<button data-run>▶ شغّل</button>'}<a href="/editor/?code=${encodeURIComponent(src)}">افتح في المحرر</a></div><pre>${hlx(src)}</pre><div class="out${err ? ' err' : ''}" data-label="${err ? 'الخطأ' : 'النتيجة'}">${out}</div></div>`;
}

function part(p, where) {
  switch (p.t) {
    case 'p': return `<p>${p.x}</p>`;
    case 'ul': return `<ul class="sul">${p.x.map(i => `<li>${i}</li>`).join('')}</ul>`;
    case 'ok': return `<div class="sok">${p.x.map(i => `<div><span>✓</span>${i}</div>`).join('')}</div>`;
    case 'art': return `<div class="sart ${p.cls || ''}">${ART[p.x]}${p.cap ? `<span class="cap">${p.cap}</span>` : ''}</div>`;
    case 'code': return win(p.file, p.src, where, { err: !!p.err });
    case 'note': return `<div class="snote"><b>${p.title || 'ملاحظة'}</b>${p.x}</div>`;
    case 'names': { // أسماء صحيحة وغير صحيحة: يتحقق البناء من كل واحد منها فعلًا
      p.good.forEach(n => { const r = R.run(`متغير ${n} = ١\nاطبع(${n})`); if (!r.ok) problems.push(`${where}: الاسم ${n} كان يُفترض صحيحًا: ${r.error}`); });
      p.bad.forEach(n => { const r = R.run(`متغير ${n} = ١`); if (r.ok) problems.push(`${where}: الاسم ${n} كان يُفترض خاطئًا`); });
      return `<div class="snames"><div class="g"><b>أمثلة صحيحة:</b><div>${p.good.map(n => `<code>${esc(n)}</code>`).join('')}</div></div><div class="b"><b>أمثلة غير صحيحة:</b><div>${p.bad.map(n => `<code>${esc(n)}</code>`).join('')}</div></div></div>`;
    }
    case 'table': { // rows: [..خلايا نصية، تعبير] والعمود الأخير يُحسب بالمحرك. badge: رقم العمود الملوّن
      const head = p.head.map(h => `<th>${h}</th>`).join('');
      const body = p.rows.map((row, ri) => {
        const cells = row.slice(0, -1).map((c, ci) => ci === p.badge ? `<td><span class="badge ${PAL[ri % PAL.length]}">${esc(c)}</span></td>` : (ci === p.codeCol ? `<td><code>${opfix(esc(c))}</code></td>` : `<td>${opfix(c)}</td>`));
        const expr = row[row.length - 1]; let res = evalOut(p.show ? p.show(expr) : expr, where);
        if (p.expect && p.expect[ri] !== undefined && p.expect[ri] !== res) problems.push(`${where}: توقّعت «${p.expect[ri]}» وحصلت على «${res}» للتعبير ${expr}`);
        return `<tr>${cells.join('')}<td><span class="res">${esc(res)}</span></td></tr>`;
      }).join('');
      return `<div class="tscroll"><table class="stable"><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table></div>`;
    }
    case 'plain': return `<div class="tscroll"><table class="stable"><thead><tr>${p.head.map(h => `<th>${h}</th>`).join('')}</tr></thead><tbody>${p.rows.map((r, ri) => `<tr>${r.map((c, ci) => ci === p.badge ? `<td><span class="badge ${PAL[ri % PAL.length]}">${c}</span></td>` : `<td>${opfix(c)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
    case 'typeTable': { // الاسم في العمود الأول يجب أن يطابق ما تُرجعه نوع()
      const body = p.rows.map(([name, desc, ex], ri) => { const t = evalOut(`نوع(${ex})`, where); if (t !== name) problems.push(`${where}: نوع(${ex}) يعيد «${t}» لا «${name}»`);
        return `<tr><td><span class="badge ${PAL[ri % PAL.length]}">${name}</span></td><td>${desc}</td><td><code>${opfix(esc(ex))}</code></td></tr>`; }).join('');
      return `<div class="tscroll"><table class="stable"><thead><tr><th>النوع</th><th>الوصف</th><th>مثال</th></tr></thead><tbody>${body}</tbody></table></div>`;
    }
    case 'anat': {
      const r = R.run(p.src); if (!r.ok) problems.push(`${where}: ${r.error}`);
      return `<div class="sanat"><div class="top"><code>${hlx(p.src)}</code></div><div class="arrs">${ART.flow}${ART.flow}</div><div class="parts" style="--n:${p.parts.length}">${p.parts.map(([a, b]) => `<div><code>${esc(a)}</code><span>${b}</span></div>`).join('')}</div></div>`;
    }
    case 'tiles': return `<div class="stiles">${p.x.map(([ic, a, b]) => `<div>${ART[ic]}<b>${a}</b><span>${b}</span></div>`).join('')}</div>`;
    case 'practice': return `<ol class="sprac">${p.x.map(i => `<li>${i}</li>`).join('')}</ol>`;
    default: throw new Error('نوع غير معروف ' + p.t);
  }
}

function block(b, n, where) {
  const span = b.span || Math.floor(12 / n);
  return `<section class="sb${b.cls ? ' ' + b.cls : ''}" style="--sp:${span}"><h2 class="sh">${b.h}</h2>${b.c.map(p => part(p, where + ':' + b.h)).join('')}</section>`;
}

const total = sheets.length;
sheets.forEach((s, i) => {
  const prev = sheets[i - 1], next = sheets[i + 1], num = AR(String(i + 1).padStart(2, '0'));
  const les = s.lesson && lessons.find(l => l.id === s.lesson);
  const rows = s.rows.map(row => `<div class="srow">${row.map(b => block(b, row.length, 'explain:' + s.id)).join('')}</div>`).join('');
  const sum = `<section class="sb sum" style="--sp:6"><h2 class="sh">ملخص الشرح:</h2><ul class="sul">${s.summary.map(x => `<li>${x}</li>`).join('')}</ul></section>`;
  const nx = s.next ? `<section class="sb nxt" style="--sp:6"><h2 class="sh">الشرح القادم: ${s.next.short || s.next.title}</h2><ul class="sul">${s.next.intro.map(x => `<li>${x}</li>`).join('')}</ul></section>`
    : `<section class="sb nxt" style="--sp:6"><h2 class="sh">بعد ذلك:</h2><ul class="sul"><li>جرّب التحديات داخل <a href="/learn/">الدروس التفاعلية</a>.</li><li>ارجع إلى <a href="/docs/">الدليل</a> و<a href="/dictionary/">المعجم</a> كلما احتجت.</li></ul></section>`;
  emit(`/explain/${s.id}/`, { title: `${s.title} — شروحات ضاد ${num}`, desc: s.desc, bodyAttr: `data-explain="${s.id}"`,
    body: `${crumbs(['/explain/', 'شروحات'], [null, s.title])}<div class="progress"><i style="width:${Math.round((i + 1) / total * 100)}%"></i></div>
<article class="ssheet"><div class="stitle"># ضاد من الصفر | شروحات مصوّرة</div><div class="stitle2">الشرح ${s.ord || num}: ${s.title}</div>${rows}<div class="srow">${sum}${nx}</div>
${les ? `<div class="slink">تريد أن تتدرّب؟ <a class="btn" href="/learn/${les.id}/">افتح الدرس التفاعلي: ${les.title} ←</a></div>` : ''}</article>
<div class="pager">${prev ? `<a class="btn alt" href="/explain/${prev.id}/">→ ${prev.short || prev.title}</a>` : '<span></span>'}${next ? `<a class="btn" href="/explain/${next.id}/">${next.short || next.title} ←</a>` : `<a class="btn" href="/learn/">الدروس التفاعلية ←</a>`}</div>` });
});

emit('/explain/', { title: 'شروحات ضاد', desc: 'شروحات مصوّرة بصفحة واحدة لكل موضوع: فكرة واضحة، جداول، أمثلة منفّذة ونتائجها، وملخص.',
  body: `${crumbs([null, 'شروحات'])}<h1>شروحات ضاد</h1><p class="lead">ورقة واحدة مصوّرة لكل موضوع: تقرأ الفكرة، تشاهد الجدول والمثال ونتيجته الحقيقية، ثم تنتقل إلى الشرح التالي. إذا أردت التدرّب بنفسك فالتحديات في <a href="/learn/">الدروس التفاعلية</a>.</p>
<section class="sec"><div class="grid lessongrid">${sheets.map((s, i) => `<a class="card" href="/explain/${s.id}/"><div class="ic">${s.icon}</div><div class="n">الشرح ${AR(String(i + 1).padStart(2, '0'))}</div><h3>${s.title}</h3><p>${s.desc}</p></a>`).join('')}</div></section>` });
