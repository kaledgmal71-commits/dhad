import Link from 'next/link'
import pool from '@/lib/db'
import Controls from './Controls'
import { COUNTED_FROM, DEFAULT_TZ, DETAIL_SINCE, FIRST_DAY, PRESETS, TZS, addDays, parseRange, rangeHref, rangeLabel } from './range'
import { CHANNELS, channelOf, countryOf, decodePath, idsIn, langOf, pageName, type Names } from './labels'

// The statistics themselves, rendered by app/admin/page.tsx once the reader is signed in, an admin and
// unlocked. Everything follows the period chosen at the top (range.ts) — a single day shows its hours,
// a longer period its days, each day a link to that day — and is compared with the period just before.
// A "visit" is one visitor's pages on one day: the visitor hash changes daily (lib/analytics.ts).
// Sizes are set for this page: the site's root font is 70% from 640px up.

type Row = Record<string, unknown>
const q = async <T extends Row = Row>(sql: string, params: unknown[] = []) =>
  (await pool.query<T>(sql, params).catch(e => { console.error('[admin]', e.message); return { rows: [] as T[] } })).rows

const num = (v: unknown) => Number(v ?? 0)
const n = (v: unknown) => num(v).toLocaleString('en')
// Numbers read left to right; a value with Arabic letters in it («5د 44ث», «جديد») right to left
const dirOf = (v: unknown) => /[؀-ۿ]/.test(String(v ?? '')) ? 'rtl' : 'ltr'
const pct = (a: unknown, b: unknown) => num(b) ? `${Math.round((num(a) / num(b)) * 100)}%` : '—'
function dur(v: unknown) {
  if (v == null || !Number.isFinite(Number(v))) return '—'
  const s = Math.round(Number(v))
  if (s < 60) return `${s}ث`
  if (s < 3600) return `${Math.floor(s / 60)}د ${s % 60}ث`
  return `${Math.floor(s / 3600)}س ${Math.floor((s % 3600) / 60)}د`
}

// Pages people read (not crawlers), in the period
const HUMAN = `NOT is_bot AND ts >= $1 AND ts < $2`

