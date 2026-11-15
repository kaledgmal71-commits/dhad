// عقل المحرر الذكي: نموذج مفتوح الأوزان عبر بوابة الذكاء الاصطناعي + أدوات ضاد المنسوخة (تشغيل/تحقق/بحث في أمثلة اللغة).
// الدورة: النموذج يقترح تعديلات على الشيفرة الحالية → نطبّقها افتراضيًّا → نتحقق (ترجمة، وتشغيل إن لم تكن واجهة) → نعيد الخطأ إليه ليصلح → نرجع للمحرر تعديلات محقَّقة.
// المحرر يكتبها رمزًا رمزًا أمام المستخدم؛ هنا لا يُكتب شيء.
const nodevm = require("vm");
const ORIGIN = process.env.DHAD_ORIGIN || "https://dhad-lang-beta.vercel.app";
const GATEWAY = process.env.DHAD_GATEWAY || "https://ai-gateway.vercel.sh/v1/chat/completions";
const MODELS = (process.env.DHAD_ASSIST_MODELS || "deepseek/deepseek-v4-pro,alibaba/qwen3-coder,openai/gpt-oss-120b").split(",").map(s => s.trim()).filter(Boolean);
const MAX_CODE = 20000, MAX_ROUNDS = 3, PER_MIN = 12, PER_DAY = 600;
let oidc = "", apiP = null, docP = null, day = { d: "", n: 0 };
const hits = new Map();
function limited(ip) {
  const now = Date.now(), h = (hits.get(ip) || []).filter(t => now - t < 60000); h.push(now); hits.set(ip, h); if (hits.size > 500) hits.clear();
  const d = new Date().toISOString().slice(0, 10); if (day.d !== d) day = { d, n: 0 }; day.n++;
  return h.length > PER_MIN ? "minute" : day.n > PER_DAY ? "day" : null;
}
async function loadApi() {
  if (!apiP) apiP = (async () => {
    const src = process.env.DHAD_ENGINE_FILE ? require("fs").readFileSync(process.env.DHAD_ENGINE_FILE, "utf8") : await (await fetch(ORIGIN + "/assets/engine.api.js")).text();
    const ctx = nodevm.createContext({ performance, setTimeout, console: { log() {}, error() {}, warn() {} } });
    nodevm.runInContext(src, ctx, { timeout: 5000 }); return ctx.__api;
  })().catch(e => { apiP = null; throw e; });
  return apiP;
}
async function loadDocs() {
  if (!docP) docP = (async () => {
    const get = async (p) => process.env.DHAD_DOCS_DIR ? require("fs").readFileSync(process.env.DHAD_DOCS_DIR + p, "utf8") : await (await fetch(ORIGIN + p)).text();
    const guide = await get("/llms.txt");
    const corpus = (await get("/ai/dhad-corpus.jsonl")).split("\n").filter(Boolean).map(l => { try { return JSON.parse(l); } catch (e) { return null; } }).filter(Boolean);
    return { guide, corpus };
  })().catch(e => { docP = null; throw e; });
  return docP;
}
function execute(api, code) {
  const out = []; let size = 0;
  try {
    const c = api.compile(api.parse(code));
    const vm = new api.VM({ maxSteps: 5000000, maxMs: 2000, onPrint: l => { size += String(l).length + 1; if (size > 20000) throw new Error("مخرجات كثيرة"); out.push(String(l)); }, onSaveFile() {}, onInput: () => "ضاد" });
    vm.run(c.mainChunkIndex, c.functionChunks); return { ok: true, out };
  } catch (e) { return { ok: false, out, error: String(e && e.message || e) }; }
}
const UI = /الجذر\(|عنصر_جديد|ضاد\/واجهة/;
function verify(api, code) {
  try { api.compile(api.parse(code)); } catch (e) { return { compiled: false, error: String(e && e.message || e) }; }
  if (UI.test(code)) return { compiled: true, ran: false, note: "برنامج واجهة: تحقّقنا من الترجمة فقط" };
  const r = execute(api, code); return r.ok ? { compiled: true, ran: true, output: r.out.slice(0, 20) } : { compiled: true, ran: false, error: r.error, output: r.out.slice(0, 20) };
}
function applyEdits(code, edits) {
  const L = code.split("\n"); const ops = (edits || []).slice().sort((a, b) => (b.from ?? b.after ?? 0) - (a.from ?? a.after ?? 0));
  for (const e of ops) {
    const t = typeof e.text === "string" ? e.text.split("\n") : [];
    if (e.op === "insert") L.splice(Math.max(0, Math.min(L.length, +e.after || 0)), 0, ...t);
    else if (e.op === "replace") L.splice(Math.max(0, (+e.from || 1) - 1), Math.max(1, (+e.to || +e.from || 1) - (+e.from || 1) + 1), ...t);
    else if (e.op === "delete") L.splice(Math.max(0, (+e.from || 1) - 1), Math.max(1, (+e.to || +e.from || 1) - (+e.from || 1) + 1));
  }
  return L.join("\n");
}
const tok = s => String(s).toLowerCase().match(/[؀-ۿa-z_]+/g) || [];
function pickExamples(corpus, q, k) {
  const qs = new Set(tok(q)); if (!qs.size) return [];
  return corpus.map(c => { const ts = tok((c.title || "") + " " + (c.instruction || "") + " " + (c.topic || "")); let s = 0; for (const t of ts) if (qs.has(t)) s++; return { c, s }; }).filter(x => x.s > 0).sort((a, b) => b.s - a.s).slice(0, k).map(x => x.c);
}
const UI_LIB = 'مكتبة الواجهات: متغير واج = استورد("ضاد/واجهة"). واج.صفحة(عنوان) تعيد الصفحة؛ واج.نص(أب، محتوى)؛ واج.حقل(أب، تسمية، تلميح) تعيد عنصر الإدخال؛ واج.زر(أب، نص، دالة() {…}) ؛ واج.نمّط(عنصر، "خاصية"، "قيمة"). مع: عيّن_نص(عنصر، نص)، اقرأ_قيمة(حقل)، عند_نقر(عنصر، دالة).';
async function system(q, code) {
  const { guide, corpus } = await loadDocs();
  const ex = pickExamples(corpus, q, 5).map(c => "### " + (c.title || c.id) + "\n" + c.code).join("\n\n");
  return [
    "أنت مساعد محرر ضاد الذكي: خبير دقيق جدًّا بلغة البرمجة العربية ضاد، ومهمتك أن تكتب وتعدّل وتصلح الشيفرة في محرر المستخدم بدقة تامة، وكأنك مندوب مدافع عن جودة عمل نماذج الذكاء الاصطناعي: لا تخترع دوال أو صياغات غير موجودة في ضاد، ولا تخمّن.",
    "قواعد صارمة: (١) اكتب ضاد صحيحة فقط، ملتزمًا بالدليل أدناه وبالأمثلة؛ الفاصلة العربية «،» تفصل المعاملات. (٢) الكلمات المحجوزة (و، أو، ليس، من، إلى، في، صحيح، خطأ، لاشيء) لا تصلح أسماء متغيرات. (٣) عدّل أقل ما يلزم وحافظ على أسلوب المستخدم وأسمائه. (٤) إن كان الطلب غامضًا فاسأل سؤالًا واحدًا قصيرًا في say ولا تعدّل. (٥) ردّك JSON واحد فقط بلا أي نص خارجه.",
    'صيغة الرد: {"say":"شرح قصير بالعربية لما فعلت ولماذا","edits":[{"op":"insert","after":رقم_السطر,"text":"…"} | {"op":"replace","from":أ,"to":ب,"text":"…"} | {"op":"delete","from":أ,"to":ب}]} — أرقام الأسطر تبدأ من ١ على الشيفرة الحالية كما تراها، و after=٠ يعني قبل أول سطر. edits فارغة إن لم يلزم تعديل.',
    UI_LIB,
    "=== دليل ضاد ===\n" + guide,
    ex ? "=== أمثلة ذات صلة ===\n" + ex : "",
  ].filter(Boolean).join("\n\n");
}
function numbered(code) { return code.split("\n").map((l, i) => (i + 1) + "| " + l).join("\n"); }
async function callModel(model, messages) {
  const key = process.env.AI_GATEWAY_API_KEY || oidc || process.env.VERCEL_OIDC_TOKEN;
  if (!key) throw new Error("لا مفتاح لبوابة الذكاء الاصطناعي في هذه البيئة");
  const r = await fetch(GATEWAY, { method: "POST", headers: { "content-type": "application/json", authorization: "Bearer " + key }, body: JSON.stringify({ model, messages, temperature: 0.1, max_tokens: 6000 }) });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error("النموذج " + model + ": " + (j.error && (j.error.message || j.error) || r.status));
  const msg = j.choices && j.choices[0] && j.choices[0].message; if (!msg || !msg.content) throw new Error("ردّ فارغ من " + model);
  return { text: msg.content, usage: j.usage || null };
}
function parseJson(t) {
  t = String(t).replace(/<think>[\s\S]*?<\/think>/g, "").trim();
  const f = t.match(/```(?:json)?\s*([\s\S]*?)```/); if (f) t = f[1].trim();
  const a = t.indexOf("{"), b = t.lastIndexOf("}"); if (a < 0 || b < a) throw new Error("لا JSON"); return JSON.parse(t.slice(a, b + 1));
}
function sane(o) {
  if (!o || typeof o !== "object") return null; const edits = Array.isArray(o.edits) ? o.edits.filter(e => e && ["insert", "replace", "delete"].includes(e.op)).slice(0, 20) : [];
  return { say: typeof o.say === "string" ? o.say.slice(0, 1500) : "", edits };
}
async function assist(body, modelsOverride) {
  const api = await loadApi(); const code = body.code || "";
  const msgs = Array.isArray(body.messages) ? body.messages.slice(-8).filter(m => m && typeof m.content === "string" && (m.role === "user" || m.role === "assistant")) : [];
  const last = msgs.filter(m => m.role === "user").pop(); if (!last) throw new Error("لا طلب");
  const sys = await system(last.content, code);
  const ctx = "الشيفرة الحالية في المحرر (مرقّمة)" + (body.cursorLine ? "، والمؤشر عند السطر " + body.cursorLine : "") + ":\n" + (code ? numbered(code) : "(فارغة)");
  let chat = [{ role: "system", content: sys }, { role: "user", content: ctx }, ...msgs];
  let lastErr = null, models = modelsOverride || MODELS;
  for (const model of models) {
    let local = chat.slice(), best = null;
    try {
      for (let round = 0; round <= MAX_ROUNDS; round++) {
        const r = await callModel(model, local); let o;
        try { o = sane(parseJson(r.text)); } catch (e) { o = null; }
        if (!o) { local.push({ role: "assistant", content: r.text }, { role: "user", content: "ردّك لم يكن JSON صالحًا بالصيغة المطلوبة. أعد الرد JSON فقط." }); continue; }
        if (!o.edits.length) return { ok: true, say: o.say, edits: [], verified: null, model, usage: r.usage };
        const next = applyEdits(code, o.edits), v = verify(api, next); best = { ok: true, say: o.say, edits: o.edits, verified: v, model, usage: r.usage, result: next };
        if (v.compiled && !v.error) return best;
        local.push({ role: "assistant", content: r.text }, { role: "user", content: "نتيجة التحقق من الشيفرة بعد تعديلك فشلت: " + v.error + "\nأصلح تعديلاتك وأعد JSON بالتعديلات كاملة على الشيفرة الأصلية (لا على الناتجة)." });
      }
      if (best) return best;
    } catch (e) { lastErr = e; }
  }
  throw lastErr || new Error("تعذّر الحصول على ردّ");
}
const SELF = [
  { id: "مضروب", d: "اكتب دالة مضروب(ن) تعيد مضروب العدد", call: "اطبع(مضروب(5))", expect: "120" },
  { id: "أولي", d: "اكتب دالة أولي(ن) تعيد صحيح إن كان العدد أوليا", call: "اطبع(أولي(7))\nاطبع(أولي(9))", expect: "صحيح|خطأ" },
  { id: "عكس", d: "اكتب دالة عكس_القائمة(ق) تعيد قائمة جديدة بترتيب معكوس", call: "اطبع(عكس_القائمة([1،2،3]))", expect: "[3، 2، 1]" },
  { id: "فيبو", d: "اكتب دالة فيبوناتشي(ن) (فيبوناتشي(0)=0 وفيبوناتشي(1)=1)", call: "اطبع(فيبوناتشي(10))", expect: "55" },
];
async function selftest(models) {
  const api = await loadApi(), rows = [];
  for (const model of models) {
    const row = { model, pass: 0, total: SELF.length, ms: 0, errors: [] };
    for (const t of SELF) {
      const t0 = Date.now();
      try {
        const r = await assist({ code: "", messages: [{ role: "user", content: t.d }] }, [model]);
        const code = r.result || applyEdits("", r.edits), run = execute(api, code + "\n" + t.call);
        const got = run.ok ? run.out.join("|").replace(/[٠-٩]/g, d => "٠١٢٣٤٥٦٧٨٩".indexOf(d)) : "ERR " + run.error;
        if (got === t.expect) row.pass++; else row.errors.push(t.id + ": " + got.slice(0, 80));
      } catch (e) { row.errors.push(t.id + ": " + String(e.message || e).slice(0, 120)); }
      row.ms += Date.now() - t0;
    }
    rows.push(row);
  }
  return rows;
}
module.exports = async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*"); res.setHeader("Access-Control-Allow-Methods", "POST, GET, OPTIONS"); res.setHeader("Access-Control-Allow-Headers", "content-type");
  if (req.method === "OPTIONS") return res.status(204).end();
  oidc = String(req.headers["x-vercel-oidc-token"] || oidc || "");
  const ip = String((req.headers["x-forwarded-for"] || "").split(",")[0] || "?").trim();
  try {
    if (req.method === "GET") {
      const q = req.query || {};
      if (q.selftest && process.env.VERCEL_ENV === "preview") return res.status(200).json({ ok: true, results: await selftest((q.models ? String(q.models).split(",") : MODELS).slice(0, 4)) });
      return res.status(200).json({ name: "ضاد: عقل المحرر الذكي", usage: "POST /api/assist {messages:[{role,content}], code, cursorLine}", models: MODELS });
    }
    if (req.method !== "POST") return res.status(405).json({ ok: false, error: "استعمل POST" });
    const lim = limited(ip); if (lim) return res.status(429).json({ ok: false, error: lim === "day" ? "بلغ المساعد حدّه اليومي؛ عد غدًا." : "طلبات كثيرة؛ أعد المحاولة بعد دقيقة." });
    let body = req.body; if (typeof body === "string") { try { body = JSON.parse(body); } catch (e) { body = null; } }
    if (!body || typeof body.code !== "string" || body.code.length > MAX_CODE) return res.status(400).json({ ok: false, error: "الجسم JSON فيه code نصًّا بحد أقصى " + MAX_CODE + " حرف." });
    return res.status(200).json(await assist(body));
  } catch (e) { return res.status(500).json({ ok: false, error: "تعذّر الاستدعاء: " + String(e && e.message || e).slice(0, 300) }); }
};
module.exports._test = { applyEdits, parseJson, sane, verify, pickExamples };
