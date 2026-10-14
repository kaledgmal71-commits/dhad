const G = require('./gen.js');
const { page, emit, codebox, hl, crumbs, esc, AR, write, lessons, dict, examples, docs, roadmap, articles, SITE, DIST, ROOT, fs, path, R, problems } = G;
const EDITOR_SRC = fs.readFileSync(path.join(DIST, 'index.html'), 'utf8');
const N = lessons.length;

// ===== الرئيسية =====
const heroCode = `# جرّب الآن: عدّل الكود واضغط تشغيل
دالة تحية(اسم) {
    ارجع "أهلًا بك يا " + اسم
}
اطبع(تحية("ضاد"))

من_أجل (ع من ١ إلى ٥) {
    اطبع(ع، "×"، ع، "="، ع * ع)
}`;
const featured = [lessons[0], lessons[5], lessons[9], lessons[11]];
emit('/', { title: 'ضاد', desc: 'ضاد لغة برمجة عربية مجانية: محرر يعمل في المتصفح، دروس مصوّرة من الصفر، معجم، أمثلة منفّذة، ومجتمع للمتعلمين.',
 body: `
<section class="hero"><div><span class="tag">مجانية · مفتوحة · بلا تثبيت</span>
<h1>البرمجة بكلمات عربية.</h1>
<p class="lead">ضاد لغة صغيرة للتعلّم: كلماتها عربية، وتعمل في متصفحك دون تثبيت. تتعلم بها الأفكار الأولى (المتغير والشرط والحلقة والدالة) بلسانك، ثم تنتقل إلى لغات الصناعة وأنت تفهم الأساس. <a href="/limits/">ما هي ضاد وما ليست؟</a></p>
<div class="btns"><a class="btn" href="/learn/">ابدأ من الصفر</a><a class="btn alt" href="/editor/">افتح المحرر</a></div>
<div class="stats"><div><b>${AR(N)}</b>درسًا مصوّرًا</div><div><b>${AR(dict.length)}</b>مدخلًا في المعجم</div><div><b>${AR(examples.length)}</b>مثالًا منفّذًا</div></div></div>
<div id="pg"><div class="codebox"><div class="bar"><span>ملعب ضاد</span><button id="pg-run">▶ شغّل (Ctrl+Enter)</button><a id="pg-ed" href="/editor/">في المحرر</a></div>
<textarea spellcheck="false" aria-label="شيفرة ضاد" style="display:block;width:100%;min-height:210px;border:0;resize:vertical;padding:16px 18px;background:var(--code);color:var(--codeink);font:500 15px/1.9 Cairo,ui-monospace,monospace;direction:rtl">${esc(heroCode)}</textarea><div class="out" id="pg-out"></div></div></div></section>

<section class="sec"><h2>لماذا ضاد؟ <a href="/articles/why-arabic/">اقرأ الفكرة ←</a></h2>
<div class="grid"><div class="card"><h3>كلمات تفهمها فورًا</h3><p>إذا، وإلا، طالما، دالة، ارجع. تنشغل بالفكرة لا بترجمة المصطلح.</p></div>
<div class="card"><h3>تصدّر ما كتبته</h3><p>اكتب برنامجك ثم صدّره ملف HTML واحدًا يعمل عند أي شخص دون إنترنت ودون حساب.</p></div>
<div class="card"><h3>أخطاء بالعربية</h3><p>«متغير غير معرّف: س» بدل رسالة غامضة بلغة أجنبية.</p></div>
<div class="card"><h3>بلا تثبيت ولا حساب</h3><p>افتح الصفحة واكتب. ملفاتك تُحفظ تلقائيًا وتُزامَن دون تسجيل.</p></div></div></section>

<section class="sec"><h2>من دروس «ضاد من الصفر» <a href="/learn/">كل الدروس ←</a></h2>
<div class="grid lessongrid">${featured.map(l => lessonCard(l)).join('')}</div></section>

<section class="sec"><h2>أمثلة منفّذة فعلًا <a href="/examples/">كل الأمثلة ←</a></h2>
<p class="lead">كل مثال في الموقع يُشغَّل بالمحرك الحقيقي أثناء بناء الموقع، والمخرجات المعروضة هي مخرجاته الفعلية.</p>
${codebox(examples.find(e => e.id === 'primes').code, 'home:primes')}</section>

<section class="sec"><h2>الذكاء الاصطناعي وضاد <a href="/ai/">التفاصيل ←</a></h2>
<div class="grid"><div class="card"><h3>اسأل نموذجك بشكل صحيح</h3><p>حزمة تعليمات جاهزة تجعل أي مساعد ذكي يكتب ضاد صحيحة.</p></div>
<div class="card"><h3>بيئة تنفيذ آمنة</h3><p>دالة <code>نفّذ</code> تشغّل كودًا مولَّدًا في صندوق معزول بحدّ خطوات.</p></div></div></section>

<section class="sec"><h2>رأيك يبني اللغة <a href="/community/">المجتمع ←</a></h2>
<p class="lead">أعجبك شيء؟ أزعجك شيء؟ عندك اقتراح للصياغة العربية؟ اكتبه في لوحة المجتمع وأيّد ما يعجبك من آراء الآخرين.</p></section>` });

