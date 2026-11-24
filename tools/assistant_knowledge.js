// معرفة المساعد: المطالبة النظامية (من tools/builder/fewshot.md المولَّدة من معجم ضاد) + الكلمات المحجوزة + أسماء الدوال الجاهزة.
// تُكتب إلى dist/ai/assistant-knowledge.json فيستعملها محرك المساعد في المتصفح وفي Node بلا شبكة خارجية.
const fs = require('fs'), path = require('path');
const dict = require('../site/content/dict.js');
module.exports = function () {
  return {
    system: fs.readFileSync(path.join(__dirname, 'builder', 'fewshot.md'), 'utf8'),
    reserved: ['من', 'إلى', 'في', 'و', 'أو', 'ليس', 'هو', 'صحيح', 'خطأ', 'لاشيء', 'دالة', 'ارجع', 'إذا', 'وإلا', 'طالما', 'متغير', 'ثابت', 'صنف', 'يرث'],
    builtins: dict.filter(d => d.kind === 'دالة جاهزة').map(d => d.w)
  };
};
