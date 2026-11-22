// حماية: تعليمات البناء الآلي يجب أن تبقى متزامنة مع معجم ضاد (لا دوال مخترعة).
const { execFileSync } = require('child_process');
try { execFileSync('node', ['tools/builder/gen_fewshot.js', '--check'], { stdio: 'inherit' }); console.log('ok'); } catch { process.exit(1); }
