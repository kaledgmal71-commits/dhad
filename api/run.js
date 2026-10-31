// واجهة ضاد للوكلاء والأدوات: تنفيذ شيفرة ضاد والتحقق منها وتحليلها وفحص تحدّيات المعيار.
// المحرك نفسه الذي يعمل في المتصفح: يُجلب من الموقع (assets/engine.api.js) ويُشغَّل في سياق node:vm منعزل بحدّ خطوات وزمن.
// لا ملفات حقيقية ولا شبكة للشيفرة المنفَّذة؛ الملفات المرسلة تُقرأ من الذاكرة فقط.
const nodevm = require("vm");
const ORIGIN = process.env.DHAD_ORIGIN || "https://dhad-lang-beta.vercel.app";
const MAX_CODE = 20000, MAX_OUT = 64000, MAX_FILES = 20;
let apiPromise = null, benchPromise = null;
const hits = new Map(); // تقييد بسيط لكل نسخة تشغيل: ٣٠ طلبًا في الدقيقة لكل عنوان
function limited(ip) {
  const now = Date.now(), h = (hits.get(ip) || []).filter(t => now - t < 60000);
  h.push(now); hits.set(ip, h); if (hits.size > 500) hits.clear();
  return h.length > 30;
}
async function loadApi(origin) {
  if (!apiPromise) apiPromise = (async () => {
    const src = process.env.DHAD_ENGINE_FILE ? require("fs").readFileSync(process.env.DHAD_ENGINE_FILE, "utf8") : await (await fetch(origin + "/assets/engine.api.js")).text();
    const ctx = nodevm.createContext({ performance, setTimeout, console: { log() {}, error() {}, warn() {} } });
    nodevm.runInContext(src, ctx, { timeout: 5000 });
    return ctx.__api;
  })().catch(e => { apiPromise = null; throw e; });
  return apiPromise;
}
async function loadBench(origin) {
  if (!benchPromise) benchPromise = (async () => {
    if (process.env.DHAD_BENCH_FILE) return JSON.parse(require("fs").readFileSync(process.env.DHAD_BENCH_FILE, "utf8"));
    return (await fetch(origin + "/ai/dhad-benchmark.json")).json();
  })().catch(e => { benchPromise = null; throw e; });
  return benchPromise;
}
function execute(api, code, files) {
  const out = []; let size = 0;
  try {
    const c = api.compile(api.parse(code));
    const vm = new api.VM({
      maxSteps: 20000000, maxMs: 2500,
      onPrint: l => { size += String(l).length + 1; if (size > MAX_OUT) throw new Error("المخرجات أطول من الحد المسموح (" + MAX_OUT + " حرفًا)"); out.push(String(l)); },
      onSaveFile: () => {}, onInput: () => "ضاد",
      ...(files ? { readModule: p => (Object.prototype.hasOwnProperty.call(files, p) ? files[p] : null) } : {}),
    });
    vm.run(c.mainChunkIndex, c.functionChunks);
    return { ok: true, out, steps: vm.steps };
  } catch (e) { return { ok: false, out, error: String(e && e.message || e) }; }
}
const norm = s => String(s).replace(/[٠-٩]/g, d => "٠١٢٣٤٥٦٧٨٩".indexOf(d)).replace(/٫/g, ".").replace(/\s+$/, "").replace(/^\s+/, "");
function grade(C, code, run) { // مطابق لـ site/grader.js
  if (!String(code).replace(/#[^\n]*/g, "").trim()) return { ok: false, message: "الكود فارغ." };
  for (const m of (C.must || [])) if (!new RegExp(m.re).test(code)) return { ok: false, message: m.msg };
  for (const m of (C.mustNot || [])) if (new RegExp(m.re).test(code)) return { ok: false, message: m.msg };
  const tests = (C.tests && C.tests.length) ? C.tests : [{ post: "", expect: null }];
  for (const T of tests) {
    const r = run(code + "\n" + (T.post || ""));
    if (C.error) { if (r.ok) return { ok: false, message: "الكود عمل دون خطأ، والمطلوب أن يحدث الخطأ المذكور." }; if (!new RegExp(C.error).test(r.error)) return { ok: false, message: "حدث خطأ آخر غير المطلوب: " + r.error }; continue; }
    if (!r.ok) return { ok: false, message: "✗ " + r.error + (r.out.length ? "\nقبل الخطأ طُبع:\n" + r.out.join("\n") : "") };
    if (T.expect) { const got = r.out.map(norm), exp = T.expect.map(norm); if (!(got.length === exp.length && got.every((g, k) => g === exp[k]))) return { ok: false, message: (T.post ? "بعد تشغيل كودك مع:\n" + T.post + "\n\n" : "") + "المتوقع:\n" + T.expect.join("\n") + "\n\nالذي ظهر:\n" + (r.out.length ? r.out.join("\n") : "(لم يُطبع شيء)") }; }
  }
  return { ok: true, message: "اجتاز كل الاختبارات." };
}
module.exports = async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*"); res.setHeader("Access-Control-Allow-Methods", "POST, GET, OPTIONS"); res.setHeader("Access-Control-Allow-Headers", "content-type");
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method === "GET") return res.status(200).json({ name: "ضاد: واجهة الوكلاء", usage: "POST /api/run بجسم JSON: {action: run|check|analyze|grade, code, files?, challenge_id?}", docs: "/ai/", tool: "/ai/agent-tool.json", openapi: "/ai/openapi.json" });
  if (req.method !== "POST") return res.status(405).json({ ok: false, error: "استعمل POST" });
  const ip = String((req.headers["x-forwarded-for"] || "").split(",")[0] || "?").trim();
  if (limited(ip)) return res.status(429).json({ ok: false, error: "طلبات كثيرة؛ أعد المحاولة بعد دقيقة." });
  let body = req.body; if (typeof body === "string") { try { body = JSON.parse(body); } catch (e) { body = null; } }
  if (!body || typeof body.code !== "string") return res.status(400).json({ ok: false, error: "الجسم يجب أن يكون JSON فيه الحقل code نصًّا." });
  if (body.code.length > MAX_CODE) return res.status(400).json({ ok: false, error: "الشيفرة أطول من " + MAX_CODE + " حرف." });
  let files = null;
  if (body.files != null) {
    if (typeof body.files !== "object" || Array.isArray(body.files) || Object.keys(body.files).length > MAX_FILES || !Object.values(body.files).every(v => typeof v === "string" && v.length <= MAX_CODE)) return res.status(400).json({ ok: false, error: "files: كائن (اسم ← نص) بحد أقصى " + MAX_FILES + " ملفًا." });
    files = Object.assign(Object.create(null), body.files);
  }
  const origin = ORIGIN; // ثابت عمدًا: لا نثق بترويسة Host فلا يمكن توجيه الجلب إلى موقع آخر
  try {
    const api = await loadApi(origin); const action = body.action || "run";
    if (action === "run") { const r = execute(api, body.code, files); return res.status(200).json({ ok: r.ok, output: r.out, ...(r.ok ? { steps: r.steps } : { error: r.error }) }); }
    if (action === "check") { try { api.compile(api.parse(body.code)); return res.status(200).json({ ok: true }); } catch (e) { return res.status(200).json({ ok: false, error: String(e && e.message || e) }); } }
    if (action === "analyze") { try { const ast = api.parse(body.code); const s = JSON.stringify(ast); if (s.length > 400000) return res.status(200).json({ ok: false, error: "الشجرة أكبر من الحد المسموح." }); return res.status(200).json({ ok: true, ast: JSON.parse(s) }); } catch (e) { return res.status(200).json({ ok: false, error: String(e && e.message || e) }); } }
    if (action === "grade") {
      const bench = await loadBench(origin); const C = (bench.challenges || []).find(c => c.id === body.challenge_id);
      if (!C) return res.status(400).json({ ok: false, error: "challenge_id غير معروف. المعرّفات: " + (bench.challenges || []).map(c => c.id).join("، ") });
      const g = grade(C, body.code, code => execute(api, code, null)); return res.status(200).json({ ok: true, passed: g.ok, message: g.message });
    }
    return res.status(400).json({ ok: false, error: "action غير معروف: run أو check أو analyze أو grade." });
  } catch (e) { return res.status(500).json({ ok: false, error: "خطأ في الخادم: " + String(e && e.message || e) }); }
};
