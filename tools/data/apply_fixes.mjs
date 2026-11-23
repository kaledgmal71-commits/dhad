// يطبّق الإصلاحات الآمنة (clean_ar.fix_for_app) على قاعدة الجامع نفسها (PGlite) في أعمدتها الأصلية بحسب المفتاح الأساسي،
// فيبقى مخطط القاعدة والوسوم وأرقام الأحاديث والحواشي كما هي. يُشغَّل من Colab (انظر colab_app_edition.sh).
//   node apply_fixes.mjs <pgdata> <clean_report.json> <fix_stream.py> <changes.json>
import fs from 'node:fs'
import { spawn } from 'node:child_process'
import readline from 'node:readline'
import { PGlite } from '@electric-sql/pglite'
import { pg_trgm } from '@electric-sql/pglite/contrib/pg_trgm'
import { unaccent } from '@electric-sql/pglite/contrib/unaccent'
const [PG, REPORT, PY, OUT] = process.argv.slice(2)
const SKIP_COL = /slug|normal|key|url|path|code|uuid|(^|_)id$|hash|email/i
const report = JSON.parse(fs.readFileSync(REPORT, 'utf8'))
const db = await PGlite.create({ dataDir: PG, extensions: { pg_trgm, unaccent } })
const py = spawn('python3', [PY], { stdio: ['pipe', 'pipe', 'inherit'] })
const rl = readline.createInterface({ input: py.stdout })
const queue = []; let waiting = null
rl.on('line', l => { if (waiting) { const w = waiting; waiting = null; w(JSON.parse(l)) } else queue.push(JSON.parse(l)) })
const fixBatch = arr => new Promise(r => { py.stdin.write(JSON.stringify(arr) + '\n'); if (queue.length) r(queue.shift()); else waiting = r })
const cnt = async t => Number((await db.query(`select count(*)::text c from "${t}"`)).rows[0].c)
const summary = {}
// الأصغر أولًا: أي خطأ يظهر مبكرًا
const tabs = Object.entries(report).map(([t, v]) => [t, v.rows, v.columns_cleaned]).sort((a, b) => a[1] - b[1])
for (const [t, rows, colsAll] of tabs) {
  const exist = (await db.query(`select column_name n, data_type d from information_schema.columns where table_schema='public' and table_name=$1`, [t])).rows
  const cols = colsAll.filter(c => !SKIP_COL.test(c) && exist.find(e => e.n === c && /text|character/.test(e.d)))
  const pk = (await db.query(`select a.attname n, format_type(a.atttypid,a.atttypmod) ty from pg_index i join pg_attribute a on a.attrelid=i.indrelid and a.attnum=any(i.indkey) where i.indrelid=('public."'||$1||'"')::regclass and i.indisprimary`, [t])).rows
  if (!cols.length) { summary[t] = { skipped: 'no text columns' }; continue }
  if (pk.length !== 1) { summary[t] = { skipped: 'no single-column primary key', rows }; console.log('تخطّي', t, 'لا مفتاح أساسي مفرد'); continue }
  const [{ n: k, ty }] = pk
  const before = await cnt(t)
  let changedRows = 0, changedCells = 0
  const STEP = 2000
  const keys = (await db.query(`select "${k}"::text k from "${t}" order by "${k}"`)).rows.map(r => r.k)
  for (let i = 0; i < keys.length; i += STEP) {
    const ks = keys.slice(i, i + STEP)
    const rs = (await db.query(`select "${k}"::text k, ${cols.map(c => `"${c}"`).join(',')} from "${t}" where "${k}" = any($1::${ty}[])`, [ks])).rows
    const flat = []; for (const r of rs) for (const c of cols) flat.push(r[c])
    const fixed = await fixBatch(flat)
    const upd = {}; let j = 0
    for (const r of rs) for (const c of cols) { const f = fixed[j++]; if (f !== null && f !== undefined) { (upd[c] ??= { k: [], v: [] }); upd[c].k.push(r.k); upd[c].v.push(f); changedCells++ } }
    for (const [c, u] of Object.entries(upd)) {
      await db.query(`update "${t}" t set "${c}" = v.val from (select unnest($1::${ty}[]) k, unnest($2::text[]) val) v where t."${k}" = v.k`, [u.k, u.v])
    }
    changedRows += new Set(Object.values(upd).flatMap(u => u.k)).size
  }
  const after = await cnt(t)
  if (after !== before) throw new Error(`${t}: عدد الصفوف تغيّر ${before} → ${after}`)
  summary[t] = { rows: before, columns: cols, changed_rows: changedRows, changed_cells: changedCells }
  console.log(t, JSON.stringify(summary[t]))
  fs.writeFileSync(OUT, JSON.stringify(summary, null, 1))
}
py.stdin.end()
// استرجاع المساحة: كل تحديث ينسخ الصف، فتُعاد كتابة الجداول المتغيّرة
for (const [t, v] of Object.entries(summary)) {
  if (!v.changed_rows) continue
  const ts = Date.now()
  try { await db.exec(`VACUUM FULL "${t}"`); console.log('VACUUM FULL', t, ((Date.now() - ts) / 1000).toFixed(0) + 's') } catch (e) { console.log('VACUUM', t, e.message) }
}
// ذاكرة التخزين المؤقت لاستعلامات ثقيلة تحوي نصًّا قديمًا: تُفرَّغ (يُعاد حسابها عند الطلب)
try { await db.exec('truncate table offline_query_cache'); console.log('أُفرغ offline_query_cache') } catch (e) { console.log('offline_query_cache:', e.message) }
try { await db.exec('ANALYZE') } catch {}
await db.exec('CHECKPOINT')
await db.close()
console.log('تم تطبيق الإصلاحات')
