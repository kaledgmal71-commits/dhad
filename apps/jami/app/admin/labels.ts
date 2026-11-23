// Readable names for the /admin statistics: countries (from the browser's time zone), languages,
// where visits come from, and the site's own pages.

const TZ_COUNTRY: Record<string, string> = {
  'Asia/Riyadh': 'السعودية', 'Asia/Dubai': 'الإمارات', 'Asia/Kuwait': 'الكويت', 'Asia/Qatar': 'قطر', 'Asia/Bahrain': 'البحرين',
  'Asia/Muscat': 'عُمان', 'Asia/Aden': 'اليمن', 'Asia/Baghdad': 'العراق', 'Asia/Amman': 'الأردن', 'Asia/Damascus': 'سوريا',
  'Asia/Beirut': 'لبنان', 'Asia/Gaza': 'فلسطين', 'Asia/Hebron': 'فلسطين', 'Asia/Jerusalem': 'فلسطين (القدس)', 'Asia/Tel_Aviv': 'فلسطين (القدس)',
  'Africa/Cairo': 'مصر', 'Africa/Tripoli': 'ليبيا', 'Africa/Tunis': 'تونس', 'Africa/Algiers': 'الجزائر', 'Africa/Casablanca': 'المغرب',
  'Africa/El_Aaiun': 'المغرب', 'Africa/Khartoum': 'السودان', 'Africa/Nouakchott': 'موريتانيا', 'Africa/Mogadishu': 'الصومال',
  'Africa/Djibouti': 'جيبوتي', 'Indian/Comoro': 'جزر القمر', 'Europe/Istanbul': 'تركيا', 'Asia/Istanbul': 'تركيا', 'Asia/Tehran': 'إيران',
  'Asia/Karachi': 'باكستان', 'Asia/Kolkata': 'الهند', 'Asia/Calcutta': 'الهند', 'Asia/Dhaka': 'بنغلاديش', 'Asia/Kabul': 'أفغانستان',
  'Asia/Jakarta': 'إندونيسيا', 'Asia/Makassar': 'إندونيسيا', 'Asia/Pontianak': 'إندونيسيا', 'Asia/Jayapura': 'إندونيسيا',
  'Asia/Kuala_Lumpur': 'ماليزيا', 'Asia/Kuching': 'ماليزيا', 'Asia/Singapore': 'سنغافورة', 'Asia/Brunei': 'بروناي',
  'Asia/Manila': 'الفلبين', 'Asia/Bangkok': 'تايلاند', 'Asia/Colombo': 'سريلانكا', 'Indian/Maldives': 'المالديف',
  'Asia/Tashkent': 'أوزبكستان', 'Asia/Samarkand': 'أوزبكستان', 'Asia/Almaty': 'كازاخستان', 'Asia/Bishkek': 'قيرغيزستان',
  'Asia/Dushanbe': 'طاجيكستان', 'Asia/Ashgabat': 'تركمانستان', 'Asia/Baku': 'أذربيجان', 'Asia/Tbilisi': 'جورجيا',
  'Asia/Shanghai': 'الصين', 'Asia/Urumqi': 'الصين', 'Asia/Hong_Kong': 'هونغ كونغ', 'Asia/Tokyo': 'اليابان', 'Asia/Seoul': 'كوريا',
  'Europe/London': 'بريطانيا', 'Europe/Dublin': 'أيرلندا', 'Europe/Paris': 'فرنسا', 'Europe/Berlin': 'ألمانيا', 'Europe/Amsterdam': 'هولندا',
  'Europe/Brussels': 'بلجيكا', 'Europe/Madrid': 'إسبانيا', 'Europe/Lisbon': 'البرتغال', 'Europe/Rome': 'إيطاليا', 'Europe/Vienna': 'النمسا',
  'Europe/Zurich': 'سويسرا', 'Europe/Stockholm': 'السويد', 'Europe/Oslo': 'النرويج', 'Europe/Copenhagen': 'الدنمارك',
  'Europe/Helsinki': 'فنلندا', 'Europe/Warsaw': 'بولندا', 'Europe/Prague': 'التشيك', 'Europe/Budapest': 'المجر', 'Europe/Athens': 'اليونان',
  'Europe/Bucharest': 'رومانيا', 'Europe/Sofia': 'بلغاريا', 'Europe/Sarajevo': 'البوسنة', 'Europe/Tirane': 'ألبانيا', 'Europe/Belgrade': 'صربيا',
  'Europe/Skopje': 'مقدونيا الشمالية', 'Europe/Moscow': 'روسيا', 'Europe/Kyiv': 'أوكرانيا', 'Europe/Kiev': 'أوكرانيا',
  'Africa/Lagos': 'نيجيريا', 'Africa/Accra': 'غانا', 'Africa/Dakar': 'السنغال', 'Africa/Bamako': 'مالي', 'Africa/Niamey': 'النيجر',
  'Africa/Ndjamena': 'تشاد', 'Africa/Nairobi': 'كينيا', 'Africa/Kampala': 'أوغندا', 'Africa/Dar_es_Salaam': 'تنزانيا',
  'Africa/Addis_Ababa': 'إثيوبيا', 'Africa/Johannesburg': 'جنوب أفريقيا', 'Africa/Conakry': 'غينيا', 'Africa/Abidjan': 'ساحل العاج',
  'America/Sao_Paulo': 'البرازيل', 'America/Mexico_City': 'المكسيك', 'America/Argentina/Buenos_Aires': 'الأرجنتين',
  'America/Toronto': 'كندا', 'America/Vancouver': 'كندا', 'America/Edmonton': 'كندا', 'America/Winnipeg': 'كندا', 'America/Halifax': 'كندا',
  'America/Montreal': 'كندا', 'America/Regina': 'كندا', 'America/St_Johns': 'كندا', 'Pacific/Auckland': 'نيوزيلندا', 'UTC': 'UTC',
}
const US = /^America\/(New_York|Chicago|Denver|Los_Angeles|Phoenix|Detroit|Anchorage|Boise|Indiana|Kentucky|North_Dakota|Juneau|Adak)|^Pacific\/Honolulu/

