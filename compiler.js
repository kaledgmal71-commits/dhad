// ========================= مُصرّف Bytecode حقيقي =========================
// يأخذ نفس شجرة AST التي يبنيها parser.js/engine.js (لم تتغيّر قواعد اللغة نفسها)
// ويُخرج تعليمات مسطّحة (Bytecode) بدل تنفيذ الشجرة مباشرة (Tree-Walking).
// هذا هو نفس المبدأ الذي تعمل به آلات بايثون وجافا الافتراضية داخليًا.

class FunctionChunk {
  constructor(name, params) {
    this.name = name;
    this.params = params;
    this.code = [];       // مصفوفة تعليمات: { op, args }
    this.constants = [];  // جدول الثوابت (نصوص، أرقام...)
    this.maxSlots = params.length; // أكبر عدد خانات محلية احتاجتها الدالة
  }
  emit(op, ...args) {
    this.code.push({ op, args, line: FunctionChunk.curLine });
    return this.code.length - 1; // عنوان التعليمة (للقفزات لاحقًا)
  }
  addConstant(value) {
    this.constants.push(value);
    return this.constants.length - 1;
  }
  patch(addr, newArgs) {
    this.code[addr].args = newArgs;
  }
  here() {
    return this.code.length;
  }
}

class CompileError extends Error {}

class FunctionScope {
  constructor(name, params) {
    this.chunk = new FunctionChunk(name, params);
    this.scopes = [new Map()]; // مكدّس نطاقات: اسم -> رقم الخانة المحلية
    this.nextSlot = 0;
    params.forEach((p) => this.declare(p));
  }
  declare(name) {
    const slot = this.nextSlot++;
    this.chunk.maxSlots = Math.max(this.chunk.maxSlots, this.nextSlot);
    this.scopes[this.scopes.length - 1].set(name, slot);
    return slot;
  }
  resolve(name) {
    for (let i = this.scopes.length - 1; i >= 0; i--) {
      if (this.scopes[i].has(name)) return this.scopes[i].get(name);
    }
    return -1;
  }
  pushScope() { this.scopes.push(new Map()); }
  popScope() { this.scopes.pop(); }
}

class Compiler {
  constructor() {
    this.functionChunks = [];   // كل الدوال المصرَّفة (بما فيها البرنامج الرئيسي عند الفهرس 0)
    this.stack = [];            // مكدّس FunctionScope الحالية (للتعامل مع دوال متداخلة)
    this.loopStack = [];        // لدعم توقف/أكمل: { breakAddrs: [], continueTarget }
    this.inFinally = 0;         // عمق كتل «أخيرًا» التي نصرّفها الآن
    this.finallyStack = [];     // كتل «أخيرًا» المفتوحة: { block, depth }
    this.tryDepth = 0;          // عمق كتل «حاول» المفتوحة (لإغلاقها عند توقف/أكمل)
    this.exportNames = [];      // أسماء ما عُلِّم بـ «صدّر» في المستوى الأعلى
  }

  get current() { return this.stack[this.stack.length - 1]; }
  get chunk() { return this.current.chunk; }
  get isTopLevel() { return this.stack.length === 1; }

  compileProgram(program) {
    const scope = new FunctionScope("<رئيسي>", []);
    this.stack.push(scope);
    this.functionChunks.push(scope.chunk); // الفهرس 0 دائمًا هو البرنامج الرئيسي
    program.statements.forEach((s) => this.compileStmt(s));
    this.chunk.emit("HALT");
    this.stack.pop();
    return { mainChunkIndex: 0, functionChunks: this.functionChunks, exportNames: this.exportNames };
  }

  // ---------- الجمل ----------
  compileStmt(node) {
    if (node.line) FunctionChunk.curLine = node.line;
    const m = this["stmt_" + node.kind];
    if (!m) throw new CompileError(`لا يمكن تصريف الجملة: ${node.kind}`);
    m.call(this, node);
  }

  stmt_Export(node) {
    this.compileStmt(node.stmt);
    node.names.forEach((n) => { if (!this.exportNames.includes(n)) this.exportNames.push(n); });
  }

  stmt_ExprStmt(node) {
    this.compileExpr(node.expr);
    this.chunk.emit("POP");
  }

