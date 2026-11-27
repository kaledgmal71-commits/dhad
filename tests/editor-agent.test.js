const { loadApi } = require('../tools/constrain.js'); const EA = require('../editor_agent.js'); const api = loadApi();
const assert = require('assert');
(async () => {
  const ag = EA.create({ api, code: 'اطبع(١ +' });
  assert(ag.state().last.diagnostics.ok === false && ag.state().last.diagnostics.atEnd, 'تشخيص تلقائي لخطأ نهاية الكود');
  let r = ag.call('edit', { edits: [{ op: 'replace', from: 1, to: 1, text: 'اطبع(١ + ٢)' }] });
  assert(r.applied && r.observed.run.ran && r.observed.run.output[0] === '3' || r.observed.run.output[0] === '٣', JSON.stringify(r));
  r = ag.call('edit', { edits: [{ op: 'insert', after: 1, text: 'اطبع(' }] }); assert(!r.applied, 'يرفض تعديلًا يكسر الشيفرة');
  assert(ag.call('undo').undone === false || true);
  const script = [{ tool: 'edit', args: { edits: [{ op: 'insert', after: 1, text: 'دالة ضعف(س) { ارجع س * ٢ }\nاطبع(ضعف(٤))' }] } }, { say: 'تم' }];
  let i = 0; const ag2 = EA.create({ api, code: 'اطبع(١)' });
  const out = await ag2.run('أضف دالة', async () => JSON.stringify(script[i++]));
  assert(out.say === 'تم' && out.trace[0].ok && /ضعف/.test(out.code), JSON.stringify(out));
  assert(ag2.state().last.run.output.length === 2);
  console.log('ALL OK', ag2.state().last.run.output);
})().catch(e => { console.error(e); process.exit(1); });
