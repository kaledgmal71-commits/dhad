// صفحة نواة المبنية (dist/nawa) وقارئ الملفات في المتصفح (nawa.files.js)
const fs=require('fs'),path=require('path');
const F=require(path.join(__dirname,'..','site','assets','nawa.files.js'));
let pass=0,fail=0;const ok=(c,m)=>{if(c)pass++;else{fail++;console.log('FAIL',m);}};
const DOCX='UEsDBBQAAAAIAMcAZV0rhCYSBgAAAAQAAAATAAAAW0NvbnRlbnRfVHlwZXNdLnhtbLOp0LcDAFBLAwQUAAAACADHAGVdN/4ITG4AAACvAAAAEQAAAHdvcmQvZG9jdW1lbnQueG1ssym3SslPLs1NzSuxsym3SspPqQTRBSCiCESU2N1YcWP5jRUKN5bfbLmxFYiX31hpow+SAJFFYLIATY9CRW6OVXFBYnKqrVJBUWpxalFZqpIdyISbjTebbmy8sRJi3Gog2XazC6uB+jDX6CM5EQBQSwECFAMUAAAACADHAGVdK4QmEgYAAAAEAAAAEwAAAAAAAAAAAAAAgAEAAAAAW0NvbnRlbnRfVHlwZXNdLnhtbFBLAQIUAxQAAAAIAMcAZV03/ghMbgAAAK8AAAARAAAAAAAAAAAAAACAATcAAAB3b3JkL2RvY3VtZW50LnhtbFBLBQYAAAAAAgACAIAAAADUAAAAAAA=',EPUB='UEsDBBQAAAAAAMcAZV1vYassFAAAABQAAAAIAAAAbWltZXR5cGVhcHBsaWNhdGlvbi9lcHViK3ppcFBLAwQUAAAACADHAGVdFyZtlDAAAAA2AAAADgAAAE9FQlBTL2MxLnhodG1ss8koyc2xs0nKT6m0symwu7H8ZsvNxhtbb7YogJg3Ft/suNlio19gZ6MPUaIPVg8AUEsDBBQAAAAIAMcAZV3Od3L8MAAAADgAAAAOAAAAT0VCUFMvYzIueGh0bWyzySjJzbGzScpPqbSzKbC7sfxmy83GG1tvtiiAmDdWA8m2m102+gV2NvoQRfpgHQBQSwMEFAAAAAgAxwBlXf0YkBYeAAAAIgAAAA8AAABPRUJQUy9uYXYueGh0bWyzySjJzbGzScpPqbS72Xiz/cbGG5tt9MFcG32wHABQSwECFAMUAAAAAADHAGVdb2GrLBQAAAAUAAAACAAAAAAAAAAAAAAAgAEAAAAAbWltZXR5cGVQSwECFAMUAAAACADHAGVdFyZtlDAAAAA2AAAADgAAAAAAAAAAAAAAgAE6AAAAT0VCUFMvYzEueGh0bWxQSwECFAMUAAAACADHAGVdzndy/DAAAAA4AAAADgAAAAAAAAAAAAAAgAGWAAAAT0VCUFMvYzIueGh0bWxQSwECFAMUAAAACADHAGVd/RiQFh4AAAAiAAAADwAAAAAAAAAAAAAAgAHyAAAAT0VCUFMvbmF2LnhodG1sUEsFBgAAAAAEAAQA6wAAAD0BAAAAAA==';
const file=(b64,n)=>new File([Buffer.from(b64,'base64')],n);
(async()=>{
  const d=await F.read(file(DOCX,'a.docx'));ok(d.kind==='docx'&&d.content.includes('<w:t>باب الصلاة</w:t>'),'docx unzip');
  const e=await F.read(file(EPUB,'b.epub'));ok(e.kind==='html'&&e.content.includes('الفصل الأول')&&e.content.includes('الفصل الثاني')&&!e.content.includes('فهرس'),'epub chapters in order, nav skipped');
  ok((await F.read(new File(['<p>x</p>'],'c.html'))).kind==='html','html kind');
  ok((await F.read(new File(['نص'],'d.txt'))).kind==='text','txt kind');
  ok((await F.read(new File(['{}'],'e.json'))).kind==='text','json kind');
  for(const n of ['x.pdf','x.bok','x.exe','x']){let m='';await F.read(new File(['x'],n)).catch(er=>m=er.message);ok(m==='unsupported','unsupported '+n);}
  {let m='';await F.read(new File([Buffer.from('not a zip at all')],'bad.docx')).catch(er=>m=er.message);ok(m.length>0,'corrupt docx rejected: '+m);}
  ok(F.ext('A.DOCX')==='docx'&&F.ext('noext')==='','ext helper');
  const D=path.join(__dirname,'..','dist','nawa');
  if(!fs.existsSync(D)){console.log('تخطّي فحوص dist: لا صفحة مبنية');}
  else{
    const html=fs.readFileSync(path.join(D,'index.html'),'utf8');
    ok(html.includes('/assets/nawa.js')&&html.includes('/assets/nawa.files.js')&&html.includes('/assets/nawa.css'),'page assets');
    ok(html.includes('rel="manifest"')&&html.includes('id="send"')&&html.includes('id="openConn"')&&html.includes('id="install"'),'page controls');
    ok(/<title>[^<]*نواة/.test(html),'title');
    ok(!/الطبقة|الموقع|ضاد ونواة|وثيقة/.test(html.replace(/<nav class="tabs">.*?<\/nav>/s,'').replace(/<title>.*?<\/title>|<meta[^>]*>/gs,'')),'no meta text in the interface');
    const man=JSON.parse(fs.readFileSync(path.join(D,'manifest.webmanifest'),'utf8'));
    ok(man.start_url==='/nawa/'&&man.scope==='/nawa/'&&man.display==='standalone'&&man.icons.some(i=>i.sizes==='192x192')&&man.icons.some(i=>i.sizes==='512x512'),'manifest');
    for(const i of man.icons)ok(fs.existsSync(path.join(__dirname,'..','dist',i.src)),'icon exists '+i.src);
    const png=fs.readFileSync(path.join(D,'icon-512.png'));ok(png.slice(1,4).toString()==='PNG','png magic');
    const base=JSON.parse(fs.readFileSync(path.join(D,'base.json'),'utf8'));
    ok(base['فهرس']&&base['أمثلة']&&Object.keys(base['أمثلة']).length>=200&&base['فهرس']['مقلوب'],'base.json shape');
    ok(fs.readFileSync(path.join(D,'sw.js'),'utf8').includes('/nawa/base.json'),'sw caches base');
    for(const f of ['nawa.css','nawa.js','nawa.files.js','nawa.worker.js'])ok(fs.existsSync(path.join(__dirname,'..','dist','assets',f)),'asset '+f);
    const w=fs.readFileSync(path.join(__dirname,'..','dist','assets','nawa.worker.js'),'utf8');ok(w.includes('engine.api.js')&&w.includes('callHost'),'worker uses engine + host handler');
    ok(fs.readFileSync(path.join(__dirname,'..','dist','sitemap.xml'),'utf8').includes('/nawa/'),'sitemap has nawa');
    ok(fs.readFileSync(path.join(__dirname,'..','dist','index.html'),'utf8').length>0,'home exists');
    const home=fs.readFileSync(path.join(__dirname,'..','dist','learn','index.html'),'utf8');ok(home.includes('href="/nawa/"'),'site nav links to nawa');
  }
    // إضافات المحادثة القياسية
    {
      const js=fs.readFileSync(path.join(__dirname,'..','dist','assets','nawa.js'),'utf8'),css=fs.readFileSync(path.join(__dirname,'..','dist','assets','nawa.css'),'utf8');
      for(const f of ['function actions','function exportConv','function startEdit','function renderHist','function rich','function textOf','function drawer','صفّر_السياق','المسار','حفظ المحادثة','بحث في المحادثات'])ok(js.includes(f),'ui has '+f);
      for(const c of ['.acts','.trace','.medit','.tobottom','.hsearch','.hbtn','.hx'])ok(css.includes(c),'css has '+c);
      ok(js.includes("mode === 'attach'")&&js.includes("'link'"),'attach/link modes');
      ok(!/innerHTML\s*=\s*[^;]*(p\['|r\['|m\.text)/.test(js.replace(/IC\./g,'')),'no raw answer text injected as HTML');
    }
    // إيقاف وإعادة المحاولة واقتراحات المتابعة والإعدادات والمحادثة المؤقتة
    {
      const js=fs.readFileSync(path.join(__dirname,'..','dist','assets','nawa.js'),'utf8'),css=fs.readFileSync(path.join(__dirname,'..','dist','assets','nawa.css'),'utf8');
      for(const f of ['function stopAsk','function addExtras','tempMode','محادثة مؤقتة','الإعدادات','أُوقف الطلب','تصدير كل المحادثات'])ok(js.includes(f),'ui has '+f);
      for(const c of ['.sugg','.sfoot','.sbody','.cbtn.send.stop'])ok(css.includes(c),'css has '+c);
      ok(js.includes('filter(function (c) { return !c.temp; })'),'temporary chats are never persisted');
    }
    // الربط موصّل (مراجع لا نسخ) والشريط والإعدادات المرتبة
    {
      const js=fs.readFileSync(path.join(__dirname,'..','dist','assets','nawa.js'),'utf8'),css=fs.readFileSync(path.join(__dirname,'..','dist','assets','nawa.css'),'utf8');
      for(const f of ['function prepareLinked','function pickDir','showDirectoryPicker','function openProjects','function openArtifacts','function openSkills','var SECTIONS','عدد_مربوط','صفّر_المكتبة','مربوط، يُقرأ عند الحاجة'])ok(js.includes(f),'ui has '+f);
      for(const c of ['.snav','.stabs','.tg','.prow'])ok(css.includes(c),'css has '+c);
      ok(!/st\.put\(\{ name: name, kind: r\.kind, content/.test(js),'linking never stores file content');
      ok(js.includes("st.clear()"),'old stored copies are purged');
    }
  console.log('pass',pass,'fail',fail);
})();
