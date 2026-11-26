// خانة التوليد في نواة: نموذج مفتوح الأوزان مؤقتًا إلى حين اكتمال نموذج نواة الخاص.
// وضعان: محلي (يعمل في متصفحك على WebGPU، يُنزَّل مرة ويُحفظ) أو مزوّد متوافق مع OpenAI بمفتاح المستخدم (يُحفظ في متصفحه وحده).
(function (root) {
  var LS = 'nawa.llm', WEBLLM = 'https://cdn.jsdelivr.net/npm/@mlc-ai/web-llm@0.2.79/+esm';
  var LOCAL = { light: { id: 'Qwen3-1.7B-q4f16_1-MLC', label: 'Qwen3 1.7B', size: '١ جيجابايت' } };
  var cfg = null, engine = null, loading = null, state = { phase: 'off', text: '' };
  function save() { try { localStorage.setItem(LS, JSON.stringify(cfg)); } catch (e) {} }
  function load() { try { cfg = JSON.parse(localStorage.getItem(LS) || 'null'); } catch (e) { cfg = null; } }
  load();
  function hasGPU() { return !!(root.navigator && root.navigator.gpu); }
  function enabled() { return !!(cfg && (cfg.mode === 'local' || (cfg.mode === 'api' && cfg.key))); }
  function modelName() { return !cfg ? '' : cfg.mode === 'local' ? LOCAL.light.label : cfg.model; }
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
    var r = await fetch(cfg.base.replace(/\/$/, '') + '/chat/completions', { method: 'POST', headers: { 'content-type': 'application/json', authorization: 'Bearer ' + cfg.key }, body: JSON.stringify({ model: cfg.model, messages: messages, stream: true, temperature: 0.6, max_tokens: 1200 }) });
    if (!r.ok) throw new Error('http ' + r.status);
    var rd = r.body.getReader(), dec = new TextDecoder(), buf = '';
    for (;;) {
      var x = await rd.read(); if (x.done) break; buf += dec.decode(x.value, { stream: true });
      var lines = buf.split('\n'); buf = lines.pop();
      for (var i = 0; i < lines.length; i++) {
        var ln = lines[i].trim(); if (ln.indexOf('data:') !== 0) continue; var js = ln.slice(5).trim(); if (js === '[DONE]') continue;
        try { var dd = JSON.parse(js).choices[0].delta.content; if (dd) { acc += dd; onTok(clean(acc)); } } catch (e) {}
      }
    }
    return clean(acc);
  }
  function system(sources, name) {
    var s = 'أنت «نواة»، ذكاء اصطناعي عربي. أجب بالعربية الفصيحة الميسّرة ما لم يكتب المستخدم بلغة أخرى، بوضوح ومباشرة ودون حشو، وبقدر ما يحتاجه السؤال. لا تختلق معلومة ولا مصدرًا ولا اقتباسًا؛ إن لم تكن متأكدًا فقل ذلك. ' +
      'من قدرات نواة المضافة: تشكيل النصوص، والتصريف، والبحث في نصوص الفقه الشافعي، والبحث الموثَّق في الويب وفي ملفات المستخدم، وكتابة البرامج وتشغيلها. ' +
      'إن سُئلت عن نموذجك فقل: الحوار العام يعمل الآن بنموذج مفتوح الأوزان (' + name + ') مؤقتًا، ونموذج نواة الخاص المدرَّب من الصفر قيد البناء.';
    if (sources && sources.length) s += '\n\nمصادر جُلبت لهذا السؤال؛ اعتمد عليها إن كانت ذات صلة، واذكر اسم المصدر الذي أخذت منه، ولا تنسب إليها ما ليس فيها:\n' + sources.map(function (x, i) { return '[' + (i + 1) + '] ' + x.name + '\n' + x.text; }).join('\n\n');
    return s;
  }
  root.NawaLLM = {
    enabled: enabled, hasGPU: hasGPU, modelName: modelName, chat: chat, system: system, clean: clean, state: function () { return state; }, local: LOCAL,
    useLocal: function () { cfg = { mode: 'local' }; save(); },
    useApi: function (base, key, model) { cfg = { mode: 'api', base: base, key: key, model: model }; save(); },
    off: function () { cfg = null; engine = null; save(); }
  };
})(window);