  stmt_VarDecl(node) {
    this.compileExpr(node.expr);
    if (this.isTopLevel) {
      this.chunk.emit("DEFINE_GLOBAL", node.name);
    } else {
      const slot = this.current.declare(node.name);
      this.chunk.emit("SET_LOCAL", slot);
      this.chunk.emit("POP");
    }
  }

  compileFunctionBody(name, params, body, isAsync) {
    const funcScope = new FunctionScope(name, params);
    funcScope.chunk.isAsync = !!isAsync;
    this.stack.push(funcScope);
    const savedLoops = this.loopStack, savedTry = this.tryDepth, savedFin = this.finallyStack, savedInFin = this.inFinally;
    this.loopStack = []; this.tryDepth = 0; this.finallyStack = []; this.inFinally = 0;
    const chunkIndex = this.functionChunks.length;
    this.functionChunks.push(funcScope.chunk);
    body.statements.forEach((s) => this.compileStmt(s));
    // ارجع لاشيء ضمنيًا إذا لم تصل الدالة إلى ارجع صريحة
    funcScope.chunk.emit("CONST", funcScope.chunk.addConstant(null));
    funcScope.chunk.emit("RETURN");
    this.loopStack = savedLoops; this.tryDepth = savedTry; this.finallyStack = savedFin; this.inFinally = savedInFin;
    this.stack.pop();
    return chunkIndex;
  }

  stmt_FuncDecl(node) {
    // داخل دالة: نحجز خانة الاسم قبل تصريف الجسم ليستطيع الاستدعاء الذاتي رؤية الاسم
    const slot = this.isTopLevel ? -1 : this.current.declare(node.name);
    const chunkIndex = this.compileFunctionBody(node.name, node.params, node.body, node.isAsync);
    this.chunk.emit("BUILD_FUNCTION", chunkIndex);
    if (this.isTopLevel) this.chunk.emit("DEFINE_GLOBAL", node.name);
    else { this.chunk.emit("SET_LOCAL", slot); this.chunk.emit("POP"); }
  }

  expr_Await(node) {
    // مسموحة في دالة غير_متزامنة أو في المستوى الأعلى من الملف
    if (!this.isTopLevel && !this.chunk.isAsync) throw new CompileError("انتظر لا تُكتب إلا داخل دالة غير_متزامنة أو في المستوى الأعلى من الملف");
    this.compileExpr(node.expr);
    this.chunk.emit("AWAIT");
  }

  expr_FuncExpr(node) {
    const chunkIndex = this.compileFunctionBody("<مجهولة>", node.params, node.body, node.isAsync);
    this.chunk.emit("BUILD_FUNCTION", chunkIndex);
  }

  stmt_Try(node) {
    if (!node.finallyBlock) return this._tryCatch(node);
    // حاول { أ } [التقط { ب }] أخيرًا { ج }: معالج خارجي يلتقط كل خطأ فيشغّل «ج» ثم يعيد إطلاقه
    const outer = this.chunk.emit("TRY_BEGIN", -1);
    this.tryDepth++;
    this.finallyStack.push({ block: node.finallyBlock, depth: this.tryDepth });
    if (node.catchBlock) this._tryCatch(node); else this.compileBlockScoped(node.tryBlock);
    this.finallyStack.pop();
    this.tryDepth--;
    this.chunk.emit("TRY_END");
    this._finallyBody(node.finallyBlock);
    const jEnd = this.chunk.emit("JUMP", -1);
    this.chunk.patch(outer, [this.chunk.here()]);
    this._finallyBody(node.finallyBlock);   // مسار الخطأ: الخطأ على المكدّس أثناء تشغيل «أخيرًا»
    this.chunk.emit("RETHROW");
    this.chunk.patch(jEnd, [this.chunk.here()]);
  }

  _finallyBody(block) {
    this.inFinally++;
    this.compileBlockScoped(block);
    this.inFinally--;
  }

  // ينفّذ أجسام «أخيرًا» المفتوحة من الداخل إلى الخارج قبل الخروج بـ ارجع/توقف/أكمل
  _unwindFinally(downToDepth) {
    const saved = this.finallyStack;
    for (let k = this.tryDepth; k > downToDepth; k--) {
      this.chunk.emit("TRY_END");
      const idx = saved.findIndex((f) => f.depth === k);
      if (idx >= 0) {
        this.finallyStack = saved.slice(0, idx);
        const savedDepth = this.tryDepth; this.tryDepth = k - 1;
        this._finallyBody(saved[idx].block);
        this.tryDepth = savedDepth;
        this.finallyStack = saved;
      }
    }
  }

