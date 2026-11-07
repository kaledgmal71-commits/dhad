// شريط الطبقتين: مصدر واحد تستعمله صفحات ضاد وصفحات نواة. أي تعديل عليه يُجرى هنا فقط.
// المواصفة (ملزمة): نصفان بعرض الشريط؛ في كل نصف الحرف ثم الاسم العربي ثم شرطة ثم الإنجليزي؛ ولا شيء بجانبهما إلا زر السمة.
const THEME_SVG = '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="8"/><path d="M12 4a8 8 0 0 1 0 16z" fill="currentColor"/></svg>';
const HALVES = [['/nawa/', 'ن', 'نواة', 'NAWA'], ['/', 'ض', 'ضاد', 'dhad']];
// active: '/nawa/' أو '/'
function lbar(active) {
  const halves = HALVES.map(([h, l, ar, en]) => `<a class="ly${h === active ? ' on' : ''}" href="${h}"><i>${l}</i><b>${ar}</b><s>—</s><em>${en}</em></a>`).join('');
  return `<div class="lbar"><div class="layers" role="navigation" aria-label="الطبقتان">${halves}</div><button id="theme" class="mode" title="السمة" aria-label="تبديل السمة">${THEME_SVG}</button></div>`;
}
module.exports = { lbar, THEME_SVG };
