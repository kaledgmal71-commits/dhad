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

const DOCS = require('./nawa.docs.js');
const ICON = (c) => `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 512 512'><rect width='512' height='512' rx='96' fill='${c}'/><text x='256' y='372' font-family='Cairo,Tahoma,sans-serif' font-size='320' font-weight='800' text-anchor='middle' fill='white'>ن</text></svg>`;
const FAV = "data:image/svg+xml," + encodeURIComponent(ICON('#9a6b12'));
const PLUS = '<svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>';

function page() {
  return `<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>نواة NAWA — الذكاء الاصطناعي المبني بضاد</title><meta name="description" content="نواة: مساعد ذكي أجزاؤه كلها مكتوبة بلغة ضاد؛ يكتب البرامج ويتحقق منها بالتشغيل، ويشخّص الأخطاء، ويبحث في معرفة الموقع وفي ملفاتك.">
<link rel="canonical" href="${SITE}/nawa/"><link rel="icon" href="${FAV}"><link rel="manifest" href="/nawa/manifest.webmanifest"><meta name="theme-color" content="#9a6b12">
<meta property="og:title" content="نواة NAWA"><meta property="og:description" content="مساعد ذكي مبني بالكامل بلغة ضاد."><meta property="og:type" content="website"><meta property="og:locale" content="ar_AR">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;500;600;700;800&display=swap" rel="stylesheet">
<link rel="stylesheet" href="/assets/nawa.css"></head><body>
${DOCS.header("/nawa/", true)}
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
              <button data-act="images"><svg viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="9" cy="10" r="1.6"/><path d="m21 16-5-5-8 8"/></svg>إرفاق صور</button>
              <button data-act="folder"><svg viewBox="0 0 24 24"><path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7z"/></svg>إرفاق مجلد</button>

            </div>
          </div>
          <span class="sp"></span>
          <button class="cbtn send" id="send" disabled aria-label="إرسال"><svg viewBox="0 0 24 24" style="transform:scaleX(-1)"><path d="M12 19V5M5 12l7-7 7 7"/></svg></button>
        </div>
      </div>
    </div>
  </main>
</div>
<div class="ov" id="ov"><div class="dlg" role="dialog" aria-modal="true">
  <header><h2>الموصّلات</h2><button class="ibtn" id="closeConn">إغلاق</button></header>
  <div class="body">
    <div id="cgrid"></div>
    <div class="files" id="files"></div>
    <input type="file" id="fileIn" multiple accept=".txt,.md,.markdown,.csv,.json,.html,.htm,.xhtml,.docx,.epub,.pdf,.dhad,.py,.js,.ts,.css,.xml,.yaml,.yml,.log" hidden>
    <input type="file" id="dirIn" webkitdirectory multiple hidden>
    <input type="file" id="imgIn" accept="image/*" multiple hidden>
  </div>
</div></div>
<script src="/assets/nawa.files.js"></script><script src="/assets/nawa.js"></script>
</body></html>`;
}


