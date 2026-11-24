// يفكّ بيانات الجامع (قطع gzip + manifest.json) إلى مجلد بيانات PostgreSQL حقيقي على القرص.
// نفس تنسيق public/offline/worker.mjs: بايتات ملفات المجلد متتابعة بترتيب entries ثم تُقطَّع قطعًا مضغوطة.
import { createWriteStream } from 'node:fs'
import { mkdir, open, writeFile, access, chmod } from 'node:fs/promises'
import { join } from 'node:path'
import { Readable } from 'node:stream'
import { createGunzip } from 'node:zlib'

const AHEAD = 3
const hdr = token => (token ? { Authorization: 'Bearer ' + token } : undefined)

export async function fetchManifest(base, token) {
  const r = await fetch(base + 'manifest.json', { headers: hdr(token) })
  if (!r.ok) throw new Error('manifest HTTP ' + r.status)
  return r.json()
}

async function fetchChunk(base, token, c) {
  for (let a = 1; ; a++) {
    try {
      const r = await fetch(base + encodeURIComponent(c.name), { headers: hdr(token) })
      if (!r.ok) throw new Error('HTTP ' + r.status + ' ' + c.name)
      const buf = Buffer.from(await r.arrayBuffer())
      if (buf.length !== c.gzSize) throw new Error(`${c.name}: ${buf.length} != ${c.gzSize}`)
      return buf
    } catch (e) { if (a >= 4) throw e; await new Promise(r => setTimeout(r, 2000 * a)) }
  }
}

const gunzip = buf => new Promise((res, rej) => {
  const out = []; const g = createGunzip()
  g.on('data', d => out.push(d)).on('end', () => res(Buffer.concat(out))).on('error', rej)
  g.end(buf)
})

export async function unpack({ base, token, dir, log = console.log }) {
  try { await access(join(dir, '.ready')); log('بيانات جاهزة'); return }
  catch {}
  const m = await fetchManifest(base, token)
  await mkdir(dir, { recursive: true })
  const files = []
  for (const e of m.entries) {
    const p = join(dir, e.path)
    if (e.dir) await mkdir(p, { recursive: true })
    else { await mkdir(join(p, '..'), { recursive: true }); files.push({ p, size: e.size }) }
  }
  // قطع الحجم الصفري
  for (const f of files) if (f.size === 0) await writeFile(f.p, '')
  const chunks = m.chunks
  const pending = new Map()
  let next = 0
  const pump = at => { while (next < chunks.length && next < at + AHEAD) { const i = next++; pending.set(i, fetchChunk(base, token, chunks[i])); pending.get(i).catch(() => {}) } }
  let f = 0, off = 0, h = null, done = 0
  const sizeOf = i => files[i].size
  const closeH = async () => { if (h) { await h.close(); h = null } }
  for (let i = 0; i < chunks.length; i++) {
    pump(i)
    const raw = await gunzip(await pending.get(i)); pending.delete(i)
    if (raw.length !== chunks[i].size) throw new Error(`${chunks[i].name}: unpacked ${raw.length} != ${chunks[i].size}`)
    let p = 0
    while (p < raw.length) {
      while (f < files.length && (files[f].size === 0 || off >= sizeOf(f))) { await closeH(); f++; off = 0 }
      if (f >= files.length) throw new Error('بيانات أكثر مما في manifest')
      if (!h) h = await open(files[f].p, 'w', 0o600)
      const n = Math.min(raw.length - p, sizeOf(f) - off)
      await h.write(raw, p, n, off)
      p += n; off += n
    }
    done += raw.length
    if (i % 5 === 0 || i === chunks.length - 1) log(`فكّ ${i + 1}/${chunks.length} · ${(done / 1e9).toFixed(2)} جيجا`)
  }
  await closeH()
  await writeFile(join(dir, '.ready'), m.version || 'ok')
  log('اكتمل فك البيانات')
}
