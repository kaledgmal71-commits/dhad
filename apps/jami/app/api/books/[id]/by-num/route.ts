import { NextResponse } from 'next/server'
import pool from '@/lib/db'

export const dynamic = 'force-dynamic'

// A hadith by its number in a book. The number must match exactly: «187» is hadith 187, never 1870-1879
// (an earlier prefix match opened another hadith whenever a longer number began with the one typed).
// A stored number may carry a suffix after a space — «2072 (م)» in Tirmidhi — and still counts.
// With the printed numbering, a number can also sit inside a row that holds more than one of the
// edition's hadiths (Bukhari 188 is printed in the row of 187); such a row is found by that number too.
// Several rows can share a number (Muslim's narrations of one Abd al-Baqi number): all are returned,
// in book order, for the reader to choose.
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const bookId = parseInt(id)
  const { searchParams } = new URL(req.url)
  const raw = searchParams.get('num')?.trim() ?? ''
  // Arabic-Indic digits typed into the box count as the same number; a suffix the reader types
  // («692/1», «12 م») is dropped and every row with that number is listed.
  const num = (raw.replace(/[٠-٩]/g, d => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d))).match(/\d+/) || [''])[0]
  const prefParam = searchParams.get('pref')
  const pref = prefParam === 'harf' ? 'harf' : 'matboa'

  if (!num || !/^\d+$/.test(num) || isNaN(bookId)) {
    return NextResponse.json({ error: 'invalid' }, { status: 400 })
  }

  const numColumn = pref === 'harf' ? 'tarqeem_harf' : 'tarqeem_matboa1'
  let { rows } = await pool.query(
    `SELECT main_id FROM hadith_toc
     WHERE book_id = $1 AND is_leaf = true AND is_paragraph = true
       AND (btrim(${numColumn}) = $2 OR ${numColumn} LIKE $3)
     ORDER BY id, main_id
     LIMIT 20`,
    [bookId, num, `${num} %`]
  )

  if (rows.length === 0 && pref === 'matboa') {
    // a printed number inside a row that holds more than one of the edition's hadiths
    ;({ rows } = await pool.query(
      `SELECT main_id FROM hadith_toc
       WHERE book_id = $1 AND is_leaf = true AND is_paragraph = true AND content LIKE $2
       ORDER BY id, main_id
       LIMIT 20`,
      [bookId, `%<رقم_حديث نوع="مطبوع">${num} </رقم_حديث>%`]
    ))
  }

  if (rows.length === 0) {
    return NextResponse.json({ found: false })
  }
  if (rows.length === 1) {
    return NextResponse.json({ found: true, main_id: rows[0].main_id })
  }
  // Several rows: the printed number of each (e.g. «99» and its supplementary «99 (م)») and its
  // opening words, so the reader can tell them apart
  const ids = rows.map((r: { main_id: number }) => r.main_id)
  const { rows: info } = await pool.query(
    `SELECT main_id, btrim(tarqeem_matboa1) AS number, left(regexp_replace(coalesce(tarf, ''), '<[^>]+>', '', 'g'), 70) AS opening
     FROM hadith_toc WHERE main_id = ANY($1::int[])`,
    [ids]
  )
  const byId = new Map(info.map((r: { main_id: number; number: string | null; opening: string }) => [r.main_id, r]))
  return NextResponse.json({
    found: true,
    main_id: ids[0],
    multiple: ids,
    items: ids.map((id: number) => ({ main_id: id, number: byId.get(id)?.number ?? null, opening: byId.get(id)?.opening ?? '' })),
  })
}
