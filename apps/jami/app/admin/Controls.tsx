'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'

// The period picker at the top of /admin: presets, any single day, any from–to range, the previous
// and next period, and the time zone the days are counted in. Everything lives in the address, so
// a period can be bookmarked or shared.

type Props = {
  from: string; to: string; tz: string; today: string; first: string; preset: string | null; days: number
  presets: [string, string][]; tzs: [string, string][]; defaultTz: string
  prev: string; next: string | null
}

export default function Controls(p: Props) {
  const router = useRouter()
  const [pending, start] = useTransition()
  const [from, setFrom] = useState(p.from)
  const [to, setTo] = useState(p.to)
  const go = (params: Record<string, string>) => {
    const sp = new URLSearchParams(params)
    const tz = params.tz ?? p.tz
    if (tz === p.defaultTz) sp.delete('tz'); else sp.set('tz', tz)
    start(() => router.push(`/admin?${sp}`))
  }
  const tzQ = p.tz === p.defaultTz ? '' : `&tz=${encodeURIComponent(p.tz)}`
  const btn = 'rounded-lg border px-3 py-1.5 whitespace-nowrap transition-colors'
  const off = 'border-border text-gray-600 hover:border-green-700 hover:text-green-800'
  const on = 'border-green-800 bg-green-800 text-white'
  const input = 'rounded-lg border border-border bg-surface px-2 py-1.5 text-gray-700 tabular-nums'

  return (
    <div className={`ui-card rounded-xl p-3 sm:p-4 space-y-3 text-sm sm:text-[1.1rem] ${pending ? 'opacity-60' : ''}`} aria-busy={pending}>
      <div className="flex flex-wrap items-center gap-2">
        {p.presets.map(([k, label]) => (
          <Link key={k} href={`/admin?r=${k}${tzQ}`} className={`${btn} ${p.preset === k ? on : off}`}>{label}</Link>
        ))}
        <span className="mx-1 h-6 w-px bg-border hidden sm:block" />
        <label className="inline-flex items-center gap-2 text-gray-500">
          يوم
          <input type="date" className={input} min={p.first} max={p.today} value={p.days === 1 ? p.from : ''}
            onChange={e => e.target.value && go({ from: e.target.value, to: e.target.value })} />
        </label>
      </div>
      <form className="flex flex-wrap items-center gap-2" onSubmit={e => { e.preventDefault(); go({ from, to }) }}>
        <Link href={p.prev} className={`${btn} ${off}`} title="الفترة السابقة">→ السابق</Link>
        {p.next ? <Link href={p.next} className={`${btn} ${off}`} title="الفترة التالية">التالي ←</Link>
          : <span className={`${btn} border-border text-gray-300`}>التالي ←</span>}
        <span className="mx-1 h-6 w-px bg-border hidden sm:block" />
        <label className="inline-flex items-center gap-2 text-gray-500">من
          <input type="date" className={input} min={p.first} max={p.today} value={from} onChange={e => setFrom(e.target.value)} required />
        </label>
        <label className="inline-flex items-center gap-2 text-gray-500">إلى
          <input type="date" className={input} min={p.first} max={p.today} value={to} onChange={e => setTo(e.target.value)} required />
        </label>
        <button type="submit" className={`${btn} ${off}`}>عرض</button>
        <label className="inline-flex items-center gap-2 text-gray-500 sm:ms-auto">بتوقيت
          <select className={input} value={p.tz} onChange={e => go({ ...(p.preset ? { r: p.preset } : { from: p.from, to: p.to }), tz: e.target.value })}>
            {p.tzs.map(([z, label]) => <option key={z} value={z}>{label}</option>)}
            {!p.tzs.some(([z]) => z === p.tz) && <option value={p.tz}>{p.tz}</option>}
          </select>
        </label>
      </form>
    </div>
  )
}
