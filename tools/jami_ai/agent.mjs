// حلقة الوكيل: النموذج يولّد نصًّا؛ كلما ظهر <أداة>{…}</أداة> نفّذنا الأداة على القاعدة وأعدنا <نتيجة>…</نتيجة> ثم تابع النموذج.
// generate(prompt, stops) ← نص يتوقف عند أحد stops (مثل «</أداة>» و«<نهاية>»). التطبيق يمرّر محرك النموذج المحلي؛ الاختبار يمرّر نموذجًا مزيَّفًا.
import { TOOLS } from './tools.mjs'

export const MAX_STEPS = 6
export function parseCall(s) {
  const m = s.match(/<أداة>([\s\S]*?)<\/أداة>/)
  if (!m) return null
  try { const c = JSON.parse(m[1]); return c && typeof c.name === 'string' ? c : { error: 'bad_call' } } catch { return { error: 'bad_json' } }
}

export async function runAgent({ db, generate, question, history = [] }) {
  let prompt = history.map(t => t.role === 'user' ? '<مستخدم>' + t.content + '\n' : '<مساعد>' + t.content + '\n').join('') + '<مستخدم>' + question + '\n'
  const trace = []
  for (let i = 0; i < MAX_STEPS; i++) {
    const out = await generate(prompt + '<مساعد>', ['</أداة>', '<نهاية>'])
    const call = parseCall(out + (out.includes('<أداة>') && !out.includes('</أداة>') ? '</أداة>' : ''))
    if (!call) {   // جواب نهائي
      const answer = out.replace('<نهاية>', '').trim()
      trace.push({ final: answer }); return { answer, trace }
    }
    let result
    if (call.error || !TOOLS[call.name]) result = { error: call.error || 'unknown_tool' }
    else { try { result = await TOOLS[call.name](db, call.args || {}) } catch (e) { result = { error: 'tool_failed' } } }
    trace.push({ call, result })
    prompt += '<مساعد><أداة>' + JSON.stringify(call) + '</أداة>\n<نتيجة>' + JSON.stringify(result) + '</نتيجة>\n'
  }
  return { answer: 'تعذّر إكمال الطلب بعدد خطوات معقول.', trace }
}
