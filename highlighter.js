// كلمات سياقية: تعمل كمفاتيح داخل صيغ معيّنة وتبقى أسماء صالحة في غيرها
const SOFT_KEYWORDS = new Set(["في", "صنف", "يرث", "هذا", "الأب", "صدّر", "حاول", "التقط", "أخيرًا", "أخيرا", "غير_متزامنة", "انتظر"]);
function escapeHtml(s) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function highlightToHTML(src) {
  const BUILTINS = new Set(["اطبع", "طول", "أضف", "نص", "عدد", "احفظ_ملف", "نص_برمجي", "مفاتيح", "قيم", "احذف", "طبّق", "رشّح", "اختصر", "كرّر", "استورد", "رمز", "حرف", "نوع", "أطلق_خطأ", "ادخل", "مجموعة", "اتحاد", "تقاطع", "فرق", "جزء_من", "إلى_قائمة", "أزواج", "نم", "وعد_جاهز", "كل_الوعود", "أول_وعد"]);
  let i = 0;
  const n = src.length;
  const out = [];

  function push(text, cls) {
    if (text === "") return;
    const esc = escapeHtml(text);
    out.push(cls ? `<span class="${cls}">${esc}</span>` : esc);
  }

  while (i < n) {
    const ch = src[i];

    if (ch === "\n") { push("\n", null); i++; continue; }
    if (ch === " " || ch === "\t" || ch === "\r") { push(ch, null); i++; continue; }

    if (ch === "/" && src[i + 1] === "*") {
      const start = i; i += 2;
      while (i < n && !(src[i] === "*" && src[i + 1] === "/")) i++;
      i = Math.min(n, i + 2);
      push(src.slice(start, i), "tok-comment");
      continue;
    }

    if (ch === "#") {
      const start = i;
      while (i < n && src[i] !== "\n") i++;
      push(src.slice(start, i), "tok-comment");
      continue;
    }

    if (isDigitChar(ch)) {
      const start = i;
      if (src[i] === "0" && /[xXbBoO]/.test(src[i + 1] || "")) { i += 2; while (i < n && (/[0-9a-fA-F_]/.test(src[i]))) i++; }
      else {
        while (i < n && (isDigitChar(src[i]) || src[i] === "." || src[i] === "_")) i++;
        if (/[eE]/.test(src[i] || "") && (isDigitChar(src[i + 1] || "") || (/[+-]/.test(src[i + 1] || "") && isDigitChar(src[i + 2] || "")))) { i += 2; while (i < n && isDigitChar(src[i])) i++; }
      }
      push(src.slice(start, i), "tok-number");
      continue;
    }

    if (ch === '"' || ch === "'") {
      const quote = ch;
      const start = i;
      i++;
      while (i < n && src[i] !== quote) {
        if (src[i] === "\\" && i + 1 < n) i += 2; else i++;
      }
      if (i < n) i++;
      push(src.slice(start, i), "tok-string");
      continue;
    }

    if (isIdentStart(ch)) {
      const start = i;
      while (i < n && isIdentPart(src[i])) i++;
      const word = src.slice(start, i);
      if (KEYWORDS[word] || SOFT_KEYWORDS.has(word)) push(word, "tok-keyword");
      else if (BUILTINS.has(word)) push(word, "tok-builtin");
      else push(word, "tok-ident");
      continue;
    }

    if ("(){}[]".includes(ch)) { push(ch, "tok-bracket"); i++; continue; }
    if ("+-*/%=<>!.:;,،".includes(ch)) { push(ch, "tok-op"); i++; continue; }

    push(ch, null);
    i++;
  }

  return out.join("") + "\n";
}
