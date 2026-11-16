// يقيس محرك المساعد (assistant_core.js) على مهام الكتابة في DhadBench، بقاعدة الموقع الفعلية وبلا أي حل مرجعي.
const fs=require('fs'),path=require('path'),vm=require('vm');
const B=require('./run.js'),A=require('../assistant_core.js');
const ctx=vm.createContext({performance,setTimeout,console:{log(){},error(){},warn(){}}});
vm.runInContext(fs.readFileSync(path.join(__dirname,'..','dist','assets','engine.api.js'),'utf8'),ctx,{timeout:8000});
const corpus=fs.readFileSync(path.join(__dirname,'..','dist','ai','dhad-corpus.jsonl'),'utf8').trim().split('\n').map(l=>JSON.parse(l));
const asst=A.create({corpus,api:ctx.__api});
const W=(process.argv.includes('--held')?require('./held.js'):B.tasks).filter(t=>t.kind==='كتابة');
let sum=0,found=0;
for(const t of W){const t0=Date.now();const r=asst.plan(t.desc,'');const code=r.edits.length?r.edits.map(e=>e.text).join('\n'):'';
 const s=code?B.score(t,code):0;sum+=s;if(code)found++;console.log(t.id,code?'وُجد':'لا',s.toFixed?s.toFixed(2):s,(Date.now()-t0)+'ms',r.source||'');}
console.log('قاعدة',asst.size,'| كتابة نجاح@١ =',(sum/W.length).toFixed(3),'| وُجد مرشَّح لـ',found,'من',W.length);