export function countryOf(tz: string | null | undefined): string {
  if (!tz) return '(غير مسجّل)'
  return TZ_COUNTRY[tz] ?? (US.test(tz) ? 'الولايات المتحدة' : tz.startsWith('Australia/') ? 'أستراليا' : tz)
}

const LANGS: Record<string, string> = {
  ar: 'العربية', en: 'الإنجليزية', ur: 'الأردية', id: 'الإندونيسية', ms: 'الملايوية', tr: 'التركية', fr: 'الفرنسية',
  de: 'الألمانية', fa: 'الفارسية', bn: 'البنغالية', ru: 'الروسية', es: 'الإسبانية', nl: 'الهولندية', it: 'الإيطالية',
  zh: 'الصينية', hi: 'الهندية', so: 'الصومالية', sw: 'السواحيلية', ps: 'البشتو', ha: 'الهوسا', uz: 'الأوزبكية', kk: 'الكازاخية',
  az: 'الأذرية', bs: 'البوسنية', sq: 'الألبانية', pt: 'البرتغالية', ja: 'اليابانية', ko: 'الكورية', sv: 'السويدية', pl: 'البولندية',
}
export const langOf = (l: string | null | undefined) => !l ? '(غير مسجّل)' : LANGS[l.toLowerCase()] ?? l

// Where a visit came from, by the referring site of its first page
const SEARCH = /(^|\.)(google\.[a-z.]+|bing\.com|yandex\.[a-z]+|duckduckgo\.com|search\.yahoo\.com|yahoo\.com|baidu\.com|ecosia\.org|search\.brave\.com|qwant\.com|startpage\.com)$|googlequicksearchbox/
const AI = /(^|\.)(chatgpt\.com|openai\.com|perplexity\.ai|claude\.ai|gemini\.google\.com|copilot\.microsoft\.com|chat\.deepseek\.com|deepseek\.com|grok\.com|you\.com|phind\.com|meta\.ai|poe\.com|kagi\.com)$/
const SOCIAL = /(^|\.)(t\.co|x\.com|twitter\.com|facebook\.com|fb\.com|instagram\.com|telegram\.org|t\.me|whatsapp\.com|reddit\.com|youtube\.com|linkedin\.com|lnkd\.in|tiktok\.com|threads\.net|pinterest\.com|snapchat\.com|discord\.com)$|org\.telegram|com\.facebook|com\.instagram|com\.twitter|com\.linkedin|com\.reddit|com\.whatsapp/

