// ========================= المحلل الرمزي (Lexer) =========================
const KEYWORDS = {
  "دالة": "FUNC", "ارجع": "RETURN", "إذا": "IF", "وإلا": "ELSE",
  "طالما": "WHILE", "من_أجل": "FOR", "من": "FROM", "إلى": "TO",
  "متغير": "VAR", "صحيح": "TRUE", "خطأ": "FALSE", "لاشيء": "NULL",
  "و": "AND", "أو": "OR", "ليس": "NOT", "توقف": "BREAK", "أكمل": "CONTINUE",
};

const SINGLE_CHAR = {
  "(": "LPAREN", ")": "RPAREN", "{": "LBRACE", "}": "RBRACE",
  "[": "LBRACKET", "]": "RBRACKET", ",": "COMMA", "،": "COMMA", ";": "SEMI", ":": "COLON",
  "+": "PLUS", "-": "MINUS", "*": "STAR", "/": "SLASH", "%": "PERCENT",
  "&": "BITAND", "|": "BITOR", "^": "BITXOR", "~": "BITNOT", "?": "QMARK",
};

class LexError extends Error {}

// دعم الأرقام العربية (الهندية) ٠١٢٣٤٥٦٧٨٩ بجانب الأرقام اللاتينية 0-9
// حتى يمكن كتابة الكود بالكامل بدون أي رمز لاتيني إن أراد المستخدم ذلك
// (تُبنى التعابير النمطية من أرقام الرموز كي لا تحوي الشيفرة تسلسلات الهروب المباشرة)
const _rng = (a, b) => String.fromCharCode(a) + "-" + String.fromCharCode(b);
const DIGIT_RE = new RegExp("[0-9" + _rng(0x660, 0x669) + _rng(0x6F0, 0x6F9) + "]");
const DIGIT_RE_G = new RegExp(DIGIT_RE.source, "g");
const IDENT_START_RE = new RegExp("[A-Za-z_" + _rng(0x600, 0x6FF) + "]");
function isDigitChar(ch) {
  return DIGIT_RE.test(ch);
}
function normalizeDigits(str) {
  return str.replace(DIGIT_RE_G, (ch) => {
    const code = ch.codePointAt(0);
    if (code >= 0x0660 && code <= 0x0669) return String(code - 0x0660);
    if (code >= 0x06F0 && code <= 0x06F9) return String(code - 0x06F0);
    return ch;
  });
}
function toArabicIndicDigits(str) {
  return String(str).replace(/[0-9]/g, (d) => "٠١٢٣٤٥٦٧٨٩"[Number(d)]);
}

// علامات ترقيم عربية يجب ألا تُعامَل كجزء من المعرّفات رغم وقوعها ضمن نطاق الأحرف العربية
const ARABIC_PUNCTUATION = new Set(["،", "؛", "؟", "٪", "٫", "٬", "۔"]);

function isIdentStart(ch) {
  if (ARABIC_PUNCTUATION.has(ch)) return false;
  return IDENT_START_RE.test(ch);
}
function isIdentPart(ch) {
  return isIdentStart(ch) || /[0-9]/.test(ch);
}

