// ========================= الآلة الافتراضية (Bytecode VM) =========================
// حلقة تنفيذ حقيقية: عدّاد تعليمات (IP) يتقدّم عبر مصفوفة Bytecode مع كومة قيم (Stack)
// وكومة إطارات استدعاء (Call Frames) للدوال — بدل التنفيذ التكراري على الشجرة مباشرة.

class VMRuntimeError extends Error {}
class VMBreakSentinel extends Error {}

class VMFunction {
  constructor(chunkIndex, chunk) {
    this.chunkIndex = chunkIndex;
    this.chunk = chunk;
    this.__isVMFunction = true;
    this.env = null; // بيئة الدالة المنشِئة (للإغلاقات)
  }
}

class CallFrame {
  constructor(chunk, locals, returnStackDepth, parentEnv) {
    this.chunk = chunk;
    this.env = { locals, parent: parentEnv || null };
    this.ip = 0;
    this.locals = locals;
    this.returnStackDepth = returnStackDepth;
  }
}

function truthy(v) {
  if (v === null || v === undefined) return false;
  if (typeof v === "boolean") return v;
  if (typeof v === "number") return v !== 0;
  if (typeof v === "string") return v.length > 0;
  if (Array.isArray(v)) return v.length > 0;
  if (v instanceof Map) return v.size > 0;
  return true;
}

function typeName(v) {
  if (v === null || v === undefined) return "«لاشيء»";
  if (typeof v === "number") return "رقم";
  if (typeof v === "string") return "نص";
  if (typeof v === "boolean") return "قيمة منطقية";
  if (Array.isArray(v)) return "قائمة";
  if (v instanceof Map) return "خريطة";
  return "قيمة";
}
function numPair(op, a, b) {
  if (typeof a !== "number" || typeof b !== "number") throw new VMRuntimeError(`العملية «${op}» تحتاج رقمين لكنها وجدت ${typeName(a)} و${typeName(b)} — حوّل النص برقم بـ عدد()`);
}
function cmpPair(op, a, b) {
  if (typeof a === "number" && typeof b === "number") return;
  if (typeof a === "string" && typeof b === "string") return;
  throw new VMRuntimeError(`لا يمكن المقارنة بـ «${op}» بين ${typeName(a)} و${typeName(b)}`);
}

function toDisplay(v) {
  if (v === null || v === undefined) return "لاشيء";
  if (typeof v === "boolean") return v ? "صحيح" : "خطأ";
  if (Array.isArray(v)) return "[" + v.map(toDisplay).join("، ") + "]";
  if (v instanceof Map) return "{" + [...v].map(([k, x]) => toDisplay(k) + ": " + toDisplay(x)).join("، ") + "}";
  if (typeof v === "number") return toArabicIndicDigits(String(v)).replace(/\./g, "٫");
  if (typeof Element !== "undefined" && v instanceof Element) return `[عنصر واجهة: ${v.tagName.toLowerCase()}]`;
  return String(v);
}

class VM {
  constructor(opts = {}) {
    this.globals = new Map();
    this.stack = [];
    this.frames = [];
    this.handlers = [];
    this.onInput = opts.onInput || null;
    this.onPrint = opts.onPrint || (() => {});
    this.onSaveFile = opts.onSaveFile || (() => { throw new VMRuntimeError("الحفظ غير مفعّل"); });
    this.maxSteps = opts.maxSteps || 200000000;
    this.maxMs = opts.maxMs || 8000;
    this.t0 = Date.now();
    this.steps = 0;
    this.domRoot = opts.domRoot || null;
    this._setupBuiltins();
  }

  _tick() {
    this.steps++;
    if (this.steps > this.maxSteps || ((this.steps & 65535) === 0 && Date.now() - this.t0 > this.maxMs)) {
      const te = new VMRuntimeError("استغرق البرنامج وقتًا طويلًا فأوقفته (أكثر من " + Math.round(this.maxMs / 1000) + " ثوانٍ). تحقّق من حلقة لا تنتهي أو من حساب ثقيل");
      te.fatal = true; throw te;
    }
  }

  push(v) { this.stack.push(v); }
  pop() {
    if (this.stack.length === 0) throw new VMRuntimeError("نفاد المكدّس الداخلي");
    return this.stack.pop();
  }
  peek() { return this.stack[this.stack.length - 1]; }

