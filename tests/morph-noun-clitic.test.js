// سوابق الأسماء ولواحقها: توليد (جذر × وزن × سوابق × ال × ضمير) ثم تحليل؛ يجب أن يعود الجذر والتعريف والسوابق واللاحقة.
const K=require('../tools/morph_noun_clitic.js'),N=require('../tools/morph_noun.js'),M=require('../tools/morph_ar.js');let ok=0,bad=0;const t=(c,m)=>{if(c)ok++;else{bad++;if(bad<20)console.log('فشل:',m)}};
const P=w=>N.NP.find(p=>p.وزن===w);
const ex=[['كتب','فَاعِلٌ',{al:true},'الْكَاتِبُ'],['شمس','فَعْلٌ',{al:true},'الشَّمْسُ'],['كتب','فِعَالٌ',{pre:['وَ'],al:true},'وَالْكِتَابُ'],['قلم','فَعَلٌ',{pre:['بِ'],al:true},'بِالْقَلَمُ'],['كتب','فِعَالٌ',{enc:'هُ'},'كِتَابُهُ'],['كتب','فِعَالٌ',{enc:'ي'},'كِتَابِي'],['كتب','مَفْعَلَةٌ',{enc:'هَا'},'مَكْتَبَتُهَا'],['كتب','فَاعِلٌ',{pre:['لِ'],al:true},'لِلْكَاتِبُ']];
for(const [r,w,o,e] of ex)t(K.generate(r,P(w),o)===e.normalize('NFC'),'مثال '+e+' ← '+K.generate(r,P(w),o));
const L=[...'بتثجحخدذرزسشصضطظعغفقكلمنه'];let seed=31;const rnd=()=>(seed=(seed*1103515245+12345)&0x7fffffff)/0x7fffffff;const pk=a=>a[Math.floor(rnd()*a.length)];
const pats=N.NP.filter(p=>p.missing==null&&!p.dbl&&!p.quad&&/ٌ$/.test(p.وزن));
const preSets=[[],['وَ'],['فَ'],['بِ'],['لِ'],['كَ'],['وَ','بِ'],['فَ','لِ']];let n=0,miss=0;
for(let i=0;i<8;i++){const a=pk(L),b=pk(L),d=pk(L);if(a===b||b===d||a===d)continue;const root=a+b+d;
 for(const p of pats){for(const pre of preSets)for(const al of [false,true])for(const enc of [null,...K.POSS.map(e=>e[0])]){if(al&&enc)continue;if(pre.some(x=>x==='لِ')&&false)continue;
  const w=K.generate(root,p,{pre,al,enc});n++;
  if(!K.analyze(w).some(x=>x.جذر===root&&x.تعريف===al&&x.سوابق.join('')===pre.join('')&&(x.لاحقة_إضافة||null)===enc)){miss++;if(miss<6)console.log('غائب',root,p.وزن,pre.join('+'),al,enc,w)}}}}
t(miss===0,'إغلاق: غائب '+miss+' من '+n);
console.log('كلمات',n,'غائب',miss,'| نجح',ok,'فشل',bad);process.exit(bad?1:0);