export default async function Dashboard({ searchParams, lockForm }: { searchParams: Record<string, string | string[] | undefined>; lockForm?: React.ReactNode }) {
  const r = parseRange(searchParams)
  const hourly = r.days === 1
  // Where the period's days begin and end in the chosen time zone
  const [b] = await q<{ s: Date; e: Date; ps: Date }>(
    `SELECT ($1::date::timestamp AT TIME ZONE $4) s, ($2::date::timestamp AT TIME ZONE $4) e, ($3::date::timestamp AT TIME ZONE $4) ps`,
    [r.from, addDays(r.to, 1), r.prevFrom, r.tz])
  if (!b) return <p className="text-red-700">تعذّر الاتصال بقاعدة البيانات.</p>
  const P = [b.s, b.e, r.tz]
  const bucket = hourly ? `to_char(ts AT TIME ZONE $3, 'HH24')` : `to_char(ts AT TIME ZONE $3, 'YYYY-MM-DD')`

  const summary = (s: Date, e: Date) => q(`
    WITH v AS (SELECT visitor, COUNT(*) c, EXTRACT(epoch FROM MAX(ts) - MIN(ts)) dur FROM page_views
               WHERE NOT is_bot AND ts >= $1 AND ts < $2 GROUP BY visitor)
    SELECT COUNT(*) visits, COALESCE(SUM(c), 0) views, COUNT(*) FILTER (WHERE c = 1) bounces,
           percentile_cont(0.5) WITHIN GROUP (ORDER BY dur) FILTER (WHERE c > 1) med_dur,
           (SELECT COUNT(*) FROM page_views WHERE is_bot AND ts >= $1 AND ts < $2) bots,
           (SELECT COUNT(*) FROM page_views WHERE NOT is_bot AND q IS NOT NULL AND ts >= $1 AND ts < $2) searches,
           (SELECT COUNT(*) FROM users WHERE created_at >= $1 AND created_at < $2) signups,
           (SELECT COUNT(*) FROM mcp_events WHERE kind = 'call' AND ts >= $1 AND ts < $2) mcp_calls,
           (SELECT COUNT(DISTINCT subject) FROM mcp_events WHERE kind = 'call' AND ts >= $1 AND ts < $2) mcp_users
    FROM v`, [s, e])

  const [
    cur, prev, live, viewLine, hours, topPages, entries, searches, audience, sections, bots, sessions,
    signupLine, accounts, userTotals, mcpLine, tools, clients, mcpUsers, mcpErrors,
  ] = await Promise.all([
    summary(b.s, b.e), summary(b.ps, b.s),
    q(`SELECT COUNT(DISTINCT visitor) FILTER (WHERE ts > now() - interval '5 minutes') now5,
              COUNT(*) views30, COUNT(DISTINCT visitor) visitors30
       FROM page_views WHERE NOT is_bot AND ts > now() - interval '30 minutes'`),
    q(`SELECT ${bucket} k, COUNT(*) FILTER (WHERE NOT is_bot) human, COUNT(DISTINCT visitor) FILTER (WHERE NOT is_bot) visitors,
              COUNT(*) FILTER (WHERE is_bot) bot
       FROM page_views WHERE ts >= $1 AND ts < $2 GROUP BY 1`, P),
    hourly ? Promise.resolve([]) : q(`SELECT to_char(ts AT TIME ZONE $3, 'HH24') k, COUNT(*) human, COUNT(DISTINCT visitor) visitors
       FROM page_views WHERE ${HUMAN} GROUP BY 1`, P),
    // time on a page: until the visitor's next page, if that came within half an hour
    q(`WITH pv AS (SELECT path, visitor, ts, LEAD(ts) OVER (PARTITION BY visitor ORDER BY ts) nxt FROM page_views WHERE ${HUMAN})
       SELECT path, COUNT(*) views, COUNT(DISTINCT visitor) visitors,
              percentile_cont(0.5) WITHIN GROUP (ORDER BY EXTRACT(epoch FROM nxt - ts)) FILTER (WHERE nxt - ts < interval '30 minutes') med
       FROM pv GROUP BY 1 ORDER BY 2 DESC LIMIT 30`, [b.s, b.e]),
    // the first page of each visit, with where the visit came from
    q(`WITH f AS (SELECT DISTINCT ON (visitor) visitor, path, referrer_host FROM page_views WHERE ${HUMAN} ORDER BY visitor, ts),
            c AS (SELECT visitor, COUNT(*) c FROM page_views WHERE ${HUMAN} GROUP BY 1)
       SELECT f.path, f.referrer_host ref, COUNT(*) visits, COUNT(*) FILTER (WHERE c.c = 1) bounces, SUM(c.c) views
       FROM f JOIN c USING (visitor) GROUP BY 1, 2`, [b.s, b.e]),
    q(`SELECT q, COUNT(*) n, COUNT(DISTINCT visitor) visitors, MAX(ts) last FROM page_views
       WHERE ${HUMAN} AND q IS NOT NULL GROUP BY 1 ORDER BY 2 DESC, 4 DESC LIMIT 30`, [b.s, b.e]),
    q(`SELECT GROUPING(device) gd, GROUPING(browser) gb, GROUPING(os) go, GROUPING(split_part(lang, '-', 1)) gl,
              device, browser, os, split_part(lang, '-', 1) lang, tz, COUNT(*) views, COUNT(DISTINCT visitor) visitors
       FROM page_views WHERE ${HUMAN}
       GROUP BY GROUPING SETS ((device), (browser), (os), (split_part(lang, '-', 1)), (tz))`, [b.s, b.e]),
    q(`SELECT '/' || split_part(path, '/', 2) section, COUNT(*) FILTER (WHERE NOT is_bot) views,
              COUNT(DISTINCT visitor) FILTER (WHERE NOT is_bot) visitors, COUNT(*) FILTER (WHERE is_bot) bots
       FROM page_views WHERE ts >= $1 AND ts < $2 GROUP BY 1 ORDER BY 2 DESC LIMIT 20`, [b.s, b.e]),
    q(`SELECT browser bot, COUNT(*) views, COUNT(DISTINCT path) pages, MAX(ts) last FROM page_views
       WHERE is_bot AND ts >= $1 AND ts < $2 GROUP BY 1 ORDER BY 2 DESC LIMIT 20`, [b.s, b.e]),
    q(`SELECT visitor, MIN(ts) start, MAX(ts) last, COUNT(*) n, (array_agg(path ORDER BY ts))[1:20] paths,
              (array_agg(referrer_host ORDER BY ts))[1] ref, array_agg(DISTINCT q) FILTER (WHERE q IS NOT NULL) qs,
              MAX(device) device, MAX(browser) browser, MAX(os) os, MAX(tz) tz, MAX(lang) lang
       FROM page_views WHERE ${HUMAN} GROUP BY visitor ORDER BY MAX(ts) DESC LIMIT 40`, [b.s, b.e]),

    q(`SELECT ${bucket.replace(/ts AT/, 'created_at AT')} k, COUNT(*) n FROM users WHERE created_at >= $1 AND created_at < $2 GROUP BY 1`, P),
    q(`SELECT u.email, u.created_at, u.last_login_at,
              (SELECT COALESCE(SUM(calls), 0) FROM mcp_usage m WHERE m.subject = 'u:' || u.id) calls,
              (SELECT COUNT(*) FROM api_tokens t WHERE t.user_id = u.id AND t.revoked_at IS NULL) tokens
       FROM users u WHERE created_at >= $1 AND created_at < $2 ORDER BY u.created_at DESC LIMIT 50`, [b.s, b.e]),
    q(`SELECT COUNT(*) total,
              COUNT(*) FILTER (WHERE last_login_at > now() - interval '30 days') active,
              (SELECT COUNT(DISTINCT user_id) FROM api_tokens WHERE revoked_at IS NULL) with_tokens,
              (SELECT COUNT(DISTINCT user_id) FROM oauth_tokens WHERE kind = 'access') with_oauth
       FROM users`),
    q(`SELECT ${bucket} k, COUNT(*) FILTER (WHERE subject LIKE 'u:%') signed, COUNT(*) FILTER (WHERE subject LIKE 'ip:%') anon
       FROM mcp_events WHERE kind = 'call' AND ts >= $1 AND ts < $2 GROUP BY 1`, P),
    q(`SELECT tool, COUNT(*) calls, COUNT(DISTINCT subject) users, COUNT(*) FILTER (WHERE NOT ok) errors, ROUND(AVG(ms)) ms
       FROM mcp_events WHERE kind = 'call' AND ts >= $1 AND ts < $2 GROUP BY 1 ORDER BY 2 DESC`, [b.s, b.e]),
    q(`SELECT COALESCE(split_part(client, ' ', 1), '(unnamed)') client, COUNT(*) connects, COUNT(DISTINCT subject) users
       FROM mcp_events WHERE kind = 'connect' AND ts >= $1 AND ts < $2 GROUP BY 1 ORDER BY 2 DESC LIMIT 15`, [b.s, b.e]),
    q(`SELECT COALESCE(u.email, e.subject) who, COUNT(*) calls, COUNT(DISTINCT e.tool) tools, MAX(e.ts) last
       FROM mcp_events e LEFT JOIN users u ON e.subject = 'u:' || u.id
       WHERE e.kind = 'call' AND e.ts >= $1 AND e.ts < $2 GROUP BY 1 ORDER BY 2 DESC LIMIT 15`, [b.s, b.e]),
    q(`SELECT e.ts, e.tool, e.ms, COALESCE(u.email, e.subject) who FROM mcp_events e LEFT JOIN users u ON e.subject = 'u:' || u.id
       WHERE e.kind = 'call' AND NOT e.ok AND e.ts >= $1 AND e.ts < $2 ORDER BY e.ts DESC LIMIT 12`, [b.s, b.e]),
  ])

  // Names of the hadiths, narrators, books and topics in the pages' addresses
  const allPaths = [...topPages.map(x => String(x.path)), ...entries.map(x => String(x.path)), ...sessions.flatMap(x => (x.paths as string[]) ?? [])]
  const ids = idsIn(allPaths)
  const list = (s: Set<number>) => [...s].slice(0, 500)
  const [hn, nn, bn, tn] = await Promise.all([
    ids.hadith.size ? q(`SELECT main_id id, book_name || ' · ' || left(regexp_replace(COALESCE(NULLIF(tarf, ''), content, ''), '<[^>]*>', '', 'g'), 60) name
       FROM hadith_toc WHERE main_id = ANY($1::int[])`, [list(ids.hadith)]) : [],
    ids.narrator.size ? q(`SELECT id, COALESCE(NULLIF(esm_shuhra, ''), NULLIF(abb_name, ''), name) name FROM narrators WHERE id = ANY($1::int[])`, [list(ids.narrator)]) : [],
    ids.book.size ? q(`SELECT id, title name FROM books WHERE id = ANY($1::int[])`, [list(ids.book)]) : [],
    ids.topic.size ? q(`SELECT id, title name FROM subject_categories WHERE id = ANY($1::int[])`, [list(ids.topic)]) : [],
  ])
  const toMap = (rows: Row[]) => new Map(rows.map(x => [Number(x.id), String(x.name ?? '').trim()]))
  const names: Names = { hadith: toMap(hn), narrator: toMap(nn), book: toMap(bn), topic: toMap(tn) }
  const page = (path: unknown) => {
    const p = String(path)
    return { text: pageName(p, names), sub: decodePath(p), href: p }
  }

  // No comparison when the period before reaches back past the first page views (1 October 2026)
  const comparable = r.prevFrom >= COUNTED_FROM
  const c = cur[0] ?? {}, pv: Row = comparable ? prev[0] ?? {} : {}, lv = live[0] ?? {}, ut = userTotals[0] ?? {}

  // Visits by where they came from (the first page's referrer: later pages keep the same document.referrer)
  const channels = new Map<string, number>()
  const refs = new Map<string, { visits: number; views: number }>()
  const entryPages = new Map<string, { visits: number; bounces: number }>()
  for (const e of entries) {
    const ch = channelOf(e.ref as string | null)
    channels.set(ch, (channels.get(ch) ?? 0) + num(e.visits))
    if (e.ref) {
      const x = refs.get(String(e.ref)) ?? { visits: 0, views: 0 }
      x.visits += num(e.visits); x.views += num(e.views); refs.set(String(e.ref), x)
    }
    const y = entryPages.get(String(e.path)) ?? { visits: 0, bounces: 0 }
    y.visits += num(e.visits); y.bounces += num(e.bounces); entryPages.set(String(e.path), y)
  }
  const visitsTotal = num(c.visits)
  const topRefs = [...refs].sort((a, b) => b[1].visits - a[1].visits).slice(0, 20)
  const topEntries = [...entryPages].sort((a, b) => b[1].visits - a[1].visits).slice(0, 20)

  // Who: one grouping set each (the others are marked by GROUPING() = 1)
  const dim = (pick: (x: Row) => boolean, label: (x: Row) => string) => {
    const m = new Map<string, number>()
    for (const x of audience.filter(pick)) m.set(label(x), (m.get(label(x)) ?? 0) + num(x.visitors))
    return [...m].sort((a, b) => b[1] - a[1])
  }
  const isSet = (k: 'gd' | 'gb' | 'go' | 'gl') => (x: Row) => num(x[k]) === 0
  const devices = dim(isSet('gd'), x => x.device === 'mobile' ? 'جوال' : 'حاسوب')
  const browsers = dim(isSet('gb'), x => String(x.browser ?? '(غير مسجّل)'))
  const systems = dim(isSet('go'), x => String(x.os ?? '(غير مسجّل)'))
  const langs = dim(isSet('gl'), x => langOf(x.lang as string))
  const countries = dim(x => num(x.gd) + num(x.gb) + num(x.go) + num(x.gl) === 4, x => countryOf(x.tz as string | null))
  const audienceTotal = devices.reduce((a, [, v]) => a + v, 0) || 1
  const mobile = devices.find(([k]) => k === 'جوال')?.[1] ?? 0

  // The chart's columns: the day's 24 hours, or each day of the period
  const keys = hourly ? Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'))
    : Array.from({ length: r.days }, (_, i) => addDays(r.from, i))
  const line = (rows: Row[]) => {
    const by = new Map(rows.map(x => [String(x.k), x]))
    return keys.map(k => ({ ...(by.get(k) ?? {}), k }))
  }
  const dayHref = hourly ? undefined : (k: string) => rangeHref({ from: k, to: k, tz: r.tz })
  const keyLabel = (k: string) => hourly ? `${k}:00` : k.slice(5)

  const shift = (d: number) => ({ from: addDays(r.from, d), to: addDays(r.to, d), tz: r.tz })
  const nextR = shift(r.days)
  const detailNote = r.from < DETAIL_SINCE
  const time = (v: unknown) => fmtTime(v, r.tz, !hourly)

  return (
    <div dir="rtl" className="max-w-[1500px] mx-auto space-y-10">
      <header className="space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-[2.2rem] font-bold text-green-900">الإحصاءات</h1>
            <p className="text-lg sm:text-[1.5rem] text-gray-700 mt-1">{rangeLabel(r)}
              <span className="text-sm sm:text-[1.1rem] text-gray-400 ms-2">{r.days > 1 ? `${r.days} يومًا · ` : ''}بتوقيت {TZS.find(([z]) => z === r.tz)?.[1] ?? r.tz}</span>
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-left text-sm sm:text-[1.1rem] text-gray-500 whitespace-nowrap" title="زوار في آخر ٥ دقائق · مشاهدات وزوار في آخر ٣٠ دقيقة">
              <span className="inline-block w-2.5 h-2.5 rounded-full bg-green-600 me-1.5 animate-pulse" />
              الآن <b className="text-green-900 tabular-nums">{n(lv.now5)}</b>
              <span className="text-gray-400"> · ٣٠ د: {n(lv.views30)} مشاهدة، {n(lv.visitors30)} زائرًا</span>
            </div>
            {lockForm}
          </div>
        </div>
        <Controls key={`${r.from}|${r.to}|${r.tz}`} from={r.from} to={r.to} tz={r.tz} today={r.today} first={FIRST_DAY}
          preset={r.preset} days={r.days} presets={PRESETS} tzs={TZS} defaultTz={DEFAULT_TZ}
          prev={rangeHref(shift(-r.days))} next={nextR.from <= r.today ? rangeHref(nextR) : null} />
      </header>

      <Section title="نظرة عامة" note={comparable ? `المقارنة بـ ${r.days === 1 ? 'اليوم السابق' : `الأيام الـ${r.days} السابقة`}` : 'دون مقارنة: ما قبل الفترة يسبق بدء الإحصاءات'}>
        <div className={STATS}>
          <Stat label="مشاهدات الصفحات" value={n(c.views)} cur={c.views} prev={pv.views} />
          <Stat label="زيارات" value={n(c.visits)} cur={c.visits} prev={pv.visits} sub="زائرٌ في يوم" />
          <Stat label="صفحات في الزيارة" value={num(c.visits) ? (num(c.views) / num(c.visits)).toFixed(1) : '—'}
            cur={num(c.visits) ? num(c.views) / num(c.visits) : 0} prev={num(pv.visits) ? num(pv.views) / num(pv.visits) : 0} />
          <Stat label="غادروا من أول صفحة" value={pct(c.bounces, c.visits)}
            cur={num(c.visits) ? num(c.bounces) / num(c.visits) : 0} prev={num(pv.visits) ? num(pv.bounces) / num(pv.visits) : 0} lowerIsBetter />
          <Stat label="مدة الزيارة (الوسيط)" value={dur(c.med_dur)} cur={c.med_dur} prev={pv.med_dur} sub="للزيارات بأكثر من صفحة" />
          <Stat label="عمليات بحث" value={n(c.searches)} cur={c.searches} prev={pv.searches} />
          <Stat label="حسابات جديدة" value={n(c.signups)} cur={c.signups} prev={pv.signups} />
          <Stat label="طلبات MCP" value={n(c.mcp_calls)} cur={c.mcp_calls} prev={pv.mcp_calls} sub={`${n(c.mcp_users)} مستخدمًا`} />
          <Stat label="الجوال" value={pct(mobile, audienceTotal)} />
          <Stat label="زيارات الزواحف" value={n(c.bots)} cur={c.bots} prev={pv.bots} sub="منفصلة عن الزوار" neutral />
        </div>
        <Card>
          <Bars rows={line(viewLine)} label={keyLabel} href={dayHref} total={hourly ? 'اليوم' : `${r.days} يومًا`}
            series={[{ key: 'human', label: 'مشاهدات', color: '#9cc4ad' }, { key: 'visitors', label: 'زوار', color: '#2d6a4a' }]} overlay />
          {!hourly && <p className="text-xs sm:text-[1rem] text-gray-400 mt-2">اضغط على أي يوم لفتحه وحده بساعاته.</p>}
        </Card>
      </Section>

      <Section title="من أين يأتون">
        <Card>
          <Split parts={CHANNELS.map(([k, label, color]) => ({ label, color, value: channels.get(k) ?? 0 }))} total={visitsTotal} />
        </Card>
        <div className={TABLES}>
          <Card title="المواقع المحيلة">
            <Table head={['الموقع', 'زيارات', 'صفحات', 'نوع']}
              rows={topRefs.map(([host, x]) => [{ text: host, href: `https://${host}` }, n(x.visits), n(x.views), CHANNELS.find(([k]) => k === channelOf(host))?.[1] ?? ''])} />
          </Card>
          <Card title="صفحات الدخول">
            <Table head={['الصفحة', 'زيارات', 'غادروا منها']}
              rows={topEntries.map(([p, x]) => [page(p), n(x.visits), pct(x.bounces, x.visits)])} />
          </Card>
          <Card title="كلمات البحث">
            <Table head={['البحث', 'مرات', 'زوار']} empty={detailNote ? `تُسجَّل كلمات البحث منذ ${DETAIL_SINCE}` : undefined}
              rows={searches.map(x => [{ text: String(x.q), href: `/search?q=${encodeURIComponent(String(x.q))}` }, n(x.n), n(x.visitors)])} />
          </Card>
        </div>
      </Section>

      <Section title="ما يقرؤونه">
        <div className="grid xl:grid-cols-3 gap-3">
          <div className="xl:col-span-2 min-w-0">
            <Card title="أكثر الصفحات">
              <Table head={['الصفحة', 'مشاهدات', 'زوار', 'البقاء']}
                rows={topPages.map(x => [page(x.path), n(x.views), n(x.visitors), dur(x.med)])} />
              <p className="text-xs sm:text-[1rem] text-gray-400 mt-2">البقاء: الوسيط بين فتح الصفحة والصفحة التالية في الزيارة نفسها.</p>
            </Card>
          </div>
          <Card title="الأقسام">
            <Table head={['القسم', 'مشاهدات', 'زوار', 'زواحف']}
              rows={sections.map(x => [page(x.section), n(x.views), n(x.visitors), n(x.bots)])} />
          </Card>
        </div>
      </Section>

      <Section title="سجل الزيارات" note={`آخر ${sessions.length} زيارةً في الفترة، الأحدث أولًا`}>
        <Card>
          <div className="divide-y divide-border/60">
            {sessions.length ? sessions.map(s => {
              const paths = (s.paths as string[]) ?? []
              const ch = channelOf(s.ref as string | null)
              return (
                <details key={String(s.visitor)} className="group py-2">
                  <summary className="flex flex-wrap items-center gap-x-4 gap-y-1 cursor-pointer list-none [&::-webkit-details-marker]:hidden text-sm sm:text-[1.1rem]">
                    <span className="tabular-nums text-gray-500 w-[7.5rem] shrink-0" dir="ltr">{time(s.start)}</span>
                    <span className="font-medium text-gray-800 min-w-0 flex-1 truncate">{page(paths[0]).text}</span>
                    <span className="text-gray-600 whitespace-nowrap">{n(s.n)} {num(s.n) === 1 ? 'صفحة' : 'صفحات'} · {dur(num(s.n) > 1 ? (new Date(String(s.last)).getTime() - new Date(String(s.start)).getTime()) / 1000 : null)}</span>
                    <span className="text-gray-500 whitespace-nowrap">{s.ref ? String(s.ref) : CHANNELS.find(([k]) => k === ch)?.[1]}</span>
                    <span className="text-gray-500 whitespace-nowrap">{s.tz ? countryOf(String(s.tz)) : ''}</span>
                    <span className="text-gray-400 whitespace-nowrap">{[s.device === 'mobile' ? 'جوال' : 'حاسوب', s.browser, s.os].filter(Boolean).join(' · ')}</span>
                  </summary>
                  <ol className="mt-2 sm:ms-[8.5rem] space-y-0.5 text-sm sm:text-[1.05rem] list-decimal list-inside text-gray-600">
                    {paths.map((p, i) => <li key={i}><Link href={p} className="hover:text-green-800 hover:underline">{page(p).text}</Link> <span className="text-gray-400 text-xs" dir="ltr">{decodePath(p)}</span></li>)}
                    {num(s.n) > paths.length && <li className="list-none text-gray-400">… و{n(num(s.n) - paths.length)} صفحات أخرى</li>}
                  </ol>
                  {(s.qs as string[] | null)?.length ? <p className="mt-1 sm:ms-[8.5rem] text-sm text-gray-500">بحث عن: {(s.qs as string[]).map(w => `«${w}»`).join('، ')}</p> : null}
                </details>
              )
            }) : <p className="py-3 text-gray-400">لا زيارات في هذه الفترة</p>}
          </div>
        </Card>
      </Section>

      <Section title="من هم" note={detailNote ? `البلد واللغة والمتصفح والنظام تُسجَّل منذ ${DETAIL_SINCE}؛ وما قبله يظهر «غير مسجّل»` : 'بعدد الزوار؛ البلد من المنطقة الزمنية للمتصفح، بلا تتبّع لعنوان الشبكة'}>
        <div className={TABLES}>
          <Card title="البلدان"><Share rows={countries} total={audienceTotal} /></Card>
          <Card title="لغة المتصفح"><Share rows={langs} total={audienceTotal} /></Card>
          <Card title="المتصفح"><Share rows={browsers} total={audienceTotal} /></Card>
          <Card title="نظام التشغيل"><Share rows={systems} total={audienceTotal} /></Card>
          <Card title="الجهاز"><Share rows={devices} total={audienceTotal} /></Card>
          {!hourly && (
            <Card title="ساعات اليوم">
              <Bars rows={Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0')).map(k => ({ ...(hours.find(h => h.k === k) ?? {}), k }))}
                label={k => `${k}:00`} series={[{ key: 'human', label: 'مشاهدات', color: '#9cc4ad' }, { key: 'visitors', label: 'زوار', color: '#2d6a4a' }]} overlay small />
            </Card>
          )}
        </div>
      </Section>

      <Section title="الزواحف" note="محركات البحث وغيرها ممن يشغّل جافاسكربت؛ لا تدخل في أعداد الزوار">
        <div className={TABLES}>
          <Card title="من يزحف">
            <Table head={['الزاحف', 'مشاهدات', 'صفحات', 'آخرها']} empty={detailNote ? `أسماء الزواحف تُسجَّل منذ ${DETAIL_SINCE}` : undefined}
              rows={bots.map(x => [String(x.bot ?? '(غير مسجّل)'), n(x.views), n(x.pages), time(x.last)])} />
          </Card>
          <div className="md:col-span-1 xl:col-span-2 min-w-0">
            <Card>
              <Bars rows={line(viewLine)} label={keyLabel} href={dayHref} total={hourly ? 'اليوم' : `${r.days} يومًا`}
                series={[{ key: 'bot', label: 'زيارات الزواحف', color: '#b9a27a' }]} small />
            </Card>
          </div>
        </div>
      </Section>

      <Section title="خادم MCP">
        <Card><Bars rows={line(mcpLine)} label={keyLabel} href={dayHref} total={hourly ? 'اليوم' : `${r.days} يومًا`}
          series={[{ key: 'signed', label: 'بحساب', color: '#2d6a4a' }, { key: 'anon', label: 'دون حساب', color: '#c9a45c' }]} /></Card>
        <div className={TABLES}>
          <Card title="الأدوات">
            <Table head={['الأداة', 'طلبات', 'مستخدمون', 'أخطاء', 'مللي ث']} rows={tools.map(x => [String(x.tool), n(x.calls), n(x.users), n(x.errors), n(x.ms)])} />
          </Card>
          <Card title="التطبيقات المتصلة">
            <Table head={['التطبيق', 'اتصالات', 'مستخدمون']} rows={clients.map(x => [String(x.client), n(x.connects), n(x.users)])} />
          </Card>
          <Card title="الأكثر استعمالًا">
            <Table head={['المستخدم', 'طلبات', 'أدوات', 'آخرها']} rows={mcpUsers.map(x => [who(x.who), n(x.calls), n(x.tools), time(x.last)])} />
          </Card>
          {mcpErrors.length > 0 && (
            <Card title="آخر الأخطاء">
              <Table head={['الأداة', 'الوقت', 'مللي ث', 'المستخدم']} rows={mcpErrors.map(x => [String(x.tool), time(x.ts), n(x.ms), who(x.who)])} />
            </Card>
          )}
        </div>
      </Section>

      <Section title="الحسابات">
        <div className={STATS}>
          <Stat label="كل الحسابات" value={n(ut.total)} />
          <Stat label="جديدة في الفترة" value={n(c.signups)} cur={c.signups} prev={pv.signups} />
          <Stat label="دخلوا في ٣٠ يومًا" value={n(ut.active)} />
          <Stat label="ربطوا مساعدًا (OAuth)" value={n(ut.with_oauth)} />
          <Stat label="لديهم رموز شخصية" value={n(ut.with_tokens)} />
        </div>
        {!hourly && <Card><Bars rows={line(signupLine)} label={keyLabel} href={dayHref} total={`${r.days} يومًا`} series={[{ key: 'n', label: 'تسجيلات جديدة', color: '#2d6a4a' }]} small /></Card>}
        <Card title="حسابات الفترة">
          <Table head={['البريد', 'التسجيل', 'آخر دخول', 'طلبات MCP', 'رموز']} empty="لا حسابات جديدة في هذه الفترة"
            rows={accounts.map(x => [String(x.email), fmtTime(x.created_at, r.tz, true), fmtTime(x.last_login_at, r.tz, true), n(x.calls), n(x.tokens)])} />
        </Card>
      </Section>

      <p className="text-xs sm:text-[1rem] text-gray-400 leading-relaxed">
        تُعدّ المشاهدات من الصفحة نفسها منذ {FIRST_DAY} ولا يُحذف منها شيء، فكل يومٍ سابق متاح؛ ولا تظهر الزواحف التي لا تشغّل جافاسكربت (سجلها في Railway).
        يُعدّ الزائر بلا ملفات تعريف: بصمةٌ لعنوان الشبكة والمتصفح تتجدد كل يوم، فالزيارة = زائرٌ في يوم. طلبات MCP في هذه الصفحة من سجل الأحداث (منذ {FIRST_DAY}).
      </p>
    </div>
  )
}

function who(v: unknown) {
  const s = String(v ?? '')
  return s.startsWith('ip:') ? 'دون حساب · ' + s.slice(3, 11) : s.startsWith('u:') ? 'حساب محذوف · ' + s.slice(2) : s
}

function fmtTime(v: unknown, tz: string, withDate: boolean) {
  if (!v) return '—'
  const d = new Date(String(v instanceof Date ? v.toISOString() : v))
  const t = new Intl.DateTimeFormat('en-GB', { timeZone: tz, hour: '2-digit', minute: '2-digit', hour12: false }).format(d)
  return withDate ? `${new Intl.DateTimeFormat('en-CA', { timeZone: tz }).format(d).slice(5)} ${t}` : t
}

// ---- pieces ----

type Series = { key: string; label: string; color: string }

/** A column per hour or day. overlay: the series drawn over one another (visitors within views),
 *  otherwise stacked. With href, each column opens its day. */
function Bars({ rows, series, label, href, total, overlay, small }: {
  rows: Row[]; series: Series[]; label: (k: string) => string; href?: (k: string) => string; total?: string; overlay?: boolean; small?: boolean
}) {
  const tops = rows.map(x => overlay ? Math.max(...series.map(s => num(x[s.key]))) : series.reduce((a, s) => a + num(x[s.key]), 0))
  const max = Math.max(1, ...tops)
  const sums = series.map(s => rows.reduce((a, x) => a + num(x[s.key]), 0))
  const k = (x: Row) => String(x.k)
  return (
    <div>
      <div className="flex items-center justify-between gap-3 mb-2 text-sm sm:text-[1.15rem]">
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-gray-600">
          {series.map((s, i) => (
            <span key={s.key} className="inline-flex items-center gap-1.5">
              <i className="inline-block w-3 h-3 rounded-sm" style={{ background: s.color }} />{s.label}
              {total && <b className="text-gray-800 tabular-nums">{n(sums[i])}</b>}
            </span>
          ))}
        </div>
        {total && <span className="text-gray-400 whitespace-nowrap">{total}</span>}
      </div>
      <div className="relative" dir="ltr">
        <span className="absolute -top-0.5 left-0 text-xs sm:text-[1rem] text-gray-400 tabular-nums">{n(max)}</span>
        <div className={`flex items-end ${rows.length > 60 ? 'gap-px' : 'gap-[3px]'} ${small ? 'h-28 sm:h-32' : 'h-40 sm:h-52'} border-b border-border pt-5`}>
          {rows.map((x, i) => {
            const tip = `${label(k(x))} — ${series.map(s => `${s.label}: ${n(x[s.key])}`).join(' · ')}`
            const inner = overlay
              ? series.map(s => <div key={s.key} className="absolute bottom-0 inset-x-0" style={{ height: `${(num(x[s.key]) / max) * 100}%`, background: s.color }} />)
              : series.map(s => <div key={s.key} style={{ height: `${(num(x[s.key]) / max) * 100}%`, background: s.color }} />)
            const cls = `relative flex-1 h-full min-w-0 hover:opacity-75 ${overlay ? '' : 'flex flex-col-reverse'}`
            return href
              ? <Link key={i} href={href(k(x))} className={cls} title={tip} prefetch={false}>{inner}</Link>
              : <div key={i} className={cls} title={tip}>{inner}</div>
          })}
        </div>
        <div className="flex justify-between text-xs sm:text-[1rem] text-gray-400 mt-1 tabular-nums">
          {(rows.length > 1 ? [0, Math.floor(rows.length / 4), Math.floor(rows.length / 2), Math.floor((rows.length * 3) / 4), rows.length - 1] : [0])
            .map(i => <span key={i}>{label(k(rows[i]))}</span>)}
        </div>
      </div>
    </div>
  )
}

function Delta({ cur, prev, lowerIsBetter, neutral }: { cur: unknown; prev: unknown; lowerIsBetter?: boolean; neutral?: boolean }) {
  const a = num(cur), b = num(prev)
  if (!Number.isFinite(a) || !Number.isFinite(b) || (a === 0 && b === 0)) return null
  if (b === 0) return <span className="text-green-700">جديد</span>
  const d = Math.round(((a - b) / b) * 100)
  if (d === 0) return <span className="text-gray-400">كما قبل</span>
  const good = neutral ? null : (d > 0) !== !!lowerIsBetter
  return <span className={good == null ? 'text-gray-500' : good ? 'text-green-700' : 'text-red-700'} dir="ltr">{d > 0 ? '▲' : '▼'} {Math.abs(d)}%</span>
}

function Stat({ label, value, sub, cur, prev, lowerIsBetter, neutral }: {
  label: string; value: string; sub?: string; cur?: unknown; prev?: unknown; lowerIsBetter?: boolean; neutral?: boolean
}) {
  return (
    <div className="ui-card rounded-xl p-4 min-w-0">
      <div className="text-sm sm:text-[1.15rem] text-gray-500 leading-snug">{label}</div>
      <div className="text-[1.9rem] sm:text-[2.6rem] font-bold text-green-900 mt-1 leading-none tabular-nums whitespace-nowrap text-left" dir={dirOf(value)}>{value}</div>
      <div className="text-xs sm:text-[1rem] text-gray-400 mt-1.5 flex flex-wrap gap-x-2">
        {cur !== undefined && prev !== undefined && <Delta cur={cur} prev={prev} lowerIsBetter={lowerIsBetter} neutral={neutral} />}
        {sub && <span>{sub}</span>}
      </div>
    </div>
  )
}

/** One bar split into parts (where visits came from) */
function Split({ parts, total }: { parts: { label: string; color: string; value: number }[]; total: number }) {
  const t = total || 1
  return (
    <div className="space-y-3">
      <div className="flex h-4 rounded-full overflow-hidden bg-surface-sunken">
        {parts.map(p => p.value > 0 && <div key={p.label} style={{ width: `${(p.value / t) * 100}%`, background: p.color }} title={`${p.label}: ${n(p.value)}`} />)}
      </div>
      <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm sm:text-[1.15rem]">
        {parts.map(p => (
          <span key={p.label} className="inline-flex items-center gap-1.5 text-gray-600">
            <i className="inline-block w-3 h-3 rounded-sm" style={{ background: p.color }} />{p.label}
            <b className="text-gray-800 tabular-nums">{n(p.value)}</b><span className="text-gray-400 tabular-nums">{pct(p.value, total)}</span>
          </span>
        ))}
      </div>
    </div>
  )
}

/** Name · visitors · share, with a bar under each name */
function Share({ rows, total }: { rows: [string, number][]; total: number }) {
  if (!rows.length) return <p className="py-3 px-2 text-gray-400">لا بيانات</p>
  const max = Math.max(1, ...rows.map(([, v]) => v))
  return (
    <ul className="space-y-1.5 text-sm sm:text-[1.15rem]">
      {rows.slice(0, 15).map(([k, v]) => (
        <li key={k}>
          <div className="flex justify-between gap-3">
            <span className="truncate text-gray-700" title={k}>{k}</span>
            <span className="tabular-nums text-gray-600 whitespace-nowrap" dir="ltr">{n(v)} <span className="text-gray-400">{pct(v, total)}</span></span>
          </div>
          <div className="h-1 rounded-full bg-surface-sunken mt-0.5"><div className="h-1 rounded-full bg-green-700/60" style={{ width: `${(v / max) * 100}%` }} /></div>
        </li>
      ))}
      {rows.length > 15 && <li className="text-gray-400 text-xs">و{rows.length - 15} أخرى</li>}
    </ul>
  )
}

type Cell = string | number | null | { text: string; href?: string; sub?: string }

// The first column takes the room that is left and is cut with «…» (full text on hover); the
// number columns fit their numbers and are never squeezed
function Table({ head, rows, empty }: { head: string[]; rows: Cell[][]; empty?: string }) {
  return (
    <table className="w-full text-sm sm:text-[1.15rem]">
      <thead>
        <tr className="text-xs sm:text-[1rem] text-gray-500 border-b border-border">
          {head.map((h, i) => (
            <th key={i} className={`font-medium py-1.5 px-2 whitespace-nowrap ${i === 0 ? 'text-right w-full' : 'text-left'}`}>{h}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.length ? rows.map((row, i) => (
          <tr key={i} className="border-b border-border/60 hover:bg-surface-sunken/40">
            {row.map((cell, j) => {
              if (j > 0) return <td key={j} className="py-1.5 px-2 text-left text-gray-700 whitespace-nowrap tabular-nums" dir={dirOf(cell)}>{cell == null ? '—' : String(cell)}</td>
              const o = cell && typeof cell === 'object' ? cell : { text: cell == null ? '—' : String(cell) }
              return (
                <td key={j} className="py-1.5 px-2 max-w-0 w-full min-w-[9rem] sm:min-w-[12rem]" title={o.sub && o.sub !== o.text ? `${o.text}\n${o.sub}` : o.text}>
                  {o.href
                    ? <a href={o.href} target={o.href.startsWith('http') ? '_blank' : undefined} rel="noreferrer" className="block truncate text-right hover:text-green-800 hover:underline" dir="auto">{o.text}</a>
                    : <span className="block truncate text-right" dir="auto">{o.text}</span>}
                </td>
              )
            })}
          </tr>
        )) : <tr><td colSpan={head.length} className="py-3 px-2 text-gray-400">{empty ?? 'لا بيانات في هذه الفترة'}</td></tr>}
      </tbody>
    </table>
  )
}

const Card = ({ title, children }: { title?: string; children: React.ReactNode }) => (
  <div className="ui-card rounded-xl p-4 min-w-0 overflow-x-auto">
    {title && <h3 className="text-base sm:text-[1.25rem] font-bold text-gray-700 mb-2">{title}</h3>}
    {children}
  </div>
)

const Section = ({ title, note, children }: { title: string; note?: string; children: React.ReactNode }) => (
  <section className="space-y-3">
    <div className="flex flex-wrap items-baseline gap-x-3">
      <h2 className="text-xl sm:text-[1.7rem] font-bold text-green-900">{title}</h2>
      {note && <span className="text-sm sm:text-[1.05rem] text-gray-400">{note}</span>}
    </div>
    {children}
  </section>
)

const STATS = 'grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-5 gap-3'
const TABLES = 'grid md:grid-cols-2 xl:grid-cols-3 gap-3'