function tokenize(src) {
  const tokens = [];
  let i = 0, line = 1;
  const n = src.length;

  function readString(template) {
      const quote = src[i];
      i++;
      let buf = "";
      const pieces = []; // للقالب: نص أو {expr: رموز}
      while (i < n && src[i] !== quote) {
        if (template && src[i] === "{") { // تعبير داخل قالب: يُرمَّز بشكل متداخل
          let j = i + 1, depth = 1;
          while (j < n && depth > 0) {
            const c = src[j];
            if (c === '"' || c === "'") { j++; while (j < n && src[j] !== c) { if (src[j] === "\\") j++; j++; } }
            else if (c === "{") depth++;
            else if (c === "}") depth--;
            j++;
          }
          if (depth > 0) throw new LexError(`السطر ${line}: تعبير القالب غير مغلق (نسيت })`);
          const exprSrc = src.slice(i + 1, j - 1);
          if (exprSrc.trim() === "") throw new LexError(`السطر ${line}: تعبير فارغ داخل القالب {}`);
          let inner;
          try { inner = tokenize(exprSrc); } catch (e) { if (e instanceof LexError) throw new LexError(`السطر ${line}: في تعبير القالب: ${e.message}`); throw e; }
          inner.pop(); // EOF
          if (buf !== "") pieces.push(buf);
          buf = "";
          pieces.push({ expr: inner.map(t => ({ ...t, line })) });
          i = j;
          continue;
        }
        if (src[i] === "\\" && i + 1 < n) {
          const nxt = src[i + 1];
          if (nxt === "x" || nxt === "u") { // \xHH و\uHHHH و\u{H…}
            const isHex = (c) => c !== undefined && /[0-9a-fA-F]/.test(c);
            let j = i + 2, hex = "";
            if (nxt === "u" && src[j] === "{") {
              j++;
              while (j < n && isHex(src[j])) { hex += src[j]; j++; }
              if (src[j] !== "}" || hex.length === 0 || hex.length > 6) throw new LexError(`السطر ${line}: تسلسل هروب غير صالح (\\u{…} يحتاج من ١ إلى ٦ أرقام سداسية ثم })`);
              j++;
            } else {
              const need = nxt === "x" ? 2 : 4;
              while (hex.length < need && isHex(src[j])) { hex += src[j]; j++; }
              if (hex.length < need) throw new LexError(`السطر ${line}: تسلسل هروب غير صالح (\\${nxt} يحتاج ${nxt === "x" ? "رقمين" : "أربعة أرقام"} سداسية عشرية)`);
            }
            const cp = parseInt(hex, 16);
            if (cp > 0x10FFFF) throw new LexError(`السطر ${line}: تسلسل هروب غير صالح (القيمة خارج النطاق 10FFFF)`);
            buf += String.fromCodePoint(cp);
            i = j;
            continue;
          }
          const esc = { n: "\n", t: "\t", r: "\r", "0": "\0", "\\": "\\", '"': '"', "'": "'" }[nxt];
          buf += esc !== undefined ? esc : nxt;
          i += 2;
        } else {
          buf += src[i]; i++;
        }
      }
      if (i >= n) throw new LexError(`السطر ${line}: نص غير مغلق (نسيت علامة الاقتباس)`);
      i++;
      if (!template || pieces.length === 0) { tokens.push({ type: "STRING", value: buf, line }); return; }
      if (buf !== "") pieces.push(buf);
      tokens.push({ type: "LPAREN", value: "(", line });
      pieces.forEach((pc, k) => {
        if (k > 0) tokens.push({ type: "PLUS", value: "+", line });
        if (typeof pc === "string") tokens.push({ type: "STRING", value: pc, line });
        else { tokens.push({ type: "IDENT", value: "@قالب", line }, { type: "LPAREN", value: "(", line }, ...pc.expr, { type: "RPAREN", value: ")", line }); }
      });
      tokens.push({ type: "RPAREN", value: ")", line });
  }

  while (i < n) {
    const ch = src[i];

    if (ch === "\n") { line++; i++; continue; }
    if (ch === " " || ch === "\t" || ch === "\r") { i++; continue; }
    if (ch === "#") { while (i < n && src[i] !== "\n") i++; continue; }
    if (ch === "/" && src[i + 1] === "*") { // تعليق كتلة /* … */ (لا يتداخل)
      const startLine = line; i += 2;
      while (i < n && !(src[i] === "*" && src[i + 1] === "/")) { if (src[i] === "\n") line++; i++; }
      if (i >= n) throw new LexError(`السطر ${startLine}: تعليق كتلة غير مغلق (نسيت */)`);
      i += 2; continue;
    }

    if (isDigitChar(ch)) {
      const start = i;
      const radixCh = (src[i] === "0" && i + 1 < n) ? src[i + 1].toLowerCase() : "";
      const radix = radixCh === "x" ? 16 : radixCh === "b" ? 2 : radixCh === "o" ? 8 : 0;
      if (radix) { // سداسي عشري 0x وثنائي 0b وثماني 0o (الفاصل _ بين رقمين)
        const digitVal = (c) => { const d = isDigitChar(c) ? Number(normalizeDigits(c)) : (/[a-fA-F]/.test(c) ? c.toLowerCase().charCodeAt(0) - 87 : -1); return d >= 0 && d < radix ? d : -1; };
        i += 2;
        let v = 0, count = 0, prevUnderscore = false;
        while (i < n && (digitVal(src[i]) >= 0 || src[i] === "_")) {
          if (src[i] === "_") {
            if (count === 0 || prevUnderscore) throw new LexError(`السطر ${line}: الفاصل _ في الرقم يجب أن يقع بين رقمين`);
            prevUnderscore = true;
          } else { v = v * radix + digitVal(src[i]); count++; prevUnderscore = false; }
          i++;
        }
        if (count === 0) throw new LexError(`السطر ${line}: رقم بالأساس ${radix} بلا أرقام بعد ${src.slice(start, i)}`);
        if (prevUnderscore) throw new LexError(`السطر ${line}: الفاصل _ في الرقم يجب أن يقع بين رقمين`);
        tokens.push({ type: "NUMBER", value: String(v), line });
        continue;
      }
      while (i < n && (isDigitChar(src[i]) || src[i] === "." || src[i] === "٫" || src[i] === "_")) i++;
      if (i < n && (src[i] === "e" || src[i] === "E")) { // الأس العلمي: e أو E ثم +/- اختياري ثم أرقام
        let j = i + 1;
        if (j < n && (src[j] === "+" || src[j] === "-")) j++;
        if (j < n && isDigitChar(src[j])) { while (j < n && isDigitChar(src[j])) j++; i = j; }
      }
      const raw = src.slice(start, i);
      if (/(^|[^0-9٠-٩۰-۹])_|_($|[^0-9٠-٩۰-۹])|__/.test(raw)) throw new LexError(`السطر ${line}: الفاصل _ في الرقم يجب أن يقع بين رقمين`);
      tokens.push({ type: "NUMBER", value: normalizeDigits(raw.replace(/٫/g, ".").replace(/_/g, "")), line });
      continue;
    }

    if (ch === '"' || ch === "'") { readString(false); continue; }

    if (isIdentStart(ch)) {
      const start = i;
      while (i < n && isIdentPart(src[i])) i++;
      const word = src.slice(start, i);
      if (word === "خام" && (src[i] === '"' || src[i] === "'")) { // نص خام: بلا هروب، ينتهي عند أول اقتباس مطابق
        const q = src[i]; i++;
        const s0 = i;
        while (i < n && src[i] !== q) i++;
        if (i >= n) throw new LexError(`السطر ${line}: نص غير مغلق (نسيت علامة الاقتباس)`);
        tokens.push({ type: "STRING", value: src.slice(s0, i), line });
        i++;
        continue;
      }
      if (word === "قالب" && (src[i] === '"' || src[i] === "'")) { readString(true); continue; } // قالب نصي بتعابير {…}
      const ttype = KEYWORDS[word] || "IDENT";
      tokens.push({ type: ttype, value: word, line });
      continue;
    }

    const two = src.slice(i, i + 2);
    const twoMap = { "==": "EQ", "!=": "NEQ", "<=": "LTE", ">=": "GTE", "&&": "AND", "||": "OR", "+=": "PLUSEQ", "-=": "MINUSEQ", "*=": "STAREQ", "/=": "SLASHEQ", "%=": "PERCENTEQ", "++": "PLUSPLUS", "--": "MINUSMINUS", "**": "POW", "//": "FLOORDIV", "<<": "SHL", ">>": "SHR", "??": "QQ" };
    if (two === "?." && !isDigitChar(src[i + 2] || "")) { tokens.push({ type: "QDOT", value: "?.", line }); i += 2; continue; } // ?. إلا إذا تلاها رقم (شرط ثلاثي: س ?.٥ : ١)
    if (twoMap[two]) { tokens.push({ type: twoMap[two], value: two, line }); i += 2; continue; }

    if (ch === "=") { tokens.push({ type: "ASSIGN", value: "=", line }); i++; continue; }
    if (ch === "<") { tokens.push({ type: "LT", value: "<", line }); i++; continue; }
    if (ch === ">") { tokens.push({ type: "GT", value: ">", line }); i++; continue; }
    if (ch === "!") { tokens.push({ type: "NOT", value: "!", line }); i++; continue; }
    if (ch === ".") { tokens.push({ type: "DOT", value: ".", line }); i++; continue; }

    if (SINGLE_CHAR[ch]) { tokens.push({ type: SINGLE_CHAR[ch], value: ch, line }); i++; continue; }

    throw new LexError(`السطر ${line}: رمز غير معروف «${ch}»`);
  }

  tokens.push({ type: "EOF", value: null, line });
  return tokens;
}

