// يبني معاينة مختبر ضاد في ملف HTML واحد حي (المحرك الحقيقي مضمَّن). الاستعمال: node tools/build_lab.js [ملف_الخرج]
const fs=require('fs'),path=require('path');
const root=path.join(__dirname,'..');
const engine=fs.readFileSync(path.join(root,'dist','assets','engine.js'),'utf8').replace(/<\/script/gi,'<\\/script').replace(/\uFFFD/g,'\\uFFFD');
const tpl=fs.readFileSync(path.join(__dirname,'lab.tpl.html'),'utf8');
const out=process.argv[2]||path.join(root,'docs','تصاميم','dhad-lab-preview.html');
fs.mkdirSync(path.dirname(out),{recursive:true});
let html=tpl.replace('/*ENGINE*/',()=>engine);
if(process.argv.includes('--artifact')){ // صيغة النشر كصفحة: بلا doctype/html/head/body، مع هوامش الجوانب الآمنة
  const title=/<title>[^<]*<\/title>/.exec(html)[0];
  const style=/<style>[\s\S]*?<\/style>/.exec(html)[0].replace('.wrap{max-width:1100px;margin:0 auto;padding:14px 16px 40px}','.wrap{max-width:1100px;margin:0 auto;padding-block:14px 40px;padding-left:max(16px,env(safe-area-inset-left,0px));padding-right:max(16px,env(safe-area-inset-right,0px))}');
  const body=/<body>([\s\S]*)<\/body>/.exec(html)[1];
  html=title+'\n<meta name="claude:viewport-fit-sides" content="cover">\n'+style+'\n'+body;
}
fs.writeFileSync(out,html);
console.log('wrote',out,fs.statSync(out).size,'bytes');
