// ========================= الآلة الافتراضية (Bytecode VM) =========================
// حلقة تنفيذ حقيقية: عدّاد تعليمات (IP) يتقدّم عبر مصفوفة Bytecode مع كومة قيم (Stack)
// وكومة إطارات استدعاء (Call Frames) للدوال — بدل التنفيذ التكراري على الشجرة مباشرة.

// <STDLIB>
const STDLIB_SOURCES = {
  "ضاد/نصوص": `# ضاد/نصوص — مكتبة النصوص، مكتوبة بضاد نفسها فوق دالتين فقط من المحرك: رمز() وحرف()
# تفهم خصوصية العربية: التشكيل، التطويل، صور الألف والياء، والأرقام الهندية.

دالة _فراغ(ح) {
    متغير ر = رمز(ح)
    ارجع ر == ٣٢ أو ر == ٩ أو ر == ١٠ أو ر == ١٣ أو ر == ١٦٠ أو ر == ١٢
}

# ---------- القصّ ----------
صدّر دالة قصّ_البداية(س) {
    متغير أ = ٠
    متغير ن = طول(س)
    طالما (أ < ن) {
        إذا (ليس _فراغ(س[أ])) { توقف }
        أ = أ + ١
    }
    ارجع اقتطع(س، أ)
}

صدّر دالة قصّ_النهاية(س) {
    متغير ب = طول(س)
    طالما (ب > ٠) {
        إذا (ليس _فراغ(س[ب - ١])) { توقف }
        ب = ب - ١
    }
    ارجع اقتطع(س، ٠، ب)
}

صدّر دالة قصّ(س) {
    ارجع قصّ_النهاية(قصّ_البداية(س))
}

# ---------- الفحص ----------
صدّر دالة يبدأ_ب(س، بداية) {
    ارجع طول(س) >= طول(بداية) و اقتطع(س، ٠، طول(بداية)) == بداية
}

صدّر دالة ينتهي_ب(س، نهاية) {
    متغير ط = طول(س) - طول(نهاية)
    ارجع ط >= ٠ و اقتطع(س، ط) == نهاية
}

صدّر دالة فارغ(س) {
    ارجع طول(قصّ(س)) == ٠
}

صدّر دالة عدّ_التكرار(س، جزء) {
    إذا (طول(جزء) == ٠) { ارجع ٠ }
    متغير عدد = ٠
    متغير م = ٠
    طالما (صحيح) {
        متغير ه = موضع(اقتطع(س، م)، جزء)
        إذا (ه < ٠) { توقف }
        عدد = عدد + ١
        م = م + ه + طول(جزء)
    }
    ارجع عدد
}

# ---------- التقسيم والعكس ----------
صدّر دالة كلمات(س) {
    متغير نتيجة = []
    متغير حالية = ""
    من_أجل (ح في س) {
        إذا (_فراغ(ح)) {
            إذا (طول(حالية) > ٠) { أضف(نتيجة، حالية) }
            حالية = ""
        } وإلا {
            حالية = حالية + ح
        }
    }
    إذا (طول(حالية) > ٠) { أضف(نتيجة، حالية) }
    ارجع نتيجة
}

صدّر دالة عدد_الكلمات(س) {
    ارجع طول(كلمات(س))
}

صدّر دالة سطور(س) {
    ارجع افصل(استبدل(س، حرف(١٣) + حرف(١٠)، حرف(١٠))، حرف(١٠))
}

صدّر دالة عكس(س) {
    متغير ح = []
    من_أجل (ك في س) { أضف(ح، ك) }
    متغير ن = []
    متغير ي = طول(ح) - ١
    طالما (ي >= ٠) {
        أضف(ن، ح[ي])
        ي = ي - ١
    }
    ارجع اربط(ن، "")
}

# ---------- المحاذاة ----------
دالة _حشو(حرفا، عدد) {
    إذا (عدد <= ٠) { ارجع "" }
    ارجع كرّر(حرفا، عدد)
}

صدّر دالة محاذاة_لليسار(س، عرض، حشو) {
    إذا (حشو == لاشيء) { حشو = " " }
    ارجع س + _حشو(حشو، عرض - طول(س))
}

صدّر دالة محاذاة_لليمين(س، عرض، حشو) {
    إذا (حشو == لاشيء) { حشو = " " }
    ارجع _حشو(حشو، عرض - طول(س)) + س
}

صدّر دالة توسيط(س، عرض، حشو) {
    إذا (حشو == لاشيء) { حشو = " " }
    متغير ناقص = عرض - طول(س)
    إذا (ناقص <= ٠) { ارجع س }
    متغير يمين = أرضية(ناقص / ٢)
    ارجع _حشو(حشو، يمين) + س + _حشو(حشو، ناقص - يمين)
}

# ---------- أصناف الحروف ----------
صدّر دالة هل_رقم(ح) {
    متغير ر = رمز(ح)
    ارجع (ر >= ٤٨ و ر <= ٥٧) أو (ر >= ١٦٣٢ و ر <= ١٦٤١) أو (ر >= ١٧٧٦ و ر <= ١٧٨٥)
}

صدّر دالة هل_تشكيل(ح) {
    متغير ر = رمز(ح)
    ارجع (ر >= ١٦١١ و ر <= ١٦٣١) أو ر == ١٦٤٨
}

صدّر دالة هل_حرف_عربي(ح) {
    متغير ر = رمز(ح)
    ارجع (ر >= ١٥٦٩ و ر <= ١٥٩٩) أو (ر >= ١٦٠١ و ر <= ١٦١٠) أو (ر >= ١٦٤٦ و ر <= ١٦٤٧) أو (ر >= ١٦٤٩ و ر <= ١٧٤٧)
}

صدّر دالة هل_حرف_لاتيني(ح) {
    متغير ر = رمز(ح)
    ارجع (ر >= ٦٥ و ر <= ٩٠) أو (ر >= ٩٧ و ر <= ١٢٢)
}

# ---------- العربية ----------
دالة _حذف(س، شرط) {
    متغير ن = []
    من_أجل (ح في س) {
        إذا (ليس شرط(ح)) { أضف(ن، ح) }
    }
    ارجع اربط(ن، "")
}

دالة _حوّل(س، دالة_تحويل) {
    متغير ن = []
    من_أجل (ح في س) { أضف(ن، دالة_تحويل(ح)) }
    ارجع اربط(ن، "")
}

صدّر دالة أزل_التشكيل(س) {
    ارجع _حذف(س، هل_تشكيل)
}

صدّر دالة أزل_التطويل(س) {
    ارجع _حذف(س، دالة(ح) { ارجع رمز(ح) == ١٦٠٠ })
}

صدّر دالة وحّد_الألف(س) {
    ارجع _حوّل(س، دالة(ح) {
        متغير ر = رمز(ح)
        إذا (ر == ١٥٧١ أو ر == ١٥٧٣ أو ر == ١٥٧٠ أو ر == ١٦٤٩) { ارجع حرف(١٥٧٥) }
        ارجع ح
    })
}

صدّر دالة وحّد_الياء(س) {
    ارجع _حوّل(س، دالة(ح) {
        إذا (رمز(ح) == ١٦٠٩) { ارجع حرف(١٦١٠) }
        ارجع ح
    })
}

صدّر دالة وحّد_التاء_المربوطة(س) {
    ارجع _حوّل(س، دالة(ح) {
        إذا (رمز(ح) == ١٥٧٧) { ارجع حرف(١٦٠٧) }
        ارجع ح
    })
}

# تطبيع للبحث والمقارنة: بلا تشكيل ولا تطويل، وتوحيد الألف والياء، وأرقام لاتينية، وأحرف لاتينية صغيرة
صدّر دالة طبّع_للبحث(س) {
    متغير ن = أزل_التطويل(أزل_التشكيل(س))
    ن = وحّد_الياء(وحّد_الألف(ن))
    ارجع صغّر(إلى_أرقام_لاتينية(ن))
}

# ---------- الأرقام ----------
صدّر دالة إلى_أرقام_لاتينية(س) {
    ارجع _حوّل(س، دالة(ح) {
        متغير ر = رمز(ح)
        إذا (ر >= ١٦٣٢ و ر <= ١٦٤١) { ارجع حرف(ر - ١٦٣٢ + ٤٨) }
        إذا (ر >= ١٧٧٦ و ر <= ١٧٨٥) { ارجع حرف(ر - ١٧٧٦ + ٤٨) }
        ارجع ح
    })
}

صدّر دالة إلى_أرقام_هندية(س) {
    ارجع _حوّل(س، دالة(ح) {
        متغير ر = رمز(ح)
        إذا (ر >= ٤٨ و ر <= ٥٧) { ارجع حرف(ر - ٤٨ + ١٦٣٢) }
        ارجع ح
    })
}

# ---------- الحروف اللاتينية ----------
صدّر دالة صغّر(س) {
    ارجع _حوّل(س، دالة(ح) {
        متغير ر = رمز(ح)
        إذا (ر >= ٦٥ و ر <= ٩٠) { ارجع حرف(ر + ٣٢) }
        ارجع ح
    })
}

صدّر دالة كبّر(س) {
    ارجع _حوّل(س، دالة(ح) {
        متغير ر = رمز(ح)
        إذا (ر >= ٩٧ و ر <= ١٢٢) { ارجع حرف(ر - ٣٢) }
        ارجع ح
    })
}
`
};
// </STDLIB>
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
  if (v instanceof VMFunction || typeof v === "function") return "دالة";
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

