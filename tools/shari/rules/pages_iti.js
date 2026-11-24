'use strict';
// يقرأ نص OpenITI ويفصله إلى صفحات: «# PageV01P003» بداية صفحة.
const fs = require('fs');
function loadPages(file) {
  const pages = new Map();
  let key = null, buf = [];
  const flush = () => { if (key) pages.set(key, buf.join(' ')); buf = []; };
  for (const ln of fs.readFileSync(file, 'utf8').split('\n')) {
    const m = ln.match(/^# PageV(\d+)P(\d+)/);
    if (m) { flush(); key = `${+m[1]}:${+m[2]}`; continue; }
    if (key && !ln.startsWith('#META#')) buf.push(ln.replace(/^(#|~~)\s*/, ''));
  }
  flush();
  return pages;
}
module.exports = { loadPages };