// ========================= المحلل النحوي (Parser) =========================
class ParseError extends Error {}

// أسماء عربية لأنواع الرموز تظهر في رسائل الخطأ بدل الأسماء الإنجليزية الداخلية
const TOKEN_AR = {
  LPAREN: "«(»", RPAREN: "«)»", LBRACE: "«{»", RBRACE: "«}»", LBRACKET: "«[»", RBRACKET: "«]»",
  COMMA: "«،»", SEMI: "«;»", COLON: "«:»", ASSIGN: "«=»", PLUS: "«+»", MINUS: "«-»", STAR: "«*»",
  SLASH: "«/»", PERCENT: "«%»", EQ: "«==»", NEQ: "«!=»", LT: "«<»", GT: "«>»", LTE: "«<=»", GTE: "«>=»",
  POW: "«**»", FLOORDIV: "«//»", SHL: "«<<»", SHR: "«>>»", BITAND: "«&»", BITOR: "«|»", BITXOR: "«^»", BITNOT: "«~»", QMARK: "«?»", QQ: "«??»", QDOT: "«?.»",
  DOT: "«.»", NOT: "«!»", IDENT: "اسم (متغير أو دالة)", NUMBER: "رقم", STRING: "نص", EOF: "نهاية الكود",
  FUNC: "«دالة»", RETURN: "«ارجع»", IF: "«إذا»", ELSE: "«وإلا»", WHILE: "«طالما»", FOR: "«من_أجل»",
  FROM: "«من»", TO: "«إلى»", VAR: "«متغير»", TRUE: "«صحيح»", FALSE: "«خطأ»", NULL: "«لاشيء»",
  AND: "«و»", OR: "«أو»", BREAK: "«توقف»", CONTINUE: "«أكمل»",
};
function tokAr(tok) {
  if (tok.type === "EOF") return "نهاية الكود (ربما نسيت إغلاق قوس)";
  if (tok.type === "IDENT" || tok.type === "NUMBER") return (TOKEN_AR[tok.type] || tok.type) + " «" + tok.value + "»";
  if (tok.type === "STRING") return "نص";
  return TOKEN_AR[tok.type] || ("«" + tok.value + "»");
}

class Parser {
  constructor(tokens) { this.tokens = tokens; this.pos = 0; this.depth = 0; }
  peek() { return this.tokens[this.pos]; }
  advance() { const t = this.tokens[this.pos]; if (t.type !== "EOF") this.pos++; return t; }
  check(t) { return this.peek().type === t; }
  match(...types) { if (types.includes(this.peek().type)) return this.advance(); return null; }
  expect(ttype, msg) {
    if (this.check(ttype)) return this.advance();
    const tok = this.peek();
    throw new ParseError(msg || `السطر ${tok.line}: كنت أنتظر ${TOKEN_AR[ttype] || ttype} لكن وجدت ${tokAr(tok)}`);
  }

  parseProgram() {
    const statements = [];
    while (!this.check("EOF")) statements.push(this.statement());
    return { kind: "Program", statements };
  }

  statement() {
    const line = this.peek().line;
    const st = this._statement();
    if (st && st.line === undefined) st.line = line;
    return st;
  }

  // «غير_متزامنة» قبل «دالة»: كلمة تعمل كلمةً مفتاحية في موضعها فقط
  isAsyncMod() { return this.check("IDENT") && this.peek().value === "غير_متزامنة" && this.tokens[this.pos + 1].type === "FUNC"; }

  _statement() {
    if (this.isAsyncMod() && this.tokens[this.pos + 2] && this.tokens[this.pos + 2].type === "IDENT") {
      this.advance();
      const fn = this.funcDecl(); fn.isAsync = true; return fn;
    }
    if (this.check("FUNC") && this.tokens[this.pos + 1].type === "IDENT") return this.funcDecl();
    if (this.check("IDENT") && this.peek().value === "حاول" && this.tokens[this.pos + 1].type === "LBRACE") return this.tryStmt();
    if (this.check("IDENT") && this.peek().value === "صنف" && this.tokens[this.pos + 1].type === "IDENT" &&
        (this.tokens[this.pos + 2].type === "LBRACE" || (this.tokens[this.pos + 2].type === "IDENT" && this.tokens[this.pos + 2].value === "يرث"))) return this.classStmt();
    if (this.check("IDENT") && (this.peek().value === "صدّر" || this.peek().value === "صدر") && this.exportable()) return this.exportStmt();
    if (this.check("IF")) return this.ifStmt();
    if (this.check("WHILE")) return this.whileStmt();
    if (this.check("FOR")) return this.forStmt();
    if (this.check("RETURN")) return this.returnStmt();
    if (this.check("VAR")) return this.varDecl();
    if (this.isConstDecl()) return this.varDecl(true);
    if (this.check("LBRACE")) return this.block();
    if (this.check("BREAK")) { this.advance(); this.match("SEMI"); return { kind: "Break" }; }
    if (this.check("CONTINUE")) { this.advance(); this.match("SEMI"); return { kind: "Continue" }; }
    return this.exprStmt();
  }