  run(mainChunkIndex, functionChunks) {
    this.t0 = Date.now();
    this.functionChunks = functionChunks;
    const mainChunk = functionChunks[mainChunkIndex];
    const frame = new CallFrame(mainChunk, [], 0);
    this.frames.push(frame);
    this._loop();
  }

  _loop() {
    let instr = null;
    try { this._loop2((i) => { instr = i; }); }
    catch (e) {
      if (e instanceof VMRuntimeError && !e.lined && instr && instr.line) { e.message = `السطر ${instr.line}: ${e.message}`; e.lined = true; }
      throw e;
    }
  }

  _loop2(track) {
    while (this.frames.length > 0) {
      const frame = this.frames[this.frames.length - 1];
      if (frame.ip >= frame.chunk.code.length) {
        this.frames.pop();
        this.push(null);
        continue;
      }
      const instr = frame.chunk.code[frame.ip];
      track(instr);
      frame.ip++;
      try {
        this._tick();
        this._exec(frame, instr);
      } catch (err) {
        let e = err;
        if (!(e instanceof VMRuntimeError) && !(e instanceof VMBreakSentinel)) {
          const ne = new VMRuntimeError("خطأ داخلي: " + (e && e.message ? e.message : e));
          e = ne;
        }
        if (e.fatal || !(e instanceof VMRuntimeError)) throw e;
        if (!e.lined && instr.line) { e.message = `السطر ${instr.line}: ${e.message}`; e.lined = true; }
        // ابحث عن أقرب كتلة «حاول» ما زالت نشطة
        let h = null;
        while (this.handlers.length) {
          const cand = this.handlers.pop();
          if (this.frames[cand.depth - 1] === cand.frame) { h = cand; break; }
        }
        if (!h) throw e;
        this.frames.length = h.depth;
        this.stack.length = h.stackLen;
        h.frame.ip = h.catchAddr;
        this.push(e.message);
      }
    }
  }

