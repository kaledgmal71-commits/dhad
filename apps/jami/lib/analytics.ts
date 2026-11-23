// First-party statistics for /admin (tables: db/add_analytics.js). No cookies: a visitor is a hash
// of IP + browser + day, so the same person counts once a day and cannot be followed across days.
import { createHash } from 'node:crypto'
import pool from '@/lib/db'

const BOT_UA = /bot|crawl|spider|slurp|bingpreview|facebookexternalhit|whatsapp|telegram|slack|discord|preview|headless|lighthouse|python|curl|wget|httpclient|okhttp|axios|node-fetch|go-http|java\/|ahrefs|semrush|mj12|petal|yandex|baidu|duckduck|gptbot|claude|perplexity|bytespider|amazonbot|applebot|isnad-project/i

export const isBot = (ua: string) => !ua || BOT_UA.test(ua)
export const deviceOf = (ua: string) => /mobile|android|iphone|ipad/i.test(ua) ? 'mobile' : 'desktop'

// A crawler's own name, for the dashboard's list of crawlers (first match wins)
const BOT_NAMES: [RegExp, string][] = [
  [/googlebot|google-inspectiontool|adsbot-google|mediapartners-google|google-extended|googleother/i, 'Googlebot'],
  [/bingbot|bingpreview|msnbot/i, 'Bingbot'], [/gptbot|chatgpt-user|oai-searchbot/i, 'OpenAI'],
  [/claudebot|claude-user|claude-searchbot|anthropic/i, 'Claude'], [/perplexity/i, 'Perplexity'],
  [/applebot/i, 'Applebot'], [/yandex/i, 'Yandex'], [/baiduspider/i, 'Baidu'], [/bytespider/i, 'Bytespider'],
  [/amazonbot/i, 'Amazonbot'], [/ahrefs/i, 'Ahrefs'], [/semrush/i, 'Semrush'], [/mj12bot/i, 'Majestic'],
  [/petalbot/i, 'PetalBot'], [/duckduck/i, 'DuckDuckGo'], [/facebookexternalhit|meta-externalagent|facebookbot/i, 'Meta'],
  [/whatsapp/i, 'WhatsApp'], [/telegram/i, 'Telegram'], [/twitterbot/i, 'X'], [/slack/i, 'Slack'], [/discord/i, 'Discord'],
  [/headlesschrome|headless/i, 'Headless Chrome'], [/lighthouse/i, 'Lighthouse'], [/isnad-project/i, 'isnad-project'],
  [/python/i, 'Python'], [/curl/i, 'curl'], [/wget/i, 'wget'], [/node-fetch|axios|undici/i, 'Node'], [/go-http/i, 'Go'],
]

/** Browser (or the crawler's name) and operating system, from the user agent. */
export function parseUA(ua: string): { browser: string; os: string } {
  const os = /windows/i.test(ua) ? 'Windows' : /android/i.test(ua) ? 'Android' : /iphone|ipad|ipod/i.test(ua) ? 'iOS'
    : /cros/i.test(ua) ? 'ChromeOS' : /mac os x|macintosh/i.test(ua) ? 'macOS' : /linux/i.test(ua) ? 'Linux' : 'أخرى'
  if (isBot(ua)) {
    const named = BOT_NAMES.find(([re]) => re.test(ua))?.[1]
    const generic = ua.match(/([\w.-]*(?:bot|crawler|spider))\b/i)?.[1]
    return { browser: named ?? generic?.slice(0, 40) ?? (ua ? 'أخرى' : '(دون هوية)'), os }
  }
  const browser = /FBAN|FBAV|FB_IAB/.test(ua) ? 'Facebook (داخل التطبيق)' : /Instagram/.test(ua) ? 'Instagram (داخل التطبيق)'
    : /Edg(e|A|iOS)?\//.test(ua) ? 'Edge' : /OPR\/|Opera/.test(ua) ? 'Opera' : /SamsungBrowser/.test(ua) ? 'Samsung Internet'
    : /YaBrowser/.test(ua) ? 'Yandex' : /UCBrowser/.test(ua) ? 'UC Browser' : /Firefox|FxiOS/.test(ua) ? 'Firefox'
    : /CriOS|Chrome|Chromium/.test(ua) ? 'Chrome' : /Safari/.test(ua) ? 'Safari' : 'أخرى'
  return { browser, os }
}

export function clientIp(req: Request): string {
  return (req.headers.get('x-forwarded-for') ?? '').split(',')[0].trim() || 'local'
}

export function visitorHash(ip: string, ua: string): string {
  const day = new Date().toISOString().slice(0, 10)
  return createHash('sha256').update(`${ip}|${ua}|${day}|${process.env.ANALYTICS_SALT ?? 'hadith.dev'}`).digest('hex').slice(0, 16)
}

/** Records an MCP event without making the caller wait (a failure is only logged). */
export function logMcpEvent(e: { subject: string; userId: number | null; kind: 'connect' | 'call'; client?: string | null; tool?: string | null; ok?: boolean | null; ms?: number | null }) {
  pool.query(
    `INSERT INTO mcp_events (subject, user_id, kind, client, tool, ok, ms) VALUES ($1,$2,$3,$4,$5,$6,$7)`,
    [e.subject, e.userId, e.kind, e.client?.slice(0, 80) ?? null, e.tool ?? null, e.ok ?? null, e.ms ?? null],
  ).catch(err => console.error('[mcp_events]', err.message))
}
