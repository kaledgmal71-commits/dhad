// يجمّع تطبيقًا مكتوبًا بضاد (مجلد فيه main.dhad ووحدات) في صفحة HTML واحدة مستقلة: المحرك + الوحدات + مشغّل صغير
// الاستعمال: node tools/bundle_app.js apps/book-editor "محرّر صفحات الكتاب" out.html
const fs = require('fs'), path = require('path');
const [dir, title, out] = process.argv.slice(2);
const ROOT = path.join(__dirname, '..');
const engine = ['front.js', 'compiler.js', 'vm.js'].map(f => fs.readFileSync(path.join(ROOT, f), 'utf8')).join('\n;\n');
const mods = {};
for (const f of fs.readdirSync(dir)) if (f.endsWith('.dhad')) mods[f.replace(/\.dhad$/, '')] = fs.readFileSync(path.join(dir, f), 'utf8');
const main = mods.main; delete mods.main;
const esc = s => JSON.stringify(s).replace(/</g, '\\u003c').split(String.fromCharCode(0x2028)).join('\\u2028').split(String.fromCharCode(0x2029)).join('\\u2029');
const html = `<!doctype html>
<html lang="ar" dir="rtl"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${title}</title></head><body>
<script>(function(){var module=undefined;
${engine}
;var MODS=${esc(mods)},MAIN=${esc(main)};
function fail(e){var d=document.createElement('pre');d.style.cssText='color:#b00;white-space:pre-wrap;padding:12px;direction:ltr';d.textContent='ضاد: '+(e&&e.message?e.message:e);document.body.appendChild(d)}
async function boot(){
  var assistant={available:false,downloads:null};
  try{ if(window.claude&&claude.use){
    var sm=await claude.use('sample');
    if(sm)assistant.available=true,assistant.ask=function(p,tools,onText){return sm(p,{tools:tools,cache:false,onText:function(u){onText(u.text)}})};
    var dl=await claude.use('downloads'); if(dl)assistant.downloads=dl;
  }}catch(e){}
  try{
    var c=compile(parse(MAIN));
    var vm=new VM({maxSteps:2e9,maxMs:120000,domRoot:document.body,mainPath:'main.dhad',assistant:assistant,
      readModule:function(p){var k=String(p).replace(/\\.(ضاد|dhad)$/,'');return Object.prototype.hasOwnProperty.call(MODS,k)?MODS[k]:null},
      onPrint:function(l){console.log(l)}});
    vm.run(c.mainChunkIndex,c.functionChunks);
  }catch(e){fail(e)}
}
boot();
})();</script></body></html>`;
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, html);
console.log('built', out, html.length, 'bytes');
