// مولّد تطبيق نواة: يبني قاعدة المعرفة (فهرس + أمثلة موثَّقة) بمحرك ضاد نفسه، ويكتب الصفحة والعامل وملفات التثبيت.
// الاستعمال: يُستدعى من site/pages.gen.js بعد كتابة dist/ai/dhad-corpus.jsonl، أو مباشرة: node site/nawa.gen.js
const fs = require('fs'), path = require('path');
const R = require('./run.js');
const ROOT = path.join(__dirname, '..'), DIST = path.join(ROOT, 'dist');
const SITE = process.env.SITE_URL || 'https://dhad-lang-beta.vercel.app';
const wr = (rel, data) => { const p = path.join(DIST, rel); fs.mkdirSync(path.dirname(p), { recursive: true }); fs.writeFileSync(p, data); };

function buildBase() {
  const corpusPath = path.join(DIST, 'ai', 'dhad-corpus.jsonl');
  if (!fs.existsSync(corpusPath)) throw new Error('نواة: لا مدوّنة في dist/ai');
  const rows = fs.readFileSync(corpusPath, 'utf8').trim().split('\n').map(l => JSON.parse(l))
    .filter(r => r.status === 'ok' && r.code && r.output && ['example', 'lesson', 'explain', 'dictionary'].includes(r.source));
  const ex = rows.map(r => ({ معرف: r.id, عنوان: r.title || r.id, وصف: r.instruction || '', شيفرة: r.code, ناتج: r.output }));
  const r = R.run('متغير ت = استورد("ضاد/نواة_توليف")\nمتغير ج = استورد("ضاد/جسون")\nاطبع(ج.اكتب(ت.ابنِ_قاعدة(' + JSON.stringify(ex) + ')))', { maxMs: 300000, maxSteps: 4e9 });
  if (!r.ok) throw new Error('نواة: فشل بناء القاعدة: ' + r.error);
  wr('nawa/base.json', r.out[0]);
  return ex.length;
}

const TABS = [['/', 'ضاد'], ['/learn/', 'دروس'], ['/explain/', 'شروحات'], ['/dictionary/', 'معجم'], ['/docs/', 'الدليل'], ['/examples/', 'أمثلة'], ['/editor/', 'المحرر'], ['/roadmap/', 'الخارطة']];
const ICON = (c) => `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 512 512'><rect width='512' height='512' rx='96' fill='${c}'/><text x='256' y='372' font-family='Cairo,Tahoma,sans-serif' font-size='320' font-weight='800' text-anchor='middle' fill='white'>ن</text></svg>`;
const FAV = "data:image/svg+xml," + encodeURIComponent(ICON('#9a6b12'));
const PLUS = '<svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>';

function page() {
  const tabs = TABS.map(([h, t]) => `<a href="${h}">${t}</a>`).join('');
  return `<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>نواة — الذكاء الاصطناعي المبني بضاد</title><meta name="description" content="نواة: مساعد ذكي أجزاؤه كلها مكتوبة بلغة ضاد؛ يكتب البرامج ويتحقق منها بالتشغيل، ويشخّص الأخطاء، ويبحث في معرفة الموقع وفي ملفاتك.">
<link rel="canonical" href="${SITE}/nawa/"><link rel="icon" href="${FAV}"><link rel="manifest" href="/nawa/manifest.webmanifest"><meta name="theme-color" content="#9a6b12">
<meta property="og:title" content="نواة"><meta property="og:description" content="مساعد ذكي مبني بالكامل بلغة ضاد."><meta property="og:type" content="website"><meta property="og:locale" content="ar_AR">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;500;600;700;800&display=swap" rel="stylesheet">
<link rel="stylesheet" href="/assets/nawa.css"></head><body>
<header class="top"><div class="in">
  <a class="logo" href="/nawa/"><i>ن</i><span>نواة</span></a>
  <nav class="tabs">${tabs}</nav>
  <div class="tools">
    <button class="ibtn" id="install" hidden><svg viewBox="0 0 24 24"><path d="M12 3v12m0 0l-4-4m4 4l4-4M5 19h14"/></svg><span>تثبيت التطبيق</span></button>
    <button class="ibtn" id="openConn" title="الموصّلات"><svg viewBox="0 0 24 24"><path d="M9 7V3m6 4V3M7 11h10v3a5 5 0 0 1-10 0v-3zM12 19v2"/></svg><span>الموصّلات</span></button>
    <button class="ibtn" id="theme" aria-label="السمة"><svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="8"/><path d="M12 4a8 8 0 0 1 0 16z" fill="currentColor"/></svg></button>
  </div>
</div></header>
<div class="app">
  <aside class="side">
    <button class="newchat" id="newchat">${PLUS.replace('<svg', '<svg style="width:17px;height:17px;stroke:currentColor;fill:none;stroke-width:2;stroke-linecap:round"')}محادثة جديدة</button>
    <div class="hist" id="hist"></div>
  </aside>
  <main class="ws">
    <div class="scroll" id="scroll"><div class="col" id="col"><div class="hero" id="hero"><div class="mark">ن</div><h1>ماذا تريد أن تبني اليوم؟</h1></div></div></div>
    <div class="dock">
      <div class="composer">
        <div class="attached" id="attached"></div>
        <textarea id="in" rows="1" placeholder="اكتب طلبك هنا"></textarea>
        <div class="crow">
          <div style="position:relative">
            <button class="cbtn" id="plus" aria-label="إضافة">${PLUS}</button>
            <div class="menu" id="menu">
              <button data-act="files"><svg viewBox="0 0 24 24"><path d="M21 12.5 12.5 21a5.5 5.5 0 0 1-8-8l9-9a3.8 3.8 0 0 1 5.4 5.4l-9 9a2 2 0 0 1-2.8-2.8l8.3-8.3"/></svg>إرفاق ملفات</button>
              <button data-act="folder"><svg viewBox="0 0 24 24"><path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7z"/></svg>ربط مجلد ملفات</button>
              <button data-act="conn"><svg viewBox="0 0 24 24"><path d="M4 5a2 2 0 0 1 2-2h12v16H6a2 2 0 0 0-2 2V5zM4 19a2 2 0 0 0 2 2h12"/></svg>الموصّلات</button>
            </div>
          </div>
          <span class="sp"></span>
          <button class="cbtn send" id="send" disabled aria-label="إرسال"><svg viewBox="0 0 24 24" style="transform:scaleX(-1)"><path d="M12 19V5M5 12l7-7 7 7"/></svg></button>
        </div>
      </div>
      <div class="chipsrow" id="chips">
        <button class="chip">اكتب لي برنامج الأعداد الأولية</button><button class="chip">اشرح لي الإغلاقات</button><button class="chip">لماذا لا يعمل هذا؟ اطبع(عدادد)</button><button class="chip">ابحث في ملفاتي</button>
      </div>
    </div>
  </main>
</div>
<div class="ov" id="ov"><div class="dlg" role="dialog" aria-modal="true">
  <header><h2>الموصّلات</h2><button class="ibtn" id="closeConn">إغلاق</button></header>
  <div class="body">
    <div class="drop" id="drop">
      <p>اسحب الملفات أو المجلد إلى هنا (txt، md، html، docx، epub، json، csv)</p>
      <div class="row"><button class="ibtn" id="pickFiles">اختيار ملفات</button><button class="ibtn" id="pickFolder">اختيار مجلد</button></div>
    </div>
    <div class="files" id="files"></div>
    <input type="file" id="fileIn" multiple accept=".txt,.md,.markdown,.csv,.json,.html,.htm,.xhtml,.docx,.epub,.pdf,.dhad,.py,.js,.ts,.css,.xml,.yaml,.yml,.log" hidden>
    <input type="file" id="dirIn" webkitdirectory multiple hidden>
  </div>
</div></div>
<script src="/assets/nawa.files.js"></script><script src="/assets/nawa.js"></script>
</body></html>`;
}