  _tryCatch(node) {
    const begin = this.chunk.emit("TRY_BEGIN", -1);
    this.tryDepth++;
    this.compileBlockScoped(node.tryBlock);
    this.tryDepth--;
    this.chunk.emit("TRY_END");
    const jEnd = this.chunk.emit("JUMP", -1);
    this.chunk.patch(begin, [this.chunk.here()]);
    // عند الخطأ تضع الآلة رسالته على المكدّس
    if (!this.isTopLevel) this.current.pushScope();
    if (node.errName) {
      if (this.isTopLevel) this.chunk.emit("DEFINE_GLOBAL", node.errName);
      else { const slot = this.current.declare(node.errName); this.chunk.emit("SET_LOCAL", slot); this.chunk.emit("POP"); }
    } else this.chunk.emit("POP");
    node.catchBlock.statements.forEach((s) => this.compileStmt(s));
    if (!this.isTopLevel) this.current.popScope();
    this.chunk.patch(jEnd, [this.chunk.here()]);
  }

  stmt_If(node) {
    this.compileExpr(node.cond);
    const jFalse = this.chunk.emit("JUMP_IF_FALSE", -1);
    this.chunk.emit("POP");
    this.compileBlockScoped(node.thenBlock);
    const jEnd = this.chunk.emit("JUMP", -1);
    this.chunk.patch(jFalse, [this.chunk.here()]);
    this.chunk.emit("POP");
    if (node.elseBlock) this.compileBlockScoped(node.elseBlock);
    this.chunk.patch(jEnd, [this.chunk.here()]);
  }

  stmt_While(node) {
    const loopStart = this.chunk.here();
    this.compileExpr(node.cond);
    const jFalse = this.chunk.emit("JUMP_IF_FALSE", -1);
    this.chunk.emit("POP");
    this.loopStack.push({ breakAddrs: [], continueAddrs: [], tryDepth: this.tryDepth, inFinally: this.inFinally });
    this.compileBlockScoped(node.body);
    const loop = this.loopStack.pop();
    loop.continueAddrs.forEach((a) => this.chunk.patch(a, [loopStart]));
    this.chunk.emit("JUMP", loopStart);
    this.chunk.patch(jFalse, [this.chunk.here()]);
    this.chunk.emit("POP");
    loop.breakAddrs.forEach((a) => this.chunk.patch(a, [this.chunk.here()]));
  }

  stmt_For(node) {
    // نفس دلالات النسخة القديمة تمامًا: نحسب اتجاه الخطوة مرة واحدة عند الدخول
    const varSlotOrGlobal = this.isTopLevel
      ? { global: node.varName }
      : { local: this.current.declare(node.varName) };
    const endName = "@for_end_" + this.chunk.here();
    const stepName = "@for_step_" + this.chunk.here();
    const endRef = this.isTopLevel ? { global: endName } : { local: this.current.declare(endName) };
    const stepRef = this.isTopLevel ? { global: stepName } : { local: this.current.declare(stepName) };

    this.compileExpr(node.start);
    this.emitStore(varSlotOrGlobal);
    this.chunk.emit("POP");

    this.compileExpr(node.end);
    this.emitStore(endRef);
    this.chunk.emit("POP");

    // الخطوة: ١ افتراضيًا (لا تعمل الحلقة إن كانت النهاية أصغر من البداية)، أو القيمة بعد «بخطوة»
    if (node.step) this.compileExpr(node.step); else this.chunk.emit("CONST", this.chunk.addConstant(1));
    this.emitStore(stepRef);
    this.chunk.emit("POP");

    const loopStart = this.chunk.here();
    this.emitLoad(varSlotOrGlobal);
    this.emitLoad(endRef);
    this.emitLoad(stepRef);
    this.chunk.emit("FOR_TEST");
    const jFalse = this.chunk.emit("JUMP_IF_FALSE", -1);
    this.chunk.emit("POP");

    this.loopStack.push({ breakAddrs: [], continueAddrs: [], tryDepth: this.tryDepth, inFinally: this.inFinally });
    this.compileBlockScoped(node.body);
    // زيادة المتغيّر بالخطوة قبل العودة إلى بداية الحلقة (هذا هو هدف "أكمل" الحقيقي)
    const incrAddr = this.chunk.here();
    const loop = this.loopStack.pop();
    loop.continueAddrs.forEach((a) => this.chunk.patch(a, [incrAddr]));
    this.emitLoad(varSlotOrGlobal);
    this.emitLoad(stepRef);
    this.chunk.emit("ADD");
    this.emitStore(varSlotOrGlobal);
    this.chunk.emit("POP");
    this.chunk.emit("JUMP", loopStart);

    this.chunk.patch(jFalse, [this.chunk.here()]);
    this.chunk.emit("POP");
    loop.breakAddrs.forEach((a) => this.chunk.patch(a, [this.chunk.here()]));
  }

