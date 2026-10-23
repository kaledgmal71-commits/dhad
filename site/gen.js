// مولّد موقع ضاد الثابت. الاستعمال: node site/gen.js  (بعد بناء المحرر في dist/)
const fs = require('fs'), path = require('path');
const R = require('./run.js');
const ROOT = path.join(__dirname, '..'), DIST = path.join(ROOT, 'dist');
const SITE = process.env.SITE_URL || 'https://dhad-lang-beta.vercel.app';
const lessons = require('./content/lessons.js'), dict = require('./content/dict.js'), examples = require('./content/examples.js');
const { docs, roadmap, articles } = require('./content/pages.js');
const AR = n => String(n).replace(/\d/g, d => '٠١٢٣٤٥٦٧٨٩'[d]);
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const problems = [];
function write(rel, data) { const p = path.join(DIST, rel); fs.mkdirSync(path.dirname(p), { recursive: true }); fs.writeFileSync(p, data); }

// ---------- تلوين الشيفرة ----------
const KW = new Set(Object.keys(R.api.KEYWORDS)), BI = new Set(dict.map(d => d.w));
function hl(code) {
  let out = '', i = 0; const n = code.length;
  const isId = c => /[\p{L}\p{N}_]/u.test(c);
  while (i < n) {
    const c = code[i];
    if (c === '#') { let j = code.indexOf('\n', i); if (j < 0) j = n; out += `<span class="hl-c">${esc(code.slice(i, j))}</span>`; i = j; }
    else if (c === '"') { let j = i + 1; while (j < n && code[j] !== '"') { if (code[j] === '\\') j++; j++; } j = Math.min(j + 1, n); out += `<span class="hl-s">${esc(code.slice(i, j))}</span>`; i = j; }
    else if (/[0-9٠-٩]/.test(c)) { let j = i; while (j < n && /[0-9٠-٩.]/.test(code[j])) j++; out += `<span class="hl-n">${esc(code.slice(i, j))}</span>`; i = j; }
    else if (isId(c)) { let j = i; while (j < n && isId(code[j])) j++; const w = code.slice(i, j); out += KW.has(w) ? `<span class="hl-k">${esc(w)}</span>` : (BI.has(w) ? `<span class="hl-f">${esc(w)}</span>` : esc(w)); i = j; }
    else { out += esc(c); i++; }
  }
  return out;
}
// ---------- تنفيذ حقيقي ----------
function exec(code, where, { expectError = false, browser = false, files = null } = {}) {
  if (browser) return { out: [], ok: true, browser: true };
  const r = R.run(code, files ? { files } : {});
  if (!r.ok && !expectError) problems.push(`${where}: ${r.error}`);
  if (r.ok && expectError) problems.push(`${where}: كان يُتوقع خطأ`);
  return r;
}
function codebox(code, where, opt = {}) {
  const r = exec(code, where, opt); let o = '';
  if (r.browser) o = `<div class="out">يعمل داخل المحرر (يحتاج صفحة المعاينة).</div>`;
  else o = `<div class="out${r.ok ? '' : ' err'}">${esc(r.out.join('\n') + (r.ok ? '' : (r.out.length ? '\n' : '') + '✗ ' + r.error))}</div>`;
  if (opt.files) { // مثال متعدد الملفات: تُعرض الملفات الإضافية أولًا، ولا يُشغَّل في المتصفح (لا ملفات هناك)
    const extra = Object.entries(opt.files).map(([n, s]) => `<div class="codebox" data-multi><div class="bar"><span>${esc(n)}</span></div><pre>${hl(s)}</pre></div>`).join('');
    return extra + `<div class="codebox" data-multi><div class="bar"><span>ضاد</span></div><pre>${hl(code)}</pre>${o}</div>`;
  }
  return `<div class="codebox"><div class="bar"><span>ضاد</span>${r.browser ? '' : '<button data-run>▶ شغّل</button>'}<a href="/editor/?code=${encodeURIComponent(code)}">افتح في المحرر</a></div><pre>${hl(code)}</pre>${o}</div>`;
}
// ---------- القالب ----------
const NAV = [['/learn/', 'تعلّم'], ['/explain/', 'شروحات'], ['/docs/', 'الدليل'], ['/dictionary/', 'المعجم'], ['/examples/', 'أمثلة'], ['/ai/', 'الذكاء الاصطناعي'], ['/community/', 'المجتمع'], ['/articles/', 'مقالات'], ['/limits/', 'الحدود'], ['/roadmap/', 'الخارطة']];
const FAV = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Crect width='100' height='100' rx='18' fill='%239a6b12'/%3E%3Ctext x='50' y='70' font-size='62' text-anchor='middle' fill='white'%3Eض%3C/text%3E%3C/svg%3E";
function page({ url, title, desc, body, bodyAttr = '', schema = '' }) {
  const full = title === 'ضاد' ? 'ضاد — لغة برمجة عربية مجانية' : title + ' — ضاد';
  const nav = NAV.map(([h, t]) => `<a href="${h}"${url.startsWith(h) ? ' class="on"' : ''}>${t}</a>`).join('');
  return `<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(full)}</title><meta name="description" content="${esc(desc)}"><link rel="canonical" href="${SITE}${url}"><link rel="icon" href="${FAV}">
<meta property="og:title" content="${esc(full)}"><meta property="og:description" content="${esc(desc)}"><meta property="og:type" content="website"><meta property="og:locale" content="ar_AR">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;500;600;700;800&display=swap" rel="stylesheet">
<link rel="stylesheet" href="/assets/site.css">${schema}</head><body ${bodyAttr}>
<header class="top"><div class="wrap"><a class="logo" href="/"><i>ض</i>ضاد</a><nav class="main">${nav}</nav><button id="theme" class="themebtn" title="السمة" aria-label="تبديل السمة">◐</button><a class="btn" href="/editor/">افتح المحرر</a></div></header>
<main><div class="wrap">${body}</div></main>
<footer class="bot"><div class="wrap"><div class="cols"><div><h4>ضاد</h4><p>لغة برمجة عربية مجانية ومفتوحة للجميع، تكريمًا للخوارزمي. هدفها تيسير العلم وتقريب البرمجة والذكاء الاصطناعي من الجميع.</p><p class="visits" hidden>عدد الزائرين: <b id="vc"></b></p></div>
<div><h4>تعلّم</h4><a href="/learn/">ضاد من الصفر</a><a href="/docs/">الدليل</a><a href="/dictionary/">المعجم</a><a href="/examples/">أمثلة</a></div>
<div><h4>استكشف</h4><a href="/editor/">المحرر</a><a href="/ai/">الذكاء الاصطناعي</a><a href="/articles/">مقالات</a><a href="/roadmap/">الخارطة</a></div>
<div><h4>شارك</h4><a href="/community/">المجتمع</a><a href="/limits/">ما هي ضاد وما ليست</a><a href="/about/">عن المشروع</a><a href="/llms.txt">llms.txt</a></div></div></div></footer>
<script src="/assets/engine.js"></script><script src="/assets/site.js"></script></body></html>`;
}
const crumbs = (...a) => `<div class="crumbs"><a href="/">الرئيسية</a>${a.map(([h, t]) => ' ‹ ' + (h ? `<a href="${h}">${t}</a>` : t)).join('')}</div>`;
const urls = [];
function emit(url, opt) { urls.push(url); write(url.replace(/^\//, '') + 'index.html', page({ url, ...opt })); }

// ---------- محرك المتصفح ----------
{
  const src = ['front.js', 'compiler.js', 'vm.js'].map(f => fs.readFileSync(path.join(ROOT, f), 'utf8')).join('\n;\n');
  write('assets/engine.js', `(function(){var module=undefined;\n${src}\n;window.DhadRunApp=function(code,root,outEl,errEl){try{var c=compile(parse(code));var vm=new VM({maxSteps:150000000,domRoot:root,onPrint:function(l){outEl.textContent+=(outEl.textContent?"\\n":"")+l},onSaveFile:function(p,content){if(/\.html?$/i.test(p)){document.open();document.write(content);document.close()}}});vm.run(c.mainChunkIndex,c.functionChunks)}catch(e){errEl.textContent="✗ "+e.message}};window.DhadRun=function(code){var out=[];try{var c=compile(parse(code));var vm=new VM({maxSteps:150000000,onPrint:function(l){out.push(l)},onSaveFile:function(){}});vm.run(c.mainChunkIndex,c.functionChunks);return{ok:true,out:out}}catch(e){return{ok:false,out:out,error:e.message}}};})();`);
  fs.copyFileSync(path.join(__dirname, 'assets/site.css'), path.join(DIST, 'assets/site.css'));
  fs.copyFileSync(path.join(__dirname, 'assets/site.js'), path.join(DIST, 'assets/site.js'));
}
module.exports = { page, emit, codebox, hl, exec, crumbs, esc, AR, write, urls, problems, lessons, dict, examples, docs, roadmap, articles, SITE, DIST, ROOT, fs, path, R };