function lessonCard(l) { const ع = lessons.indexOf(l);
  return `<a class="card" href="/learn/${l.id}/" data-lesson-card="${l.id}"><div class="ic">${l.icon}</div><div class="n">الدرس ${AR(String(ع + 1).padStart(2, '0'))} · ${l.level}</div><h3>${l.title}</h3><p>${l.goal}</p></a>`; }


// ===== محرر التحدي داخل الدرس =====
const challenges = require('./content/challenges.js');
function chalBox(l) { const c = challenges[l.id]; if (!c) return '';
  const data = JSON.stringify({ id: l.id, task: c.task, tests: c.tests || [], must: c.must || [], mustNot: c.mustNot || [], error: c.error || '', hint: c.hint, solution: c.solution, starter: c.starter }).replace(/</g, '\\u003c');
  return `<div class="chalbox" id="cb"><div class="cbhead"><b>جرّب بنفسك</b><span>${esc(c.task)}</span></div>
<div class="cbbar"><button class="btn" data-act="run">▶ شغّل وافحص</button><button class="btn alt" data-act="hint">تلميح</button><button class="btn alt" data-act="sol" hidden>أظهر الحل</button><button class="btn alt" data-act="reset">إعادة</button></div>
<textarea class="cbta" dir="rtl" spellcheck="false" autocapitalize="off" autocomplete="off" aria-label="محرر التحدي">${esc(c.starter)}</textarea>
<div class="cbmsg" role="status" hidden></div><div class="cbsol" hidden></div></div><script type="application/json" id="chal-data">${data}</script>`; }

// ===== تعلّم =====
{ const levels = [...new Set(lessons.map(l => l.level))];
  emit('/learn/', { title: 'ضاد من الصفر', desc: 'سلسلة دروس مصوّرة بأوراق دفتر مرتّبة: ورقة واحدة لكل فكرة، مع مثال منفّذ وتحدٍّ.',
   body: `${crumbs([null, 'تعلّم'])}<h1>ضاد من الصفر</h1><p class="lead">${AR(N)} ورقة، لكل ورقة فكرة واحدة ومثال واحد وتحدٍّ واحد. اقرأ، شغّل المثال، ثم جرّب التحدي في المحرر. لا تحتاج أي معرفة سابقة.</p>
${levels.map(lv => `<section class="sec"><h2>${lv}</h2><div class="grid lessongrid">${lessons.filter(l => l.level === lv).map(lessonCard).join('')}</div></section>`).join('')}
<div class="callout"><b>دروس الفيديو:</b> قيد الإنتاج وفق <a href="/roadmap/">الخارطة</a>. إلى حين صدورها، كل درس مكتوب ومنفّذ تفاعليًا أمامك.</div>` });
  lessons.forEach((l, ع) => {
    const prev = lessons[ع - 1], next = lessons[ع + 1], num = AR(String(ع + 1).padStart(2, '0'));
    emit(`/learn/${l.id}/`, { title: `${l.title} — ضاد من الصفر ${num}`, desc: l.goal, bodyAttr: `data-lesson="${l.id}"`,
     body: `${crumbs(['/learn/', 'تعلّم'], [null, l.title])}<div class="progress"><i style="width:${Math.round((ع + 1) / N * 100)}%"></i></div>
<div class="sheetwrap"><article class="sheet"><div class="ico">${l.icon}</div><div class="no">ضاد من الصفر · ${num} / ${AR(N)}</div><h1>${l.title}</h1>
<div class="goal">الهدف: ${l.goal}</div><ol>${l.points.map(p => `<li>${esc(p)}</li>`).join('')}</ol>
${codebox(l.code, 'lesson:' + l.id, { expectError: l.expectError })}
<div class="tipbox"><b>نصيحة:</b> ${esc(l.tip)}</div><div class="chal"><b>تحدٍّ:</b> ${esc(l.challenge)}</div>${chalBox(l)}</article>
<div class="sheetnote">اطبع الصفحة (Ctrl+P) لتحصل على الورقة وحدها.</div>
<div class="pager">${prev ? `<a class="btn alt" href="/learn/${prev.id}/">→ ${prev.title}</a>` : '<span></span>'}${next ? `<a class="btn" href="/learn/${next.id}/">${next.title} ←</a>` : `<a class="btn" href="/examples/">أمثلة عملية ←</a>`}</div></div>` });
  });
}

