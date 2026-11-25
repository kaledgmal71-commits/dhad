// تشخيص: اتصال pg مباشر بمقبس PGlite بأنماط مختلفة
import pg from 'pg'
const url = process.env.DATABASE_URL
const t = async (name, fn) => { try { console.log(name, '=>', JSON.stringify(await fn())) } catch (e) { console.log(name, 'FAIL', e.message) } }
const c = new pg.Client({ connectionString: url, ssl: false })
await t('connect', async () => { await c.connect(); return 'ok' })
await t('simple', async () => (await c.query('select 1 as x')).rows)
await t('empty-values', async () => (await c.query('select 2 as x', [])).rows)
await t('param', async () => (await c.query('select $1::int as x', [3])).rows)
await t('books', async () => (await c.query('select count(*)::int c from books')).rows)
await c.end().catch(() => {})
const c2 = new pg.Client({ connectionString: url, ssl: false })
await t('reconnect', async () => { await c2.connect(); return (await c2.query('select 4 as x')).rows })
await c2.end().catch(() => {})
