import assert from 'node:assert/strict'
import { classify, nawaLocal, ABSTAIN } from './nawa_local.mjs'
assert.deepEqual(classify('حديث رقم ٣٣ في صحيح البخاري'), { kind: 'hadith_by_number', number: '33', book: 'صحيح البخاري' })
assert.equal(classify('ترجمة سفيان الثوري').name, 'سفيان الثوري')
assert.equal(classify('ما حكم الصلاة؟').kind, 'unknown')
const db = { async query(t, p) {
  if (/from books/.test(t)) return { rows: [{ id: 1, title: 'صحيح البخاري' }] }
  if (/from hadith_toc h join/.test(t)) return { rows: [{ main_id: 9, book: 'صحيح البخاري', number: '33', content: 'نص الحديث' }] }
  if (/from hadith_toc/.test(t)) return { rows: [{ main_id: 9, number: '33' }] }
  if (/isnad_hadiths/.test(t)) return { rows: [{ a: [1, 2] }] }
  if (/from narrators where id = any/.test(t)) return { rows: [{ id: 1, name: 'ا' }, { id: 2, name: 'ب' }] }
  if (/hadith_judgments/.test(t)) return { rows: [{ scholar: 'الألباني', say_text: 'صحيح' }] }
  return { rows: [] } } }
const r = await nawaLocal({ db, question: 'حديث رقم 33 في صحيح البخاري' })
assert.match(r.answer, /نص الحديث/); assert.match(r.answer, /ا ← ب/); assert.match(r.answer, /الألباني/)
assert.equal((await nawaLocal({ db, question: 'ما رأيك في كذا' })).answer, ABSTAIN)
assert.match((await nawaLocal({ db: { async query() { return { rows: [] } } }, question: 'حديث رقم 5 في كتاب غيرموجود' })).answer, /لم أجد/)
console.log('nawa_local ok')
