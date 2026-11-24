// لوحة الذكاء داخل الجامع: نواة المحلية (دون إنترنت) وجيميناي (مفتوح دائمًا عند الاتصال وبوجود المفتاح)، ومفتاح اختيار المحرك بجانب «نواة».
// الأدوات تعمل على القاعدة المحلية نفسها. المفتاح يُحفظ على هذا الجهاز فقط.
import { useEffect, useRef, useState } from 'react'
// @ts-ignore وحدات مشتركة مع مسار التدريب
import { nawaLocal } from '@/lib/ai/nawa_local.mjs'
// @ts-ignore
import { runGeminiAgent, pickGeminiModel } from '@/lib/ai/gemini.mjs'

type Engine = 'auto' | 'nawa' | 'gemini'
type Msg = { role: 'user' | 'assistant'; content: string; meta?: string }
const KEY = 'nawa-gemini-key', ENG = 'nawa-engine'
const ls = {
  get: (k: string) => { try { return localStorage.getItem(k) } catch { return null } },
  set: (k: string, v: string) => { try { localStorage.setItem(k, v) } catch {} },
  del: (k: string) => { try { localStorage.removeItem(k) } catch {} },
}

export default function AskPanel({ db }: { db: { query: (t: string, p?: unknown[]) => Promise<{ rows: any[] }> } }) {
  const [open, setOpen] = useState(false)
  const [engine, setEngine] = useState<Engine>((ls.get(ENG) as Engine) || 'auto')
  const [key, setKey] = useState(ls.get(KEY) || '')
  const [keyDraft, setKeyDraft] = useState('')
  const [online, setOnline] = useState(typeof navigator === 'undefined' ? true : navigator.onLine)
  const [msgs, setMsgs] = useState<Msg[]>([])
  const [q, setQ] = useState('')
  const [busy, setBusy] = useState(false)
  const model = useRef<string | null>(null)
  const end = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const on = () => setOnline(true), off = () => setOnline(false)
    window.addEventListener('online', on); window.addEventListener('offline', off)
    return () => { window.removeEventListener('online', on); window.removeEventListener('offline', off) }
  }, [])
  useEffect(() => { end.current?.scrollIntoView({ block: 'end' }) }, [msgs, busy])

  const effective: 'nawa' | 'gemini' = engine === 'nawa' ? 'nawa' : engine === 'gemini' ? 'gemini' : (online && key ? 'gemini' : 'nawa')
  const pick = (e: Engine) => { setEngine(e); ls.set(ENG, e) }

  async function send() {
    const question = q.trim(); if (!question || busy) return
    setQ(''); setBusy(true)
    const history = msgs.map(m => ({ role: m.role === 'user' ? 'user' : 'model', content: m.content }))
    setMsgs(m => [...m, { role: 'user', content: question }])
    try {
      let answer: string, meta: string
      if (effective === 'gemini') {
        if (!key) throw new Error('أدخل مفتاح جيميناي أولًا.')
        if (!online) throw new Error('جيميناي يحتاج اتصالًا. اختر «نواة» أو «تلقائي» للعمل دون إنترنت.')
        if (!model.current) model.current = await pickGeminiModel(key)
        const r = await runGeminiAgent({ db, key, model: model.current, question, history, web: true })
        answer = r.answer
        const used = new Set<string>((r.trace || []).filter((s: any) => s.call).map((s: any) => s.call.name))
        meta = 'جيميناي · ' + (used.size ? [...used].map(n => n === 'web_research' ? 'بحث في الويب' : 'أدوات الجامع').filter((v, i, a) => a.indexOf(v) === i).join(' + ') : 'دون أدوات')
      } else {
        const r = await nawaLocal({ db, question })
        answer = r.answer; meta = 'نواة · محلي'
      }
      setMsgs(m => [...m, { role: 'assistant', content: answer, meta }])
    } catch (e: any) {
      if (/المفتاح/.test(String(e?.message))) { model.current = null }
      setMsgs(m => [...m, { role: 'assistant', content: String(e?.message || e), meta: 'خطأ' }])
    } finally { setBusy(false) }
  }

  const seg = (e: Engine, label: string) => (
    <button type="button" onClick={() => pick(e)} style={{ flex: 1, padding: '6px 4px', border: 0, cursor: 'pointer', fontFamily: 'inherit', fontSize: 13,
      background: engine === e ? '#1B2A5C' : 'transparent', color: engine === e ? '#fff' : '#1B2A5C' }}>{label}</button>
  )

  return (
    <div dir="rtl" style={{ position: 'fixed', insetInlineStart: 16, bottom: 16, zIndex: 90, fontFamily: 'inherit' }}>
      {!open && (
        <button type="button" onClick={() => setOpen(true)} aria-label="نواة"
          style={{ background: '#1B2A5C', color: '#E8D3A0', border: 0, borderRadius: 999, padding: '10px 18px', fontSize: 16, fontWeight: 700, boxShadow: '0 4px 14px rgba(0,0,0,.25)', cursor: 'pointer' }}>
          نواة
        </button>
      )}
      {open && (
        <div style={{ width: 'min(92vw, 400px)', height: 'min(80vh, 560px)', display: 'flex', flexDirection: 'column', background: '#fff', color: '#1a1a1a', border: '1px solid #cfd3e3', borderRadius: 16, boxShadow: '0 10px 30px rgba(0,0,0,.3)', overflow: 'hidden' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', background: '#1B2A5C', color: '#E8D3A0' }}>
            <b style={{ flex: 1 }}>نواة</b>
            <span style={{ fontSize: 11, opacity: .85 }}>{effective === 'gemini' ? 'جيميناي' : 'محلي'} · {online ? 'متصل' : 'دون إنترنت'}</span>
            <button type="button" onClick={() => setOpen(false)} aria-label="إغلاق" style={{ background: 'transparent', border: 0, color: '#E8D3A0', fontSize: 18, cursor: 'pointer' }}>×</button>
          </div>
          <div style={{ display: 'flex', border: '1px solid #1B2A5C', borderRadius: 8, margin: 8, overflow: 'hidden' }}>
            {seg('auto', 'تلقائي')}{seg('nawa', 'نواة')}{seg('gemini', 'جيميناي')}
          </div>
          {engine !== 'nawa' && !key && (
            <div style={{ margin: '0 8px 8px', fontSize: 12, lineHeight: 1.7 }}>
              مفتاح جيميناي مجاني، يُنشأ مرة واحدة من <a href="https://aistudio.google.com/apikey" target="_blank" rel="noreferrer" style={{ color: '#1B2A5C', textDecoration: 'underline' }}>aistudio.google.com/apikey</a> ثم يُلصق هنا ويبقى على جهازك.
              <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
                <input value={keyDraft} onChange={e => setKeyDraft(e.target.value)} dir="ltr" placeholder="AIza…" style={{ flex: 1, border: '1px solid #cfd3e3', borderRadius: 6, padding: '4px 6px' }} />
                <button type="button" onClick={() => { const k = keyDraft.trim(); if (k) { ls.set(KEY, k); setKey(k); setKeyDraft(''); model.current = null } }} style={{ background: '#1B2A5C', color: '#fff', border: 0, borderRadius: 6, padding: '4px 10px', cursor: 'pointer' }}>حفظ</button>
              </div>
            </div>
          )}
          {engine !== 'nawa' && key && (
            <div style={{ margin: '0 8px 6px', fontSize: 11, color: '#555' }}>
              المفتاح محفوظ على جهازك. <button type="button" onClick={() => { ls.del(KEY); setKey(''); model.current = null }} style={{ background: 'none', border: 0, color: '#1B2A5C', textDecoration: 'underline', cursor: 'pointer', fontSize: 11 }}>حذف</button>
              {' '}· عند استعمال جيميناي تُرسَل إلى جوجل مقتطفات الأدوات اللازمة للجواب.
            </div>
          )}
          <div style={{ flex: 1, overflowY: 'auto', padding: '0 10px', fontSize: 14, lineHeight: 1.9 }}>
            {msgs.length === 0 && <p style={{ color: '#666', fontSize: 13 }}>اسأل عن حديث برقمه («حديث رقم ٣٣ في صحيح البخاري») أو راوٍ («ترجمة سفيان الثوري»)، أو ابحث بحثًا أعمق عبر جيميناي.</p>}
            {msgs.map((m, i) => (
              <div key={i} style={{ margin: '8px 0', padding: '8px 10px', borderRadius: 10, background: m.role === 'user' ? '#eef0f8' : '#faf6ec', whiteSpace: 'pre-wrap' }}>
                {m.content}
                {m.meta && <div style={{ fontSize: 11, color: '#777', marginTop: 4 }}>{m.meta}</div>}
              </div>
            ))}
            {busy && <div style={{ color: '#777', fontSize: 13 }}>جارٍ البحث…</div>}
            <div ref={end} />
          </div>
          <form onSubmit={e => { e.preventDefault(); send() }} style={{ display: 'flex', gap: 6, padding: 8, borderTop: '1px solid #e3e5ef' }}>
            <input value={q} onChange={e => setQ(e.target.value)} placeholder="اكتب سؤالك" style={{ flex: 1, border: '1px solid #cfd3e3', borderRadius: 8, padding: '8px 10px', fontSize: 14, fontFamily: 'inherit' }} />
            <button type="submit" disabled={busy} style={{ background: '#1B2A5C', color: '#fff', border: 0, borderRadius: 8, padding: '8px 14px', cursor: 'pointer', fontFamily: 'inherit' }}>إرسال</button>
          </form>
        </div>
      )}
    </div>
  )
}
