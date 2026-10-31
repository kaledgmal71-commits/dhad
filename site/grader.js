// فاحص التحدّيات: يطابق منطق الفحص في المتصفح (site/assets/site.js) حرفيًا، ويُستعمل عند البناء وفي واجهة الوكلاء.
const norm = s => String(s).replace(/[٠-٩]/g, d => '٠١٢٣٤٥٦٧٨٩'.indexOf(d)).replace(/٫/g, '.').replace(/\s+$/, '').replace(/^\s+/, '');
// C: تعريف التحدي {tests, must, mustNot, error}، run: (code) => {ok, out, error}
function grade(C, code, run) {
  if (!String(code).replace(/#[^\n]*/g, '').trim()) return { ok: false, message: 'الكود فارغ.' };
  for (const m of (C.must || [])) if (!new RegExp(m.re).test(code)) return { ok: false, message: m.msg };
  for (const m of (C.mustNot || [])) if (new RegExp(m.re).test(code)) return { ok: false, message: m.msg };
  const tests = (C.tests && C.tests.length) ? C.tests : [{ post: '', expect: null }];
  for (const T of tests) {
    const r = run(code + '\n' + (T.post || ''));
    if (C.error) {
      if (r.ok) return { ok: false, message: 'الكود عمل دون خطأ، والمطلوب أن يحدث الخطأ المذكور.' };
      if (!new RegExp(C.error).test(r.error)) return { ok: false, message: 'حدث خطأ آخر غير المطلوب: ' + r.error };
      continue;
    }
    if (!r.ok) return { ok: false, message: '✗ ' + r.error + (r.out.length ? '\nقبل الخطأ طُبع:\n' + r.out.join('\n') : '') };
    if (T.expect) {
      const got = r.out.map(norm), exp = T.expect.map(norm);
      const same = got.length === exp.length && got.every((g, k) => g === exp[k]);
      if (!same) return { ok: false, message: (T.post ? 'بعد تشغيل كودك مع:\n' + T.post + '\n\n' : '') + 'المتوقع:\n' + T.expect.join('\n') + '\n\nالذي ظهر:\n' + (r.out.length ? r.out.join('\n') : '(لم يُطبع شيء)') };
    }
  }
  return { ok: true, message: 'اجتاز كل الاختبارات.' };
}
module.exports = { grade, norm };
