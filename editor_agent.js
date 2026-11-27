/* وكيل المحرر: المحرر نفسه هو الحلقة. كل خدمة فيه (التشخيص، التنفيذ، الهيكل، التعديل، التراجع) أداة يستدعيها
   النموذج، وبعد كل تعديل يُجري المحرر التشخيص والتنفيذ تلقائيًّا ويُعيد النتيجة دون طلب.
   الواجهة: EditorAgent.create({api, code}) → { tools, call(name,args), state(), run(request, generate, o) }. */
(function (root, factory) { if (typeof module === "object" && module.exports) module.exports = factory(); else root.EditorAgent = factory(); })(this, function () {
  function lineOf(msg) { var m = /(?:سطر|السطر|line)\s*[:：]?\s*([0-9٠-٩]+)/i.exec(msg || ""); return m ? +String(m[1]).replace(/[٠-٩]/g, function (d) { return "٠١٢٣٤٥٦٧٨٩".indexOf(d); }) : null; }
  function applyEdits(code, edits) {
    var L = code ? code.split("\n") : [];
    edits.slice().sort(function (a, b) { return (b.after != null ? b.after : b.from) - (a.after != null ? a.after : a.from); }).forEach(function (e) {
      if (e.op === "insert") { L.splice(e.after, 0, e.text); }
      else if (e.op === "replace") { L.splice(e.from - 1, e.to - e.from + 1, e.text); }
      else if (e.op === "delete") { L.splice(e.from - 1, e.to - e.from + 1); }
    });
    return L.join("\n");
  }
  function create(opt) {
    var api = opt.api, code = opt.code || "", history = [], last = null;
    function diagnose(src) {
      try { api.compile(api.parse(src)); return { ok: true }; }
      catch (e) { var m = String(e && e.message || e); return { ok: false, message: m, line: lineOf(m), atEnd: /نهاية الكود/.test(m) }; }
    }
    function execute(src) {
      var d = diagnose(src); if (!d.ok) return { ran: false, error: d.message, line: d.line, output: [] };
      var out = [];
      try {
        var c = api.compile(api.parse(src));
        var vm = new api.VM({ maxSteps: 3000000, maxMs: 1500, onPrint: function (l) { if (out.length < 40) out.push(String(l)); }, onSaveFile: function () {}, onInput: function () { return "ضاد"; } });
        vm.run(c.mainChunkIndex, c.functionChunks); return { ran: true, output: out };
      } catch (e) { return { ran: false, error: String(e && e.message || e), line: lineOf(String(e && e.message)), output: out }; }
    }
    function outline(src) {
      var o = [], re = /(^|\n)(دالة|صنف)\s+([^\s({]+)/g, m; while ((m = re.exec(src))) o.push({ kind: m[2], name: m[3], line: src.slice(0, m.index + m[1].length).split("\n").length });
      return o;
    }
    /* ما يراه المحرر تلقائيًّا بعد أي تغيير: لا يطلبه أحد */
    function observe() { var d = diagnose(code); last = { diagnostics: d, run: d.ok ? execute(code) : null, outline: outline(code), lines: code ? code.split("\n").length : 0 }; return last; }
    var tools = {
      read: function (a) { var L = code.split("\n"), f = (a && a.from) || 1, t = (a && a.to) || L.length; return L.slice(f - 1, t).map(function (x, i) { return (f + i) + "| " + x; }).join("\n"); },
      outline: function () { return outline(code); },
      diagnostics: function () { return diagnose(code); },
      run: function () { return execute(code); },
      edit: function (a) {
        var next = applyEdits(code, a.edits || []), d = diagnose(next);
        if (!d.ok && !(a && a.allowBroken)) return { applied: false, reason: "الشيفرة بعد التعديل لا تُحلَّل: " + d.message, diagnostics: d };
        history.push(code); code = next; return { applied: true, observed: observe() };
      },
      undo: function () { if (!history.length) return { undone: false }; code = history.pop(); return { undone: true, observed: observe() }; }
    };
    function call(name, args) { if (!tools[name]) return { error: "أداة غير معروفة: " + name }; return tools[name](args || {}); }
    /* الحلقة: النموذج يُخرج {tool,args} أو {say}؛ نتيجة كل أداة تعود إليه؛ الحد الأقصى للخطوات محدود */
    async function run(request, generate, o) {
      o = o || {}; var max = o.steps || 6, msgs = [{ role: "user", content: request + "\n\nالحالة:\n" + JSON.stringify(observe()) }], trace = [];
      for (var i = 0; i < max; i++) {
        var raw = await generate(msgs), act; try { act = JSON.parse(raw); } catch (e) { msgs.push({ role: "user", content: "أخرج JSON فقط." }); continue; }
        if (act.say != null && !act.tool) return { say: act.say, code: code, trace: trace, steps: i + 1 };
        var res = call(act.tool, act.args); trace.push({ tool: act.tool, ok: !(res && (res.error || res.applied === false)) });
        msgs.push({ role: "assistant", content: raw }, { role: "user", content: "نتيجة " + act.tool + ":\n" + JSON.stringify(res) });
      }
      return { say: "", code: code, trace: trace, steps: max, exhausted: true };
    }
    return { tools: Object.keys(tools), call: call, state: function () { return { code: code, last: last || observe() }; }, run: run };
  }
  return { create: create, applyEdits: applyEdits, lineOf: lineOf };
});