function toDisplay(v, seen) {
  if (v === null || v === undefined) return "لاشيء";
  if (typeof v === "boolean") return v ? "صحيح" : "خطأ";
  if (typeof v === "number") return toArabicIndicDigits(String(v)).replace(/\./g, "٫");
  if (typeof v === "string") return v;
  if (Array.isArray(v) || v instanceof Map) {
    seen = seen || new Set();
    if (seen.has(v)) return "[…]";           // بنية تحوي نفسها: لا نكرّر إلى ما لا نهاية
    seen.add(v);
    const out = Array.isArray(v)
      ? "[" + v.map((x) => toDisplay(x, seen)).join("، ") + "]"
      : "{" + [...v].map(([k, x]) => toDisplay(k, seen) + ": " + toDisplay(x, seen)).join("، ") + "}";
    seen.delete(v);
    return out;
  }
  if (v instanceof VMFunction) return "‹دالة›";
  if (typeof v === "function") return "‹دالة جاهزة›";
  if (typeof Element !== "undefined" && v instanceof Element) return `[عنصر واجهة: ${v.tagName.toLowerCase()}]`;
  return String(v);
}

// موضع الخطأ: «السطر ٣» في الملف الرئيسي، و«أدوات.dhad، السطر ٣» داخل ملف مستورد
function lineWhere(frame, instr) {
  const f = frame && frame.chunk && frame.chunk.file;
  return (f ? f + "، " : "") + "السطر " + instr.line;
}

