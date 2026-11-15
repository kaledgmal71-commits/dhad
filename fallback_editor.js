/* محرر احتياطي: يعمل تلقائيًا إذا تعذّر تحميل Monaco (شبكة محجوبة، إلخ).
   textarea حقيقي + طبقة تلوين + أرقام أسطر + إكمال تلقائي وقوالب. */
function createFallbackEditor(container) {
  const LH = 22;
  const root = document.createElement("div");
  root.className = "fb-root";
  root.innerHTML =
    '<div class="fb-code" dir="rtl">' +
    '<div class="fb-band" hidden></div>' +
    '<pre class="fb-hl" aria-hidden="true"></pre>' +
    '<textarea class="fb-ta" spellcheck="false" autocapitalize="off" autocomplete="off" wrap="off" aria-label="محرر الكود"></textarea>' +
    '<ul class="ac-list fb-ac" hidden></ul>' +
    '</div>' +
    '<div class="fb-gutter" aria-hidden="true"><div class="fb-gutter-inner"></div></div>';
  container.appendChild(root);

  const code = root.querySelector(".fb-code");
  const band = root.querySelector(".fb-band");
  const hl = root.querySelector(".fb-hl");
  const ta = root.querySelector(".fb-ta");
  const acList = root.querySelector(".fb-ac");
  const gutterInner = root.querySelector(".fb-gutter-inner");

  let errorLine = 0;
  const inputCbs = [];
  const cursorCbs = [];
  const contentCbs = [], posCbs = [], modelCbs = [];
  const curBand = document.createElement("div");
  curBand.className = "fb-cur";
  code.insertBefore(curBand, hl);
  let decos = []; // {id, line, cls, gcls, el}
  let decoSeq = 0;
  const gutterHl = new Set();

  function lineCount() { return ta.value.split("\n").length; }

  function renderGutter() {
    const n = lineCount();
    let html = "";
    for (let i = 1; i <= n; i++) {
      html += '<div class="fb-ln' + (i === errorLine ? " err" : "") + (gutterHl.has(i) ? " hl" : "") + '">' + toArabicIndicDigits(String(i)) + "</div>";
    }
    gutterInner.innerHTML = html;
  }

  function topOf(line) { return 10 + (line - 1) * LH - ta.scrollTop; }
  function positionBand() {
    if (!errorLine) band.hidden = true;
    else { band.hidden = false; band.style.top = topOf(errorLine) + "px"; }
    curBand.style.top = topOf(cursorInfo().line) + "px";
    decos.forEach((d) => { d.el.style.top = topOf(d.line) + "px"; });
  }

  function sync() {
    hl.innerHTML = highlightToHTML(ta.value);
    renderGutter();
    positionBand();
    syncScroll();
  }

  function syncScroll() {
    hl.style.transform = "translate(" + -ta.scrollLeft + "px," + -ta.scrollTop + "px)";
    gutterInner.style.transform = "translateY(" + -ta.scrollTop + "px)";
    positionBand();
  }

  function cursorInfo() {
    const before = ta.value.slice(0, ta.selectionStart);
    const lines = before.split("\n");
    return { line: lines.length, column: lines[lines.length - 1].length + 1 };
  }
  function emitCursor() {
    const c = cursorInfo(); cursorCbs.forEach((f) => f(c)); positionBand();
    posCbs.forEach((f) => f({ position: { lineNumber: c.line, column: c.column } }));
  }

  ta.addEventListener("input", () => { sync(); inputCbs.forEach((f) => f()); contentCbs.forEach((f) => f()); emitCursor(); });
  ta.addEventListener("scroll", syncScroll);
  ["keyup", "click", "focus", "mouseup"].forEach((ev) => ta.addEventListener(ev, emitCursor));

  const PAIRS = { "(": ")", "[": "]", "{": "}", '"': '"' };
  const CLOSERS = new Set([")", "]", "}", '"']);
  function lineBounds(pos) {
    const a = ta.value.lastIndexOf("\n", pos - 1) + 1; let b = ta.value.indexOf("\n", pos); if (b < 0) b = ta.value.length; return [a, b];
  }
  function replaceRange(a, b, text, selA, selB) {
    ta.focus(); ta.setSelectionRange(a, b); document.execCommand("insertText", false, text);
    if (selA !== undefined) ta.setSelectionRange(selA, selB === undefined ? selA : selB);
  }
  function blockIndent(out) {
    const s0 = ta.selectionStart, e0 = ta.selectionEnd;
    const a = lineBounds(s0)[0], b = lineBounds(e0 > s0 && ta.value[e0 - 1] === "\n" ? e0 - 1 : e0)[1];
    const lines = ta.value.slice(a, b).split("\n");
    const res = lines.map((l) => out ? l.replace(/^( {1,4}|\t)/, "") : "    " + l).join("\n");
    replaceRange(a, b, res, a, a + res.length);
  }
  function toggleComment() {
    const s0 = ta.selectionStart, e0 = ta.selectionEnd;
    const a = lineBounds(s0)[0], b = lineBounds(e0 > s0 && ta.value[e0 - 1] === "\n" ? e0 - 1 : e0)[1];
    const lines = ta.value.slice(a, b).split("\n");
    const all = lines.every((l) => /^\s*#/.test(l) || !l.trim());
    const res = lines.map((l) => !l.trim() ? l : all ? l.replace(/^(\s*)# ?/, "$1") : l.replace(/^(\s*)/, "$1# ")).join("\n");
    replaceRange(a, b, res, a, a + res.length);
  }
  function moveLines(dir) {
    const s0 = ta.selectionStart, e0 = ta.selectionEnd, v = ta.value;
    const a = lineBounds(s0)[0], b = lineBounds(e0 > s0 && v[e0 - 1] === "\n" ? e0 - 1 : e0)[1];
    if (dir < 0) {
      if (a === 0) return; const pa = lineBounds(a - 1)[0];
      const prev = v.slice(pa, a - 1), cur = v.slice(a, b);
      replaceRange(pa, b, cur + "\n" + prev, pa + (s0 - a), pa + (e0 - a));
    } else {
      if (b >= v.length) return; const nb = lineBounds(b + 1)[1];
      const cur = v.slice(a, b), next = v.slice(b + 1, nb);
      replaceRange(a, nb, next + "\n" + cur, a + next.length + 1 + (s0 - a), a + next.length + 1 + (e0 - a));
    }
  }
  ta.addEventListener("keydown", (e) => {
    const mod = e.ctrlKey || e.metaKey;
    if (!acList.hidden && (e.key === "Tab" || e.key === "Enter" || e.key === "ArrowUp" || e.key === "ArrowDown" || e.key === "Escape")) return;
    if (e.key === "Tab" && !mod) {
      e.preventDefault();
      if (ta.selectionStart !== ta.selectionEnd && /\n/.test(ta.value.slice(ta.selectionStart, ta.selectionEnd))) blockIndent(e.shiftKey);
      else if (e.shiftKey) blockIndent(true);
      else document.execCommand("insertText", false, "    ");
    } else if (e.key === "Enter" && !mod) {
      const s0 = ta.selectionStart, ls = lineBounds(s0)[0];
      const before = ta.value.slice(ls, s0), after = ta.value.slice(s0, lineBounds(s0)[1]);
      const indent = (before.match(/^[ \t]*/) || [""])[0];
      const opens = /\{\s*$/.test(before), closes = /^\s*\}/.test(after);
      e.preventDefault();
      if (opens && closes) { const at = s0; document.execCommand("insertText", false, "\n" + indent + "    \n" + indent); ta.setSelectionRange(at + 1 + indent.length + 4, at + 1 + indent.length + 4); }
      else document.execCommand("insertText", false, "\n" + indent + (opens ? "    " : ""));
    } else if (mod && (e.key === "/" || e.key === "؟")) { e.preventDefault(); toggleComment(); }
    else if (e.altKey && (e.key === "ArrowUp" || e.key === "ArrowDown")) { e.preventDefault(); moveLines(e.key === "ArrowUp" ? -1 : 1); }
    else if (mod && e.shiftKey && (e.key === "d" || e.key === "D")) { e.preventDefault(); const s0 = ta.selectionStart; const [a, b] = lineBounds(s0); replaceRange(b, b, "\n" + ta.value.slice(a, b), s0 + (b - a) + 1); }
    else if (!mod && !e.altKey && e.key.length === 1) {
      const s0 = ta.selectionStart, e0 = ta.selectionEnd, ch = e.key, nx = ta.value[s0];
      if (s0 !== e0 && PAIRS[ch]) { e.preventDefault(); const sel = ta.value.slice(s0, e0); replaceRange(s0, e0, ch + sel + PAIRS[ch], s0 + 1, e0 + 1); }
      else if (CLOSERS.has(ch) && nx === ch && s0 === e0) { e.preventDefault(); ta.setSelectionRange(s0 + 1, s0 + 1); emitCursor(); }
      else if (PAIRS[ch] && s0 === e0 && (ch !== '"' || !/[\w\u0600-\u06FF"]/.test(ta.value[s0 - 1] || "")) && (!nx || /[\s)\]}»،,;]/.test(nx))) {
        e.preventDefault(); document.execCommand("insertText", false, ch + PAIRS[ch]); ta.setSelectionRange(s0 + 1, s0 + 1);
      }
    } else if (e.key === "Backspace" && ta.selectionStart === ta.selectionEnd) {
      const s0 = ta.selectionStart, pv = ta.value[s0 - 1], nx = ta.value[s0];
      if (pv && PAIRS[pv] === nx) { e.preventDefault(); replaceRange(s0 - 1, s0 + 1, "", s0 - 1); }
    }
  });

  setupAutocomplete(ta, acList, code);
  sync();

  /* واجهة برمجية متوافقة مع ما يحتاجه المحرر الذكي (الأسطر/الأعمدة تبدأ من ١) */
  class Range { constructor(sl, sc, el, ec) { this.sl = sl; this.sc = sc; this.el = el; this.ec = ec; } }
  const offOf = (l, c) => { const ls = ta.value.split("\n"); let o = 0; for (let i = 0; i < l - 1 && i < ls.length; i++) o += ls[i].length + 1; return o + c - 1; };
  const model = {
    getValue: () => ta.value,
    getLineCount: lineCount,
    getLineMaxColumn: (l) => (ta.value.split("\n")[l - 1] || "").length + 1,
    getFullModelRange: () => { const ls = ta.value.split("\n"); return new Range(1, 1, ls.length, ls[ls.length - 1].length + 1); },
  };
  const raw = {
    getModel: () => model,
    executeEdits: (_src, ops) => {
      ops.forEach((o) => { const r = o.range; ta.setRangeText(o.text, offOf(r.sl, r.sc), offOf(r.el, r.ec), "end"); });
      sync(); inputCbs.forEach((f) => f()); contentCbs.forEach((f) => f()); emitCursor();
    },
    deltaDecorations: (oldIds, list) => {
      decos.filter((d) => oldIds.indexOf(d.id) >= 0).forEach((d) => d.el.remove());
      decos = decos.filter((d) => oldIds.indexOf(d.id) < 0);
      gutterHl.clear();
      decos.forEach((d) => { if (d.gcls) gutterHl.add(d.line); });
      const ids = list.map((x) => {
        const el = document.createElement("div"); el.className = "fb-deco " + (x.options.className || "");
        code.insertBefore(el, hl);
        const d = { id: "d" + (++decoSeq), line: x.range.sl, el, gcls: x.options.linesDecorationsClassName };
        decos.push(d); if (d.gcls) gutterHl.add(d.line); return d.id;
      });
      renderGutter(); positionBand(); return ids;
    },
    revealLineInCenterIfOutsideViewport: (n) => {
      const y = (n - 1) * LH, top = ta.scrollTop, h = ta.clientHeight;
      if (y < top || y + LH + 20 > top + h) { ta.scrollTop = Math.max(0, y - h / 2); syncScroll(); }
    },
    setPosition: (p) => { const o = offOf(p.lineNumber, p.column); ta.setSelectionRange(o, o); emitCursor(); },
    updateOptions: (o) => { if (o && "readOnly" in o) ta.readOnly = !!o.readOnly; },
    layout: () => {},
    onDidChangeCursorPosition: (f) => posCbs.push(f),
    onDidChangeModelContent: (f) => contentCbs.push(f),
    onDidChangeModel: (f) => modelCbs.push(f),
  };
  window.DhadEditorCompat = { Range };

  return {
    kind: "fallback", raw,
    getValue: () => ta.value,
    setValue: (v) => { ta.value = v; ta.setSelectionRange(0, 0); ta.scrollTop = 0; ta.scrollLeft = 0; sync(); emitCursor(); modelCbs.forEach((f) => f()); },
    onInput: (f) => inputCbs.push(f),
    onCursor: (f) => cursorCbs.push(f),
    focus: () => ta.focus(),
    revealLine: (n) => {
      const lines = ta.value.split("\n");
      let pos = 0;
      for (let i = 0; i < n - 1 && i < lines.length; i++) pos += lines[i].length + 1;
      ta.focus();
      ta.setSelectionRange(pos, pos);
      ta.scrollTop = Math.max(0, (n - 4) * LH);
      syncScroll();
      emitCursor();
    },
    setErrorLine: (n) => { errorLine = n || 0; renderGutter(); positionBand(); },
    undo: () => { ta.focus(); document.execCommand("undo"); },
    redo: () => { ta.focus(); document.execCommand("redo"); },
    selectAll: () => { ta.focus(); ta.select(); },
    show: (v) => { root.style.display = v ? "" : "none"; },
    insertAtCursor: (t) => { ta.focus(); document.execCommand("insertText", false, t); },
  };
}