// ---------- دليل ضاد: مقاطع نثرية من الدليل والدروس والشروحات والمعجم لتجيب نواة عن ضاد من نصها الفعلي ----------
const ENT = { '&lt;': '<', '&gt;': '>', '&quot;': '"', '&#39;': "'", '&nbsp;': ' ', '&amp;': '&' };
const unent = t => t.replace(/&(lt|gt|quot|#39|nbsp|amp);/g, m => ENT[m]);
const strip = h => unent(h.replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim();
function passagesOf(url, html) {
  const mm = /<main>([\s\S]*?)<\/main>/.exec(html); if (!mm) return [];
  let body = mm[1].replace(/<script[\s\S]*?<\/script>/g, '').replace(/<style[\s\S]*?<\/style>/g, '').replace(/<div class="crumbs">[\s\S]*?<\/div>/, '').replace(/<div class="bar">[\s\S]*?<\/div>/g, '');
  const h1 = /<h1[^>]*>([\s\S]*?)<\/h1>/.exec(body); const tt = /<title>([\s\S]*?)<\/title>/.exec(html); const page = h1 ? strip(h1[1]) : (tt ? strip(tt[1]).replace(/\s*[—-]\s*ضاد$/, '') : url);
  const parts = body.split(/(<h[23][^>]*>[\s\S]*?<\/h[23]>)/); const out = []; let head = '';
  const push = (txt, code) => {
    txt = txt.trim(); if (txt.length < 30 && !code) return;
    const sents = txt.split(/(?<=[.؟!؛])\s+/); let cur = '';
    const flush = c => { if (c.trim().length >= 30 || (c.trim() && code)) out.push({ معرف: url + '#' + (out.length + 1), عنوان: head && head !== page ? page + ' — ' + head : page, رابط: url, نص: c.trim(), شيفرة: code || '' }); code = ''; };
    for (const st of sents) { if (cur && (cur + ' ' + st).length > 700) { flush(cur); cur = st; } else cur = cur ? cur + ' ' + st : st; }
    if (cur) flush(cur);
  };
  for (const part of parts) {
    if (/^<h[23]/.test(part)) { head = strip(part); continue; }
    const codes = []; const noPre = part.replace(/<pre[^>]*>([\s\S]*?)<\/pre>/g, (_, c) => { codes.push(strip(c.replace(/<br\s*\/?>/g, '\n').replace(/<\/?span[^>]*>/g, '')) ); return ' '; });
    const raw = part.replace(/<pre[^>]*>([\s\S]*?)<\/pre>/g, (_, c) => unent(c.replace(/<[^>]+>/g, '')).trim());
    const code = (/<pre/.test(part) ? unent((part.match(/<pre[^>]*>([\s\S]*?)<\/pre>/) || [0, ''])[1].replace(/<[^>]+>/g, '')).trim() : '');
    push(strip(noPre.replace(/<div class="out"[\s\S]*?<\/div>/g, ' ')), code.slice(0, 600));
  }
  return out;
}
function buildGuide() {
  const dirs = ['docs', 'dictionary', 'limits', 'about'], found = [];
  for (const d of dirs) { const f = path.join(DIST, d, 'index.html'); if (fs.existsSync(f)) found.push(['/' + d + '/', f]); }
  for (const d of ['learn', 'explain']) {
    const base = path.join(DIST, d); if (!fs.existsSync(base)) continue;
    for (const sub of fs.readdirSync(base).sort()) { const f = path.join(base, sub, 'index.html'); if (fs.existsSync(f)) found.push(['/' + d + '/' + sub + '/', f]); }
  }
  const all = [];
  for (const [url, f] of found) for (const p of passagesOf(url, fs.readFileSync(f, 'utf8'))) all.push(p);
  for (const p of all) p.نص = p.نص.replace(/\S+\.dhad\s*▶ شغّل\s*افتح في المحرر/g, '').replace(/▶ شغّل|افتح في المحرر/g, '').replace(/\s+/g, ' ').trim();
  for (const p of all) p.نص = p.نص.replace(/^#\s*ضاد من الصفر \|\s*شروحات مصوّرة\s*/, '').replace(/^الشرح [٠-٩]+:[^.]*?(?=\s{1}\S)/, m => m).trim();
  const kept = all.filter(p => p.نص.length >= 60 || (p.شيفرة && p.نص.length >= 20));
  const r = R.run('متغير د = استورد("ضاد/نواة_دليل")\nمتغير ج = استورد("ضاد/جسون")\nاطبع(ج.اكتب(د.ابنِ(' + JSON.stringify(kept) + ')))', { maxMs: 600000, maxSteps: 2e10 });
  if (!r.ok) throw new Error('نواة: فشل بناء الدليل: ' + r.error);
  wr('nawa/guide.json', r.out[0]);
  return kept.length;
}

function build(G) {
  const n = buildBase();
  const g = buildGuide();
  wr('nawa/index.html', page());
  for (const [f, h] of Object.entries(DOCS.pages)) wr(f, h);
  for (const f of ['nawa.css', 'nawa.js', 'nawa.files.js', 'nawa.worker.js']) fs.copyFileSync(path.join(__dirname, 'assets', f), path.join(DIST, 'assets', f));
  const png = fs.existsSync(path.join(__dirname, 'assets', 'nawa-icon-192.png'));
  const iconsList = png
    ? [{ src: '/nawa/icon-192.png', sizes: '192x192', type: 'image/png' }, { src: '/nawa/icon-512.png', sizes: '512x512', type: 'image/png' }, { src: '/nawa/icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' }]
    : [{ src: '/nawa/icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' }];
  if (png) { fs.copyFileSync(path.join(__dirname, 'assets', 'nawa-icon-192.png'), path.join(DIST, 'nawa', 'icon-192.png')); fs.copyFileSync(path.join(__dirname, 'assets', 'nawa-icon-512.png'), path.join(DIST, 'nawa', 'icon-512.png')); }
  wr('nawa/icon.svg', ICON('#9a6b12'));
  wr('nawa/manifest.webmanifest', JSON.stringify({ name: 'نواة NAWA', short_name: 'نواة', description: 'مساعد ذكي مبني بلغة ضاد', start_url: '/nawa/', scope: '/nawa/', display: 'standalone', dir: 'rtl', lang: 'ar', background_color: '#ffffff', theme_color: '#9a6b12', icons: iconsList }));
  // عامل الخدمة: أصول التطبيق تُحفظ لتعمل الصفحة بلا اتصال بعد أول زيارة؛ الطلبات الأخرى من الشبكة
  wr('nawa/sw.js', `const C='nawa-v3',A=['/nawa/','/nawa/learn/','/nawa/guide/','/nawa/explain/','/assets/nawa.css','/assets/nawa.js','/assets/nawa.files.js','/assets/nawa.worker.js','/assets/engine.api.js','/nawa/base.json','/nawa/guide.json'];
self.addEventListener('install',e=>{e.waitUntil(caches.open(C).then(c=>c.addAll(A)).then(()=>self.skipWaiting()))});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(k=>Promise.all(k.filter(x=>x!==C).map(x=>caches.delete(x)))).then(()=>self.clients.claim()))});
self.addEventListener('fetch',e=>{const u=new URL(e.request.url);if(e.request.method!=='GET'||u.origin!==location.origin||!A.includes(u.pathname))return;e.respondWith(fetch(e.request).then(r=>{const cp=r.clone();caches.open(C).then(c=>c.put(e.request,cp));return r}).catch(()=>caches.match(e.request)))});
`);
  if (G && G.urls) { G.urls.push('/nawa/'); for (const u of DOCS.urls) G.urls.push(u); }
  console.log('نواة: صفحة التطبيق جاهزة؛ القاعدة', n, 'مثالًا؛ الدليل', g, 'مقطعًا');
}
module.exports = { build };
if (require.main === module) { try { build(null); } catch (e) { console.error(e.message); process.exit(1); } }
