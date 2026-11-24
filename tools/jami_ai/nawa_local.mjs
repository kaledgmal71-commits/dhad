// عامل نواة المحلي (v0): يعمل دون إنترنت على أدوات الجامع نفسها. تصنيف الطلب بالأنماط ثم أدوات ثم جواب منقول من نتائجها؛
// ما لا يعرفه يمتنع عنه بدل التخمين. يُستبدل لاحقًا بنموذج نواة المدرَّب على بيانات الجامع (gen_sft.mjs) عبر agent.mjs.
import { TOOLS, strip } from './tools.mjs'

const AR_DIGITS = '٠١٢٣٤٥٦٧٨٩'
const digits = s => String(s).replace(/[٠-٩]/g, d => AR_DIGITS.indexOf(d))
const BOOK_WORDS = /^(?:كتاب|صحيح|سنن|مسند|موطأ|جامع)\s+/

export function classify(q) {
  q = digits(strip(q))
  let m = q.match(/حديث\s*(?:رقم\s*)?(\d+)\s*(?:في|من|عند)?\s*(.+)$/)
  if (m) return { kind: 'hadith_by_number', number: m[1], book: m[2].replace(/^(?:كتاب)\s+/, '').trim() }
  m = q.match(/(?:ترجمة|من هو|من هي|حال|الراوي|عن الراوي)\s+(.+?)\s*[؟?]?$/)
  if (m) return { kind: 'narrator', name: m[1].replace(/^(?:الراوي|الإمام)\s+/, '').trim() }
  return { kind: 'unknown' }
}

export const ABSTAIN = 'هذا خارج ما أحسنه محليًّا الآن. أحسن دون إنترنت: «حديث رقم ٣٣ في صحيح البخاري» وترجمة راوٍ مثل «ترجمة سفيان الثوري». لأي بحث أعمق فعّل جيميناي من المفتاح.'

export async function nawaLocal({ db, question }) {
  const trace = [], c = classify(question)
  const call = async (name, args) => { const r = await TOOLS[name](db, args); trace.push({ call: { name, args }, result: r }); return r }
  if (c.kind === 'hadith_by_number') {
    const books = (await call('find_book', { query: c.book })).books
    if (!books.length) return { answer: `لم أجد في الجامع كتابًا باسم «${c.book}».`, trace }
    const b = books[0], hs = (await call('find_hadith_by_number', { book_id: b.id, number: c.number })).hadiths
    if (!hs.length) return { answer: `لم أجد في «${strip(b.title)}» حديثًا برقم ${c.number}.`, trace }
    const h = await call('get_hadith', { hadith_id: hs[0].main_id })
    const ch = (await call('get_chains', { hadith_id: hs[0].main_id })).chains
    const jd = (await call('get_judgments', { hadith_id: hs[0].main_id })).judgments
    let a = `«${h.book}» رقم ${h.number}:\n${h.text}`
    if (ch.length) a += '\n\nالإسناد: ' + ch[0].map(n => n.name).join(' ← ')
    if (jd.length) a += '\n\nأقوال العلماء في الحكم:\n' + jd.map(j => `• ${j.scholar || 'عالم'}: ${j.text}`).join('\n')
    return { answer: a, trace }
  }
  if (c.kind === 'narrator') {
    const ns = (await call('find_narrator', { name: c.name })).narrators
    if (!ns.length) return { answer: `لم أجد راويًا باسم «${c.name}» في الجامع.`, trace }
    const n = await call('get_narrator', { narrator_id: ns[0].id })
    let a = `${n.name}${n.kunia ? ' (' + n.kunia + ')' : ''}` + (n.death_year ? ` — توفي ${n.death_year}هـ` : '') + (n.hadiths_count ? ` — له ${n.hadiths_count} حديثًا في الجامع` : '') + (n.companion ? ' — صحابي' : '')
    if (n.ibn_hajar) a += `\nابن حجر: ${n.ibn_hajar}`
    if (n.dhahabi) a += `\nالذهبي: ${n.dhahabi}`
    if (n.criticism?.length) a += '\n\nأقوال النقاد:\n' + n.criticism.map(x => `• ${x.scholar}: ${x.text}`).join('\n')
    if (ns.length > 1) a += '\n\nأسماء مشابهة: ' + ns.slice(1).map(x => x.name).join('، ')
    return { answer: a, trace }
  }
  return { answer: ABSTAIN, trace }
}