  // صدّر دالة/متغير/صنف: تُعلِن أن هذا الاسم يظهر لمن يستورد الملف. تعمل كلمةً مفتاحية فقط حين يليها دالة أو متغير أو صنف.
  exportable() {
    const nx = this.tokens[this.pos + 1], n2 = this.tokens[this.pos + 2];
    if (!nx) return false;
    if (nx.type === "FUNC") return !!n2 && n2.type === "IDENT";
    if (nx.type === "IDENT" && nx.value === "غير_متزامنة" && !!n2 && n2.type === "FUNC") return !!this.tokens[this.pos + 3] && this.tokens[this.pos + 3].type === "IDENT";
    if (nx.type === "VAR") return true;
    if (nx.type === "IDENT" && nx.value === "ثابت" && !!n2 && n2.line === nx.line && (n2.type === "IDENT" || n2.type === "LBRACKET" || n2.type === "LBRACE")) return true;
    return nx.type === "IDENT" && nx.value === "صنف" && !!n2 && n2.type === "IDENT";
  }
  exportStmt() {
    const line = this.peek().line;
    if (this.depth > 0) throw new ParseError(`السطر ${line}: «صدّر» تُكتب في المستوى الأعلى من الملف فقط، لا داخل دالة أو كتلة`);
    this.advance();                                   // صدّر
    const st = this.statement();
    const names = st.kind === "Multi" ? (st.names || [st.statements[st.statements.length - 1].name]) : [st.name];
    return { kind: "Export", names, stmt: st, line };
  }

  // صنف اسم [يرث أب] { دالة جديد(...) {...}  دالة طريقة(...) {...} }
  // يُحوَّل إلى دوال عادية: كل نسخة خريطة تحمل طرقها كإغلاقات على «هذا»، فلا تغيير في الآلة الافتراضية.
  classStmt() {
    const line = this.peek().line;
    this.advance();                                   // صنف
    const name = this.expect("IDENT").value;
    this.classes = this.classes || new Map();
    let parent = null;
    if (this.check("IDENT") && this.peek().value === "يرث") {
      this.advance();
      const pn = this.expect("IDENT").value;
      parent = this.classes.get(pn);
      if (!parent) throw new ParseError(`السطر ${line}: الصنف الأب «${pn}» غير معروف — عرّفه قبل الصنف الذي يرثه`);
      parent.name = pn;
    }
    this.expect("LBRACE");
    const methods = [];
    let ctor = null;
    while (!this.check("RBRACE") && !this.check("EOF")) {
      const asyncMethod = this.isAsyncMod();
      if (asyncMethod) this.advance();
      if (!this.check("FUNC")) throw new ParseError(`السطر ${this.peek().line}: داخل الصنف لا يُكتب إلا تعريف دوال (دالة اسم(...) { ... })`);
      const fn = this.funcDecl();
      if (asyncMethod) fn.isAsync = true;
      if (fn.name === "جديد" && fn.isAsync) throw new ParseError(`السطر ${line}: دالة «جديد» لا تكون غير_متزامنة`);
      if (fn.name === "جديد") { if (ctor) throw new ParseError(`السطر ${line}: للصنف «${name}» أكثر من دالة جديد`); ctor = fn; }
      else methods.push(fn);
    }
    this.expect("RBRACE");

    const id = (n) => ({ kind: "Identifier", name: n });
    const str = (v) => ({ kind: "String", value: v });
    const call = (f, args) => ({ kind: "Call", callee: typeof f === "string" ? id(f) : f, args });
    const stmt = (e) => ({ kind: "ExprStmt", expr: e });
    const THIS = "هذا";
    const ctorParams = ctor ? ctor.params : (parent ? parent.ctorParams : []);

    // الطرق: تثبّت طرق الأب أولًا ثم طرق هذا الصنف فتتغلّب عليها
    const mBody = [];
    if (parent) mBody.push(stmt(call("@طرق_" + parent.name, [id(THIS)])));
    for (const m of methods) {
      mBody.push(m);
      mBody.push(stmt({ kind: "Assign", target: { kind: "Index", obj: id(THIS), index: str(m.name) }, expr: id(m.name) }));
    }
    const methodsFn = { kind: "FuncDecl", name: "@طرق_" + name, params: [THIS], body: { kind: "Block", statements: mBody } };

    // المُنشئ: «الأب(...)» داخل جديد تستدعي مُنشئ الأب على الكائن نفسه
    const cBody = [];
    if (parent) {
      cBody.push({ kind: "VarDecl", name: "الأب", expr: { kind: "FuncExpr", params: parent.ctorParams,
        body: { kind: "Block", statements: [stmt(call("@بناء_" + parent.name, [id(THIS)].concat(parent.ctorParams.map(id))))] } } });
    }
    if (ctor) cBody.push(...ctor.body.statements);
    else if (parent) cBody.push(stmt(call("الأب", ctorParams.map(id))));
    const ctorFn = { kind: "FuncDecl", name: "@بناء_" + name, params: [THIS].concat(ctorParams), body: { kind: "Block", statements: cBody } };

    // الدالة العامة: اسم_الصنف(...) تُنشئ كائنًا جديدًا
    const mk = { kind: "FuncDecl", name, params: ctorParams, body: { kind: "Block", statements: [
      { kind: "VarDecl", name: THIS, expr: { kind: "MapLiteral", entries: [] } },
      stmt(call("@طرق_" + name, [id(THIS)])),
      stmt(call("@بناء_" + name, [id(THIS)].concat(ctorParams.map(id)))),
      { kind: "Return", expr: id(THIS) },
    ] } };
    this.classes.set(name, { ctorParams });
    return { kind: "Multi", statements: [methodsFn, ctorFn, mk], line };
  }