// ===== الدليل =====
emit('/docs/', { title: 'دليل المستخدم', desc: 'مرجع لغة ضاد: الصياغة والأنواع والعوامل والتحكم والدوال والقوائم والأخطاء.',
 body: `${crumbs([null, 'الدليل'])}<h1>دليل المستخدم</h1><p class="lead">مرجع مختصر ودقيق. للتعلم المتدرج ابدأ من <a href="/learn/">الدروس</a>، وللبحث عن دالة بعينها افتح <a href="/dictionary/">المعجم</a>.</p>
<div class="prose">${docs.map(d => `<section id="${d.id}"><h2>${d.title}</h2>${d.body}${d.code ? codebox(d.code, 'docs:' + d.id, { browser: d.browser }) : ''}</section>`).join('')}</div>` });
write('guide.html', `<!doctype html><meta charset="utf-8"><meta http-equiv="refresh" content="0;url=/docs/"><link rel="canonical" href="${SITE}/docs/"><title>الدليل</title><a href="/docs/">انتقل إلى الدليل</a>`);

// ===== المعجم =====
{ const cats = ['كلمة محجوزة', ...new Set(dict.filter(d => d.cat).map(d => d.cat))];
  const entries = dict.map(d => { const c = d.kind === 'كلمة محجوزة' ? 'كلمة محجوزة' : d.cat;
    return `<div class="entry" data-cat="${c}" data-q="${esc(d.w + ' ' + d.en + ' ' + d.d + ' ' + c)}" id="${esc(d.w)}"><h3>${d.w} <span class="tag">${c}</span> <span class="en">${d.en}</span></h3><code class="sig">${esc(d.sig)}</code><p>${d.d}</p>${d.ex ? codebox(d.ex, 'dict:' + d.w) : (c === 'متصفح' ? '<p class="msg">تعمل في المحرر فقط (لوحة المعاينة).</p>' : '')}</div>`; }).join('');
  emit('/dictionary/', { title: 'المعجم', desc: 'معجم لغة ضاد: الكلمات المحجوزة والدوال الجاهزة مع شرح ومثال منفّذ لكل منها.',
   body: `${crumbs([null, 'المعجم'])}<h1>معجم ضاد</h1><p class="lead">كل كلمة محجوزة وكل دالة جاهزة في المحرك، مع مثال يعمل. يُتحقق عند كل بناء أن المعجم يغطي كل ما في المحرك.</p>
<div class="dictbar"><input id="dsearch" type="search" placeholder="ابحث بالعربية أو بالمقابل الإنجليزي…" aria-label="بحث"><span class="msg" id="dcount"></span></div>
<div class="chips"><button class="chip on" data-cat="">الكل</button>${cats.concat(['متصفح']).filter((c, ع, a) => a.indexOf(c) === ع).map(c => `<button class="chip" data-cat="${c}">${c}</button>`).join('')}</div>${entries}` });
}

// ===== الأمثلة =====
{ const cats = [...new Set(examples.map(e => e.cat))];
  emit('/examples/', { title: 'أمثلة عملية', desc: 'برامج حقيقية بلغة ضاد: خوارزميات وتطبيقات صغيرة، منفّذة بمخرجاتها الفعلية.',
   body: `${crumbs([null, 'أمثلة'])}<h1>أمثلة عملية</h1><p class="lead">كل برنامج هنا نُفِّذ بمحرك ضاد أثناء بناء الموقع. اضغط «شغّل» لتراه يعمل في متصفحك، أو افتحه في المحرر وعدّل عليه.</p>
${cats.map(c => `<section class="sec"><h2>${c}</h2>${examples.filter(e => e.cat === c).map(e => `<h3 id="${e.id}">${e.title}</h3><p>${e.desc}</p>${codebox(e.code, 'example:' + e.id)}`).join('')}</section>`).join('')}` });
}