  // من_أجل (س في قائمة): تُحوَّل إلى حلقة عدّاد مخفي فوق القائمة، فيبقى توقف/أكمل/الإغلاقات على دلالاتها
  stmt_ForIn(node) {
    this.forInCount = (this.forInCount || 0) + 1;
    const n = this.forInCount;
    const L = { kind: "Identifier", name: "@forin_list_" + n };
    const I = { kind: "Identifier", name: "@forin_i_" + n };
    this.stmt_VarDecl({ kind: "VarDecl", name: "@forin_list_" + n, expr: { kind: "Call", callee: { kind: "Identifier", name: "@تكرار" }, args: [node.iter] } });
    const last = { kind: "BinOp", op: "MINUS", left: { kind: "Call", callee: { kind: "Identifier", name: "طول" }, args: [L] }, right: { kind: "Number", value: 1 } };
    const first = { kind: "VarDecl", name: node.varName, expr: { kind: "Index", obj: L, index: I } };
    this.stmt_For({ kind: "For", varName: "@forin_i_" + n, start: { kind: "Number", value: 0 }, end: last, step: null,
      body: { kind: "Block", statements: [first].concat(node.body.statements) } });
  }

  stmt_Return(node) {
    if (this.inFinally) throw new CompileError("لا يُكتب ارجع داخل كتلة «أخيرًا» لأنها تعمل في كل الأحوال");
    if (node.expr) this.compileExpr(node.expr);
    else this.chunk.emit("CONST", this.chunk.addConstant(null));
    if (this.finallyStack.length) this._unwindFinally(0);
    this.chunk.emit("RETURN");
  }

  stmt_Multi(node) { node.statements.forEach((s) => this.compileStmt(s)); }

  stmt_Block(node) { this.compileBlockScoped(node); }

  stmt_Break() {
    if (this.loopStack.length === 0) throw new CompileError("توقف مستخدمة خارج حلقة");
    const lp = this.loopStack[this.loopStack.length - 1];
    if (this.inFinally > lp.inFinally) throw new CompileError("لا يخرج توقف/أكمل من كتلة «أخيرًا» إلى حلقة خارجها");
    this._unwindFinally(lp.tryDepth);
    const addr = this.chunk.emit("JUMP", -1);
    lp.breakAddrs.push(addr);
  }

  stmt_Continue() {
    if (this.loopStack.length === 0) throw new CompileError("أكمل مستخدمة خارج حلقة");
    const lp = this.loopStack[this.loopStack.length - 1];
    if (this.inFinally > lp.inFinally) throw new CompileError("لا يخرج توقف/أكمل من كتلة «أخيرًا» إلى حلقة خارجها");
    this._unwindFinally(lp.tryDepth);
    const addr = this.chunk.emit("JUMP", -1);
    lp.continueAddrs.push(addr);
  }

  compileBlockScoped(block) {
    if (!this.isTopLevel) this.current.pushScope();
    block.statements.forEach((s) => this.compileStmt(s));
    if (!this.isTopLevel) this.current.popScope();
  }

  // ---------- مساعدات تحميل/تخزين متغيّر عام أو محلي ----------
  emitLoad(ref) {
    if (ref.global !== undefined) this.chunk.emit("GET_GLOBAL", ref.global);
    else this.chunk.emit("GET_LOCAL", ref.local);
  }
  emitStore(ref) {
    if (ref.global !== undefined) this.chunk.emit("SET_GLOBAL_NEW", ref.global);
    else this.chunk.emit("SET_LOCAL", ref.local);
  }

  // ---------- التعابير ----------
  compileExpr(node) {
    const m = this["expr_" + node.kind];
    if (!m) throw new CompileError(`لا يمكن تصريف التعبير: ${node.kind}`);
    m.call(this, node);
  }

