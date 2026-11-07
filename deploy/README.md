# النشر الآمن (ملزم)

لا `gitSource` أبدًا (سبّب انقطاعًا ٢٠٢٦-١١-٠٦). الطريقة الوحيدة: ملفات bootstrap مثبّتة على كوميت.

## الخطوات
1. `git push` ثم خذ SHA الكامل: `git rev-parse HEAD`.
2. `create_deployment` (بلا target فيكون معاينة) بخمسة ملفات:
   - `build.js` = deploy/build.js.tpl بعد استبدال __SHA__
   - `package.json` = deploy/package.json
   - `vercel.json` و `api/keepalive.js` و `api/run.js` من المستودع نفسه. ما لم يتغير منها يُمرَّر بالمرجع بدل النص:
     `{"file":"vercel.json","sha":"8b80a6e4d2507cf96fd2485802c7f4243db0761e","size":71}`
     `{"file":"api/keepalive.js","sha":"a3c9da3a8ea94aca0c30ecd4acbab00045c5805e","size":842}`
     `{"file":"api/run.js","sha":"833d00c3f4ab2aa6882dca8b86418dfaf8be5bbf","size":7787}`
     (تحقّق قبل ذلك أن `sha1sum` للملف المحلي يطابق؛ إن اختلف أرسل نصه)
   - المشروع: prj_zExJcvI2MQo901ZOlMDYarG8Uamv، الفريق: team_irAMYHwSlKC9kMWjFYW5bZTQ
3. انتظر READY (~٤٠ ثانية)، ثم افحص على رابط المعاينة: /api/run و /api/keepalive و /nawa/ و /learn/ و /nawa/explain/ وصفحة من ضاد.
4. `assign_alias` للنطاق dhad-lang-beta.vercel.app على المعاينة (لا `request_promote` للمعاينات).
5. أعد الفحص على النطاق الحي و `get_runtime_errors`. احتفظ بمعرّف الإصدار السابق للتراجع الفوري بـ `request_rollback`.

## قبل الخطوة ١
`node build.js && node site/pages.gen.js && for f in tests/*.test.js; do node $f; done` ثم `node tools/shots.js <مجلد>` وانظر إلى الصور.