// ===== الذكاء الاصطناعي =====
const BI_LIST = dict.filter(d => d.kind === 'دالة جاهزة').map(d => d.w).join('، ');
const SPEC = `أنت تكتب برامج بلغة «ضاد» (لغة برمجة عربية). التزم بالقواعد التالية حرفيًا:

الكلمات المحجوزة: دالة، ارجع، إذا، وإلا، طالما، من_أجل، من، إلى، متغير، صحيح، خطأ، لاشيء، و، أو، ليس، توقف، أكمل.
الصياغة:
- تعريف متغير: متغير س = ٥  (ثم س = ٦ للتغيير).
- شرط: إذا (شرط) { … } وإلا إذا (شرط) { … } وإلا { … }
- حلقات: طالما (شرط) { … }  و  من_أجل (ع من ١ إلى ١٠) { … }  (النهاية شاملة). توقف / أكمل متاحتان.
- دالة: دالة اسم(أ، ب) { ارجع أ + ب }. تُستدعى اسم(١، ٢). الدالة قيمة عادية.
- الفاصلة بين المعاملات والقيم: «،» أو «,». التعليق: # إلى آخر السطر.
- قائمة: [١، ٢، ٣] وفهرستها ق[٠] تبدأ من ٠. قاموس: {اسم: "علي"} ويُقرأ ويُكتب بـ م["اسم"].
- العوامل: + - * / % == != < > <= >= و أو ليس.
- ادمج النص مع الرقم بـ "نص" + نص(٥).
الدوال الجاهزة: ${BI_LIST}.
قيود لا تخالفها (غير مدعومة حاليًا): لا وحدات ولا كائنات ولا صيغة من_أجل على العناصر مباشرة (استعمل العدّاد أو طبّق/رشّح/اختصر). المدعوم: الدوال المجهولة والإغلاقات، م.اسم وم["اسم"]، مفاتيح() وقيم() واحذف() وطول() للخرائط، ادخل()، حاول { } التقط (خ) { }، أطلق_خطأ(). لا تستعمل «و» أو «من» أو «إلى» اسمًا لمتغير.
اكتب الشيفرة وحدها داخل كتلة واحدة، ثم شرحًا موجزًا بالعربية.`;
emit('/ai/', { title: 'ضاد والذكاء الاصطناعي', desc: 'كيف تستعين بالذكاء الاصطناعي لتعلّم ضاد وكتابتها، وكيف يمكن أن تفيد لغة صغيرة معزولة مثل ضاد النماذج.',
 body: `${crumbs([null, 'الذكاء الاصطناعي'])}<h1>ضاد والذكاء الاصطناعي</h1><p class="lead">علاقة باتجاهين: الذكاء الاصطناعي يسرّع تعلّمك لضاد، وضاد تجعل فهم البرمجة (والتعامل مع الذكاء الاصطناعي) أسهل بلغتك.</p>
<div class="prose"><h2>١) كيف تستفيد أنت من الذكاء الاصطناعي في تعلّم ضاد؟</h2>
<ul><li><b>مدرّس صبور:</b> الصق كودك مع رسالة الخطأ واطلب شرحًا لما حدث بالعربية.</li><li><b>مولّد تمارين:</b> «أعطني ٥ تمارين على الحلقات بمستوى مبتدئ، بحلولها».</li><li><b>مترجم بين اللغات:</b> «حوّل هذا الكود من بايثون إلى ضاد، وبيّن ما لا تدعمه ضاد».</li><li><b>مراجع:</b> «ما الأخطاء المنطقية في برنامجي؟» ثم تحقق بنفسك بتشغيله.</li></ul>
<div class="callout warn"><b>تنبيه:</b> النماذج لا تعرف ضاد جيدًا لأنها لغة جديدة، وقد تخترع دوالًا غير موجودة. الحل: أعطها الحزمة أدناه، ثم <b>شغّل ما تكتبه في المحرر</b> قبل أن تثق به.</div>
<h2>٢) حزمة تعليمات جاهزة للنسخ</h2><p>ضعها في بداية المحادثة مع أي مساعد ذكي (أو في التعليمات المخصّصة). مولَّدة آليًا من المحرك والمعجم، فهي تتحدّث مع اللغة.</p></div>
<div class="codebox"><div class="bar"><span>تعليمات للنموذج</span><button data-copy="spec">نسخ</button></div><pre id="spec" style="white-space:pre-wrap">${esc(SPEC)}</pre></div>
<div class="prose"><p>ملف <a href="/llms.txt">llms.txt</a> يحوي النسخة نفسها لمن يبني أدوات تقرأه آليًا.</p>
<h2>٣) كيف تفيد ضاد الذكاء الاصطناعي؟</h2>
<p>بعض هذه النقاط قائم اليوم، وبعضها اتجاه نعمل عليه، ونفصل بينهما بوضوح:</p>
<div class="tablewrap"><table><tr><th>الفكرة</th><th>الحالة</th></tr>
<tr><td><b>صندوق تنفيذ آمن لكود مولَّد:</b> دالة <code>نفّذ</code> تشغّل نصًا في آلة معزولة بحدّ خطوات وتعيد مخرجاته، فلا يضر كود النموذج الجهاز.</td><td><span class="status done">قائم</span></td></tr>
<tr><td><b>لغة صغيرة قابلة للتحقق:</b> قواعدها قليلة فيسهل فحص صحة ما تولّده النماذج آليًا بالمحلل والمُصرّف.</td><td><span class="status done">قائم</span></td></tr>
<tr><td><b>مادة تعليمية مصحّحة بالتنفيذ:</b> أمثلة الموقع ومخرجاتها يمكن أن تكون مجموعة بيانات عربية نظيفة لقياس قدرة النماذج على البرمجة بالعربية.</td><td><span class="status wip">قيد التجهيز</span></td></tr>
<tr><td><b>حلقة «النموذج يكتب ← ضاد تنفّذ ← النموذج يصلح»:</b> أداة سطر أوامر تسمح بتشغيل هذه الحلقة آليًا.</td><td><span class="status plan">مخطط</span></td></tr></table></div>
<h2>٤) جرّب حلقة الإصلاح الآن</h2><p>هذا ما يحدث عمليًا عندما يخطئ نموذج: ينفّذ ضاد الكود فتعيد رسالة واضحة يمكن إرجاعها له ليصلح.</p></div>
${codebox(`# كود مولَّد فيه خطأ (دالة غير موجودة)
اطبع(نفّذ("اطبع(مجموع([١، ٢، ٣]))"))
# بعد إصلاح النموذج له:
اطبع(نفّذ("متغير م = ٠\\nمن_أجل (ع من ١ إلى ٣) { م = م + ع }\\nاطبع(م)"))`, 'ai:loop')}` });
write('llms.txt', `# ضاد (Dhad)\n> لغة برمجة عربية مجانية مفتوحة، مترجم وآلة افتراضية خاصة، تعمل في المتصفح. الموقع: ${SITE}\n\n## تعليمات لكتابة شيفرة ضاد\n${SPEC}\n\n## روابط\n- المحرر: ${SITE}/editor/\n- الدليل: ${SITE}/docs/\n- المعجم: ${SITE}/dictionary/\n- الدروس: ${SITE}/learn/\n- أمثلة: ${SITE}/examples/\n`);

