// يولّد بيانات ضبط موجَّه لذكاء الجامع المضمَّن من قاعدة الجامع نفسها: محادثات باستدعاء أدوات تُنفَّذ فعليًا على القاعدة،
// وإجابات تنقل ما أعادته الأداة فقط، وحالات امتناع (لا يوجد/not_found) كي لا يختلق.
//   node gen_sft.mjs <pgdata> <outdir> <per_kind> [navheader.tsx]
import fs from 'node:fs'
import path from 'node:path'
import { PGlite } from '@electric-sql/pglite'
import { pg_trgm } from '@electric-sql/pglite/contrib/pg_trgm'
import { unaccent } from '@electric-sql/pglite/contrib/unaccent'
import { TOOLS, SYSTEM, strip } from './tools.mjs'

const [PG, OUT, PER = '200', NAV = '../apps/jami/app/components/NavHeader.tsx'] = process.argv.slice(2)
const N = Number(PER)
const db = await PGlite.create({ dataDir: PG, extensions: { pg_trgm, unaccent } })
fs.mkdirSync(OUT, { recursive: true })
let seed = 12345
const rnd = () => (seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296
const pick = a => a[Math.floor(rnd() * a.length)]
const J = o => JSON.stringify(o)
const stats = {}, rows = []
const emit = (kind, turns) => {
  stats[kind] = (stats[kind] || 0) + 1
  const messages = [{ role: 'system', content: SYSTEM }, ...turns]
  const text = turns.map(t => t.role === 'user' ? '<مستخدم>' + t.content : t.role === 'assistant' ? '<مساعد>' + t.content : '<نتيجة>' + t.content + '</نتيجة>').join('\n') + '\n<نهاية>'
  rows.push({ kind, messages, text })
}
// خطوة أداة: الاستدعاء ثم النتيجة الحقيقية من القاعدة
async function step(turns, name, args) {
  const result = await TOOLS[name](db, args)
  turns.push({ role: 'assistant', content: `<أداة>${J({ name, args })}</أداة>` })
  turns.push({ role: 'tool', content: J(result) })
  return result
}
const shortTitle = t => { const w = strip(t).split(' '); return Math.rand ? t : (rnd() < 0.5 ? strip(t) : w.slice(0, Math.min(2, w.length)).join(' ')) }
const numWord = n => String(n)

const Q_HADITH = [
  n => `ما نص الحديث رقم ${n.num} في ${n.book}؟`, n => `اعرض لي حديث ${n.book} رقم ${n.num}`, n => `أريد الحديث ${n.num} من ${n.book}`,
  n => `نص الحديث ${n.num} في كتاب ${n.book}`, n => `ماذا يقول الحديث رقم ${n.num} في ${n.book}؟`,
]
const Q_CHAIN = [
  n => `ما إسناد الحديث رقم ${n.num} في ${n.book}؟`, n => `من رواة الحديث ${n.num} في ${n.book}؟`, n => `اذكر سند حديث ${n.book} رقم ${n.num}`,
]
const Q_JUDG = [
  n => `ما حكم العلماء على الحديث رقم ${n.num} في ${n.book}؟`, n => `هل صُحّح الحديث ${n.num} في ${n.book}؟`, n => `أقوال أهل العلم في حديث ${n.book} رقم ${n.num}`,
]
const Q_NARR = [
  n => `من هو الراوي ${n}؟`, n => `عرّفني بالراوي ${n}`, n => `ما حال ${n} في الرواية؟`, n => `ترجمة ${n}`, n => `ما مرتبة ${n} عند ابن حجر؟`,
]

// عيّنات الأحاديث: كتاب + رقم + معرّف
const { rows: hs } = await db.query(
  `select h.main_id, h.book_id, h.tarqeem_harf::text as num, b.title from hadith_toc h join books b on b.id = h.book_id
   where h.is_leaf = true and h.tarqeem_harf is not null and h.content is not null and length(h.content) > 40
   order by random() limit $1`, [N * 4])
console.log('عيّنات أحاديث', hs.length)

async function locate(h, turns) {
  const bq = shortTitle(h.title)
  const fb = await step(turns, 'find_book', { query: bq })
  if (!fb.books.find(b => b.id === h.book_id)) return null
  const fn = await step(turns, 'find_hadith_by_number', { book_id: h.book_id, number: h.num })
  if (!fn.hadiths.find(x => x.main_id === h.main_id)) return null
  return bq
}
const q = (arr, h, bq) => pick(arr)({ num: h.num, book: bq })

let c = { hadith: 0, chain: 0, judg: 0 }
for (const h of hs) {
  try {
    const kind = c.hadith < N ? 'hadith' : c.chain < N ? 'chain' : c.judg < N ? 'judgments' : null
    if (!kind) break
    const turns = []
    // نحتاج bq قبل السؤال؛ نحدّده أولًا ثم نبني السؤال
    const bq = shortTitle(h.title)
    const user = q(kind === 'hadith' ? Q_HADITH : kind === 'chain' ? Q_CHAIN : Q_JUDG, h, bq)
    turns.push({ role: 'user', content: user })
    const fb = await step(turns, 'find_book', { query: bq })
    if (!fb.books.find(b => b.id === h.book_id)) continue
    const fn = await step(turns, 'find_hadith_by_number', { book_id: h.book_id, number: h.num })
    if (!fn.hadiths.find(x => x.main_id === h.main_id)) continue
    if (kind === 'hadith') {
      const g = await step(turns, 'get_hadith', { hadith_id: h.main_id })
      if (g.error) continue
      turns.push({ role: 'assistant', content: `«${g.text}»\n— ${g.book}، حديث رقم ${g.number}.` })
      c.hadith++; emit('hadith', turns)
    } else if (kind === 'chain') {
      const g = await step(turns, 'get_chains', { hadith_id: h.main_id })
      if (!g.chains.length) { turns.push({ role: 'assistant', content: `لا يوجد إسناد مسجَّل لهذا الحديث في قاعدة الجامع.` }) }
      else turns.push({ role: 'assistant', content: `الإسناد (من الصحابي إلى المصنِّف):\n` + g.chains.map(ch => ch.map(x => x.name).join(' ← ')).join('\n') + `\n— ${h.title}، حديث رقم ${h.num}.` })
      c.chain++; emit('chain', turns)
    } else {
      const g = await step(turns, 'get_judgments', { hadith_id: h.main_id })
      if (!g.judgments.length) turns.push({ role: 'assistant', content: `لا أجد في قاعدة الجامع حكمًا مسجَّلًا لهذا الحديث.` })
      else turns.push({ role: 'assistant', content: g.judgments.map(j => `${j.scholar ? j.scholar + ': ' : ''}«${j.text}»`).join('\n') })
      c.judg++; emit('judgments', turns)
    }
  } catch (e) { stats.errors = (stats.errors || 0) + 1; if (stats.errors < 4) console.log('خطأ', e.message) }
}

// الرواة
const { rows: ns } = await db.query(`select id, name from narrators where name is not null and hadiths_count > 50 order by random() limit $1`, [N * 3])
let cn = 0
for (const n of ns) {
  if (cn >= N) break
  try {
    const name = strip(n.name); if (name.length < 4) continue
    const turns = [{ role: 'user', content: pick(Q_NARR)(name) }]
    const fnr = await step(turns, 'find_narrator', { name })
    if (!fnr.narrators.find(x => x.id === n.id)) continue
    const g = await step(turns, 'get_narrator', { narrator_id: n.id })
    if (g.error) continue
    const parts = [`${g.name}${g.kunia ? ` (${g.kunia})` : ''}${g.companion ? '، صحابي' : ''}.`]
    if (g.tabaqa) parts.push(`الطبقة: ${g.tabaqa}.`)
    if (g.death_year) parts.push(`وفاته: ${g.death_year}هـ.`)
    if (g.ibn_hajar) parts.push(`مرتبته عند ابن حجر: «${g.ibn_hajar}».`)
    if (g.dhahabi) parts.push(`وعند الذهبي: «${g.dhahabi}».`)
    if (g.hadiths_count) parts.push(`عدد أحاديثه في الجامع: ${g.hadiths_count}.`)
    if (g.criticism.length) parts.push('من أقوال العلماء فيه:\n' + g.criticism.map(x => `${x.scholar}: «${x.text}»`).join('\n'))
    turns.push({ role: 'assistant', content: parts.join(' ') })
    cn++; emit('narrator', turns)
  } catch (e) { stats.errors = (stats.errors || 0) + 1 }
}

// الامتناع: لا اختلاق
const { rows: bk } = await db.query(`select id, title from books order by random() limit $1`, [Math.ceil(N / 2)])
for (const b of bk) {
  const t = [{ role: 'user', content: `ما نص الحديث رقم ${90000000 + Math.floor(rnd() * 9999999)} في ${strip(b.title)}؟` }]
  const num = t[0].content.match(/\d+/)[0]
  await step(t, 'find_book', { query: strip(b.title) })
  const r = await step(t, 'find_hadith_by_number', { book_id: b.id, number: num })
  if (r.hadiths.length) continue
  t.push({ role: 'assistant', content: `لا يوجد في قاعدة الجامع حديث بالرقم ${num} في ${strip(b.title)}. تأكد من الرقم أو أخبرني بكتاب آخر.` })
  emit('abstain_hadith', t)
}
for (let i = 0; i < Math.ceil(N / 2); i++) {
  const junk = Array.from({ length: 3 }, () => String.fromCharCode(0x0621 + Math.floor(rnd() * 26))).join('') + ' ' + Array.from({ length: 4 }, () => String.fromCharCode(0x0621 + Math.floor(rnd() * 26))).join('')
  const t = [{ role: 'user', content: pick(Q_NARR)(junk) }]
  const r = await step(t, 'find_narrator', { name: junk })
  if (r.narrators.length) continue
  t.push({ role: 'assistant', content: `لم أجد راويًا بهذا الاسم في قاعدة الجامع. جرّب كتابة الاسم كاملًا أو بصيغة أخرى.` })
  emit('abstain_narrator', t)
}

// معرفة التطبيق: صفحات القائمة الفعلية من كود التطبيق (لا من الذاكرة)
try {
  const src = fs.readFileSync(NAV, 'utf8').split('\n').filter(l => !/^\s*\/\//.test(l))
  const links = src.map(l => l.match(/\{\s*href:\s*'([^']+)',\s*label:\s*'([^']+)'/)).filter(Boolean).map(m => ({ href: m[1], label: m[2] }))
  for (const l of links) {
    emit('app_nav', [{ role: 'user', content: pick([`أين أجد «${l.label}»؟`, `كيف أفتح صفحة ${l.label}؟`, `ما رابط ${l.label}؟`]) },
      { role: 'assistant', content: `من قائمة الجامع اختر «${l.label}»، أو افتح الرابط ${l.href}.` }])
  }
  console.log('صفحات التطبيق', links.length)
} catch (e) { console.log('تعذّرت قراءة القائمة', e.message) }

// تقسيم 95/5
const dev = rows.filter((_, i) => i % 20 === 0)
const tr = rows.filter((_, i) => i % 20 !== 0)
const w = (f, a) => fs.writeFileSync(path.join(OUT, f), a.map(r => JSON.stringify(r)).join('\n') + '\n')
w('train.jsonl', tr); w('dev.jsonl', dev)
fs.writeFileSync(path.join(OUT, 'stats.json'), JSON.stringify({ stats, train: tr.length, dev: dev.length }, null, 1))
console.log(JSON.stringify(stats), 'train', tr.length, 'dev', dev.length)
await db.close()
