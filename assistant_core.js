/* محرك مساعد المحرر (بأدوات ضاد وحدها، بلا نموذج ولا مفتاح ولا شبكة).
   يعمل في المتصفح وفي Node. الدورة: فهم الطلب → مرشّحات (استرجاع من أمثلة ضاد) → تحقق بمحرك ضاد → أفضل مرشّح محقَّق.
   الواجهة: Assistant.create({corpus, api}) → { plan(request, code) } تعيد { say, edits, verified, source } أو { say, ask }.
   edits بصيغة: {op:"insert",after,text} | {op:"replace",from,to,text} | {op:"delete",from,to} (أرقام الأسطر من ١). */
(function (root, factory) { if (typeof module === "object" && module.exports) module.exports = factory(); else root.DhadAssistant = factory(); })(this, function () {
  var AR = "٠١٢٣٤٥٦٧٨٩";
  function norm(s) {
    return String(s || "").replace(/[ً-ٰٟـ]/g, "").replace(/[أإآٱ]/g, "ا").replace(/ى/g, "ي").replace(/ة/g, "ه")
      .replace(/[٠-٩]/g, function (d) { return String(AR.indexOf(d)); }).toLowerCase();
  }
  var STOP = {}; "اكتب اكتبي اضف اضيفي انشئ اعمل لي لنا من في الى على عن مع هذا هذه برنامج برنامجا دالة داله وظيفه تعيد يعيد ترجع يرجع ارجع تحسب يحسب بحيث ما هو هي ثم او و ان اذا كان كانت يكون العدد عدد الي لو قم بكتابه"
    .split(" ").forEach(function (w) { STOP[w] = 1; });
  function stem(w) { w = w.replace(/^(وال|بال|كال|فال|لل|ال)/, ""); return w.length > 3 ? w.replace(/(ات|ون|ين|ان|ها|ه)$/, "") : w; }
  function toks(s) { var m = norm(s).match(/[ء-ي_a-z0-9]+/g) || [], out = []; for (var i = 0; i < m.length; i++) { var parts = m[i].split("_"); for (var j = 0; j < parts.length; j++) { var t = stem(parts[j]); if (t && !STOP[t] && !STOP[parts[j]]) out.push(t); } } return out; }

  /* استخراج تعريفات الدوال العليا من شيفرة ضاد بموازنة الأقواس (مع تجاهل النصوص والتعليقات) */
  function functionsOf(code) {
    var out = [], re = /(^|\n)(دالة\s+([^\s(]+)\s*\()/g, m;
    while ((m = re.exec(code))) {
      var start = m.index + m[1].length, i = code.indexOf("{", start); if (i < 0) continue;
      var depth = 0, inStr = null, j = i;
      for (; j < code.length; j++) {
        var c = code[j];
        if (inStr) { if (c === "\\") j++; else if (c === inStr) inStr = null; continue; }
        if (c === '"' || c === "«") { inStr = c === "«" ? "»" : '"'; continue; }
        if (c === "#") { while (j < code.length && code[j] !== "\n") j++; continue; }
        if (c === "{") depth++; else if (c === "}") { depth--; if (!depth) break; }
      }
      if (depth) continue; out.push({ name: m[3], text: code.slice(start, j + 1) });
    }
    return out;
  }

  function create(opt) {
    var api = opt.api, docs = [], df = {}, N = 0;
    (opt.corpus || []).forEach(function (r) {
      if (!r || r.status !== "ok" || !r.code) return;
      var fns = functionsOf(r.code), bag = toks((r.title || "") + " " + (r.instruction || "").slice(0, 300) + " " + fns.map(function (f) { return f.name; }).join(" "));
      docs.push({ r: r, fns: fns, bag: bag, set: bag.reduce(function (a, t) { a[t] = (a[t] || 0) + 1; return a; }, {}) });
    });
    N = docs.length; docs.forEach(function (d) { Object.keys(d.set).forEach(function (t) { df[t] = (df[t] || 0) + 1; }); });
    function idf(t) { return Math.log(1 + (N - (df[t] || 0) + 0.5) / ((df[t] || 0) + 0.5)); }

    function check(code) {
      if (!api) return { compiled: true, unchecked: true };
      try { var c = api.compile(api.parse(code)); }
      catch (e) { return { compiled: false, error: String(e && e.message || e) }; }
      if (/الجذر\(|عنصر_جديد|ضاد\/واجهة/.test(code)) return { compiled: true, ran: false };
      var out = [];
      try {
        var vm = new api.VM({ maxSteps: 3000000, maxMs: 1500, onPrint: function (l) { if (out.length < 30) out.push(String(l)); }, onSaveFile: function () {}, onInput: function () { return "ضاد"; } });
        vm.run(c.mainChunkIndex, c.functionChunks); return { compiled: true, ran: true, output: out };
      } catch (e) { return { compiled: true, ran: false, error: String(e && e.message || e), output: out }; }
    }

    /* ١) طلب كتابة دالة: ابحث عن دالة بالاسم أو بالمعنى */
    function candidatesForFunction(req) {
      var nameM = /دالة\s+([^\s(]+)/.exec(req), want = nameM ? nameM[1] : "", q = toks(req), cands = [];
      docs.forEach(function (d) {
        d.fns.forEach(function (f) {
          var s = 0;
          if (want && norm(f.name) === norm(want)) s += 100;
          var ft = toks(f.name); q.forEach(function (t) { if (ft.indexOf(t) >= 0) s += 6 * idf(t); else if (d.set[t]) s += 1.5 * idf(t); });
          if (s > 0) cands.push({ s: s, name: f.name, text: f.text, from: d.r.id });
        });
      });
      cands.sort(function (a, b) { return b.s - a.s; }); return cands.slice(0, 4);
    }

    function lineCount(code) { return code ? code.split("\n").length : 0; }
    function insertAtEnd(code, text) { var n = lineCount(code); return [{ op: "insert", after: n, text: text }]; }

    function plan(request, code) {
      code = code || ""; var req = String(request || "").trim();
      if (!req) return { say: "اكتب ما تريد أن أفعله في الشيفرة.", edits: [] };
      var wantsFn = /دالة|اكتب|احسب|اعمل|انشئ|أنشئ/.test(req);
      if (wantsFn) {
        var cs = candidatesForFunction(req);
        for (var i = 0; i < cs.length; i++) {
          var c = cs[i]; if (c.s < 100) break;
          if (code.indexOf("دالة " + c.name + "(") >= 0) return { say: "الدالة «" + c.name + "» موجودة عندك في الشيفرة بالفعل.", edits: [] };
          var next = code ? code.replace(/\s*$/, "") + "\n\n" + c.text + "\n" : c.text + "\n", v = check(next);
          if (v.compiled && !v.error) return { say: "كتبتُ الدالة «" + c.name + "» وتحققتُ أنها تُترجم" + (v.ran ? " وتعمل بلا خطأ." : "."), edits: insertAtEnd(code, (code ? "\n" : "") + c.text), verified: v, source: c.from };
        }
        return { say: "لم أجد في معرفتي دالة تطابق هذا الطلب بدقة. اذكر اسم الدالة ومدخلاتها وما تعيده، أو اكتب أولها وأكمله معك.", edits: [], ask: true };
      }
      return { say: "أستطيع الآن كتابة دوال معروفة، مثل: «اكتب دالة مضروب(ن)».", edits: [], ask: true };
    }
    /* ٢) مسار النموذج: مطالبة من معجم ضاد + فحص ساكن + تحقق بمحرك ضاد + إصلاح ذاتي (منقول من خط بناء نواة، قيس بـ Qwen3-8B).
       generate(messages) → وعد بنص الرد؛ المحرك لا يعرف أين يعمل النموذج (أولاما، المتصفح، أو غيرهما). */
    var K = opt.knowledge || null;
    function lint(block) {
      if (!K) return "";
      if (/`/.test(block)) return "الشيفرة تحوي الرمز ` خارج كتلة الشيفرة؛ أعد كتلة واحدة سليمة.";
      var c = block.replace(/"(?:[^"\\\n]|\\.)*"/g, '""').replace(/#.*$/gm, ""), names = [], m, re;
      re = /(?:متغير|ثابت)\s+([^\s=،,()]+)/g; while ((m = re.exec(c))) names.push(m[1]);
      re = /من_أجل\s*\(\s*([^\s)]+)\s+(?:في|من)\s/g; while ((m = re.exec(c))) names.push(m[1]);
      re = /دالة\s*[^\s(]*\(([^)]*)\)/g; while ((m = re.exec(c))) m[1].split(/[،,]/).forEach(function (p) { p = p.trim(); if (p) names.push(p); });
      for (var i = 0; i < names.length; i++) {
        if (K.reserved.indexOf(names[i]) >= 0) return "الاسم «" + names[i] + "» كلمة محجوزة في ضاد ولا يصلح اسمًا لمتغير أو معامل؛ اختر اسمًا آخر.";
        if (K.builtins.indexOf(names[i]) >= 0) return "الاسم «" + names[i] + "» دالة جاهزة في ضاد؛ تسميته لمتغير أو معامل تعطّل استدعاء الدالة. اختر اسمًا آخر.";
      }
      return "";
    }
    function blockOf(text) {
      text = String(text || "").replace(/<think>[\s\S]*?<\/think>/g, "").trim();
      var m = /```[^\n]*\n([\s\S]*?)```/.exec(text); return (m ? m[1] : text).trim();
    }
    /* يدمج كتلة النموذج في الشيفرة الحالية: دالة بنفس الاسم تُستبدل، وما سواها يُلحق في النهاية */
    function merge(code, block) {
      var out = code, fns = functionsOf(block), rest = block;
      fns.forEach(function (f) {
        rest = rest.replace(f.text, "");
        var old = functionsOf(out).filter(function (o) { return o.name === f.name; })[0];
        if (old) out = out.replace(old.text, f.text); else out = (out ? out.replace(/\s*$/, "") + "\n\n" : "") + f.text + "\n";
      });
      rest = rest.replace(/\n{3,}/g, "\n\n").trim();
      if (rest) out = out.replace(/\s*$/, "") + "\n\n" + rest + "\n";
      return out;
    }
    function diffEdits(oldCode, newCode) {
      var a = oldCode.split("\n"), b = newCode.split("\n"), i = 0;
      while (i < a.length && i < b.length && a[i] === b[i]) i++;
      var ea = a.length, eb = b.length;
      while (ea > i && eb > i && a[ea - 1] === b[eb - 1]) { ea--; eb--; }
      var text = b.slice(i, eb).join("\n");
      if (ea === i) return text === "" ? [] : [{ op: "insert", after: i, text: text }];
      if (eb === i) return [{ op: "delete", from: i + 1, to: ea }];
      return [{ op: "replace", from: i + 1, to: ea, text: text }];
    }
    async function solve(request, code, generate, o) {
      o = o || {}; code = code || ""; var rounds = o.rounds || 3;
      var ctx = code ? "الشيفرة الحالية في المحرر:\n```\n" + code + "\n```\nالطلب: " + request + "\nأعد فقط الدوال الجديدة أو المعدَّلة (بأسمائها نفسها) وأي أسطر جديدة، لا الشيفرة كلها." : request;
      var msgs = [{ role: "system", content: (K && K.system) || "" }, { role: "user", content: ctx + "\n/no_think" }], last = null, hist = [];
      for (var r = 1; r <= rounds; r++) {
        var text; try { text = await generate(msgs); } catch (e) { return { ok: false, say: "تعذّر الوصول إلى النموذج: " + String(e && e.message || e), edits: [], hist: hist }; }
        var block = blockOf(text), why = lint(block), next = "", v = null;
        if (!why) { next = merge(code, block); v = check(next); if (!v.compiled || v.error) why = v.error || "لا تُترجم الشيفرة"; }
        hist.push({ round: r, block: block, why: why });
        if (!why) return { ok: true, say: r === 1 ? "كتبتُ ما طلبتَ وتحققتُ أنه يُترجم" + (v.ran ? " ويعمل بلا خطأ." : ".") : "كتبتُ ما طلبتَ بعد " + (r - 1) + " إصلاح تلقائي، وتحققتُ أنه يُترجم" + (v.ran ? " ويعمل." : "."), edits: diffEdits(code, next), result: next, verified: v, rounds: r, hist: hist };
        last = why; msgs.push({ role: "assistant", content: text }, { role: "user", content: "فشل التحقق: " + why + "\nصحّح الشيفرة وأعد الكتلة كاملة." });
      }
      return { ok: false, say: "لم أصل إلى شيفرة سليمة بعد " + rounds + " محاولات. آخر خطأ: " + last, edits: [], rounds: rounds, hist: hist };
    }
    return { plan: plan, solve: solve, lint: lint, merge: merge, check: check, size: N };
  }
  return { create: create, norm: norm, toks: toks, functionsOf: functionsOf };
});
