'use client'
// لوحة نواة حين يعمل الجامع من الخادم: الأدوات تستعلم عبر /api/ai/q. (في وضع الجهاز تركّب اللوحة نفسها من الوقت التشغيلي.)
import { useEffect, useState } from 'react'
import AskPanel from '@/lib/offline/runtime/AskPanel'

const db = {
  async query(text: string, params?: unknown[]) {
    const r = await fetch('/api/ai/q', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ text, params: params ?? [] }) })
    const j = await r.json()
    if (!r.ok) throw new Error(j.message || j.error || 'query failed')
    return { rows: j.rows as any[] }
  },
}

export default function AskNawaOnline() {
  const [on, setOn] = useState(false)
  useEffect(() => { setOn(!('__OFFLINE_TARGET' in window)) }, [])
  if (!on) return null
  return <AskPanel db={db} />
}
