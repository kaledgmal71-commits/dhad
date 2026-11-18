// يجمع طبقات التحليل الصرفي (tools/morph_*.js وatomic_ar.js) في ملف متصفح واحد: site/assets/nawa.morph.js ← window.NawaMorph
// شغّله بعد أي تعديل على هذه الطبقات: node tools/bundle_morph.js
const fs = require('fs'), path = require('path');
const mods = ['atomic_ar', 'morph_ar', 'morph_conj', 'morph_conj_weak_pres', 'morph_conj_weak', 'morph_clitic', 'morph_noun', 'morph_noun_clitic', 'morph_particles', 'morph_particles_clitic', 'morph_all'];
let out = '// مولَّد بـ tools/bundle_morph.js — لا يُعدَّل يدويًّا\n(function () {\n var defs = {}, cache = {};\n function req(n) { n = n.replace(/^\\.\\//, \'\').replace(/\\.js$/, \'\'); if (cache[n]) return cache[n].exports; var m = { exports: {} }; cache[n] = m; defs[n](m, m.exports, req); return m.exports; }\n req.main = null;\n';
for (const m of mods) {
  const src = fs.readFileSync(path.join(__dirname, m + '.js'), 'utf8');
  if (/<\/script/i.test(src)) throw new Error(m + ': </script');
  out += ' defs[' + JSON.stringify(m) + '] = function (module, exports, require) {\n' + src + '\n };\n';
}
out += ' window.NawaMorph = req("morph_all");\n})();\n';
fs.writeFileSync(path.join(__dirname, '..', 'site', 'assets', 'nawa.morph.js'), out);
console.log('nawa.morph.js', out.length, 'bytes');