// ===== المجتمع =====
emit('/community/', { title: 'المجتمع', desc: 'لوحة مجتمع ضاد: آراء المتعلمين الإيجابية والسلبية، اقتراحاتهم وأسئلتهم.',
 body: `${crumbs([null, 'المجتمع'])}<h1>مجتمع ضاد</h1><p class="lead">هنا تُصنع اللغة. اكتب ما أعجبك وما أزعجك وما تتمنى أن تراه. لا حاجة لحساب؛ يُنشأ لك حساب مجهول تلقائيًا في متصفحك.</p>
<div style="display:grid;grid-template-columns:1fr 1.4fr;gap:26px" class="comgrid"><form class="new" id="newpost"><h3 style="margin-top:0">مشاركة جديدة</h3>
<label>النوع</label><select name="kind"><option>رأي إيجابي</option><option>رأي سلبي</option><option selected>اقتراح</option><option>سؤال</option></select>
<label>الاسم (اختياري)</label><input name="author" maxlength="40" placeholder="زائر"><label>مشاركتك</label><textarea name="body" rows="5" maxlength="1200" placeholder="اكتب بوضوح واحترام…"></textarea>
<p style="margin:10px 0 0"><button class="btn" type="submit">انشر</button></p><div class="msg" id="postmsg"></div><div class="msg">تظهر المشاركة فورًا للجميع. نحذف المسيء والإعلانات.</div></form>
<div><div class="chips" style="margin-bottom:8px"><button class="chip on" data-kind="">الكل</button><button class="chip" data-kind="رأي إيجابي">إيجابي</button><button class="chip" data-kind="رأي سلبي">سلبي</button><button class="chip" data-kind="اقتراح">اقتراحات</button><button class="chip" data-kind="سؤال">أسئلة</button></div><div id="board"><p class="msg">جارٍ التحميل…</p></div></div></div>
<style>@media(max-width:820px){.comgrid{grid-template-columns:1fr!important}}</style>` });

