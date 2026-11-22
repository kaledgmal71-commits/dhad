'use strict';
// تطبيع عربي للمطابقة والبحث: يزيل التشكيل والتطويل وعلامات المصحف، ويوحّد الألف والياء والتاء المربوطة.
function normalizeAr(s) {
  return String(s)
    .normalize('NFC')
    .replace(/[ؐ-ًؚ-ٰٟۖ-ۭـ]/g, '')
    .replace(/[آأإٱ]/g, 'ا')
    .replace(/ى/g, 'ي')
    .replace(/ة/g, 'ه')
    .replace(/ؤ/g, 'و')
    .replace(/ئ/g, 'ي')
    .replace(/[^ء-غف-ي0-9٠-٩a-zA-Z]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}
module.exports = { normalizeAr };
