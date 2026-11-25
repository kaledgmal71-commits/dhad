// خادم الجامع على Hugging Face Space: (١) واجهة حارس على المنفذ العام (مفتاح وصول + حالة التجهيز)
// (٢) تنزيل البيانات وفكّها مرة (٣) PGlite على القرص مكشوفًا ببروتوكول PostgreSQL (٤) تشغيل التطبيق نفسه.
import http from 'node:http'
import { spawn } from 'node:child_process'
import { createHash } from 'node:crypto'
import { unpack } from './unpack.mjs'

const PORT = +(process.env.PORT || 7860), APP_PORT = 3000, PG_PORT = 5432
const DIR = process.env.DATA_DIR || '/home/node/data'
const BASE = (process.env.DATA_BASE || 'https://huggingface.co/datasets/kaledgmal/aljami-private/resolve/main/').replace(/\/*$/, '/')
const TOKEN = process.env.HF_TOKEN || ''
const KEY = process.env.ACCESS_KEY || ''
const cookieVal = KEY ? createHash('sha256').update('jami:' + KEY).digest('hex') : ''

let status = 'يجري تجهيز البيانات…', ready = false
const log = s => { status = s; console.log(s) }

const page = (body, code = 200) => [code, { 'content-type': 'text/html; charset=utf-8' }, `<!doctype html><meta charset=utf-8><meta name=viewport content="width=device-width,initial-scale=1"><body dir=rtl style="font-family:sans-serif;background:#FAF6EC;color:#1B2A5C;max-width:28rem;margin:4rem auto;padding:0 1rem">${body}`]
const authed = req => !KEY || (req.headers.cookie || '').split(/;\s*/).includes('jk=' + cookieVal)

http.createServer((req, res) => {
  const send = ([c, h, b]) => { res.writeHead(c, h); res.end(b) }
  if (req.url === '/__health') return send([200, { 'content-type': 'text/plain' }, 'ok'])
  if (req.method === 'POST' && req.url === '/__key') {
    let b = ''; req.on('data', d => (b += d)).on('end', () => {
      const k = new URLSearchParams(b).get('k') || ''
      if (KEY && k === KEY) { res.writeHead(303, { location: '/', 'set-cookie': `jk=${cookieVal}; Path=/; HttpOnly; Secure; SameSite=None; Max-Age=31536000` }); res.end() }
      else send(page('<h2>جامع نواة</h2><p style="color:#b00">المفتاح غير صحيح.</p><form method=post action=/__key><input name=k type=password autofocus style="width:100%;padding:8px"><button style="margin-top:8px;padding:8px 16px">دخول</button></form>', 401))
    }); return
  }
  if (!authed(req)) return send(page('<h2>جامع نواة</h2><form method=post action=/__key><input name=k type=password placeholder="مفتاح الدخول" autofocus style="width:100%;padding:8px"><button style="margin-top:8px;padding:8px 16px">دخول</button></form>', 401))
  if (!ready) return send(page(`<h2>جامع نواة</h2><p>${status}</p><p style="color:#777;font-size:13px">أعد تحميل الصفحة بعد دقائق.</p>`, 503))
  const p = http.request({ host: '127.0.0.1', port: APP_PORT, path: req.url, method: req.method, headers: { ...req.headers, host: req.headers.host } }, r => { res.writeHead(r.statusCode, r.headers); r.pipe(res) })
  p.on('error', () => { if (!res.headersSent) send(page('<p>الخادم يعيد التشغيل…</p>', 502)) })
  req.pipe(p)
}).listen(PORT, '0.0.0.0', () => console.log('حارس على', PORT))

async function main() {
  await unpack({ base: BASE, token: TOKEN, dir: DIR, log })
  log('يفتح قاعدة البيانات…')
  const { PGlite } = await import('@electric-sql/pglite')
  const { pg_trgm } = await import('@electric-sql/pglite/contrib/pg_trgm')
  const { unaccent } = await import('@electric-sql/pglite/contrib/unaccent')
  const { PGLiteSocketServer } = await import('@electric-sql/pglite-socket')
  const db = await PGlite.create({ dataDir: DIR, extensions: { pg_trgm, unaccent }, relaxedDurability: true })
  const n = (await db.query('select count(*)::int c from books')).rows[0].c
  log('القاعدة مفتوحة: كتب ' + n)
  const pgs = new PGLiteSocketServer({ db, port: PG_PORT, host: '127.0.0.1', maxConnections: 8 })
  await pgs.start()
  log('يشغّل التطبيق…')
  const app = spawn('node', ['node_modules/next/dist/bin/next', 'start', '-p', String(APP_PORT)], {
    cwd: process.env.APP_DIR || '/app/jami', stdio: 'inherit',
    env: { ...process.env, PORT: String(APP_PORT), DATABASE_URL: `postgres://postgres:postgres@127.0.0.1:${PG_PORT}/postgres`, DB_SSL: '0', DB_POOL_MAX: '1', DB_CONNECT_TIMEOUT_MS: '60000', DB_STATEMENT_TIMEOUT_MS: '120000', DB_QUERY_TIMEOUT_MS: '125000' },
  })
  app.on('exit', c => { console.log('التطبيق خرج', c); process.exit(1) })
  for (let i = 0; i < 120; i++) {
    const ok = await new Promise(r => http.get({ host: '127.0.0.1', port: APP_PORT, path: '/api/ai/q', timeout: 2000 }, x => { x.resume(); r(true) }).on('error', () => r(false)))
    if (ok) break
    await new Promise(r => setTimeout(r, 1000))
  }
  ready = true; log('جاهز')
}
main().catch(e => { console.error('فشل التجهيز', e); status = 'فشل التجهيز: ' + String(e.message || e).slice(0, 200) })
