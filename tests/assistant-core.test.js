// محرك المساعد: مسار النموذج (مطالبة + فحص ساكن + تحقق بمحرك ضاد + إصلاح ذاتي + دمج + تحويل إلى edits) بمولِّد مزيَّف يخطئ ثم يصيب.
const fs=require('fs'),path=require('path'),vm=require('vm');
const A=require('../assistant_core.js');let bad=0;const ck=(n,c)=>{console.log((c?'ok  ':'FAIL')+' '+n);if(!c)bad++;};
const ctx=vm.createContext({performance,setTimeout,console:{log(){},error(){},warn(){}}});
vm.runInContext(fs.readFileSync(path.join(__dirname,'..','dist','assets','engine.api.js'),'utf8'),ctx,{timeout:8000});
const K=JSON.parse(fs.readFileSync(path.join(__dirname,'..','dist','ai','assistant-knowledge.json'),'utf8'));
const S=A.create({corpus:[],api:ctx.__api,knowledge:K});
function applyEdits(code,edits){const L=code?code.split('\n'):[];for(const e of edits.slice().sort((a,b)=>(b.from??b.after)-(a.from??a.after))){const t=(e.text||'').split('\n');if(e.op==='insert')L.splice(e.after,0,...t);else if(e.op==='replace')L.splice(e.from-1,e.to-e.from+1,...t);else L.splice(e.from-1,e.to-e.from+1);}return L.join('\n');}
const seq=(answers)=>{let i=0,seen=[];const g=async m=>{seen.push(m.map(x=>x.content).join('||'));return answers[Math.min(i++,answers.length-1)];};g.seen=seen;return g;};
(async()=>{
 ck('knowledge has system prompt, reserved words, builtins',K.system.length>3000&&K.reserved.includes('من')&&K.builtins.includes('اطبع'));
 ck('lint rejects builtin shadowing',/دالة جاهزة/.test(S.lint('دالة ف(نص) { ارجع نص }')));
 ck('lint rejects reserved name',/محجوزة/.test(S.lint('متغير من = ٣')));
 ck('lint accepts clean code',S.lint('دالة ف(ق) { ارجع ق }')==='');
 // ١) يخطئ مرتين (تظليل دالة جاهزة ثم نحو خاطئ) ثم يصيب → تُصلح تلقائيًّا
 const g1=seq(['```\nدالة مجموع_الزوجي(نص) { ارجع ٠ }\n```','```\nدالة مجموع_الزوجي(ق) { إذا ( { }\n```','```\nدالة مجموع_الزوجي(ق) {\n  متغير م = ٠\n  من_أجل (ع في ق) { إذا (ع % ٢ == ٠) { م += ع } }\n  ارجع م\n}\n```']);
 const r1=await S.solve('اكتب دالة مجموع_الزوجي',"",g1);
 ck('self-repair across 3 rounds ends ok',r1.ok&&r1.rounds===3);
 ck('repair feedback reached the model (lint message in round 2 prompt)',/دالة جاهزة/.test(g1.seen[1]));
 ck('compile error fed back in round 3 prompt',/فشل التحقق/.test(g1.seen[2]));
 ck('result runs correctly',(()=>{const x=ctx.__api;const c=x.compile(x.parse(r1.result+'\nاطبع(مجموع_الزوجي([١،٢،٣،٤]))'));const o=[];new x.VM({maxSteps:1e6,maxMs:1000,onPrint:l=>o.push(l),onSaveFile(){},onInput:()=>''}).run(c.mainChunkIndex,c.functionChunks);return o.join('')==='٦'||o.join('')==='6';})());
 // ٢) دمج في شيفرة موجودة: استبدال دالة بنفس الاسم وإلحاق الجديدة، والتعديلات تعيد بناء النتيجة بدقة
 const base='دالة أ() { ارجع ١ }\n\nدالة ب() { ارجع ٢ }\n\nاطبع(أ())';
 const g2=seq(['```\nدالة أ() { ارجع ٥ }\nدالة ج() { ارجع ٣ }\n```']);
 const r2=await S.solve('غيّر أ وأضف ج',base,g2);
 ck('merge replaces same-name function and appends new',r2.ok&&r2.result.includes('ارجع ٥')&&r2.result.includes('دالة ج()')&&!r2.result.includes('ارجع ١ }')&&r2.result.includes('دالة ب()'));
 ck('edits reproduce the result exactly',applyEdits(base,r2.edits)===r2.result);
 ck('existing code sent to model as context',/الشيفرة الحالية/.test(g2.seen[0]));
 // ٣) فشل دائم → رسالة صادقة بلا تعديل
 const r3=await S.solve('ما لا يُترجم',"",seq(['```\nدالة ( {\n```']));
 ck('permanent failure → honest message, no edits',!r3.ok&&r3.edits.length===0&&/بعد 3 محاولات/.test(r3.say));
 // ٤) النموذج غير متاح
 const r4=await S.solve('س',"",async()=>{throw new Error('لا اتصال');});
 ck('backend down → clear message',!r4.ok&&/تعذّر الوصول/.test(r4.say));
 console.log(bad?'FAILED':'ALL OK');process.exit(bad?1:0);})();