  block() {
    this.expect("LBRACE");
    const stmts = [];
    this.depth++;
    while (!this.check("RBRACE") && !this.check("EOF")) stmts.push(this.statement());
    this.depth--;
    this.expect("RBRACE");
    return { kind: "Block", statements: stmts };
  }

  // قائمة المعاملات بعد «(» وحتى «)»، مع قيم افتراضية اختيارية: دالة س(أ، ب = ٥)
  paramList() {
    const params = [], defaults = [];
    if (!this.check("RPAREN")) {
      do {
        const name = this.expect("IDENT").value;
        params.push(name);
        if (this.match("ASSIGN")) defaults.push({ name, expr: this.ternary() });
        else if (defaults.length) throw new ParseError(`السطر ${this.peek().line}: بعد معامل له قيمة افتراضية يجب أن تكون بقية المعاملات كذلك`);
      } while (this.match("COMMA"));
    }
    this.expect("RPAREN");
    return { params, defaults };
  }
  withDefaults(body, defaults) {
    if (!defaults.length) return body;
    const pre = defaults.map((d) => ({ kind: "If",
      cond: { kind: "BinOp", op: "EQ", left: { kind: "Identifier", name: d.name }, right: { kind: "Null" } },
      thenBlock: { kind: "Block", statements: [{ kind: "ExprStmt", expr: { kind: "Assign", target: { kind: "Identifier", name: d.name }, expr: d.expr } }] },
      elseBlock: null }));
    return { kind: "Block", statements: pre.concat(body.statements) };
  }

  funcDecl() {
    this.expect("FUNC");
    const name = this.expect("IDENT").value;
    this.expect("LPAREN");
    const { params, defaults } = this.paramList();
    const body = this.withDefaults(this.block(), defaults);
    return { kind: "FuncDecl", name, params, body };
  }

  tryStmt() {
    this.advance(); // حاول
    const tryBlock = this.block();
    let errName = null, catchBlock = null, finallyBlock = null;
    const isWord = (w) => this.check("IDENT") && (this.peek().value === w || (w === "أخيرًا" && (this.peek().value === "أخيرا" || this.peek().value === "أخيراً")));
    if (isWord("التقط")) {
      this.advance();
      if (this.match("LPAREN")) { errName = this.expect("IDENT").value; this.expect("RPAREN"); }
      catchBlock = this.block();
    }
    if (isWord("أخيرًا")) { this.advance(); finallyBlock = this.block(); }
    if (!catchBlock && !finallyBlock) {
      const tok = this.peek();
      throw new ParseError(`السطر ${tok.line}: بعد كتلة «حاول» يجب أن تأتي «التقط { … }» أو «أخيرًا { … }»`);
    }
    return { kind: "Try", tryBlock, errName, catchBlock, finallyBlock };
  }

  ifStmt() {
    this.expect("IF"); this.expect("LPAREN");
    const cond = this.expression();
    this.expect("RPAREN");
    const thenBlock = this.block();
    let elseBlock = null;
    if (this.match("ELSE")) {
      if (this.check("IF")) elseBlock = { kind: "Block", statements: [this.ifStmt()] };
      else elseBlock = this.block();
    }
    return { kind: "If", cond, thenBlock, elseBlock };
  }

  whileStmt() {
    this.expect("WHILE"); this.expect("LPAREN");
    const cond = this.expression();
    this.expect("RPAREN");
    const body = this.block();
    return { kind: "While", cond, body };
  }

  forStmt() {
    this.expect("FOR"); this.expect("LPAREN");
    let varName, pat = null;
    if (this.check("LBRACKET") || this.check("LBRACE")) { pat = this.pattern(); this.destructN = (this.destructN || 0) + 1; varName = "@عنصر_حلقة_" + this.destructN; }
    else varName = this.expect("IDENT").value;
    if (this.check("IDENT") && this.peek().value === "في") {
      this.advance();
      const iter = this.expression();
      this.expect("RPAREN");
      const body = this.block();
      if (pat) body.statements.unshift(this.destructure(pat, { kind: "Identifier", name: varName }, this.peek().line));
      return { kind: "ForIn", varName, iter, body };
    }
    if (pat) throw new ParseError(`السطر ${this.peek().line}: التفكيك في الحلقة يعمل مع «في» فقط: من_أجل ([أ، ب] في قائمة)`);
    this.expect("FROM");
    const start = this.expression();
    this.expect("TO");
    const end = this.expression();
    let step = null;
    if (this.check("IDENT") && this.peek().value === "بخطوة") { this.advance(); step = this.expression(); }
    this.expect("RPAREN");
    const body = this.block();
    return { kind: "For", varName, start, end, step, body };
  }

  returnStmt() {
    this.expect("RETURN");
    let expr = null;
    if (!this.check("SEMI") && !this.check("RBRACE")) expr = this.expression();
    this.match("SEMI");
    return { kind: "Return", expr };
  }

