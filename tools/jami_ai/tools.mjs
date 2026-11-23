// أدوات ذكاء الجامع: الواجهة التي يستدعيها النموذج، تنفّذها قاعدة PGlite المحلية. هي نفسها في توليد التدريب وفي التطبيق.
// كل أداة تعيد كائنًا صغيرًا بلا نص خارج القاعدة؛ والنموذج لا يجيب إلا بما تعيده.
export const strip = s => String(s ?? '').replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim()
const clip = (s, n) => { s = strip(s); return s.length > n ? s.slice(0, n) + '…' : s }

export const TOOLS = {
  async find_book(db, { query }) {
    const { rows } = await db.query(`select id, title from books where title ilike $1 order by id limit 5`, ['%' + strip(query) + '%'])
    return { books: rows }
  },
  async find_hadith_by_number(db, { book_id, number }) {
    const { rows } = await db.query(
      `select main_id, tarqeem_harf as number from hadith_toc where book_id = $1 and is_leaf = true and tarqeem_harf::text = $2 order by main_id limit 3`,
      [book_id, String(number)])
    return { hadiths: rows }
  },
  async get_hadith(db, { hadith_id }) {
    const { rows } = await db.query(
      `select h.main_id, b.title as book, h.tarqeem_harf as number, h.content from hadith_toc h join books b on b.id = h.book_id where h.main_id = $1`, [hadith_id])
    if (!rows[0]) return { error: 'not_found' }
    const r = rows[0]
    return { hadith_id: r.main_id, book: r.book, number: r.number, text: clip(r.content, 1500) }
  },
  async get_chains(db, { hadith_id }) {
    const { rows } = await db.query(
      `select ic.narrator_id_array a from isnad_hadiths ih join isnad_chains ic on ic.id = ih.isnad_id where ih.hadith_id = $1 limit 3`, [hadith_id])
    if (!rows.length) return { chains: [] }
    const ids = [...new Set(rows.flatMap(r => r.a || []))]
    const nm = new Map((await db.query(`select id, name from narrators where id = any($1::int[])`, [ids])).rows.map(r => [r.id, strip(r.name)]))
    return { chains: rows.map(r => (r.a || []).map(i => ({ id: i, name: nm.get(i) || '؟' }))) }
  },
  async get_judgments(db, { hadith_id }) {
    const { rows } = await db.query(
      `select n.name as scholar, j.say_text from hadith_judgments j left join narrators n on n.id = j.scientist_id where j.hadith_id = $1 limit 6`, [hadith_id])
    return { judgments: rows.map(r => ({ scholar: strip(r.scholar) || null, text: clip(r.say_text, 300) })) }
  },
  async find_narrator(db, { name }) {
    const { rows } = await db.query(`select id, name, tabaqa, hadiths_count from narrators where name ilike $1 order by hadiths_count desc nulls last limit 5`, ['%' + strip(name) + '%'])
    return { narrators: rows.map(r => ({ id: r.id, name: strip(r.name), tabaqa: r.tabaqa, hadiths_count: r.hadiths_count })) }
  },
  async get_narrator(db, { narrator_id }) {
    const { rows } = await db.query(
      `select id, name, kunia, death_year_num, tabaqa, hadiths_count, martaba_ibn_hajar, martaba_zahabi, is_companion from narrators where id = $1`, [narrator_id])
    if (!rows[0]) return { error: 'not_found' }
    const crit = (await db.query(`select scientist_name, say_text from narrator_criticism where narrator_id = $1 order by say_sort limit 5`, [narrator_id])).rows
    const r = rows[0]
    return {
      id: r.id, name: strip(r.name), kunia: strip(r.kunia) || null, death_year: r.death_year_num, tabaqa: r.tabaqa, hadiths_count: r.hadiths_count,
      ibn_hajar: strip(r.martaba_ibn_hajar) || null, dhahabi: strip(r.martaba_zahabi) || null, companion: !!r.is_companion,
      criticism: crit.map(c => ({ scholar: strip(c.scientist_name), text: clip(c.say_text, 240) })),
    }
  },
}

// وصف الأدوات كما يُعرض للنموذج في مقدمة كل محادثة
export const TOOL_SPEC = [
  ['find_book', 'query', 'يبحث عن كتاب باسمه فيعيد معرّفه'],
  ['find_hadith_by_number', 'book_id, number', 'يجد معرّف حديث برقمه في كتاب'],
  ['get_hadith', 'hadith_id', 'نص الحديث واسم كتابه ورقمه'],
  ['get_chains', 'hadith_id', 'أسانيد الحديث من الصحابي إلى المصنف'],
  ['get_judgments', 'hadith_id', 'أحكام العلماء على الحديث'],
  ['find_narrator', 'name', 'يبحث عن راوٍ باسمه فيعيد معرّفه'],
  ['get_narrator', 'narrator_id', 'ترجمة الراوي ومرتبته وأقوال الجرح والتعديل فيه'],
].map(([n, a, d]) => `- ${n}(${a}): ${d}`).join('\n')

export const SYSTEM = `أنت مساعد داخل «الجامع». تجيب بالعربية، وتستدعي الأدوات لتأتي بالنص والبيانات من قاعدة الجامع، ولا تجيب بشيء من عندك.
صيغة الاستدعاء: <أداة>{"name":"...","args":{...}}</أداة> ثم تنتظر <نتيجة>…</نتيجة>.
إن أعادت الأداة فراغًا أو not_found فقل ذلك صراحة ولا تختلق. انقل النصوص بين تنصيص كما وردت، وأحِل إلى الكتاب والرقم. لا تُفتِ.
الأدوات:
${TOOL_SPEC}`
