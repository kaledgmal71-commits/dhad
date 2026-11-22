'use strict';
// تحليل ملفات OpenITI mARkdown إلى صفحات. علامة PageV01P005 تقع في نهاية الصفحة 5 (داخل السطر غالبًا).
const MARK = /PageV(\d+)P(\d+)/g;

function cleanLine(l) {
  return l
    .replace(/^#{1,6}\s*\|+\s*/, '')      // عناوين ### ||
    .replace(/^#+\s*/, '')
    .replace(/^~~/, '')
    .replace(/@[A-Z_]+@/g, ' ')            // @MATN@ ونحوها
    .replace(/\bms\d+\b/g, ' ')
    .replace(/@\w+@\w*/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function parse(text) {
  const idx = text.indexOf('#META#Header#End#');
  let body = idx >= 0 ? text.slice(idx + '#META#Header#End#'.length) : text;
  const pages = [];
  let buf = [];
  let cur = { vol: 1, page: 0 };
  let started = false;
  const push = (vol, page, content) => {
    const t = content.join(' ').replace(/\s+/g, ' ').trim();
    if (t) pages.push({ vol, page, text: t });
  };
  for (const raw of body.split('\n')) {
    const line = cleanLine(raw);
    if (!line) continue;
    let last = 0, m;
    MARK.lastIndex = 0;
    while ((m = MARK.exec(line))) {
      buf.push(line.slice(last, m.index));
      push(+m[1], +m[2], buf);
      buf = [];
      last = m.index + m[0].length;
      started = true;
    }
    buf.push(line.slice(last));
  }
  const tail = buf.join(' ').replace(/\s+/g, ' ').trim();
  if (tail) {
    const lp = pages.length ? pages[pages.length - 1] : { vol: 1, page: 0 };
    pages.push({ vol: lp.vol, page: lp.page + 1, text: tail });
  }
  return pages;
}

function pageId(book, vol, page) { return `${book}:v${vol}:p${page}`; }

module.exports = { parse, pageId };
