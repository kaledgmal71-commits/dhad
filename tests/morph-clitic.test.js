// السوابق واللواحق: توليد (جذر × وزن × سوابق × لاحقة) ثم تحليل؛ يجب أن يعود الجذر والوزن والسوابق واللاحقة.
const K=require('../tools/morph_clitic.js'),M=require('../tools/morph_ar.js'),C=require('../tools/morph_conj.js');let ok=0,bad=0;const t=(c,m)=>{if(c)ok++;else{bad++;console.log('فشل:',m)}};
const P=(w,n)=>M.PATTERNS.find(x=>x.وزن===w&&(!n||x.نوع===n));
const ex=[['كتب','فَعَلَ',{pre:['فَ'],enc:'هَا'},'فَكَتَبَهَا'],['كتب','يَفْعُلُ',{pre:['سَ'],enc:'هُ'},'سَيَكْتُبُهُ'],['كتب','فَعَلَ',{pre:['وَ'],enc:'نِي'},'وَكَتَبَنِي'],['علم','فَعَّلَ',{pre:[],enc:'كُمْ'},'عَلَّمَكُمْ']];
for(const [r,w,o,e] of ex)t(K.generate(r,P(w),o)===e.normalize('NFC'),'مثال '+e+' ← '+K.generate(r,P(w),o));
const L=[...'بتثجحخدذرزسشصضطظعغفقكلمنه'];let seed=5;const rnd=()=>(seed=(seed*1103515245+12345)&0x7fffffff)/0x7fffffff;const pk=a=>a[Math.floor(rnd()*a.length)];
const pats=M.PATTERNS.filter(p=>p.missing==null&&!p.dbl&&/^(ماضٍ|مضارع)/.test(p.نوع));
const preSets=[[],['وَ'],['فَ'],['وَ','سَ'],['فَ','سَ'],['لِ'],['وَ','لِ']];let n=0,miss=0;
for(let i=0;i<120;i++){const a=pk(L),b=pk(L),d=pk(L);if(a===b||b===d||a===d)continue;const root=a+b+d;
 for(const p of pats){if(!M.applies(root,p))continue;for(const pre of preSets){const pres=/^مضارع/.test(p.نوع);if(pre.some(x=>x==='سَ'||x==='لِ')&&!pres)continue;
  for(const enc of [null,...K.ENCLITICS.map(e=>e[0])]){const w=K.generate(root,p,{pre,enc});n++;
   if(!K.analyze(w).some(x=>x.جذر===root&&x.وزن===p.وزن&&x.سوابق.join('')===pre.join('')&&(x.لاحقة_مفعول||null)===enc)){miss++;if(miss<6)console.log('غائب',root,p.وزن,pre.join('+'),enc,w)}}}}}
t(miss===0,'إغلاق: غائب '+miss+' من '+n);
console.log('كلمات',n,'غائب',miss,'| نجح',ok,'فشل',bad);process.exit(bad?1:0);