// ===== الخارطة =====
{ const lab = { done: 'أُنجز', wip: 'قيد العمل', plan: 'مخطط' };
  emit('/roadmap/', { title: 'متطلبات وخارطة الطريق', desc: 'ما أُنجز في ضاد وما هو قيد العمل وما نخطط له، بصراحة.',
   body: `${crumbs([null, 'الخارطة'])}<h1>المتطلبات وخارطة الطريق</h1><p class="lead">لغة جادة تحتاج متطلبات جادة. هذه قائمتنا المعلنة، بما فيها الحدود الحالية التي لا نخفيها. اقترح أو أيّد من <a href="/community/">المجتمع</a>.</p>
<div class="road">${roadmap.map(([s, t, d]) => `<div class="item"><span class="status ${s}">${lab[s]}</span><div><b>${t}</b><span class="d">${d}</span></div></div>`).join('')}</div>` });
}

// ===== المقالات =====
emit('/articles/', { title: 'مقالات', desc: 'مقالات عن ضاد وعن البرمجة واللغات الأخرى وتعلّم البرمجة.',
 body: `${crumbs([null, 'مقالات'])}<h1>مقالات</h1><div class="grid" style="grid-template-columns:repeat(auto-fill,minmax(300px,1fr))">${articles.map(a => `<a class="card" href="/articles/${a.id}/"><span class="tag">${a.mins ? AR(a.mins) + ' دقائق قراءة' : ''}</span><h3>${a.title}</h3></a>`).join('')}</div>` });
articles.forEach(a => emit(`/articles/${a.id}/`, { title: a.title, desc: a.title,
 body: `${crumbs(['/articles/', 'مقالات'], [null, a.title])}<article class="prose"><h1>${a.title}</h1><p class="msg">${AR(a.mins)} دقائق قراءة</p>${a.body}${a.code ? codebox(a.code, 'article:' + a.id) : ''}</article>` }));

// ===== عن =====
emit('/about/', { title: 'عن المشروع', desc: 'عن ضاد: الغاية، الاسم، وكيف تشارك.',
 body: `${crumbs([null, 'عن المشروع'])}<article class="prose"><h1>عن المشروع</h1>
<p>ضاد عمل مجاني لوجه العلم: لغة برمجة عربية مبنية بشكل صحيح (مترجم وآلة افتراضية) لا مجرد ترجمة للكلمات. غايتنا تسهيل العلم، وبالتالي تسهيل فهم الذكاء الاصطناعي والتعامل معه باحترافية وبساطة.</p>
<h2>كيف تشارك؟</h2><ul><li>تعلّم وأخبرنا بما صعب عليك في <a href="/community/">المجتمع</a>.</li><li>اقترح صياغات عربية أفضل للكلمات والبنية.</li><li>اكتب مقالًا أو مثالًا تعليميًا وأرسله لنا.</li></ul>
<h2>خصوصيتك</h2><p>لا نطلب بريدك ولا اسمك. يُنشأ حساب مجهول في متصفحك لحفظ ملفاتك ومشاركاتك. لا نستعمل إعلانات ولا تتبعًا.</p></article>` });