function build(G) {
  const n = buildBase();
  wr('nawa/index.html', page());
  for (const f of ['nawa.css', 'nawa.js', 'nawa.files.js', 'nawa.worker.js']) fs.copyFileSync(path.join(__dirname, 'assets', f), path.join(DIST, 'assets', f));
  const png = fs.existsSync(path.join(__dirname, 'assets', 'nawa-icon-192.png'));
  const iconsList = png
    ? [{ src: '/nawa/icon-192.png', sizes: '192x192', type: 'image/png' }, { src: '/nawa/icon-512.png', sizes: '512x512', type: 'image/png' }, { src: '/nawa/icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' }]
    : [{ src: '/nawa/icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' }];
  if (png) { fs.copyFileSync(path.join(__dirname, 'assets', 'nawa-icon-192.png'), path.join(DIST, 'nawa', 'icon-192.png')); fs.copyFileSync(path.join(__dirname, 'assets', 'nawa-icon-512.png'), path.join(DIST, 'nawa', 'icon-512.png')); }
  wr('nawa/icon.svg', ICON('#9a6b12'));
  wr('nawa/manifest.webmanifest', JSON.stringify({ name: 'نواة', short_name: 'نواة', description: 'مساعد ذكي مبني بلغة ضاد', start_url: '/nawa/', scope: '/nawa/', display: 'standalone', dir: 'rtl', lang: 'ar', background_color: '#ffffff', theme_color: '#9a6b12', icons: iconsList }));
  // عامل الخدمة: أصول التطبيق تُحفظ لتعمل الصفحة بلا اتصال بعد أول زيارة؛ الطلبات الأخرى من الشبكة
  wr('nawa/sw.js', `const C='nawa-v1',A=['/nawa/','/assets/nawa.css','/assets/nawa.js','/assets/nawa.files.js','/assets/nawa.worker.js','/assets/engine.api.js','/nawa/base.json'];
self.addEventListener('install',e=>{e.waitUntil(caches.open(C).then(c=>c.addAll(A)).then(()=>self.skipWaiting()))});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(k=>Promise.all(k.filter(x=>x!==C).map(x=>caches.delete(x)))).then(()=>self.clients.claim()))});
self.addEventListener('fetch',e=>{const u=new URL(e.request.url);if(e.request.method!=='GET'||u.origin!==location.origin||!A.includes(u.pathname))return;e.respondWith(fetch(e.request).then(r=>{const cp=r.clone();caches.open(C).then(c=>c.put(e.request,cp));return r}).catch(()=>caches.match(e.request)))});
`);
  if (G && G.urls) G.urls.push('/nawa/');
  console.log('نواة: صفحة التطبيق جاهزة؛ القاعدة', n, 'مثالًا');
}
module.exports = { build };
if (require.main === module) { try { build(null); } catch (e) { console.error(e.message); process.exit(1); } }
