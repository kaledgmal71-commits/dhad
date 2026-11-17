// إسناد الماضي المعتل والمضعّف: توليد (جذر × وزن × ضمير) ثم تحليل؛ يجب أن يعود الجذر والوزن والضمير.
const W=require('../tools/morph_conj_weak.js'),C=require('../tools/morph_conj.js'),M=require('../tools/morph_ar.js');let ok=0,bad=0;const t=(c,m)=>{if(c)ok++;else{bad++;console.log('فشل:',m)}};
const P=(w,f)=>M.PATTERNS.find(x=>x.وزن===w&&f(x));
const ex=[['قول','فَالَ','أنا','قُلْتُ'],['بيع','فَالَ','أنتم','بِعْتُمْ'],['قوم','أَفَالَ','أنا','أَقَمْتُ'],['مدد','فَعَّ','أنا','مَدَدْتُ'],['مدد','فَعَّ','هم','مَدُّوا'],['مدد','فَعَّ','هي','مَدَّتْ'],['حبب','أَفَعَّ','أنا','أَحْبَبْتُ'],['مرر','ٱسْتَفَعَّ','أنا','ٱسْتَمْرَرْتُ'],['دعو','فَعَا','أنا','دَعَوْتُ'],['دعو','فَعَا','هم','دَعَوْا'],['رمي','فَعَى','هي','رَمَتْ'],['رمي','فَعَى','هما (م)','رَمَيَا'],['خشي','فَعِيَ','هم','خَشُوا'],['خشي','فَعِيَ','أنا','خَشِيتُ'],['عطي','أَفْعَى','أنا','أَعْطَيْتُ']];
const kind={'فَالَ':W.isHollow,'أَفَالَ':W.isHollow,'فَعَّ':W.isDoubled,'أَفَعَّ':W.isDoubled,'ٱسْتَفَعَّ':W.isDoubled,'فَعَا':W.isDefective,'فَعَى':W.isDefective,'فَعِيَ':W.isDefective,'أَفْعَى':W.isDefective};
for(const [r,w,pr,exp] of ex){const p=P(w,kind[w]);t(!!p&&W.conjugate(r,p,pr)===exp.normalize('NFC'),'مثال '+exp+' ← '+(p&&W.conjugate(r,p,pr)))}
const L=[...'بتثجحخدذرزسشصضطظعغفقكلمنه'];let seed=17;const rnd=()=>(seed=(seed*1103515245+12345)&0x7fffffff)/0x7fffffff;const pk=a=>a[Math.floor(rnd()*a.length)];
const pats=M.PATTERNS.filter(p=>W.isHollow(p)||W.isDefective(p)||W.isDoubled(p));let n=0,miss=0;const bad2={};
for(let i=0;i<150;i++){const a=pk(L),b=pk(L),d=pk(L);if(a===b||b===d||a===d)continue;const wk=pk(['و','ي']);const roots=[a+wk+d,a+b+wk,a+b+b];
 for(const root of roots)for(const p of pats){if(!M.applies(root,p))continue;const vows=W.isHollow(p)&&p.باب==='I'?(root[1]==='و'?['ُ','ِ']:['ِ']):[undefined];
  for(const vow of vows)for(const [pr] of C.PRONOUNS){const w=W.conjugate(root,p,pr,vow);n++;
   const r=W.analyzeAll(w).some(x=>x.جذر===root&&x.وزن===p.وزن&&x.ضمير===pr);if(!r){miss++;const k=p.وزن+'/'+pr;bad2[k]=(bad2[k]||0)+1;if(miss<8)console.log('غائب',root,p.وزن,pr,w)}}}}
t(miss===0,'إغلاق المعتل والمضعّف: غائب '+miss+' من '+n);
if(miss)console.log(Object.entries(bad2).slice(0,12));
console.log('صيغ',n,'غائب',miss,'| نجح',ok,'فشل',bad);process.exit(bad?1:0);