// ===== ما هي ضاد وما ليست =====
emit('/limits/', { title: 'ما هي ضاد وما ليست', desc: 'حدود ضاد بصراحة: ما تصلح له، ما لا تصلح له، كيف تنشر ما تكتبه، وكيف تنتقل منها إلى بايثون وجافاسكربت.',
 body: `${crumbs([null, 'ما هي ضاد وما ليست'])}<article class="prose"><h1>ما هي ضاد وما ليست</h1>
<p class="lead">نفضّل أن تعرف الحدود من أول صفحة، لا أن تكتشفها بعد ساعات.</p>
<h2>ما هي</h2>
<ul><li><b>لغة تعليمية صغيرة.</b> الغاية أن تفهم فكرة البرمجة بلسانك: المتغير، الشرط، الحلقة، الدالة، القائمة.</li>
<li><b>لها مترجم وآلة افتراضية خاصة بها</b> (محلل لغوي ← بايتكود ← آلة مكدّس)، مكتوبة بجافاسكربت وتعمل داخل المتصفح. ليست مجرد استبدال كلمات.</li>
<li><b>مجانية ومفتوحة</b>، بلا حساب ولا إعلانات.</li></ul>
<h2>ما ليست</h2>
<ul><li>ليست بديلًا عن بايثون أو جافاسكربت أو غيرهما في العمل الحقيقي. لا مكتبات ولا حزم ولا اتصال بقواعد بيانات.</li>
<li>ليست مستقلة عن بنية اللغات الأجنبية: محركها يعمل فوق جافاسكربت، وناتج التصدير يحمل هذا المحرك. نقول ذلك صراحةً.</li>
<li>ليست سريعة: نحو عشرة ملايين تعليمة في الثانية. تكفي للدروس والبرامج الصغيرة، ولا تصلح لحسابات ثقيلة.</li></ul>
<h2>ما ينقصها اليوم</h2>
<div class="tablewrap"><table><tr><th>النقص</th><th>الأثر</th></tr>



<tr><td>لا وحدات ولا كائنات</td><td>لا استيراد بين الملفات بعد، وتُجمَّع البيانات في خرائط وقوائم.</td></tr>
<tr><td>المتغير داخل كتلة <code>إذا</code> أو الحلقة يبقى مرئيًا بعدها</td><td>نطاق الدالة فقط، لا نطاق الكتلة.</td></tr>
<tr><td>الكلمات <code>و</code> و<code>من</code> و<code>إلى</code> محجوزة</td><td>لا تصلح أسماء متغيرات.</td></tr></table></div>
<h2>ما تحقق مؤخرًا</h2>
<p>أُضيف إلى المحرك وجُرّب: الدوال المجهولة والإغلاقات، ومفاتيح الخرائط وقيمها وحذفها والوصول إليها بالنقطة، والإدخال بـ <code>ادخل()</code>، ومعالجة الأخطاء بـ <code>حاول/التقط</code>، ودوال <code>طبّق</code> و<code>رشّح</code> و<code>اختصر</code>. التفاصيل في <a href="/roadmap/">الخارطة</a>.</p>
<h2>ما تغيّر بعد أول مراجعة نقدية</h2>
<p>راجع أحد المتخصصين الشيفرة ووجد عيوبًا حقيقية، فأصلحنا ما يلي وجرّبنا كل بند:</p>
<ul><li>حلقة <code>من_أجل (ع من ٠ إلى طول(ق) - ١)</code> على قائمة فارغة كانت تعمل مرتين. الآن لا تعمل. وللعدّ التنازلي: <code>بخطوة -١</code>.</li>
<li>الإسناد لمتغير غير معرّف داخل دالة كان ينشئ متغيرًا عامًا بصمت. الآن يعطي خطأ يطلب تعريفه بـ <code>متغير</code>.</li>
<li><code>"أ" - ١</code> كانت تعطي NaN، و<code>١ + "٢"</code> كانت تعطي «1٢». الآن الأنواع صارمة والرسالة تشرح السبب.</li>
<li>رسائل الأخطاء صارت بالعربية الخالصة مع رقم السطر، وكتابة <code>اذا</code> بلا همزة تقترح <code>إذا</code>.</li>
<li>الفاصلة العشرية العربية <code>٣٫٥</code> مقبولة، والمخرجات تستعملها.</li>
<li>حدّ التنفيذ صار زمنيًا (٨ ثوانٍ) لا مليوني تعليمة، فيعمل <code>فيبوناتشي(٢٥)</code> في ربع ثانية.</li>
<li>معاينة الصفحات داخل المحرر معزولة (sandbox)، ولا يُسمح بإنشاء وسوم <code>script</code> أو <code>iframe</code> من البرنامج.</li>
<li>أضفنا <code>نص_برمجي()</code> لتوليد CSS وJSON بأرقام لاتينية، فتبقى <code>نص()</code> للعرض.</li></ul>
<h2>كيف أنشر ما كتبته بضاد؟</h2>
<p>من المحرر اضغط «تصدير تطبيق مستقل». تحصل على ملف HTML واحد فيه محرك ضاد وبرنامجك، يعمل دون إنترنت ودون حساب ودون خادم. افتحه بنقرتين أو أرسله بواتساب أو ارفعه على أي استضافة ثابتة (GitHub Pages أو Netlify أو مجلد على خادم مدرستك).</p>
<p>الحدود هنا أيضًا: هذا مناسب للبرامج الصغيرة والتعليمية. لخدمة حقيقية بقاعدة بيانات وحسابات مستخدمين ستحتاج لغة صناعية، وضاد تهيئك لها.</p>
<h2>جسر إلى لغات الصناعة</h2>
<p>الغاية أن تنتقل وأنت تفهم. هذا ما يقابل أبرز بنى ضاد في بايثون وجافاسكربت (الأمثلة هنا للمقارنة، وليست مما ينفّذه الموقع):</p>
<div class="tablewrap"><table><tr><th>ضاد</th><th>بايثون</th><th>جافاسكربت</th></tr>
<tr><td><code>متغير س = ٥</code></td><td><code>س = 5</code></td><td><code>let x = 5</code></td></tr>
<tr><td><code>اطبع("مرحبا")</code></td><td><code>print("hello")</code></td><td><code>console.log("hello")</code></td></tr>
<tr><td><code>إذا (س &gt; ٣) { … } وإلا { … }</code></td><td><code>if x &gt; 3: … else: …</code></td><td><code>if (x &gt; 3) { … } else { … }</code></td></tr>
<tr><td><code>طالما (س &lt; ١٠) { … }</code></td><td><code>while x &lt; 10: …</code></td><td><code>while (x &lt; 10) { … }</code></td></tr>
<tr><td><code>من_أجل (ع من ١ إلى ٥) { … }</code></td><td><code>for i in range(1, 6): …</code></td><td><code>for (let i = 1; i &lt;= 5; i++) { … }</code></td></tr>
<tr><td><code>دالة جمع(أ، ب) { ارجع أ + ب }</code></td><td><code>def add(a, b): return a + b</code></td><td><code>function add(a, b) { return a + b }</code></td></tr>
<tr><td><code>متغير ق = [١، ٢، ٣]</code> و <code>ق[٠]</code></td><td><code>q = [1, 2, 3]</code> و <code>q[0]</code></td><td><code>let q = [1, 2, 3]</code> و <code>q[0]</code></td></tr>
<tr><td><code>متغير م = {"اسم": "علي"}</code></td><td><code>m = {"name": "Ali"}</code></td><td><code>let m = {name: "Ali"}</code></td></tr></table></div>
<p>ملاحظة: في اللغات الأجنبية الفهرسة تبدأ من صفر أيضًا، والكلمات المحجوزة بالإنجليزية فقط (<code>if</code> و<code>while</code> و<code>for</code>)، وستجدها كما هي في كل مكان.</p>
<p>هل لديك نقد أو اقتراح؟ اكتبه في <a href="/community/">المجتمع</a>، فالنقد الصريح هو ما يطوّر اللغة.</p></article>` });

