import assert from 'node:assert'
import { runGeminiAgent, pickGeminiModel, DECLS } from './gemini.mjs'
const db = { async query(sql) {
  if (/from narrators where name ilike/.test(sql)) return { rows: [{ id: 9, name: 'سفيان الثوري', tabaqa: 'السابعة', hadiths_count: 100 }] }
  return { rows: [] }
} }
let n = 0
const bodies = []
const fetchFn = async (url, init) => {
  if (url.includes('/models?key')) return { ok: true, json: async () => ({ models: [{ name: 'models/gemini-2.5-flash', supportedGenerationMethods: ['generateContent'] }, { name: 'models/gemini-3-pro', supportedGenerationMethods: ['generateContent'] }, { name: 'models/gemini-3-pro-preview', supportedGenerationMethods: ['generateContent'] }, { name: 'models/embedding-001', supportedGenerationMethods: ['embedContent'] }] }) }
  bodies.push(JSON.parse(init.body))
  const seq = [
    { candidates: [{ content: { parts: [{ functionCall: { name: 'find_narrator', args: { name: 'سفيان' } } }] } }] },
    { candidates: [{ content: { parts: [{ text: 'وجدتُ: سفيان الثوري (الطبقة السابعة).' }] } }] },
  ]
  return { ok: true, json: async () => seq[n++] }
}
assert.equal(await pickGeminiModel('k', fetchFn), 'gemini-3-pro')
const r = await runGeminiAgent({ db, key: 'k', model: 'm', question: 'من سفيان؟', fetchFn })
assert.equal(r.trace.length, 2); assert.equal(r.trace[0].result.narrators[0].id, 9); assert.match(r.answer, /سفيان الثوري/)
assert.equal(bodies[0].tools[0].functionDeclarations.length, DECLS.length)
assert.deepEqual(bodies[1].contents.at(-1).parts[0].functionResponse.name, 'find_narrator')
console.log('ok')