  expr_Number(node) { this.chunk.emit("CONST", this.chunk.addConstant(node.value)); }
  expr_String(node) { this.chunk.emit("CONST", this.chunk.addConstant(node.value)); }
  expr_Boolean(node) { this.chunk.emit("CONST", this.chunk.addConstant(node.value)); }
  expr_Null() { this.chunk.emit("CONST", this.chunk.addConstant(null)); }

  expr_ListLiteral(node) {
    node.elements.forEach((e) => this.compileExpr(e));
    this.chunk.emit("MAKE_LIST", node.elements.length);
  }

  expr_MapLiteral(node) {
    node.entries.forEach((e) => { this.compileExpr(e.key); this.compileExpr(e.value); });
    this.chunk.emit("MAKE_MAP", node.entries.length);
  }

  // يبحث عن الاسم في الدوال المحيطة (غير الرئيسي): يُرجع {up, slot} أو null
  resolveUp(name) {
    for (let d = 1; d < this.stack.length - 1; d++) {
      const sc = this.stack[this.stack.length - 1 - d];
      const slot = sc.resolve(name);
      if (slot !== -1) return { up: d, slot };
    }
    return null;
  }

  expr_Identifier(node) {
    if (!this.isTopLevel) {
      const slot = this.current.resolve(node.name);
      if (slot !== -1) { this.chunk.emit("GET_LOCAL", slot); return; }
      const up = this.resolveUp(node.name);
      if (up) { this.chunk.emit("GET_UP", up.up, up.slot); return; }
    }
    this.chunk.emit("GET_GLOBAL", node.name);
  }

  expr_Assign(node) {
    if (node.target.kind === "Identifier") {
      this.compileExpr(node.expr);
      if (!this.isTopLevel) {
        const slot = this.current.resolve(node.target.name);
        if (slot !== -1) { this.chunk.emit("SET_LOCAL", slot); return; }
        const up = this.resolveUp(node.target.name);
        if (up) { this.chunk.emit("SET_UP", up.up, up.slot); return; }
      }
      this.chunk.emit("SET_GLOBAL", node.target.name);
    } else if (node.target.kind === "Index") {
      this.compileExpr(node.expr);
      this.compileExpr(node.target.obj);
      this.compileExpr(node.target.index);
      this.chunk.emit("INDEX_SET");
    }
  }

  expr_Index(node) {
    this.compileExpr(node.obj);
    this.compileExpr(node.index);
    this.chunk.emit("INDEX_GET");
  }

  expr_UnaryOp(node) {
    this.compileExpr(node.expr);
    if (node.op === "ليس") this.chunk.emit("NOT");
    else if (node.op === "-") this.chunk.emit("NEG");
  }

  expr_BinOp(node) {
    if (node.op === "و") {
      this.compileExpr(node.left);
      const jFalse = this.chunk.emit("JUMP_IF_FALSE", -1); // لا يُزال القيمة (لتقصير الدائرة)
      this.chunk.emit("POP");
      this.compileExpr(node.right);
      this.chunk.patch(jFalse, [this.chunk.here()]);
      return;
    }
    if (node.op === "أو") {
      this.compileExpr(node.left);
      const jFalse = this.chunk.emit("JUMP_IF_FALSE", -1);
      const jEnd = this.chunk.emit("JUMP", -1);
      this.chunk.patch(jFalse, [this.chunk.here()]);
      this.chunk.emit("POP");
      this.compileExpr(node.right);
      this.chunk.patch(jEnd, [this.chunk.here()]);
      return;
    }
    this.compileExpr(node.left);
    this.compileExpr(node.right);
    const map = {
      PLUS: "ADD", MINUS: "SUB", STAR: "MUL", SLASH: "DIV", PERCENT: "MOD",
      EQ: "EQ", NEQ: "NEQ", LT: "LT", GT: "GT", LTE: "LTE", GTE: "GTE",
    };
    const op = map[node.op];
    if (!op) throw new CompileError(`عملية غير مدعومة في المُصرّف: ${node.op}`);
    this.chunk.emit(op);
  }

  expr_Call(node) {
    this.compileExpr(node.callee);
    node.args.forEach((a) => this.compileExpr(a));
    this.chunk.emit("CALL", node.args.length);
  }
}

function compile(program) {
  return new Compiler().compileProgram(program);
}

if (typeof module !== "undefined") {
  module.exports = { compile, Compiler, FunctionChunk, CompileError };
}