// يحوّل مسار الاستيراد إلى مفتاح موحّد داخل مجلد المشروع. «./» و«../» نسبة إلى الملف المستورِد،
// وما سواهما نسبة إلى جذر المشروع. يعيد null إن خرج المسار من الجذر.
function normalizeModulePath(spec, fromFile) {
  const p = String(spec).replace(/\\/g, "/");
  let parts = [];
  if (p.startsWith("./") || p.startsWith("../")) {
    parts = String(fromFile || "").split("/");
    parts.pop();
    parts = parts.filter(Boolean);
  }
  for (const seg of p.split("/")) {
    if (seg === "" || seg === ".") continue;
    if (seg === "..") { if (!parts.length) return null; parts.pop(); continue; }
    parts.push(seg);
  }
  return parts.length ? parts.join("/") : null;
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
    this.readModule = opts.readModule || null;        // (مسار) => نص الملف أو null
    this.mainPath = opts.mainPath || "main.dhad";
    this.modules = new Map();                          // الوحدات المحمّلة: مسار -> { loading, exports }
    this.importStack = [];
    this._setupBuiltins();
    this.builtins = new Map(this.globals);             // لقطة الدوال الجاهزة؛ تُنسخ لكل وحدة فتبدأ بأسماء نظيفة
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
    let instr = null, fr = null;
    try { this._loop2((i, f) => { instr = i; fr = f; }); }
    catch (e) {
      if (e instanceof VMRuntimeError && !e.lined && instr && instr.line) { e.message = `${lineWhere(fr, instr)}: ${e.message}`; e.lined = true; }
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
      track(instr, frame);
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
        if (!e.lined && instr.line) { e.message = `${lineWhere(frame, instr)}: ${e.message}`; e.lined = true; }
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
    const G = frame.chunk.globals || this.globals;   // فضاء أسماء الملف الذي تنتمي إليه هذه التعليمة
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
        if (!G.has(name)) throw new VMRuntimeError(`متغير غير معرّف: ${name}` + this._hint(name, G));
        this.push(G.get(name));
        return;
      }
      case "SET_GLOBAL": {
        if (!G.has(args[0])) throw new VMRuntimeError(`المتغير «${args[0]}» غير معرّف — عرّفه أولًا بـ «متغير ${args[0]} = …» (الإسناد لا ينشئ متغيرًا جديدًا)` + this._hint(args[0], G));
        G.set(args[0], this.peek()); return;
      }
      case "SET_GLOBAL_NEW": G.set(args[0], this.peek()); return;
      case "DEFINE_GLOBAL": G.set(args[0], this.pop()); return;
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
        // فهرسة صارمة: أعداد صحيحة فقط على القوائم والنصوص، ولا وصول لأي خاصية داخلية في جافاسكربت
        if (Array.isArray(obj) || typeof obj === "string") {
          if (typeof idx === "number" && Number.isInteger(idx)) {
            const k = idx < 0 ? obj.length + idx : idx;
            if (k >= 0 && k < obj.length) { this.push(obj[k]); return; }
          }
          throw new VMRuntimeError(`خطأ في الفهرسة عند ${toDisplay(idx)}`);
        }
        throw new VMRuntimeError(`لا يمكن الفهرسة على قيمة من نوع ${typeName(obj).replace(/[«»]/g, "")}`);
      }
      case "INDEX_SET": {
        const idx = this.pop();
        const obj = this.pop();
        const value = this.pop();
        if (obj instanceof Map) { obj.set(idx, value); this.push(value); return; }
        if (Array.isArray(obj)) {
          if (typeof idx === "number" && Number.isInteger(idx)) {
            const k = idx < 0 ? obj.length + idx : idx;
            if (k >= 0 && k <= obj.length) { obj[k] = value; this.push(value); return; }
          }
          throw new VMRuntimeError(`خطأ في الفهرسة عند ${toDisplay(idx)}`);
        }
        if (typeof obj === "string") throw new VMRuntimeError("النصوص لا تُعدَّل بالفهرسة؛ أنشئ نصًا جديدًا بـ استبدل() أو اقتطع()");
        throw new VMRuntimeError(`لا يمكن الإسناد بالفهرسة على قيمة من نوع ${typeName(obj).replace(/[«»]/g, "")}`);
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
        const fn = new VMFunction(chunkIndex, (frame.chunk.fchunks || this.functionChunks)[chunkIndex]);
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

  _hint(name, G) {
    const strip = (w) => String(w).replace(/[أإآ]/g, "ا").replace(/ة/g, "ه").replace(/ى/g, "ي").replace(/[ً-ْ]/g, "");
    const target = strip(name);
    const pool = [...(G || this.globals).keys()].filter((k) => !String(k).startsWith("@"));
    if (typeof KEYWORDS !== "undefined") pool.push(...Object.keys(KEYWORDS));
    const hit = pool.find((k) => k !== name && strip(k) === target);
    return hit ? ` — هل تقصد «${hit}»؟` : "";
  }

  _setupBuiltins() {
    const g = this.globals;
    g.set("اطبع", (...a) => { this.onPrint(a.map((x) => toDisplay(x)).join(" ")); return null; });
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
    g.set("كرّر", (x, n) => {
      if (typeof n !== "number" || !Number.isInteger(n) || n < 0) throw new VMRuntimeError("كرّر(): العدد يجب أن يكون صحيحًا غير سالب");
      if (typeof x === "string") { if (x.length * n > 1000000) throw new VMRuntimeError("كرّر(): الناتج كبير جدًا"); return x.repeat(n); }
      if (Array.isArray(x)) { if (x.length * n > 1000000) throw new VMRuntimeError("كرّر(): الناتج كبير جدًا"); const r = []; for (let i = 0; i < n; i++) for (const e of x) r.push(e); return r; }
      throw new VMRuntimeError("كرّر() تحتاج نصًا أو قائمة، لكن وجدت " + typeName(x).replace(/[«»]/g, ""));
    });
    g.set("استورد", (spec) => this._import(spec));
    g.set("نوع", (x) => typeName(x).replace(/[«»]/g, ""));
    g.set("@تكرار", (x) => {
      if (Array.isArray(x) || typeof x === "string") return x;
      throw new VMRuntimeError(`من_أجل (… في …) تحتاج قائمة أو نصًا، لكن وجدت ${typeName(x).replace(/[«»]/g, "")}. للخريطة استعمل مفاتيح() أو قيم()`);
    });
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
    // رمز(حرف) ترجع رقم الحرف في يونيكود، وحرف(رقم) ترجع الحرف من رقمه: هما أساس مكتبة النصوص المكتوبة بضاد
    g.set("رمز", (c) => { if (typeof c !== "string" || c.length === 0) throw new VMRuntimeError("رمز() تحتاج نصًا فيه حرف واحد على الأقل"); return c.codePointAt(0); });
    g.set("حرف", (n) => { if (typeof n !== "number" || !Number.isInteger(n) || n < 0 || n > 0x10FFFF) throw new VMRuntimeError("حرف() تحتاج رقمًا صحيحًا بين ٠ و ١١١٤١١١"); return String.fromCodePoint(n); });
    // نص للكود: أرقام لاتينية ونقطة عشرية، يصلح لتوليد CSS وJSON وJavaScript
    g.set("نص_برمجي", (x) => (typeof x === "number" ? String(x) : toDisplay(x)));
    g.set("عدد", (x) => {
      if (typeof x === "number") return x;
      // الفاصلة العشرية العربية ٫ تُعامَل كنقطة، والتحويل صارم: النص كله رقم أو خطأ
      const normalized = typeof x === "string" ? normalizeDigits(x).replace(/٫/g, ".").trim() : x;
      if (typeof normalized !== "string" || !/^[+-]?(\d+(\.\d*)?|\.\d+)$/.test(normalized)) throw new VMRuntimeError(`لا يمكن تحويل "${toDisplay(x)}" إلى رقم`);
      return parseFloat(normalized);
    });
    g.set("احفظ_ملف", (path, content) => { this.onSaveFile(path, content); return path; });
    const num = (name, ...xs) => { for (const x of xs) if (typeof x !== "number" || Number.isNaN(x)) throw new VMRuntimeError(`${name}() تحتاج رقمًا لكنها وجدت ${typeName(x).replace(/[«»]/g, "")}`); };
    g.set("جمع", (l) => { needList("جمع", l); let t = 0; for (const x of l) { num("جمع", x); t += x; } return t; });
    g.set("موضع", (c, v) => {
      if (typeof c === "string") { if (typeof v !== "string") throw new VMRuntimeError("موضع() في النص تحتاج نصًا تبحث عنه"); return c.indexOf(v); }
      needList("موضع", c);
      return c.findIndex((x) => x === v);
    });
    g.set("@في", (c, v) => { if (typeof c === "string" || Array.isArray(c)) return c.includes(v); if (c instanceof Map) return c.has(v); throw new VMRuntimeError("«في» تحتاج في طرفها الأيمن نصًا أو قائمة أو خريطة"); });
    g.set("الوقت", () => Date.now());
    g.set("@شريحة", (c, a, b) => {
      if (!(typeof c === "string" || Array.isArray(c))) throw new VMRuntimeError(`الشريحة [أ:ب] تحتاج قائمة أو نصًا لكن وجدت ${typeName(c).replace(/[«»]/g, "")}`);
      for (const x of [a, b]) if (x !== null && x !== undefined && !(typeof x === "number" && Number.isInteger(x))) throw new VMRuntimeError("حدّا الشريحة [أ:ب] يجب أن يكونا عددين صحيحين");
      return c.slice(a === null ? undefined : a, b === null ? undefined : b);
    });
    g.set("جذر", (x) => { num("جذر", x); if (x < 0) throw new VMRuntimeError("لا يوجد جذر حقيقي لعدد سالب"); return Math.sqrt(x); });
    g.set("قوة", (a, b) => { num("قوة", a, b); return Math.pow(a, b); });
    g.set("مطلق", (x) => { num("مطلق", x); return Math.abs(x); });
    g.set("جولة", (x) => { num("جولة", x); return Math.round(x); });
    g.set("أرضية", (x) => { num("أرضية", x); return Math.floor(x); });
    g.set("سقف", (x) => { num("سقف", x); return Math.ceil(x); });
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
    g.set("اربط", (lst, sep) => { if (!Array.isArray(lst)) throw new VMRuntimeError("اربط() تحتاج قائمة"); return lst.map((x) => toDisplay(x)).join(sep === undefined ? "" : sep); });
    g.set("قصّ", (s) => { if (typeof s !== "string") throw new VMRuntimeError("قصّ() تحتاج نصًا"); return s.trim(); });
    g.set("رتب", (lst, cmp) => {
      if (!Array.isArray(lst)) throw new VMRuntimeError("رتب() تحتاج قائمة");
      const c = [...lst];
      if (cmp !== undefined) {
        needFn("رتب", cmp);
        c.sort((a, b) => { const r = callFn(cmp, [a, b]); num("دالة المقارنة في رتب", r); return r; });
        return c;
      }
      c.sort((a, b) => (typeof a === "number" && typeof b === "number") ? a - b : String(a).localeCompare(String(b), "ar"));
      return c;
    });
    g.set("انزع", (l) => { needList("انزع", l); if (!l.length) throw new VMRuntimeError("انزع() لا تعمل على قائمة فارغة"); return l.pop(); });
    g.set("أدرج", (l, i, v) => {
      needList("أدرج", l);
      if (typeof i !== "number" || !Number.isInteger(i) || i < 0 || i > l.length) throw new VMRuntimeError("أدرج(): الموضع يجب أن يكون عددًا صحيحًا بين ٠ وطول القائمة");
      l.splice(i, 0, v); return l;
    });
    g.set("مدى", (a, b, st) => {
      if (b === undefined) { b = a; a = 0; }
      if (st === undefined) st = 1;
      for (const x of [a, b, st]) if (typeof x !== "number" || !Number.isFinite(x)) throw new VMRuntimeError("مدى() تحتاج أرقامًا");
      if (st === 0) throw new VMRuntimeError("مدى(): الخطوة لا تكون صفرًا");
      const n = Math.ceil((b - a) / st);
      if (n > 1000000) throw new VMRuntimeError("مدى(): القائمة أكبر من المسموح (مليون عنصر)");
      const out = [];
      for (let k = 0; k < n; k++) out.push(a + k * st);
      return out;
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

  // استورد("مسار"): تحمّل ملف ضاد مرة واحدة في فضاء أسماء خاص به، وتعيد خريطة بما عُلِّم فيه بـ «صدّر»
  _import(spec) {
    if (typeof spec !== "string" || !spec.trim()) throw new VMRuntimeError("استورد() تحتاج اسم الملف نصًا، مثل: استورد(\"أدوات\")");
    const top = this.frames[this.frames.length - 1];
    const from = (top && top.chunk.file) || this.mainPath;
    if (spec.startsWith("ضاد/")) {
      const text = STDLIB_SOURCES[spec];
      if (typeof text !== "string") throw new VMRuntimeError(`الوحدة القياسية «${spec}» غير موجودة. الموجود: ${Object.keys(STDLIB_SOURCES).join("، ")}`);
      const hit0 = this.modules.get(spec);
      if (hit0) { if (hit0.loading) throw new VMRuntimeError("استيراد دائري في الوحدة القياسية " + spec); return hit0.exports; }
      return this._loadModule(spec, text);
    }
    if (!this.readModule) throw new VMRuntimeError("الاستيراد غير متاح في هذه البيئة (لا توجد ملفات يُستورد منها)");
    const base = normalizeModulePath(spec, from);
    if (!base) throw new VMRuntimeError(`المسار «${spec}» غير صالح أو يخرج من مجلد المشروع`);
    const cands = /\.(dhad|ضاد)$/.test(base) ? [base] : [base + ".dhad", base + ".ضاد", base];
    let key = null, src = null;
    for (const c of cands) {
      if (c === this.mainPath) throw new VMRuntimeError(`لا يمكن استيراد الملف الرئيسي «${c}»`);
      const hit = this.modules.get(c);
      if (hit) {
        if (hit.loading) {
          const st = this.importStack, chain = st.slice(Math.max(0, st.indexOf(c))).concat(c);
          throw new VMRuntimeError("استيراد دائري: " + chain.join(" ← ") + " — اكسر الدائرة بنقل المشترك إلى ملف ثالث");
        }
        return hit.exports;
      }
      const text = this.readModule(c);
      if (typeof text === "string") { key = c; src = text; break; }
    }
    if (key === null) throw new VMRuntimeError(`لم أجد الملف «${spec}» (بحثت عن ${cands.join(" و")})`);
    return this._loadModule(key, src);
  }

  _loadModule(key, src) {
    const entry = { loading: true, exports: null };
    this.modules.set(key, entry);
    if (!this.importStack.length) this.importStack.push(this.mainPath);
    this.importStack.push(key);
    const savedFrames = this.frames, savedStack = this.stack, savedHandlers = this.handlers;
    try {
      let compiled;
      try { compiled = compile(parse(src)); }
      catch (e) { throw new VMRuntimeError(`في الملف ${key}: ${e.message}`); }
      const G = new Map(this.builtins);
      for (const ch of compiled.functionChunks) { ch.globals = G; ch.file = key; ch.fchunks = compiled.functionChunks; }
      this.frames = []; this.stack = []; this.handlers = [];
      this.frames.push(new CallFrame(compiled.functionChunks[compiled.mainChunkIndex], [], 0));
      this._loop();
      const ex = new Map();
      for (const n of compiled.exportNames) ex.set(n, G.has(n) ? G.get(n) : null);
      entry.loading = false; entry.exports = ex;
      return ex;
    } catch (e) {
      this.modules.delete(key);
      throw e;
    } finally {
      this.frames = savedFrames; this.stack = savedStack; this.handlers = savedHandlers;
      this.importStack.pop();
    }
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
