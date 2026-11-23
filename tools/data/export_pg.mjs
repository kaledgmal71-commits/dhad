// تصدير جداول قاعدة الجامع (PGlite) من قطع التنزيل إلى JSONL.gz — يعمل على Colab
import fs from 'node:fs'; import path from 'node:path'; import zlib from 'node:zlib'
import { PGlite } from '@electric-sql/pglite'
import { pg_trgm } from '@electric-sql/pglite/contrib/pg_trgm'
import { unaccent } from '@electric-sql/pglite/contrib/unaccent'
const D=process.argv[2], O=process.argv[3], PG='/content/pgdata'
const m=JSON.parse(fs.readFileSync(D+'/manifest.json'))
if(!fs.existsSync(PG+'/PG_VERSION')){
  fs.rmSync(PG,{recursive:true,force:true}); fs.mkdirSync(PG,{recursive:true})
  const files=m.entries.filter(e=>!e.dir)
  for(const e of m.entries) if(e.dir) fs.mkdirSync(PG+e.path,{recursive:true})
  let fi=0, fd=null, left=0
  const open=()=>{ while(fi<files.length && files[fi].size===0){ fs.closeSync(fs.openSync(PG+files[fi].path,'w')); fi++ }
    if(fi<files.length){ fd=fs.openSync(PG+files[fi].path,'w'); left=files[fi].size } }
  open()
  for(const c of m.chunks){
    let b=zlib.gunzipSync(fs.readFileSync(D+'/'+c.name)), p=0
    while(p<b.length){ const n=Math.min(left,b.length-p); fs.writeSync(fd,b,p,n); p+=n; left-=n
      if(left===0){ fs.closeSync(fd); fi++; open() } }
  }
  console.log('reassembled',files.length,'files')
}
if(process.env.ONLY_REASSEMBLE){console.log('تم التجميع');process.exit(0)}
const db=await PGlite.create({dataDir:PG,extensions:{pg_trgm,unaccent}})
const tabs=(await db.query(`select c.relname n, pg_total_relation_size(c.oid) tot, pg_relation_size(c.oid) heap from pg_class c join pg_namespace s on s.oid=c.relnamespace where s.nspname='public' and c.relkind='r' order by 2 desc`)).rows
const summary=[]
for(const t of tabs){
  const cnt=(await db.query(`select count(*)::text c from "${t.n}"`)).rows[0].c
  summary.push({table:t.n,rows:+cnt,heap_mb:Math.round(t.heap/1e6),total_mb:Math.round(t.tot/1e6)})
}
fs.writeFileSync(O+'/summary.json',JSON.stringify(summary,null,1))
console.log(JSON.stringify(summary.slice(0,40)))
const SKIP=/^(offline_query_cache|analytics|login_codes|accounts|client_secrets)/
for(const t of tabs){
  if(SKIP.test(t.n)) continue
  const out=O+'/'+t.n+'.jsonl.gz'
  if(fs.existsSync(out)) continue
  const pages=Math.max(1,Math.ceil(t.heap/8192)), STEP=1500
  const gz=zlib.createGzip({level:6}); const ws=fs.createWriteStream(out+'.part'); gz.pipe(ws)
  for(let p=0;p<pages;p+=STEP){
    const r=await db.query(`select row_to_json(x)::text j from "${t.n}" x where ctid>='(${p},0)'::tid and ctid<'(${p+STEP},0)'::tid`)
    for(const row of r.rows){ if(!gz.write(row.j+'\n')) await new Promise(r=>gz.once('drain',r)) }
  }
  await new Promise(r=>{ws.on('close',r);gz.end()})
  fs.renameSync(out+'.part',out); console.log('exported',t.n)
}
console.log('تم')
