// خانة التوليد في نواة: نموذج مفتوح الأوزان مؤقتًا إلى حين اكتمال نموذج نواة الخاص.
// يعمل في متصفح المستخدم على WebGPU، يُنزَّل مرة ويُحفظ؛ لا مفاتيح ولا خوادم خارجية.
(function (root) {
  var LS = 'nawa.llm', WEBLLM = 'https://cdn.jsdelivr.net/npm/@mlc-ai/web-llm@0.2.79/+esm';
  var LOCAL = { light: { id: 'Qwen3-1.7B-q4f16_1-MLC', label: 'Qwen3 1.7B', size: '١ جيجابايت' } };
  var cfg = null, engine = null, loading = null, state = { phase: 'off', text: '' };
  function save() { try { localStorage.setItem(LS, JSON.stringify(cfg)); } catch (e) {} }
  function load() { try { cfg = JSON.parse(localStorage.getItem(LS) || 'null'); } catch (e) { cfg = null; } }
  load();
  function hasGPU() { return !!(root.navigator && root.navigator.gpu); }
  function enabled() { return !!(cfg && cfg.mode === 'local'); }
  function modelName() { return !cfg ? '' : LOCAL.light.label; }
  // يحذف وسم التفكير: كتلًا مكتملة، وما بعد وسم لم يُغلق بعد
  function clean(t) { t = String(t).replace(/<think>[\s\S]*?<\/think>/g, ''); var i = t.indexOf('<think>'); if (i >= 0) t = t.slice(0, i); return t.replace(/^\s+/, ''); }
  async function ensureLocal(onP) {
    if (engine) return engine;
    if (!hasGPU()) throw new Error('nogpu');
    if (loading) return loading;
    state = { phase: 'loading', text: 'يُهيَّأ النموذج…' };
    loading = (async function () {
      var m = await import(WEBLLM);
      var ids = [LOCAL.light.id, 'Qwen3-1.7B-q4f32_1-MLC'], err = null;
      for (var k = 0; k < ids.length && !engine; k++) {
        try { engine = await m.CreateMLCEngine(ids[k], { initProgressCallback: function (p) { state = { phase: 'loading', text: p.text || '', progress: p.progress }; if (onP) onP(state); } }); } catch (e) { err = e; engine = null; }
      }
      if (!engine) throw err || new Error('load');
      state = { phase: 'ready', text: '' }; return engine;
    })();
    try { return await loading; } finally { loading = null; }
  }
  // يعيد وعدًا بالنص الكامل؛ onTok تُستدعى بالنص المتراكم
  async function chat(messages, onTok, onP) {
    if (!enabled()) throw new Error('disabled');
    var acc = '';
    if (cfg.mode === 'local') {
      var en = await ensureLocal(onP), ms = messages.map(function (x) { return { role: x.role, content: x.content }; });
      var last = ms[ms.length - 1]; if (last && last.role === 'user') last.content += ' /no_think';
      var st = await en.chat.completions.create({ messages: ms, stream: true, temperature: 0.6, max_tokens: 900 });
      for await (var c of st) { var d = c.choices[0] && c.choices[0].delta && c.choices[0].delta.content; if (d) { acc += d; onTok(clean(acc)); } }
      return clean(acc);
    }
    return clean(acc);
  }
  function system(sources, name) {
    var s = 'أنت «نواة»، ذكاء اصطناعي عربي. أجب بالعربية الفصيحة الميسّرة ما لم يكتب المستخدم بلغة أخرى، بوضوح ومباشرة ودون حشو، وبقدر ما يحتاجه السؤال. لا تختلق معلومة ولا مصدرًا ولا اقتباسًا؛ إن لم تكن متأكدًا فقل ذلك. ' +
      'من قدرات نواة المضافة: تشكيل النصوص، والتصريف، والبحث في نصوص الفقه الشافعي، والبحث الموثَّق في الويب وفي ملفات المستخدم، وكتابة البرامج وتشغيلها. ' +
      'إن سُئلت عن نموذجك فقل: الحوار العام يعمل الآن بنموذج ' + (/gemma|qwen|llama/i.test(name) ? 'مفتوح الأوزان' : 'خارجي') + ' (' + name + ') مؤقتًا، ونموذج نواة الخاص المدرَّب من الصفر قيد البناء.';
    if (sources && sources.length) s += '\n\nمصادر جُلبت لهذا السؤال؛ اعتمد عليها إن كانت ذات صلة، واذكر اسم المصدر الذي أخذت منه، ولا تنسب إليها ما ليس فيها:\n' + sources.map(function (x, i) { return '[' + (i + 1) + '] ' + x.name + '\n' + x.text; }).join('\n\n');
    return s;
  }
  root.NawaLLM = {
    enabled: enabled, hasGPU: hasGPU, modelName: modelName, chat: chat, system: system, clean: clean, state: function () { return state; }, local: LOCAL,
    useLocal: function () { cfg = { mode: 'local' }; save(); },
    off: function () { cfg = null; engine = null; save(); }
  };
})(window);