export const CHANNELS: [string, string, string][] = [
  ['direct', 'مباشر', '#2d6a4a'], ['search', 'محركات البحث', '#3f7fb0'], ['ai', 'مساعدات الذكاء الاصطناعي', '#8a5cc2'],
  ['social', 'التواصل الاجتماعي', '#c9a45c'], ['other', 'مواقع أخرى', '#9aa39d'],
]
export function channelOf(host: string | null | undefined): string {
  if (!host) return 'direct'
  return SEARCH.test(host) ? 'search' : AI.test(host) ? 'ai' : SOCIAL.test(host) ? 'social' : 'other'
}

const PAGES: Record<string, string> = {
  '/': 'الرئيسية', '/search': 'البحث', '/narrators': 'الرواة', '/books': 'الكتب', '/login': 'تسجيل الدخول', '/account': 'الحساب',
  '/hadith/compare': 'مقارنة الأحاديث', '/compare': 'المقارنة', '/developers': 'للمطوّرين', '/topics': 'الموضوعات',
  '/lexicon': 'المعجم', '/quran': 'القرآن', '/chains': 'الأسانيد', '/bio-search': 'البحث في التراجم',
  '/find-by-number': 'البحث بالرقم', '/library': 'مكتبتي', '/saved': 'المحفوظات', '/scholars': 'العلماء', '/companions': 'الصحابة',
  '/hadith-terms': 'مصطلحات الحديث', '/takhrij': 'التخريج', '/stats': 'إحصاءات الموسوعة', '/controversial': 'المسائل الخلافية',
  '/hadiths/advanced-research': 'البحث المتقدم', '/narrators/chain-filter': 'تصفية الرواة بالسند', '/mcp': 'خادم MCP',
  '/authors': 'المصنّفون', '/indexes': 'الفهارس', '/sections': 'الأبواب', '/matn-compare': 'مقارنة المتون', '/asaneed': 'الأسانيد',
  '/hadith': 'الأحاديث', '/narrator': 'تراجم الرواة', '/scholar': 'العلماء (صفحاتهم)', '/service-content': 'محتوى الخدمات',
  '/hadiths': 'الأحاديث', '/offline': 'دون اتصال', '/oauth': 'الربط (OAuth)', '/unique-hadiths': 'الأحاديث المتفردة', '/narrator-types': 'أنواع الرواة', '/musnad-musannaf': 'المسانيد والمصنفات',
}

/** Ids in the pages' addresses, to look up their names (hadith, narrators, books, topics). */
export function idsIn(paths: string[]) {
  const ids = { hadith: new Set<number>(), narrator: new Set<number>(), book: new Set<number>(), topic: new Set<number>() }
  for (const p of paths) {
    const m = p.match(/^\/(hadith|narrator|narrators|scholar|books|topics)\/(\d+)(?:\/|$)/)
    if (!m) continue
    const id = Number(m[2])
    if (m[1] === 'hadith') ids.hadith.add(id)
    else if (m[1] === 'books') ids.book.add(id)
    else if (m[1] === 'topics') ids.topic.add(id)
    else ids.narrator.add(id)
  }
  return ids
}

export type Names = { hadith: Map<number, string>; narrator: Map<number, string>; book: Map<number, string>; topic: Map<number, string> }

export function decodePath(s: string) {
  try { return decodeURIComponent(s) } catch { return s }
}

/** «حديث · صحيح البخاري · إنما الأعمال…», «راوٍ · …», or the page's name */
export function pageName(path: string, names: Names): string {
  if (PAGES[path]) return PAGES[path]
  const m = path.match(/^\/(hadith|narrator|narrators|scholar|books|topics)\/(\d+)(\/.*)?$/)
  if (m) {
    const id = Number(m[2]), rest = m[3] ? ` ${m[3]}` : ''
    const [kind, map] = m[1] === 'hadith' ? ['حديث', names.hadith] : m[1] === 'books' ? ['كتاب', names.book]
      : m[1] === 'topics' ? ['موضوع', names.topic] : m[1] === 'scholar' ? ['عالم', names.narrator] : ['راوٍ', names.narrator]
    const name = map.get(id)
    return name ? `${kind} · ${name}${rest}` : `${kind} ${id}${rest}`
  }
  const sura = path.match(/^\/quran\/(\d+)$/)
  if (sura) return `سورة رقم ${sura[1]}`
  const section = '/' + path.split('/')[1]
  return PAGES[section] && path !== section ? `${PAGES[section]} · ${decodePath(path.slice(section.length + 1))}` : decodePath(path)
}
