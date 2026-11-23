import pool from '@/lib/db'
import { clientIp, deviceOf, isBot, parseUA, visitorHash } from '@/lib/analytics'

export const dynamic = 'force-dynamic'

const clip = (v: unknown, max: number) => {
  const s = typeof v === 'string' ? v.trim() : ''
  return s ? s.slice(0, max) : null
}

// Page-view beacon from app/components/Analytics (navigator.sendBeacon, so it never slows the page).
// Body: p path, r referrer, q search words, l navigator.language, z the browser's time zone.
export async function POST(req: Request) {
  const body = await req.json().catch(() => null) as { p?: string; r?: string; q?: string; l?: string; z?: string } | null
  const path = String(body?.p ?? '').slice(0, 300)
  if (!path.startsWith('/')) return new Response(null, { status: 204 })
  const ua = req.headers.get('user-agent') ?? ''
  let refHost: string | null = null
  try {
    const r = body?.r ? new URL(body.r) : null
    if (r && !/(^|\.)hadith\.dev$|railway\.app$|localhost/.test(r.hostname)) refHost = r.hostname.replace(/^www\./, '')
  } catch { /* not a URL */ }
  const { browser, os } = parseUA(ua)
  const tz = clip(body?.z, 48)
  await pool.query(
    `INSERT INTO page_views (path, referrer_host, visitor, is_bot, device, browser, os, lang, tz, q)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
    [path, refHost, visitorHash(clientIp(req), ua), isBot(ua), deviceOf(ua), browser, os,
      clip(body?.l, 16), tz && /^[A-Za-z_]+(\/[A-Za-z0-9_+-]+)*$/.test(tz) ? tz : null, clip(body?.q, 120)],
  ).catch(err => console.error('[page_views]', err.message))
  return new Response(null, { status: 204 })
}