// ===== 404 وخرائط =====
write('404.html', page({ url: '/404', title: 'الصفحة غير موجودة', desc: 'الصفحة غير موجودة', body: `<h1>الصفحة غير موجودة</h1><p class="lead">ربما تغيّر العنوان. ابدأ من <a href="/">الرئيسية</a> أو <a href="/learn/">الدروس</a>.</p>` }));
write('sitemap.xml', `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${G.urls.concat(['/editor/']).map(u => `<url><loc>${SITE}${u}</loc></url>`).join('')}</urlset>`);
write('robots.txt', `User-agent: *\nAllow: /\nSitemap: ${SITE}/sitemap.xml\n`);

// ===== المحرر: نقله إلى /editor/ مع ترقيعات =====
{ const src = path.join(DIST, 'index.html');
  let html = EDITOR_SRC;
  if (!html.includes('data-site-patched')) {
    const before = html.length;
    html = html.replace('openFile(defaultId, { preview: false });',
      `(function(){var q=null;try{q=new URLSearchParams(location.search).get("code")}catch(e){}if(q){var nm="من-الموقع-"+toArabicIndicDigits(String(Date.now()%100000));var id=USER_CAT+"/"+nm;fileEntries.push({id:id,name:nm+".ضاد",code:"",category:USER_CAT,user:true});contents.set(id,q);touch(id);saveStore();buildTree();openFile(id,{preview:false});try{history.replaceState(null,"","/editor/")}catch(e){}}else openFile(defaultId,{preview:false});})();`);
    html = html.replace('window.open("/guide.html", "_blank")', 'window.open("/docs/", "_blank")');
    html = html.replace('<span class="titlebar-text">ضاد — محرر الأكواد</span>', '<a class="titlebar-text" href="/" style="color:inherit;text-decoration:none" title="موقع ضاد">ضاد — محرر الأكواد ⟵ الموقع</a>');
    if (!html.includes('من-الموقع-')) problems.push('editor: فشل ترقيع ?code=');
    if (!html.includes('href="/"')) problems.push('editor: فشل ترقيع الشريط');
    html = html.replace('<html', '<html data-site-patched="1"');
  }
  write('editor/index.html', html);
}
if (problems.length) { console.error('مشاكل البناء:\n' + problems.join('\n')); process.exit(1); }
console.log('الموقع جاهز:', G.urls.length, 'صفحة');
