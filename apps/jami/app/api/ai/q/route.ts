// استعلام قراءة فقط لأدوات الذكاء حين يعمل الجامع من الخادم (النسخة الخاصة): جملة SELECT/WITH واحدة بلا تعديل.
import pool from '@/lib/db'

export const dynamic = 'force-dynamic'
const READ_ONLY = /^\s*(select|with)\b/i
const FORBIDDEN = /\b(insert|update|delete|drop|alter|create|truncate|grant|revoke|copy|call|do|vacuum|set)\b/i

export async function POST(req: Request) {
  let body: { text?: unknown; params?: unknown }
  try { body = await req.json() } catch { return Response.json({ error: 'bad_json' }, { status: 400 }) }
  const text = typeof body.text === 'string' ? body.text : ''
  const params = Array.isArray(body.params) ? body.params : []
  const bare = text.replace(/'(?:[^']|'')*'/g, "''")
  if (!text || text.length > 4000 || !READ_ONLY.test(text) || bare.replace(/;\s*$/, '').includes(';') || FORBIDDEN.test(bare) || params.length > 20) {
    return Response.json({ error: 'not_allowed' }, { status: 400 })
  }
  try {
    const r = await pool.query(text.replace(/;\s*$/, ''), params)
    return Response.json({ rows: r.rows.slice(0, 500) })
  } catch (e) {
    return Response.json({ error: 'query_failed', message: String((e as Error)?.message || e).slice(0, 160) }, { status: 500 })
  }
}