  _exec(frame, instr) {
    const { op, args } = instr;
    switch (op) {
      case "HALT": this.frames.pop(); return;
      case "CONST": this.push(frame.chunk.constants[args[0]]); return;
      case "POP": this.pop(); return;
      case "GET_LOCAL": this.push(frame.locals[args[0]]); return;
      case "SET_LOCAL": frame.locals[args[0]] = this.peek(); return;
      case "GET_UP": { let e = frame.env; for (let k = 0; k < args[0]; k++) e = e.parent; this.push(e.locals[args[1]]); return; }
      case "SET_UP": { let e = frame.env; for (let k = 0; k < args[0]; k++) e = e.parent; e.locals[args[1]] = this.peek(); return; }
      case "TRY_BEGIN": this.handlers.push({ frame, depth: this.frames.length, stackLen: this.stack.length, catchAddr: args[0] }); return;
      case "TRY_END": this.handlers.pop(); return;
      case "GET_GLOBAL": {
        const name = args[0];
        if (!this.globals.has(name)) throw new VMRuntimeError(`متغير غير معرّف: ${name}` + this._hint(name));
        this.push(this.globals.get(name));
        return;
      }
      case "SET_GLOBAL": {
        if (!this.globals.has(args[0])) throw new VMRuntimeError(`المتغير «${args[0]}» غير معرّف — عرّفه أولًا بـ «متغير ${args[0]} = …» (الإسناد لا ينشئ متغيرًا جديدًا)` + this._hint(args[0]));
        this.globals.set(args[0], this.peek()); return;
      }
      case "SET_GLOBAL_NEW": this.globals.set(args[0], this.peek()); return;
      case "DEFINE_GLOBAL": this.globals.set(args[0], this.pop()); return;
      case "JUMP": frame.ip = args[0]; return;
      case "JUMP_IF_FALSE": if (!truthy(this.peek())) frame.ip = args[0]; return;
      case "MAKE_LIST": {
        const n = args[0];
        const items = this.stack.splice(this.stack.length - n, n);
        this.push(items);
        return;
      }
      case "MAKE_MAP": {
        const n = args[0];
        const flat = this.stack.splice(this.stack.length - 2 * n, 2 * n);
        const m = new Map();
        for (let k = 0; k < flat.length; k += 2) m.set(flat[k], flat[k + 1]);
        this.push(m);
        return;
      }
      case "INDEX_GET": {
        const idx = this.pop();
        const obj = this.pop();
        if (obj instanceof Map) { this.push(obj.has(idx) ? obj.get(idx) : null); return; }
        if (obj == null || obj[idx] === undefined) throw new VMRuntimeError(`خطأ في الفهرسة عند ${toDisplay(idx)}`);
        this.push(obj[idx]);
        return;
      }
      case "INDEX_SET": {
        const idx = this.pop();
        const obj = this.pop();
        const value = this.pop();
        if (obj == null) throw new VMRuntimeError("خطأ في الفهرسة");
        if (obj instanceof Map) obj.set(idx, value); else obj[idx] = value;
        this.push(value);
        return;
      }
      case "ADD": {
        const b = this.pop(), a = this.pop();
        if (typeof a === "number" && typeof b === "number") { this.push(a + b); return; }
        if (typeof a === "string" || typeof b === "string") { this.push((typeof a === "string" ? a : toDisplay(a)) + (typeof b === "string" ? b : toDisplay(b))); return; }
        if (Array.isArray(a) && Array.isArray(b)) { this.push(a.concat(b)); return; }
        throw new VMRuntimeError(`لا يمكن جمع ${typeName(a)} مع ${typeName(b)}`);
      }
      case "SUB": { const b = this.pop(), a = this.pop(); numPair("-", a, b); this.push(a - b); return; }
      case "MUL": { const b = this.pop(), a = this.pop(); numPair("*", a, b); this.push(a * b); return; }
      case "DIV": {
        const b = this.pop(), a = this.pop();
        numPair("/", a, b);
        if (b === 0) throw new VMRuntimeError("قسمة على صفر");
        this.push(a / b);
        return;
      }
      case "MOD": { const b = this.pop(), a = this.pop(); numPair("%", a, b); if (b === 0) throw new VMRuntimeError("قسمة على صفر"); this.push(a % b); return; }
      case "NEG": { const a = this.pop(); if (typeof a !== "number") throw new VMRuntimeError(`لا يمكن عكس إشارة ${typeName(a)}`); this.push(-a); return; }
      case "NOT": this.push(!truthy(this.pop())); return;
      case "EQ": { const b = this.pop(), a = this.pop(); this.push(a === b); return; }
      case "NEQ": { const b = this.pop(), a = this.pop(); this.push(a !== b); return; }
      case "LT": { const b = this.pop(), a = this.pop(); cmpPair("<", a, b); this.push(a < b); return; }
      case "GT": { const b = this.pop(), a = this.pop(); cmpPair(">", a, b); this.push(a > b); return; }
      case "LTE": { const b = this.pop(), a = this.pop(); cmpPair("<=", a, b); this.push(a <= b); return; }
      case "GTE": { const b = this.pop(), a = this.pop(); cmpPair(">=", a, b); this.push(a >= b); return; }
      case "FOR_TEST": {
        const step = this.pop(), end = this.pop(), i = this.pop();
        if (typeof step !== "number" || typeof end !== "number" || typeof i !== "number") throw new VMRuntimeError("حدود الحلقة (من، إلى، بخطوة) يجب أن تكون أرقامًا");
        if (step === 0) throw new VMRuntimeError("خطوة الحلقة لا يمكن أن تكون صفرًا");
        this.push(step > 0 ? i <= end : i >= end);
        return;
      }
      case "BUILD_FUNCTION": {
        const chunkIndex = args[0];
        const fn = new VMFunction(chunkIndex, this.functionChunks[chunkIndex]);
        fn.env = frame.env;
        this.push(fn);
        return;
      }
      case "CALL": {
        const argCount = args[0];
        const argVals = this.stack.splice(this.stack.length - argCount, argCount);
        const callee = this.pop();
        if (callee instanceof VMFunction) {
          const locals = new Array(callee.chunk.maxSlots).fill(null);
          callee.chunk.params.forEach((_, i) => { locals[i] = i < argVals.length ? argVals[i] : null; });
          if (this.frames.length > 5000) throw new VMRuntimeError("تجاوزت الدالة عمق الاستدعاء المسموح (٥٠٠٠) — غالبًا استدعاء ذاتي بلا شرط توقف");
          this.frames.push(new CallFrame(callee.chunk, locals, this.stack.length, callee.env));
          return;
        }
        if (typeof callee === "function") {
          this.push(callee(...argVals));
          return;
        }
        throw new VMRuntimeError("غير قابل للاستدعاء");
      }
      case "RETURN": {
        const value = this.pop();
        this.frames.pop();
        this.push(value);
        return;
      }
      default:
        throw new VMRuntimeError(`تعليمة غير معروفة: ${op}`);
    }
  }

