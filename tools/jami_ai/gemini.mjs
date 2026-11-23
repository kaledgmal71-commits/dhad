// الوكيل السحابي: نفس أدوات الجامع (تنفَّذ محليًّا على PGlite)، لكن المحرّك جيميناي عبر استدعاء الدوال، فيبحث ويحلّل بقوة أعلى.
// لا يُرسَل إلى جيميناي إلا نتائج الأدوات التي طلبها (مقتطفات)، لا القاعدة. المفتاح يبقى في جهاز المستخدم.
// web_research: توسّع عالمي بالبحث في الويب عبر جيميناي (يعمل فقط حين يكون الاتصال متاحًا وبإذن المستخدم).
import { TOOLS, strip } from './tools.mjs'

const API = 'https://generativelanguage.googleapis.com/v1beta'
const P = (props, req) => ({ type: 'OBJECT', properties: props, required: req })
const S = { type: 'STRING' }, I = { type: 'INTEGER' }
export const DECLS = [
  { name: 'find_book', description: 'يبحث عن كتاب باسمه فيعيد معرّفه', parameters: P({ query: S }, ['query']) },
  { name: 'find_hadith_by_number', description: 'يجد معرّف حديث برقمه في كتاب', parameters: P({ book_id: I, number: S }, ['book_id', 'number']) },
  { name: 'get_hadith', description: 'نص الحديث واسم كتابه ورقمه', parameters: P({ hadith_id: I }, ['hadith_id']) },
  { name: 'get_chains', description: 'أسانيد الحديث من الصحابي إلى المصنف', parameters: P({ hadith_id: I }, ['hadith_id']) },
  { name: 'get_judgments', description: 'أحكام العلماء على الحديث', parameters: P({ hadith_id: I }, ['hadith_id']) },
  { name: 'find_narrator', description: 'يبحث عن راوٍ باسمه فيعيد معرّفه', parameters: P({ name: S }, ['name']) },
  { name: 'get_narrator', description: 'ترجمة الراوي ومرتبته وأقوال الجرح والتعديل فيه', parameters: P({ narrator_id: I }, ['narrator_id']) },
]
export const WEB_DECL = { name: 'web_research', description: 'بحث في الويب خارج الجامع لتوسيع البحث؛ نتائجه من خارج قاعدة الجامع فتُنسب إلى مصادرها ولا تُنسب إلى كتاب في الجامع', parameters: P({ query: S }, ['query']) }

export const SYSTEM_RESEARCH = `أنت باحث شرعي أكاديمي داخل موسوعة «الجامع» للحديث النبوي. تعمل بالأدوات على قاعدة الجامع المحلية وتحلّل وتناقش بأعلى مستوى.
المنهج: (١) استخرج النصوص والأسانيد وأقوال العلماء من الأدوات قبل أي استنتاج، وانقل النص حرفيًا بين تنصيص مع الكتاب والرقم. (٢) ميّز دائمًا بين المنقول من الجامع وبين استنباطك وبين ما جاء من الويب. (٣) اعرض الأقوال والخلاف وأدلة كل قول وجه الترجيح بإنصاف، وبيّن حدود البحث وما لم تجده. (٤) لا تختلق إسنادًا ولا حكمًا ولا رقمًا، وما تعذّر على الأدوات فقل إنه لم يوجد. (٥) لا تفتِ فتوى شخصية؛ أحِل إلى أهل العلم.
اكتب بالعربية الفصحى المنظَّمة.`

export async function pickGeminiModel(key, fetchFn = fetch) {
  const r = await fetchFn(`${API}/models?key=${key}`)
  if (!r.ok) throw new Error(r.status === 400 || r.status === 403 ? 'المفتاح غير صحيح' : 'تعذّر جلب النماذج (' + r.status + ')')
  const ids = ((await r.json()).models || []).filter(m => (m.supportedGenerationMethods || []).includes('generateContent')).map(m => m.name.replace('models/', ''))
  const good = ids.filter(i => /^gemini-[\d.]+-(pro|flash)$/.test(i)).sort((a, b) => parseFloat(b.match(/[\d.]+/)[0]) - parseFloat(a.match(/[\d.]+/)[0]) || (b.endsWith('pro') ? 1 : -1))
  const pick = good[0] || ids.find(i => /flash/.test(i)) || ids[0]
  if (!pick) throw new Error('لا نموذج متاح لهذا المفتاح')
  return pick
}

async function gen(key, model, body, fetchFn) {
  const r = await fetchFn(`${API}/models/${model}:generateContent?key=${key}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
  if (!r.ok) throw new Error(r.status === 429 ? 'بلغتَ حدّ الاستعمال المجاني الآن؛ أعد المحاولة بعد قليل.' : 'تعذّر الجواب (' + r.status + ')')
  return r.json()
}

// بحث الويب: طلب منفصل بأداة googleSearch (لا تُجمع مع الدوال في الطلب نفسه)
export async function webResearch({ key, model, query, fetchFn = fetch }) {
  const j = await gen(key, model, { contents: [{ role: 'user', parts: [{ text: query }] }], tools: [{ googleSearch: {} }] }, fetchFn)
  const c = j.candidates?.[0]
  const text = (c?.content?.parts || []).map(p => p.text || '').join('')
  const sources = (c?.groundingMetadata?.groundingChunks || []).map(g => g.web && { title: g.web.title, url: g.web.uri }).filter(Boolean).slice(0, 8)
  return { text: text.slice(0, 4000), sources, note: 'من خارج الجامع' }
}

export async function runGeminiAgent({ db, key, model, question, history = [], web = false, maxSteps = 10, fetchFn = fetch, onStep = () => {} }) {
  const decls = web ? [...DECLS, WEB_DECL] : DECLS
  const contents = [...history.map(t => ({ role: t.role === 'user' ? 'user' : 'model', parts: [{ text: t.content }] })), { role: 'user', parts: [{ text: question }] }]
  const trace = []
  for (let i = 0; i < maxSteps; i++) {
    const j = await gen(key, model, { systemInstruction: { parts: [{ text: SYSTEM_RESEARCH }] }, contents, tools: [{ functionDeclarations: decls }], generationConfig: { temperature: 0.2 } }, fetchFn)
    const parts = j.candidates?.[0]?.content?.parts || []
    const calls = parts.filter(p => p.functionCall)
    if (!calls.length) { const answer = parts.map(p => p.text || '').join('').trim(); trace.push({ final: answer }); return { answer: answer || 'لم يصلني جواب.', trace } }
    contents.push({ role: 'model', parts })
    const resp = []
    for (const { functionCall: fc } of calls) {
      let result
      try {
        if (fc.name === 'web_research' && web) result = await webResearch({ key, model, query: strip(fc.args?.query), fetchFn })
        else if (TOOLS[fc.name]) result = await TOOLS[fc.name](db, fc.args || {})
        else result = { error: 'unknown_tool' }
      } catch (e) { result = { error: 'tool_failed', message: String(e.message || e).slice(0, 120) } }
      trace.push({ call: fc, result }); onStep(fc, result)
      resp.push({ functionResponse: { name: fc.name, response: { result } } })
    }
    contents.push({ role: 'user', parts: resp })
  }
  return { answer: 'تعذّر إكمال البحث بعدد خطوات معقول.', trace }
}