  // «ثابت» كلمة سياقية: تبدأ تعريف ثابت إن جاء بعدها على السطر نفسه اسم أو نمط تفكيك
  isConstDecl() {
    const t = this.peek(), nx = this.tokens[this.pos + 1];
    return t.type === "IDENT" && t.value === "ثابت" && !!nx && nx.line === t.line && (nx.type === "IDENT" || nx.type === "LBRACKET" || nx.type === "LBRACE");
  }
  markConst(st) {
    if (st.kind === "VarDecl") st.isConst = true;
    else if (st.kind === "Multi") for (const x of st.statements) if (x.kind === "VarDecl" && !String(x.name).startsWith("@") && (st.names ? st.names.includes(x.name) : true)) x.isConst = true;
    return st;
  }
  varDecl(isConst) {
    if (isConst) this.advance(); else this.expect("VAR");
    if (this.check("LBRACKET") || this.check("LBRACE")) {
      const line = this.peek().line;
      const pat = this.pattern();
      if (isConst && !this.check("ASSIGN")) throw new ParseError(`السطر ${line}: الثابت يحتاج قيمة ابتدائية: ثابت [أ، ب] = قيمة`);
      this.expect("ASSIGN");
      const expr = this.expression();
      this.match("SEMI");
      const d = this.destructure(pat, expr, line);
      return isConst ? this.markConst(d) : d;
    }
    const nameTok = this.expect("IDENT"), name = nameTok.value;
    if (isConst && !this.check("ASSIGN")) throw new ParseError(`السطر ${nameTok.line}: الثابت «${name}» يحتاج قيمة ابتدائية: ثابت ${name} = قيمة`);
    this.expect("ASSIGN");
    const expr = this.expression();
    this.match("SEMI");
    return isConst ? { kind: "VarDecl", name, expr, isConst: true } : { kind: "VarDecl", name, expr };
  }

  // نمط التفكيك: [أ، ب، ...الباقي] للقوائم، و{اسم، عمر: ع} للخرائط، ويجوز التداخل
  pattern() {
    const line = this.peek().line;
    if (this.match("LBRACKET")) {
      const items = []; let rest = null;
      if (!this.check("RBRACKET")) {
        do {
          if (this.check("DOT") && this.tokens[this.pos + 1].type === "DOT" && this.tokens[this.pos + 2].type === "DOT") {
            this.advance(); this.advance(); this.advance();
            rest = this.expect("IDENT").value;
            break;
          }
          items.push(this.check("LBRACKET") || this.check("LBRACE") ? this.pattern() : this.expect("IDENT").value);
        } while (this.match("COMMA"));
      }
      this.expect("RBRACKET");
      if (!items.length && !rest) throw new ParseError(`السطر ${line}: نمط التفكيك فارغ`);
      return { type: "list", items, rest };
    }
    this.expect("LBRACE");
    const entries = [];
    do {
      const key = this.expect("IDENT").value;
      let target = key;
      if (this.match("COLON")) target = this.check("LBRACKET") || this.check("LBRACE") ? this.pattern() : this.expect("IDENT").value;
      entries.push({ key, target });
    } while (this.match("COMMA"));
    this.expect("RBRACE");
    return { type: "map", entries };
  }

  // يحوّل نمط التفكيك إلى متغيرات عادية: مصدر مخفي ثم متغير لكل اسم
  destructure(pat, expr, line) {
    this.destructN = (this.destructN || 0) + 1;
    const stmts = [], names = [];
    const call = (fn, args) => ({ kind: "Call", callee: { kind: "Identifier", name: fn }, args });
    const walk = (p, srcExpr) => {
      const hidden = "@تفكيك_" + (++this.destructN);
      stmts.push({ kind: "VarDecl", name: hidden, expr: srcExpr });
      const H = { kind: "Identifier", name: hidden };
      const bind = (target, valueExpr) => {
        if (typeof target === "string") { stmts.push({ kind: "VarDecl", name: target, expr: valueExpr }); names.push(target); }
        else walk(target, valueExpr);
      };
      if (p.type === "list") {
        p.items.forEach((t, i) => bind(t, call("@عنصر", [H, { kind: "Number", value: i }])));
        if (p.rest) bind(p.rest, call("@باقي", [H, { kind: "Number", value: p.items.length }]));
      } else {
        p.entries.forEach((e) => bind(e.target, call("@عنصر", [H, { kind: "String", value: e.key }])));
      }
    };
    walk(pat, expr);
    return { kind: "Multi", statements: stmts, names, line };
  }

  exprStmt() {
    const expr = this.expression();
    this.match("SEMI");
    return { kind: "ExprStmt", expr };
  }

  expression() { return this.assignment(); }

  assignment() {
    const expr = this.ternary();
    const COMPOUND = { PLUSEQ: "PLUS", MINUSEQ: "MINUS", STAREQ: "STAR", SLASHEQ: "SLASH", PERCENTEQ: "PERCENT" };
    const ct = this.peek().type;
    if (COMPOUND[ct] || ct === "PLUSPLUS" || ct === "MINUSMINUS") {
      this.advance();
      if (expr.kind !== "Identifier" && !(expr.kind === "Index" && this.simpleTarget(expr))) {
        throw new ParseError(`السطر ${this.peek().line}: الطرف الأيسر للإسناد المركّب يجب أن يكون متغيرًا أو عنصرًا بفهرس بسيط`);
      }
      let op, value;
      if (ct === "PLUSPLUS" || ct === "MINUSMINUS") { op = ct === "PLUSPLUS" ? "PLUS" : "MINUS"; value = { kind: "Number", value: 1 }; }
      else { op = COMPOUND[ct]; value = this.assignment(); }
      return { kind: "Assign", target: expr, expr: { kind: "BinOp", op, left: expr, right: value } };
    }
    if (this.check("ASSIGN")) {
      this.advance();
      const value = this.assignment();
      if (expr.kind === "Identifier" || expr.kind === "Index") {
        return { kind: "Assign", target: expr, expr: value };
      }
      throw new ParseError("الطرف الأيسر للإسناد يجب أن يكون متغيرًا");
    }
    return expr;
  }