  _hint(name) {
    const strip = (w) => String(w).replace(/[أإآ]/g, "ا").replace(/ة/g, "ه").replace(/ى/g, "ي").replace(/[ً-ْ]/g, "");
    const target = strip(name);
    const pool = [...this.globals.keys()].filter((k) => !String(k).startsWith("@"));
    if (typeof KEYWORDS !== "undefined") pool.push(...Object.keys(KEYWORDS));
    const hit = pool.find((k) => k !== name && strip(k) === target);
    return hit ? ` — هل تقصد «${hit}»؟` : "";
  }

  _setupBuiltins() {
    const g = this.globals;
    g.set("اطبع", (...a) => { this.onPrint(a.map(toDisplay).join(" ")); return null; });
    g.set("طول", (x) => { if (typeof x === "string" || Array.isArray(x)) return x.length; if (x instanceof Map) return x.size; throw new VMRuntimeError("طول() تحتاج نصًا أو قائمة أو خريطة"); });
    const needFn = (name, f) => { if (!(f instanceof VMFunction) && typeof f !== "function") throw new VMRuntimeError(name + "() تحتاج دالة في الوسيط الأخير"); };
    const callFn = (f, a) => (f instanceof VMFunction ? this.callFunctionExternally(f, a) : f(...a));
    const needList = (name, l) => { if (!Array.isArray(l)) throw new VMRuntimeError(name + "() تحتاج قائمة"); };
    g.set("مفاتيح", (m) => { if (!(m instanceof Map)) throw new VMRuntimeError("مفاتيح() تحتاج خريطة"); return [...m.keys()]; });
    g.set("قيم", (m) => { if (!(m instanceof Map)) throw new VMRuntimeError("قيم() تحتاج خريطة"); return [...m.values()]; });
    g.set("احذف", (c, k) => {
      if (c instanceof Map) { c.delete(k); return c; }
      if (Array.isArray(c)) { if (typeof k !== "number" || k < 0 || k >= c.length) throw new VMRuntimeError("احذف(): فهرس خارج حدود القائمة"); c.splice(k, 1); return c; }
      throw new VMRuntimeError("احذف() تحتاج خريطة أو قائمة");
    });
    g.set("طبّق", (l, f) => { needList("طبّق", l); needFn("طبّق", f); return l.map((x) => callFn(f, [x])); });
    g.set("رشّح", (l, f) => { needList("رشّح", l); needFn("رشّح", f); return l.filter((x) => truthy(callFn(f, [x]))); });
    g.set("اختصر", (l, f, init) => { needList("اختصر", l); needFn("اختصر", f); let acc = init === undefined ? null : init; for (const x of l) acc = callFn(f, [acc, x]); return acc; });
    g.set("نوع", (x) => typeName(x).replace(/[«»]/g, ""));
    g.set("أطلق_خطأ", (m) => { throw new VMRuntimeError(toDisplay(m)); });
    g.set("ادخل", (q) => {
      const msg = q === undefined ? "" : toDisplay(q);
      let r;
      if (this.onInput) r = this.onInput(msg);
      else if (typeof prompt === "function") r = prompt(msg);
      else throw new VMRuntimeError("ادخل() تحتاج بيئة تدعم الإدخال (المحرر أو التطبيق المُصدَّر)");
      return r === null || r === undefined ? "" : normalizeDigits(String(r));
    });
    g.set("أضف", (lst, val) => { if (!Array.isArray(lst)) throw new VMRuntimeError("أضف() تحتاج قائمة"); lst.push(val); return lst; });
    g.set("نص", (x) => toDisplay(x));
    // نص للكود: أرقام لاتينية ونقطة عشرية، يصلح لتوليد CSS وJSON وJavaScript
    g.set("نص_برمجي", (x) => (typeof x === "number" ? String(x) : toDisplay(x)));
    g.set("عدد", (x) => {
      if (typeof x === "number") return x;
      // الفاصلة العشرية العربية ٫ تُعامَل كنقطة، والتحويل صارم: النص كله رقم أو خطأ
      const normalized = typeof x === "string" ? normalizeDigits(x).replace(/\u066B/g, ".").trim() : x;
      if (typeof normalized !== "string" || !/^[+-]?(\d+(\.\d*)?|\.\d+)$/.test(normalized)) throw new VMRuntimeError(`لا يمكن تحويل "${toDisplay(x)}" إلى رقم`);
      return parseFloat(normalized);
    });
    g.set("احفظ_ملف", (path, content) => { this.onSaveFile(path, content); return path; });
    g.set("جذر", (x) => { if (x < 0) throw new VMRuntimeError("لا يوجد جذر حقيقي لعدد سالب"); return Math.sqrt(x); });
    g.set("قوة", (a, b) => Math.pow(a, b));
    g.set("مطلق", (x) => Math.abs(x));
    g.set("جولة", (x) => Math.round(x));
    g.set("أرضية", (x) => Math.floor(x));
    g.set("سقف", (x) => Math.ceil(x));
    g.set("الأكبر", (...a) => { const v = a.length === 1 && Array.isArray(a[0]) ? a[0] : a; if (!v.length) throw new VMRuntimeError("الأكبر() تحتاج قيمة واحدة على الأقل"); return Math.max(...v); });
    g.set("الأصغر", (...a) => { const v = a.length === 1 && Array.isArray(a[0]) ? a[0] : a; if (!v.length) throw new VMRuntimeError("الأصغر() تحتاج قيمة واحدة على الأقل"); return Math.min(...v); });
    g.set("عشوائي", (من, إلى) => {
      if (من === undefined) return Math.random();
      if (إلى === undefined) throw new VMRuntimeError("عشوائي(من, إلى) تحتاج حدين");
      return Math.floor(Math.random() * (إلى - من + 1)) + من;
    });
    g.set("اقتطع", (s, a, b) => { if (typeof s !== "string") throw new VMRuntimeError("اقتطع() تحتاج نصًا"); return b === undefined ? s.slice(a) : s.slice(a, b); });
    g.set("استبدل", (s, a, b) => { if (typeof s !== "string") throw new VMRuntimeError("استبدل() تحتاج نصًا"); return s.split(a).join(b); });
    g.set("يحوي", (c, v) => { if (typeof c === "string" || Array.isArray(c)) return c.includes(v); if (c instanceof Map) return c.has(v); throw new VMRuntimeError("يحوي() تحتاج نصًا أو قائمة أو خريطة"); });
    g.set("افصل", (s, sep) => { if (typeof s !== "string") throw new VMRuntimeError("افصل() تحتاج نصًا"); return s.split(sep === undefined ? " " : sep); });
    g.set("اربط", (lst, sep) => { if (!Array.isArray(lst)) throw new VMRuntimeError("اربط() تحتاج قائمة"); return lst.map(toDisplay).join(sep === undefined ? "" : sep); });
    g.set("قصّ", (s) => { if (typeof s !== "string") throw new VMRuntimeError("قصّ() تحتاج نصًا"); return s.trim(); });
    g.set("رتب", (lst) => {
      if (!Array.isArray(lst)) throw new VMRuntimeError("رتب() تحتاج قائمة");
      const c = [...lst];
      c.sort((a, b) => (typeof a === "number" && typeof b === "number") ? a - b : String(a).localeCompare(String(b), "ar"));
      return c;
    });
    g.set("اعكس", (v) => {
      if (Array.isArray(v)) return [...v].reverse();
      if (typeof v === "string") return [...v].reverse().join("");
      throw new VMRuntimeError("اعكس() تحتاج نصًا أو قائمة");
    });
    const requireDom = (fnName) => {
      if (!this.domRoot) throw new VMRuntimeError(`${fnName}() تحتاج بيئة واجهة حية`);
      return this.domRoot;
    };
    g.set("عنصر_جديد", (tag) => { requireDom("عنصر_جديد"); if (typeof tag !== "string") throw new VMRuntimeError("عنصر_جديد() تحتاج اسم وسم نصي"); if (/^(script|iframe|frame|frameset|object|embed|link|meta|base|applet)$/i.test(tag.trim())) throw new VMRuntimeError("الوسم «" + tag + "» غير مسموح به لأسباب أمنية"); return document.createElement(tag); });
    g.set("عيّن_نص", (el, v) => { requireDom("عيّن_نص"); if (!(el instanceof Element)) throw new VMRuntimeError("عيّن_نص() تحتاج عنصر واجهة صالحًا"); el.textContent = toDisplay(v); return el; });
    g.set("عيّن_نمط", (el, k, v) => { requireDom("عيّن_نمط"); if (!(el instanceof Element)) throw new VMRuntimeError("عيّن_نمط() تحتاج عنصر واجهة صالحًا"); el.style.setProperty(String(k), String(v)); return el; });
    g.set("أضف_فئة", (el, c) => { requireDom("أضف_فئة"); if (!(el instanceof Element)) throw new VMRuntimeError("أضف_فئة() تحتاج عنصر واجهة صالحًا"); el.classList.add(String(c)); return el; });
    g.set("أضف_ابن", (p, c) => { requireDom("أضف_ابن"); if (!(p instanceof Element) || !(c instanceof Element)) throw new VMRuntimeError("أضف_ابن() تحتاج عنصرَي واجهة صالحَين"); p.appendChild(c); return p; });
    g.set("امسح_عنصر", (el) => { requireDom("امسح_عنصر"); if (!(el instanceof Element)) throw new VMRuntimeError("امسح_عنصر() تحتاج عنصر واجهة صالحًا"); el.innerHTML = ""; return el; });
    g.set("اقرأ_قيمة", (el) => { requireDom("اقرأ_قيمة"); if (!(el instanceof Element)) throw new VMRuntimeError("اقرأ_قيمة() تحتاج عنصر واجهة صالحًا"); return normalizeDigits(String(el.value !== undefined ? el.value : "")); });
    g.set("عيّن_قيمة", (el, v) => { requireDom("عيّن_قيمة"); if (!(el instanceof Element)) throw new VMRuntimeError("عيّن_قيمة() تحتاج عنصر واجهة صالحًا"); el.value = toDisplay(v); return el; });
    g.set("عند_نقر", (el, fn) => {
      requireDom("عند_نقر");
      if (!(el instanceof Element)) throw new VMRuntimeError("عند_نقر() تحتاج عنصر واجهة صالحًا");
      if (!(fn instanceof VMFunction)) throw new VMRuntimeError("عند_نقر() تحتاج دالة معرّفة");
      const self = this;
      el.addEventListener("click", () => {
        try { self.callFunctionExternally(fn, []); }
        catch (e) { self.onPrint("خطأ داخل معالج النقر: " + e.message); }
      });
      return el;
    });
    g.set("الجذر", () => { requireDom("الجذر"); return this.domRoot; });
    g.set("نفّذ", (code) => {
      if (typeof code !== "string") throw new VMRuntimeError("نفّذ() تحتاج نصًا يمثّل كود ضاد");
      const output = [];
      try {
        const program = parse(code);
        const { mainChunkIndex, functionChunks } = compile(program);
        const subVm = new VM({ maxSteps: 200000, onPrint: (l) => output.push(l), onSaveFile: () => { throw new VMRuntimeError("الحفظ غير متاح داخل نفّذ()"); } });
        subVm.run(mainChunkIndex, functionChunks);
      } catch (e) {
        output.push("خطأ: " + e.message);
      }
      return output;
    });
  }

  callFunctionExternally(vmFunction, args) {
    const savedFrames = this.frames, savedStack = this.stack, savedHandlers = this.handlers;
    this.frames = []; this.stack = []; this.handlers = [];
    try {
      const locals = new Array(vmFunction.chunk.maxSlots).fill(null);
      vmFunction.chunk.params.forEach((_, i) => { locals[i] = i < args.length ? args[i] : null; });
      this.frames.push(new CallFrame(vmFunction.chunk, locals, 0, vmFunction.env));
      this._loop();
      return this.stack.length ? this.stack[this.stack.length - 1] : null;
    } finally {
      this.frames = savedFrames; this.stack = savedStack; this.handlers = savedHandlers;
    }
  }
}

if (typeof module !== "undefined") {
  module.exports = { VM, VMFunction, VMRuntimeError, toDisplay, truthy };
}
