// اختيار نموذج جوجل: Gemma المفتوح الأوزان أولًا، وطيّ تعليمات النظام في أول رسالة مستخدم لنماذج Gemma
const fs=require('fs'),vm=require('vm');let pass=0,fail=0;const ok=(c,m)=>{if(c)pass++;else{fail++;console.log('FAIL',m)}};
const store={};let sent=null;
const win={navigator:{},localStorage:{getItem:k=>store[k]||null,setItem:(k,v)=>store[k]=v},
 fetch:async(u,o)=>{if(/\/models$/.test(u))return{ok:true,json:async()=>({data:[{id:'models/gemini-2.5-flash'},{id:'models/gemma-4-26b-it'},{id:'models/gemma-4-31b-it'},{id:'models/text-embedding-004'},{id:'models/gemini-3.5-flash-lite'}]})};
  sent=JSON.parse(o.body);return{ok:true,body:{getReader:()=>{let d=false;return{read:async()=>d?{done:true}:(d=true,{done:false,value:new TextEncoder().encode('data: {"choices":[{"delta":{"content":"أهلًا"}}]}\n\ndata: [DONE]\n\n')})}}}}},TextEncoder,TextDecoder};
win.window=win;vm.createContext(win);vm.runInContext(fs.readFileSync(__dirname+'/../site/assets/nawa.llm.js','utf8'),win);
(async()=>{const L=win.NawaLLM;
 ok(L.pick(['models/gemini-3.5-flash-lite','models/gemini-2.5-flash','models/gemma-4-31b-it','models/gemma-4-26b-it'])==='gemma-4-31b-it','تفضيل أكبر Gemma');
 ok(L.pick(['models/gemini-2.5-flash','models/gemini-3.5-flash','models/gemini-3.5-flash-lite'])==='gemini-3.5-flash','وإلا أحدث Flash غير Lite');
 const m=await L.useGoogle('KEY');ok(m==='gemma-4-31b-it'&&L.enabled(),'useGoogle يحفظ الاختيار');
 let acc='';const out=await L.chat([{role:'system',content:'SYS'},{role:'user',content:'سؤال'}],t=>acc=t);
 ok(out==='أهلًا'&&acc==='أهلًا','البثّ');
 ok(sent.messages.length===1&&/^SYS/.test(sent.messages[0].content)&&/سؤال/.test(sent.messages[0].content),'طيّ النظام في رسالة المستخدم لـGemma');
 ok(/مفتوح الأوزان/.test(L.system([],'gemma-4-31b-it'))&&/خارجي/.test(L.system([],'gemini-3.5-flash')),'وصف النموذج صادق');
 console.log('نجح',pass,'فشل',fail);})();
