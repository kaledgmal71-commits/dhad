// The period the /admin statistics show, from the address: ?r=<preset> or ?from=YYYY-MM-DD&to=YYYY-MM-DD,
// with &tz=<zone> for where a day begins and ends. Every earlier day can be opened: nothing is deleted.

export const DEFAULT_TZ = process.env.ADMIN_TZ || 'Australia/Sydney'
export const TZS: [string, string][] = [
  ['Australia/Sydney', 'سيدني'], ['Asia/Riyadh', 'مكة'], ['Africa/Cairo', 'القاهرة'], ['Europe/London', 'لندن'], ['UTC', 'UTC'],
]
// The first statistics (MCP from 29 September 2026, page views and accounts from 1 October)
export const FIRST_DAY = '2026-09-29'
export const COUNTED_FROM = '2026-10-01'
// Browser, system, language, country and search words are kept from this day on
export const DETAIL_SINCE = '2026-11-18'

export const PRESETS: [string, string][] = [
  ['today', 'اليوم'], ['yesterday', 'أمس'], ['7d', '٧ أيام'], ['30d', '٣٠ يومًا'], ['90d', '٩٠ يومًا'], ['all', 'الكل'],
]

const ISO = /^\d{4}-\d{2}-\d{2}$/
const DAY = 86400000
export const addDays = (d: string, n: number) => new Date(Date.parse(d + 'T00:00:00Z') + n * DAY).toISOString().slice(0, 10)
export const daysBetween = (a: string, b: string) => Math.round((Date.parse(b) - Date.parse(a)) / DAY)

function validTz(tz: string) {
  try { new Intl.DateTimeFormat('en', { timeZone: tz }); return true } catch { return false }
}

export function todayIn(tz: string) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date())
}

export type Range = {
  tz: string; today: string; preset: string | null
  from: string; to: string; days: number
  prevFrom: string; prevTo: string   // the same number of days just before
}

type SP = Record<string, string | string[] | undefined>
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? ''

export function parseRange(sp: SP): Range {
  const tzIn = one(sp.tz)
  const tz = tzIn && validTz(tzIn) ? tzIn : DEFAULT_TZ
  const today = todayIn(tz)
  let from = one(sp.from), to = one(sp.to)
  let preset: string | null = null
  if (ISO.test(one(sp.day))) from = to = one(sp.day)
  if (!ISO.test(from) || !ISO.test(to)) {
    preset = PRESETS.some(([k]) => k === one(sp.r)) ? one(sp.r) : '7d'
    to = preset === 'yesterday' ? addDays(today, -1) : today
    from = preset === 'today' ? today : preset === 'yesterday' ? to
      : preset === 'all' ? FIRST_DAY : addDays(today, -(parseInt(preset) - 1))
  }
  if (from > to) [from, to] = [to, from]
  if (to > today) to = today
  if (from > to) from = to
  if (from < FIRST_DAY) from = FIRST_DAY
  if (to < FIRST_DAY) to = FIRST_DAY
  const days = daysBetween(from, to) + 1
  return { tz, today, preset, from, to, days, prevFrom: addDays(from, -days), prevTo: addDays(from, -1) }
}

export function rangeHref(r: { from: string; to: string; tz: string }) {
  const p = new URLSearchParams({ from: r.from, to: r.to })
  if (r.tz !== DEFAULT_TZ) p.set('tz', r.tz)
  return `/admin?${p}`
}

const fmt = (d: string, o: Intl.DateTimeFormatOptions) =>
  new Intl.DateTimeFormat('ar-u-nu-latn', { timeZone: 'UTC', ...o }).format(new Date(d + 'T00:00:00Z'))

/** «الثلاثاء 17 نوفمبر 2026», or «10 – 17 نوفمبر 2026» */
export function rangeLabel(r: Range) {
  if (r.days === 1) return fmt(r.from, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
  const sameYear = r.from.slice(0, 4) === r.to.slice(0, 4)
  return `${fmt(r.from, { day: 'numeric', month: 'long', ...(sameYear ? {} : { year: 'numeric' }) })} – ${fmt(r.to, { day: 'numeric', month: 'long', year: 'numeric' })}`
}
