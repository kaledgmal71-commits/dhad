// وضع المختبر داخل محرر ضاد: الواجهة | الكود | شرح العلاقة (إضافة اختيارية؛ المحرر كما هو حين يكون مطفأً)
(function () {
"use strict";
var AR = "٠١٢٣٤٥٦٧٨٩";
var PARAMS={'صفحة':['العنوان'],'حقل':['—','التسمية','التلميح'],'نص':['—','المحتوى'],'زر':['—','نص الزر'],'نمّط':['—','الخاصية','القيمة'],'عيّن_نص':['—','النص'],'استورد':['الوحدة']};
var TERMS={
 'input':{ar:'حقل إدخال',en:'input',say:'إنْبُت',arab:'حقل إدخال',what:'عنصر في الصفحة يكتب فيه المستخدم نصًّا أو رقمًا.',role:'يستقبل بيانات المستخدم ليستعملها البرنامج.',how:'أنشئه بـ «حقل(...)» ثم اقرأ ما كُتب فيه بـ «اقرأ_قيمة(الحقل)».'},
 'button':{ar:'زر',en:'button',say:'بَتِن',arab:'زِرّ',what:'عنصر يُنفِّذ فعلًا حين ينقر عليه المستخدم.',role:'يربط نقرة المستخدم بدالة في شيفرتك.',how:'أنشئه بـ «زر(...)» ومرّر له الدالة التي تُنفَّذ عند النقر.'},
 'section':{ar:'قسم',en:'section',say:'سِكشِن',arab:'قسم',what:'حاوية تجمع أجزاء الصفحة المتصلة بموضوع واحد.',role:'تنظّم الصفحة وتحمل عناصرها.',how:'تُنشأ بـ «صفحة(...)» وتُضاف إليها العناصر بتمرير الصفحة أول وسيط.'},
 'h2':{ar:'عنوان فرعي',en:'heading 2',say:'هِدِنغ تو',arab:'عنوان',what:'نص كبير يسمّي القسم الذي تحته.',role:'يدلّ القارئ على موضوع القسم.',how:'يُنشأ تلقائيًّا بعنوان «صفحة(...)».'},
 'p':{ar:'فقرة',en:'paragraph',say:'بارَغراف',arab:'فقرة',what:'سطر أو أكثر من النص العادي.',role:'يعرض معلومة أو رسالة للمستخدم.',how:'أنشئها بـ «نص(...)» وغيّر محتواها لاحقًا بـ «عيّن_نص(...)».'},
 'label':{ar:'تسمية',en:'label',say:'لِيبِل',arab:'عنوان الحقل',what:'نص مرتبط بحقل يشرح ما يُكتب فيه.',role:'يخبر المستخدم ماذا يدخل.',how:'تُنشأ مع «حقل(...)» من وسيط التسمية.'},
 'span':{ar:'نص مضمَّن',en:'span',say:'سْبان',arab:'نطاق نصي',what:'قطعة نص صغيرة داخل سطر.',role:'تُنسَّق وحدها دون كسر السطر.',how:'تُستعمل داخل المكتبة لعرض تسمية الحقل.'},
 'div':{ar:'حاوية',en:'div',say:'دِڤ',arab:'حاوية',what:'صندوق عام بلا معنى خاص يجمع عناصر.',role:'يُستعمل للتجميع والتنسيق.',how:'أنشئه مباشرة بـ «عنصر_جديد("div")» ثم أضفه بـ «أضف_ابن».'},
 'متغير':{ar:'متغير',en:'variable',say:'فارْيابِل',arab:'متغيّر',what:'اسم يحفظ قيمة لتعود إليها لاحقًا.',role:'يحمل حقلًا أو رقمًا أو نصًّا.',how:'اكتب «متغير الاسم = القيمة».'},
 'استورد':{ar:'استورد',en:'import',say:'إمْبورت',arab:'استيراد',what:'يجلب مكتبة جاهزة إلى برنامجك.',role:'يتيح لك استعمال دوالها.',how:'«استورد("ضاد/واجهة")» تعطيك بناة الواجهة.'},
 'دالة':{ar:'دالة',en:'function',say:'فَنكشِن',arab:'دالة',what:'مجموعة أوامر لها اسم أو تُمرَّر كقيمة.',role:'تُنفَّذ عند الحاجة، مثل نقرة زر.',how:'اكتب «دالة() { ... }» وضع الأوامر داخل القوسين المعقوفين.'},
 'عيّن_نص':{ar:'عيّن نصًّا',en:'set text',say:'سِت تِكست',arab:'تعيين النص',what:'دالة مدمجة تغيّر النص الظاهر داخل عنصر.',role:'تحدّث الواجهة دون إعادة رسمها.',how:'«عيّن_نص(العنصر، "النص")».'},
 'اقرأ_قيمة':{ar:'اقرأ قيمة',en:'read value',say:'رِيد ڤاليو',arab:'قراءة القيمة',what:'دالة مدمجة تعيد ما كتبه المستخدم في حقل.',role:'تنقل مدخلات الواجهة إلى الشيفرة.',how:'«اقرأ_قيمة(الحقل)».'},
 'الجذر':{ar:'الجذر',en:'root',say:'رُوت',arab:'جذر الصفحة',what:'العنصر الأعلى الذي تُعلَّق عليه كل الواجهة.',role:'نقطة بداية رسم الواجهة.',how:'«أضف_ابن(الجذر()، عنصرك)».'},
 'عند_نقر':{ar:'عند النقر',en:'on click',say:'أُنْ كْلِك',arab:'عند النقر',what:'دالة مدمجة تربط نقر عنصر بدالتك.',role:'تجعل الواجهة تتفاعل.',how:'«عند_نقر(العنصر، دالة() { ... })».'},
 'عنصر_جديد':{ar:'عنصر جديد',en:'create element',say:'كْرِيت إلِمنت',arab:'إنشاء عنصر',what:'دالة مدمجة تنشئ عنصر واجهة بوسمه.',role:'الأساس الذي تُبنى عليه كل الواجهات.',how:'«عنصر_جديد("div")».'},
 'صفحة':{ar:'صفحة',en:'',say:'',arab:'',what:'تنشئ قسمًا رئيسيًّا بعنوان وتلحقه بجذر الصفحة.',role:'نقطة بدء كل واجهة في المكتبة.',how:'«واج.صفحة("العنوان")».'},
 'حقل':{ar:'حقل',en:'',say:'',arab:'',what:'تنشئ حقل إدخال له تسمية وتلميح.',role:'تُدخل بيانات المستخدم.',how:'«واج.حقل(الصفحة، "التسمية"، "التلميح")» وتعيد الحقل نفسه.'},
 'زر':{ar:'زر (المكتبة)',en:'',say:'',arab:'',what:'تنشئ زرًّا يشغّل دالتك عند النقر.',role:'تحوّل الضغط إلى فعل.',how:'«واج.زر(الصفحة، "النص"، دالة() {...})».'},
 'نمّط':{ar:'نمّط',en:'style',say:'',arab:'',what:'تغيّر خاصية مظهر عنصر مثل حجم الخط أو لونه.',role:'تضبط الشكل دون تغيير المضمون.',how:'«واج.نمّط(العنصر، "font-size"، "40px")».'}
};
var TAGWORD={'input':'حقل إدخال','button':'زر','section':'قسم','h2':'عنوان','p':'فقرة','label':'تسمية الحقل','span':'نص','div':'حاوية'};

  var $ = function (s) { return document.querySelector(s); };
  function toAr(n) { return String(n).replace(/\d/g, function (d) { return AR[+d]; }); }
  function esc(s) { return String(s).replace(/[&<>]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c]; }); }

  var H = null, raw = null, monaco = null, labOn = false;
  var selLine = 0, hoverLine = 0, decIds = [], runT = 0, typing = false, paused = false, history = [], lastReq = "", typeT = 0;
  var area = document.querySelector(".editor-area"), toggle = $("#lab-toggle"), pvBody = $("#lab-ui-body");
  var liveRoot = document.getElementById("live-app-root"), liveHome = liveRoot.parentNode, liveNext = liveRoot.nextSibling;

  document.addEventListener("dhad-editor-ready", function () {
    H = window.__dhad; raw = H.ed && H.ed.raw; monaco = H.monaco;
    if (!raw) return;
    toggle.hidden = false;
    raw.onDidChangeCursorPosition(function (e) { if (!labOn || typing) return; if (e.position.lineNumber !== selLine) selectLine(e.position.lineNumber); });
    raw.onDidChangeModelContent(function () { if (labOn) schedRun(); });
    raw.onDidChangeModel(function () { if (labOn) { selLine = 0; hoverLine = 0; paint(); showRelation(0); schedRun(); } });
  });

  function model() { return raw && raw.getModel(); }
  function lines() { var m = model(); return m ? m.getValue().split("\n") : []; }
  function schedRun() { clearTimeout(runT); runT = setTimeout(function () { if (!labOn) return; H.runCode(); afterRun(); }, 380); }
  function afterRun() { paintSel(); buildTerms(); updateStatus(); }

  function setLab(on) {
    labOn = on; window.__labOn = on;
    area.classList.toggle("lab-on", on);
    $("#lab-bar").hidden = !on; $("#lab-tab").hidden = !on;
    toggle.setAttribute("aria-pressed", on); toggle.classList.toggle("on", on);
    document.getElementById("panel").classList.toggle("lab-panel", on);
    if (on) { pvBody.appendChild(liveRoot); liveRoot.classList.add("lab-live"); H.showPanel("lab"); H.runCode(); showRelation(0); afterRun(); }
    else {
      liveRoot.classList.remove("lab-live"); liveHome.insertBefore(liveRoot, liveNext);
      raw.deltaDecorations(decIds, []); decIds = []; $("#lab-ui-status").hidden = true; H.showPanel("problems", true); H.runCode();
    }
    if (raw) setTimeout(function () { raw.layout(); }, 30);
  }
  toggle.addEventListener("click", function () { if (H && raw) setLab(!labOn); });

  function updateStatus() {
    var st = $("#lab-ui-status"), pl = document.getElementById("problems-list");
    var bad = pl && !pl.hidden && pl.textContent.trim();
    st.hidden = !bad; st.textContent = bad ? pl.textContent.trim().replace(/^●\s*/, "") : "";
  }

  /* ---- التظليل المتبادل ---- */
  function paint() {
    if (!raw) return;
    var L = hoverLine || selLine, d = [];
    if (L && L <= model().getLineCount()) d.push({ range: new monaco.Range(L, 1, L, 1), options: { isWholeLine: true, className: "lab-hl-line", linesDecorationsClassName: "lab-hl-gutter" } });
    decIds = raw.deltaDecorations(decIds, d); paintSel();
  }
  function paintSel() {
    Array.prototype.forEach.call(liveRoot.querySelectorAll("[data-sel]"), function (e) { e.removeAttribute("data-sel"); });
    var L = hoverLine || selLine; if (!L) return;
    Array.prototype.forEach.call(liveRoot.querySelectorAll('[data-dhad-line="' + L + '"]'), function (e) {
      var p = e.parentElement; if (p && p !== liveRoot && p.getAttribute("data-dhad-line") === String(L)) return; e.setAttribute("data-sel", "1");
    });
  }
  function lineEls(L) { return Array.prototype.slice.call(liveRoot.querySelectorAll('[data-dhad-line="' + L + '"]')); }
  function lineOf(e) { var el = e.target.closest && e.target.closest("[data-dhad-line]"); return el && liveRoot.contains(el) ? el : null; }
  pvBody.addEventListener("click", function (e) { var el = lineOf(e); if (!el) return; selectLine(+el.getAttribute("data-dhad-line"), el.tagName.toLowerCase(), true); });
  pvBody.addEventListener("mouseover", function (e) { var el = lineOf(e); if (!el) return; hoverLine = +el.getAttribute("data-dhad-line"); paint(); raw.revealLineInCenterIfOutsideViewport(hoverLine); buildTerms(); });
  pvBody.addEventListener("mouseleave", function () { hoverLine = 0; paint(); buildTerms(); });

  function selectLine(L, tag, move) {
    selLine = L; hoverLine = 0; paint(); showRelation(L, tag); buildTerms();
    if (move) { raw.revealLineInCenterIfOutsideViewport(L); raw.setPosition({ lineNumber: L, column: 1 }); }
  }

  /* ---- تحليل الاستدعاء والقيم القابلة للتغيير ---- */
  function parseCall(text) {
    var m = /([؀-ۿA-Za-z_][؀-ۿ\w_]*)\(/.exec(text); if (!m) return null;
    var name = m[1], start = m.index + m[0].length, depth = 1, q = false, i = start, args = [], cur = start;
    for (; i < text.length && depth > 0; i++) {
      var c = text[i];
      if (c === '"') { q = !q; continue; } if (q) continue;
      if (c === "(" || c === "{" || c === "[") depth++;
      else if (c === ")" || c === "}" || c === "]") { depth--; if (depth === 0) break; }
      else if ((c === "،" || c === ",") && depth === 1) { args.push([cur, i]); cur = i + 1; }
    }
    args.push([cur, i]);
    return { name: name, args: args.map(function (a) { return { s: a[0], e: a[1], t: text.slice(a[0], a[1]) }; }) };
  }
  function controlsFor(L) {
    var t = lines()[L - 1] || "", call = parseCall(t), out = []; if (!call) return out;
    var labels = PARAMS[call.name] || [];
    call.args.forEach(function (a, idx) {
      var raw0 = a.t, tr = raw0.trim(), off = a.s + raw0.indexOf(tr), label = labels[idx] || "قيمة"; if (label === "—") return;
      var sm = /^"([^"]*)"$/.exec(tr);
      if (sm) { var px = /^(-?\d+(?:\.\d+)?)(px|%|em)$/.exec(sm[1]);
        out.push({ kind: px ? "range" : "text", label: label, off: off, len: tr.length, val: sm[1], num: px ? +px[1] : 0, unit: px ? px[2] : "" }); return; }
      var nm = /^[٠-٩\d]+(?:٫[٠-٩]+|\.\d+)?$/.exec(tr);
      if (nm) { var v = +tr.replace(/[٠-٩]/g, function (d) { return AR.indexOf(d); }).replace("٫", "."); out.push({ kind: "num", label: label, off: off, len: tr.length, val: v }); }
    });
    return out;
  }
  function replaceAt(L, off, len, text) {
    raw.executeEdits("dhad-lab", [{ range: new monaco.Range(L, off + 1, L, off + len + 1), text: text }]);
  }
  function showRelation(L, tag) {
    var rb = $("#lab-relbody"), tr = $("#lab-try"), ct = $("#lab-ctls");
    if (!L) { rb.innerHTML = '<p class="lab-muted">اضغط أي جزء من الواجهة أو أي سطر من الشيفرة لترى العلاقة بينهما.</p>'; tr.hidden = true; return; }
    var t = (lines()[L - 1] || "").trim(), els = lineEls(L), main = tag || (els[0] && els[0].tagName.toLowerCase());
    var word = main && TAGWORD[main] ? TAGWORD[main] : "";
    var s = "<p>" + (word ? "عند تحديد <b>" + word + "</b> في الواجهة يتظلل السطر <b>" + toAr(L) + "</b> في الكود:" : "السطر <b>" + toAr(L) + "</b> في الكود:") + "</p><p><code>" + esc(t) + "</code></p>";
    var call = parseCall(t);
    if (call && TERMS[call.name]) s += "<p>" + TERMS[call.name].what + " " + TERMS[call.name].role + "</p>";
    else if (!els.length) s += '<p class="lab-muted">هذا السطر لا ينشئ عنصرًا مرئيًّا بنفسه؛ أثره يظهر حين يُستعمل ما يعرّفه.</p>';
    rb.innerHTML = s;
    var cs = controlsFor(L); ct.innerHTML = ""; tr.hidden = !cs.length;
    cs.forEach(function (c) {
      var d = document.createElement("div"); d.className = "lab-ctl"; var lab = document.createElement("label"); lab.textContent = c.label; d.appendChild(lab);
      var cur = { off: c.off, len: c.len };
      if (c.kind === "range") {
        var r = document.createElement("input"); r.type = "range"; r.min = 0; r.max = c.unit === "%" ? 100 : Math.max(80, c.num * 3); r.value = c.num;
        var o = document.createElement("output"); o.textContent = c.num + c.unit;
        r.oninput = function () { var nt = '"' + r.value + c.unit + '"'; replaceAt(L, cur.off, cur.len, nt); cur.len = nt.length; o.textContent = r.value + c.unit; };
        d.appendChild(r); d.appendChild(o);
      } else {
        var i = document.createElement("input"); i.type = c.kind === "num" ? "number" : "text"; i.value = c.val; if (c.kind === "num") i.step = "any";
        i.oninput = function () {
          var nt = c.kind === "num" ? String(i.value === "" ? 0 : i.value).replace(/\d/g, function (x) { return AR[+x]; }).replace(".", "٫") : '"' + i.value.replace(/"/g, "") + '"';
          replaceAt(L, cur.off, cur.len, nt); cur.len = nt.length;
        };
        d.appendChild(i);
      }
      ct.appendChild(d);
    });
  }

  /* ---- المصطلحات ---- */
  function termHTML(k) {
    var t = TERMS[k];
    return '<details data-k="' + esc(k) + '"><summary><span>' + esc(t.ar) + "</span>" + (t.en ? " <em>" + esc(t.en) + "</em>" : "") + '</summary><dl class="lab-tb">' +
      (t.say ? "<dt>النطق</dt><dd>" + esc(t.say) + "</dd>" : "") + (t.arab && t.en ? "<dt>التعريب</dt><dd>" + esc(t.arab) + "</dd>" : "") +
      "<dt>الشرح</dt><dd>" + esc(t.what) + "</dd><dt>وظيفته</dt><dd>" + esc(t.role) + "</dd><dt>كيف تستعمله</dt><dd>" + esc(t.how) + "</dd></dl></details>";
  }
  var BUILTIN = ["متغير", "استورد", "دالة", "الجذر", "عنصر_جديد", "عند_نقر", "عيّن_نص", "اقرأ_قيمة"], LIBFN = ["صفحة", "حقل", "زر", "نمّط"];
  function termsFor(text, els) {
    var keys = [], seen = {}; function add(k) { if (TERMS[k] && !seen[k]) { seen[k] = 1; keys.push(k); } }
    BUILTIN.forEach(function (k) { if (text.indexOf(k) > -1) add(k); });
    LIBFN.forEach(function (k) { if (new RegExp("\\." + k + "\\(").test(text)) add(k); });
    els.forEach(function (e) { add(e.tagName.toLowerCase()); });
    return keys;
  }
  function buildTerms() {
    var src = lines().join("\n"), all = termsFor(src, Array.prototype.slice.call(liveRoot.querySelectorAll("*")));
    var L = hoverLine || selLine, rel = L ? termsFor(lines()[L - 1] || "", lineEls(L)) : [];
    var box = $("#lab-termlist"), h = "";
    if (rel.length) h += '<p class="lab-muted">المرتبطة بالمحدد</p>' + rel.map(termHTML).join("");
    var others = all.filter(function (k) { return rel.indexOf(k) < 0; });
    if (others.length) h += '<details class="lab-all"><summary><span>' + (rel.length ? "بقية مصطلحات البرنامج" : "مصطلحات البرنامج") + " (" + toAr(others.length) + ")</span></summary><div>" + others.map(termHTML).join("") + "</div></details>";
    var openAll = box.querySelector("details.lab-all[open]");
    var openK = Array.prototype.map.call(box.querySelectorAll("details[open][data-k]"), function (d) { return d.getAttribute("data-k"); });
    box.innerHTML = h;
    if (openAll) { var a = box.querySelector("details.lab-all"); if (a) a.open = true; }
    openK.forEach(function (k) { var d = box.querySelector('details[data-k="' + k + '"]'); if (d) d.open = true; });
  }

  /* ---- المساعد: يكتب رمزًا برمز داخل Monaco ---- */
  var msg = $("#lab-msg"); function note(t) { msg.textContent = t || ""; }
  function setCtl() {
    $("#lab-aistop").disabled = !(typing && !paused); $("#lab-airesume").disabled = !(typing && paused);
    $("#lab-aiundo").disabled = typing || !history.length; $("#lab-airedo").disabled = typing || !history.length;
    $("#lab-notego").disabled = !history.length; $("#lab-aigo").disabled = typing; raw.updateOptions({ readOnly: typing && !paused });
  }
  function genFor(req) {
    var m = /(?:حقل)\s+(.+)$/.exec(req.trim()), z = /(?:زر)\s+(.+)$/.exec(req.trim());
    var ls = lines(), pageVar = "ص", mm = /متغير\s+(\S+)\s*=\s*واج\.صفحة/.exec(ls.join("\n")); if (mm) pageVar = mm[1];
    var ins = ls.length; for (var i = 0; i < ls.length; i++) { if (/^\s*واج\.زر\(/.test(ls[i])) { ins = i; break; } }
    if (m) { var nm = m[1].replace(/["«»]/g, "").trim(); return { at: ins, text: "متغير حقل_" + Math.floor(Math.random() * 90 + 10) + " = واج.حقل(" + pageVar + "، \"" + nm + "\"، \"" + nm + "...\")" }; }
    if (z) { var tx = z[1].replace(/["«»]/g, "").trim(); return { at: ls.length, text: "واج.زر(" + pageVar + "، \"" + tx + "\"، لاشيء)" }; }
    return null;
  }
  function endOf(lineNo) { return model().getLineMaxColumn(lineNo); }
  function typeFrom(at, text, from) {
    /* at: فهرس السطر (من صفر) — يكتب text من الموضع from رمزًا رمزًا */
    typing = true; paused = false; setCtl();
    var lineNo = at + 1, i = from;
    (function step() {
      if (paused) return;
      if (i >= text.length) { typing = false; setCtl(); H.runCode(); afterRun(); selectLine(lineNo, null, true); note("كُتب السطر " + toAr(lineNo) + ". أيّ تغيير تريده؟"); return; }
      i++;
      var e = endOf(lineNo);
      raw.executeEdits("dhad-lab", [{ range: new monaco.Range(lineNo, e, lineNo, e), text: text[i - 1] }]);
      selLine = lineNo; paint(); raw.revealLineInCenterIfOutsideViewport(lineNo);
      typeT = setTimeout(step, 38);
    })();
  }
  function startTyping(g) {
    var m = model(), prev = m.getValue();
    history.push({ at: g.at, text: g.text, prev: prev });
    var lc = m.getLineCount();
    if (g.at >= lc) raw.executeEdits("dhad-lab", [{ range: new monaco.Range(lc, endOf(lc), lc, endOf(lc)), text: "\n" }]);
    else raw.executeEdits("dhad-lab", [{ range: new monaco.Range(g.at + 1, 1, g.at + 1, 1), text: "\n" }]);
    typeFrom(g.at, g.text, 0);
  }
  $("#lab-aiform").addEventListener("submit", function (e) { e.preventDefault(); });
  $("#lab-aigo").addEventListener("click", function () {
    var r = $("#lab-aireq").value; if (!r.trim() || typing) return; lastReq = r;
    var g = genFor(r); if (!g) { note("أستطيع الآن إضافة حقل أو زر، مثل: «أضف حقل رقم الصفحات»."); return; }
    note("أكتب أمامك…"); $("#lab-aireq").value = ""; startTyping(g);
  });
  $("#lab-aistop").onclick = function () { paused = true; clearTimeout(typeT); setCtl(); note("أوقفتُ الكتابة. يمكنك التعديل بنفسك ثم المتابعة."); };
  $("#lab-airesume").onclick = function () {
    var h = history[history.length - 1]; if (!h) return; var cur = lines()[h.at] || "";
    if (h.text.indexOf(cur) !== 0) { note("تغيّر السطر؛ استعمل «أعد الكتابة»."); return; }
    typeFrom(h.at, h.text, cur.length);
  };
  function restore(prev) { var m = model(); raw.executeEdits("dhad-lab", [{ range: m.getFullModelRange(), text: prev }]); }
  $("#lab-aiundo").onclick = function () { var h = history.pop(); if (!h) return; restore(h.prev); selLine = 0; paint(); showRelation(0); setCtl(); note("تراجعتُ عن آخر ما كتبت."); };
  $("#lab-airedo").onclick = function () { var h = history.pop(); if (!h) return; restore(h.prev); setCtl(); note("أعيد الكتابة…"); startTyping({ at: h.at, text: h.text }); };
  $("#lab-notego").addEventListener("click", function () {
    var n = $("#lab-note").value.trim(); if (!n || !history.length) return; var h = history[history.length - 1];
    raw.executeEdits("dhad-lab", [{ range: new monaco.Range(h.at + 1, 1, h.at + 1, 1), text: "# ملاحظتك: " + n + "\n" }]); $("#lab-note").value = ""; note("سجّلتُ ملاحظتك فوق السطر.");
  });
  function setMode(ai) {
    $("#lab-m-hand").setAttribute("aria-pressed", !ai); $("#lab-m-ai").setAttribute("aria-pressed", ai); $("#lab-aiform").hidden = !ai;
    if (!ai) { note(""); }
  }
  $("#lab-m-hand").onclick = function () { setMode(false); };
  $("#lab-m-ai").onclick = function () { setMode(true); };
})();
