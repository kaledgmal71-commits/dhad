'use client'

import { useEffect } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'

// Counts a page view (first load, each client-side navigation, and each new search on the same page)
// for the /admin statistics, with the search words, the browser's language and its time zone (the
// country, without looking up anyone's address). sendBeacon queues it without delaying anything; no
// cookies, nothing stored in the browser. Rendered inside <Suspense> (useSearchParams).
// The path last counted: a change of path counts at once, a change of only the search words waits
let lastPath = ''

export default function Analytics() {
  const pathname = usePathname()
  const q = (useSearchParams().get('q') ?? '').trim()
  useEffect(() => {
    // Pages read from the device's copy (the offline app) have no server to count them
    if (!pathname || pathname.startsWith('/admin') || pathname.startsWith('/offline') || '__OFFLINE_TARGET' in window) return
    let tz = ''
    try { tz = Intl.DateTimeFormat().resolvedOptions().timeZone ?? '' } catch { /* old browser */ }
    const data = JSON.stringify({ p: pathname, r: document.referrer, q, l: navigator.language, z: tz })
    const send = () => {
      try {
        if (!navigator.sendBeacon?.('/api/track', new Blob([data], { type: 'application/json' }))) {
          fetch('/api/track', { method: 'POST', body: data, headers: { 'Content-Type': 'application/json' }, keepalive: true }).catch(() => {})
        }
      } catch { /* never let statistics break a page */ }
    }
    // A new search on the same page waits a moment, so words still being typed into the address count once
    const samePath = lastPath === pathname
    lastPath = pathname
    if (!samePath) { send(); return }
    const t = setTimeout(send, 1500)
    return () => clearTimeout(t)
  }, [pathname, q])
  return null
}