  // هدف الإسناد المركّب لا يحوي استدعاءً (حتى لا يُنفَّذ مرتين)
  simpleTarget(n) {
    if (n.kind === "Identifier" || n.kind === "Number" || n.kind === "String") return true;
    if (n.kind === "Index") return this.simpleTarget(n.obj) && this.simpleTarget(n.index);
    if (n.kind === "BinOp") return this.simpleTarget(n.left) && this.simpleTarget(n.right);
    if (n.kind === "UnaryOp") return this.simpleTarget(n.expr);
    return false;
  }

  // الشرط الثلاثي  ش ؟ أ : ب  (ينعقد لليمين) ودمج الفراغ  أ ?? ب  (أدنى من أو/و وأعلى من الشرط الثلاثي)
  ternary() {
    const cond = this.coalesce();
    if (this.check("QMARK")) {
      this.advance();
      const a = this.assignment();
      this.expect("COLON");
      const b = this.assignment();
      return { kind: "Cond", cond, then: a, else: b };
    }
    return cond;
  }
  coalesce() {
    let expr = this.logicOr();
    while (this.check("QQ")) { this.advance(); expr = { kind: "Coalesce", left: expr, right: this.logicOr() }; }
    return expr;
  }
  logicOr() {
    let expr = this.logicAnd();
    while (this.check("OR")) { this.advance(); expr = { kind: "BinOp", op: "أو", left: expr, right: this.logicAnd() }; }
    return expr;
  }
  logicAnd() {
    let expr = this.equality();
    while (this.check("AND")) { this.advance(); expr = { kind: "BinOp", op: "و", left: expr, right: this.equality() }; }
    return expr;
  }
  equality() {
    let expr = this.comparison();
    while (this.check("EQ") || this.check("NEQ")) {
      const op = this.advance().type;
      expr = { kind: "BinOp", op, left: expr, right: this.comparison() };
    }
    return expr;
  }
  comparison() {
    let expr = this.bitOr();
    const REL = ["LT", "GT", "LTE", "GTE"];
    while (true) {
      const tk = this.peek();
      if (REL.includes(tk.type)) { // أ < ب < ج: مقارنات متسلسلة، الأوسط يُحسب مرة واحدة
        const operands = [expr], ops = [];
        while (REL.includes(this.peek().type)) { ops.push(this.advance().type); operands.push(this.bitOr()); }
        expr = ops.length === 1 ? { kind: "BinOp", op: ops[0], left: operands[0], right: operands[1] } : { kind: "CmpChain", operands, ops };
        continue;
      }
      if (tk.type === "IDENT" && tk.value === "في") {   // س في قائمة  ==  يحوي(قائمة، س)
        this.advance();
        expr = { kind: "Call", callee: { kind: "Identifier", name: "@في" }, args: [this.bitOr(), expr] };
        continue;
      }
      const nx = this.tokens[this.pos + 1];
      if (tk.type === "NOT" && tk.value === "ليس" && nx && nx.type === "IDENT" && nx.value === "في") { // س ليس في قائمة
        this.advance(); this.advance();
        expr = { kind: "UnaryOp", op: "ليس", expr: { kind: "Call", callee: { kind: "Identifier", name: "@في" }, args: [this.bitOr(), expr] } };
        continue;
      }
      if (tk.type === "IDENT" && tk.value === "هو" && this.pos > 0 && this.tokens[this.pos - 1].line === tk.line) { // س هو "نص": فحص النوع
        this.advance();
        expr = this.bin2("@هو", expr, this.bitOr());
        continue;
      }
      break;
    }
    return expr;
  }
  // العمليات البتّية والإزاحات (أدنى من الجمع وأعلى من المقارنة كما في بايثون)؛ تُفكَّك إلى مدمجات داخلية
  bin2(name, left, right) { return { kind: "Call", callee: { kind: "Identifier", name }, args: [left, right] }; }
  bitOr() {
    let expr = this.bitXor();
    while (this.check("BITOR")) { this.advance(); expr = this.bin2("@بتّ_أو", expr, this.bitXor()); }
    return expr;
  }
  bitXor() {
    let expr = this.bitAnd();
    while (this.check("BITXOR")) { this.advance(); expr = this.bin2("@بتّ_خاص", expr, this.bitAnd()); }
    return expr;
  }
  bitAnd() {
    let expr = this.shift();
    while (this.check("BITAND")) { this.advance(); expr = this.bin2("@بتّ_و", expr, this.shift()); }
    return expr;
  }
  shift() {
    let expr = this.term();
    while (this.check("SHL") || this.check("SHR")) {
      const left = this.advance().type === "SHL";
      expr = this.bin2(left ? "@إزاحة_يسار" : "@إزاحة_يمين", expr, this.term());
    }
    return expr;
  }
  term() {
    let expr = this.factor();
    while (["PLUS", "MINUS"].includes(this.peek().type)) {
      const op = this.advance().type;
      expr = { kind: "BinOp", op, left: expr, right: this.factor() };
    }
    return expr;
  }
  factor() {
    let expr = this.unary();
    while (["STAR", "SLASH", "PERCENT", "FLOORDIV"].includes(this.peek().type)) {
      const op = this.advance().type;
      if (op === "FLOORDIV") { expr = this.bin2("@قسمة_صحيحة", expr, this.unary()); continue; }
      expr = { kind: "BinOp", op, left: expr, right: this.unary() };
    }
    return expr;
  }
  unary() {
    if (this.check("IDENT") && this.peek().value === "انتظر") {
      const nx = this.tokens[this.pos + 1];
      if (["IDENT", "NUMBER", "STRING", "LPAREN", "LBRACKET", "LBRACE", "FUNC", "NOT", "MINUS", "TRUE", "FALSE", "NULL"].includes(nx.type)) {
        const line = this.advance().line;
        return { kind: "Await", expr: this.unary(), line };
      }
    }
    if (this.check("NOT")) { this.advance(); return { kind: "UnaryOp", op: "ليس", expr: this.unary() }; }
    if (this.check("MINUS")) { this.advance(); return { kind: "UnaryOp", op: "-", expr: this.unary() }; }
    if (this.check("BITNOT")) { this.advance(); return { kind: "Call", callee: { kind: "Identifier", name: "@بتّ_نفي" }, args: [this.unary()] }; }
    return this.power();
  }
  // الأسّ ** : ينعقد لليمين ويربط أقوى من السالب الأحادي على يساره (-٢ ** ٢ = -٤) ويقبل سالبًا على يمينه (٢ ** -١)
  power() {
    const base = this.callExpr();
    if (this.check("POW")) { this.advance(); return this.bin2("@أس", base, this.unary()); }
    return base;
  }
  callExpr() {
    let expr = this.primary();
    const guards = []; // تسلسل اختياري ?. : كل حارس تعبيرٌ يُقطع التسلسل عند لاشيء فيه
    while (true) {
      if (this.check("QDOT")) {
        this.advance();
        guards.push(expr);
        const base = { kind: "ChainBase" };
        if (this.check("IDENT")) { expr = { kind: "Index", obj: base, index: { kind: "String", value: this.advance().value } }; }
        else if (this.check("LBRACKET")) { this.advance(); const idx = this.expression(); this.expect("RBRACKET"); expr = { kind: "Index", obj: base, index: idx }; }
        else if (this.check("LPAREN")) {
          this.advance(); const args = [];
          if (!this.check("RPAREN")) { args.push(this.expression()); while (this.match("COMMA")) args.push(this.expression()); }
          this.expect("RPAREN");
          expr = { kind: "Call", callee: base, args };
        } else this.expect("IDENT");
        continue;
      }
      if (this.check("LPAREN")) {
        this.advance();
        const args = [];
        if (!this.check("RPAREN")) {
          args.push(this.expression());
          while (this.match("COMMA")) args.push(this.expression());
        }
        this.expect("RPAREN");
        expr = { kind: "Call", callee: expr, args };
      } else if (this.check("DOT")) {
        this.advance();
        const nameTok = this.expect("IDENT");
        expr = { kind: "Index", obj: expr, index: { kind: "String", value: nameTok.value } };
      } else if (this.check("LBRACKET")) {
        this.advance();
        const Null = { kind: "Null" };
        if (this.check("COLON")) {            // ق[:ب]
          this.advance();
          const hi = this.check("RBRACKET") ? Null : this.expression();
          this.expect("RBRACKET");
          expr = { kind: "Call", callee: { kind: "Identifier", name: "@شريحة" }, args: [expr, Null, hi] };
          continue;
        }
        const idx = this.expression();
        if (this.check("COLON")) {            // ق[أ:ب] أو ق[أ:]
          this.advance();
          const hi = this.check("RBRACKET") ? Null : this.expression();
          this.expect("RBRACKET");
          expr = { kind: "Call", callee: { kind: "Identifier", name: "@شريحة" }, args: [expr, idx, hi] };
          continue;
        }
        this.expect("RBRACKET");
        expr = { kind: "Index", obj: expr, index: idx };
      } else break;
    }
    for (let k = guards.length - 1; k >= 0; k--) expr = { kind: "Opt", expr: guards[k], chain: expr };
    return expr;
  }
  primary() {
    if (this.isAsyncMod() && this.tokens[this.pos + 2] && this.tokens[this.pos + 2].type === "LPAREN") {
      this.advance();
      const f = this.primary(); f.isAsync = true; return f;
    }
    const tok = this.peek();
    if (tok.type === "NUMBER") { this.advance(); return { kind: "Number", value: parseFloat(tok.value) }; }
    if (tok.type === "STRING") { this.advance(); return { kind: "String", value: tok.value }; }
    if (tok.type === "TRUE") { this.advance(); return { kind: "Boolean", value: true }; }
    if (tok.type === "FALSE") { this.advance(); return { kind: "Boolean", value: false }; }
    if (tok.type === "NULL") { this.advance(); return { kind: "Null" }; }
    if (tok.type === "IDENT") { this.advance(); return { kind: "Identifier", name: tok.value }; }
    if (tok.type === "FUNC") {
      this.advance();
      this.expect("LPAREN");
      const { params, defaults } = this.paramList();
      return { kind: "FuncExpr", params, body: this.withDefaults(this.block(), defaults) };
    }
    if (tok.type === "LPAREN") { this.advance(); const e = this.expression(); this.expect("RPAREN"); return e; }
    if (tok.type === "LBRACE") {
      this.advance();
      const entries = [];
      if (!this.check("RBRACE")) {
        do {
          let key;
          if (this.check("IDENT") && this.tokens[this.pos + 1].type === "COLON") {
            key = { kind: "String", value: this.advance().value };
          } else {
            key = this.expression();
          }
          this.expect("COLON");
          entries.push({ key, value: this.expression() });
        } while (this.match("COMMA"));
      }
      this.expect("RBRACE");
      return { kind: "MapLiteral", entries };
    }
    if (tok.type === "LBRACKET") {
      this.advance();
      const elements = [];
      if (!this.check("RBRACKET")) {
        elements.push(this.expression());
        while (this.match("COMMA")) elements.push(this.expression());
      }
      this.expect("RBRACKET");
      return { kind: "ListLiteral", elements };
    }
    throw new ParseError(`السطر ${tok.line}: لم أفهم هذا الموضع — وجدت ${tokAr(tok)} حيث يُنتظر قيمة أو تعبير`);
  }
}

function parse(src) {
  const tokens = tokenize(src);
  return new Parser(tokens).parseProgram();
}

if (typeof module !== 'undefined') { module.exports = { tokenize, parse, LexError, ParseError, toArabicIndicDigits, normalizeDigits, KEYWORDS, isDigitChar, isIdentStart, isIdentPart }; }
