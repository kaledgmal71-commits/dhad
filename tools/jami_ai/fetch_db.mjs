// ينزّل قاعدة الجامع (قطع gzip على Hugging Face خاص) ويفكّها إلى مجلد بيانات PGlite.
//   node fetch_db.mjs <outdir>     (HF_TOKEN في البيئة)
import fs from 'node:fs'
import path from 'node:path'
import zlib from 'node:zlib'
import { Readable } from 'node:stream'
const out = process.argv[2]
const BASE = process.env.BASE || 'https://huggingface.co/datasets/kaledgmal/aljami-private/resolve/main/'
const H = { Authorization: 'Bearer ' + process.env.HF_TOKEN }
const m = await (await fetch(BASE + 'manifest.json', { headers: H })).json()
console.log('نسخة', m.version, 'حجم', (m.dbSize / 1e9).toFixed(2), 'GB')
fs.mkdirSync(out, { recursive: true })
const files = m.entries.filter(e => !e.dir)
for (const e of m.entries) if (e.dir) fs.mkdirSync(path.join(out, e.path), { recursive: true })
let fi = 0, at = 0, fd = null
const open = () => { fd = fs.openSync(path.join(out, files[fi].path), 'w') }
const closeF = () => { if (fd !== null) { fs.closeSync(fd); fd = null } }
const skipEmpty = () => { while (fi < files.length && files[fi].size === 0) { fs.writeFileSync(path.join(out, files[fi].path), ''); fi++ } }
skipEmpty(); if (fi < files.length) open()
let total = 0
for (const [ci, c] of m.chunks.entries()) {
  let res
  for (let a = 1; a <= 4; a++) { res = await fetch(BASE + c.name, { headers: H }); if (res.ok) break; await new Promise(r => setTimeout(r, 2000 * a)) }
  if (!res.ok) throw new Error('chunk ' + c.name + ' HTTP ' + res.status)
  let got = 0
  for await (const buf of Readable.fromWeb(res.body).pipe(zlib.createGunzip())) {
    let off = 0
    while (off < buf.length) {
      if (fi >= files.length) throw new Error('بيانات أكثر من المانيفست')
      const n = Math.min(buf.length - off, files[fi].size - at)
      fs.writeSync(fd, buf, off, n); at += n; off += n; got += n
      if (at >= files[fi].size) { closeF(); fi++; at = 0; skipEmpty(); if (fi < files.length) open() }
    }
  }
  if (got !== c.size) throw new Error(`${c.name}: ${got} != ${c.size}`)
  total += got
  if (ci % 8 === 0) console.log('قطعة', ci + 1, '/', m.chunks.length, (total / 1e9).toFixed(2), 'GB')
}
closeF()
console.log('تم الفك', (total / 1e9).toFixed(2), 'GB')
