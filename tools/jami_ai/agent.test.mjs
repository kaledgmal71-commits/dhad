import assert from 'node:assert'
import { runAgent, parseCall } from './agent.mjs'
// قاعدة مزيَّفة بالحد الأدنى: الأدوات تُستدعى عبر db.query فنعيد صفوفًا حسب نص الاستعلام
const db = { async query(sql) {
  if (/from books/.test(sql)) return { rows: [{ id: 12, title: 'المعجم الكبير' }] }
  if (/from hadith_toc where book_id/.test(sql)) return { rows: [{ main_id: 7, number: '5' }] }
  if (/join books b on b.id = h.book_id/.test(sql)) return { rows: [{ main_id: 7, book: 'المعجم الكبير', number: '5', content: '<p>نص الحديث</p>' }] }
  return { rows: [] }
} }
const script = [
  '<أداة>{"name":"find_book","args":{"query":"المعجم"}}',
  '<أداة>{"name":"find_hadith_by_number","args":{"book_id":12,"number":"5"}}',
  '<أداة>{"name":"get_hadith","args":{"hadith_id":7}}',
  '«نص الحديث»\n— المعجم الكبير، حديث رقم 5.<نهاية>',
]
let i = 0
const r = await runAgent({ db, question: 'ما نص الحديث 5 في المعجم؟', generate: async () => script[i++] })
assert.equal(r.trace.length, 4); assert.equal(r.trace[0].call.name, 'find_book'); assert.deepEqual(r.trace[2].result, { hadith_id: 7, book: 'المعجم الكبير', number: '5', text: 'نص الحديث' })
assert.ok(r.answer.includes('نص الحديث'))
assert.equal(parseCall('<أداة>{bad</أداة>').error, 'bad_json')
const r2 = await runAgent({ db, question: 'x', generate: async () => '<أداة>{"name":"rm_rf","args":{}}' })   // أداة غير معروفة لا تُنفَّذ، وتنتهي الحلقة بحدّ الخطوات
assert.equal(r2.trace[0].result.error, 'unknown_tool'); assert.equal(r2.trace.length, 6)
console.log('ok')
