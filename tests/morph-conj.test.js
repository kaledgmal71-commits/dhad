// إسناد الماضي للضمائر: توليد (جذر × وزن × ضمير) ثم تحليل؛ يجب أن يعود الجذر والوزن والضمير.
const C=require('../tools/morph_conj.js'),M=require('../tools/morph_ar.js');let ok=0,bad=0;const t=(c,m)=>{if(c)ok++;else{bad++;if(bad<15)console.log('فشل:',m)}};
const ex=[['كتب','فَعَلَ','أنا','كَتَبْتُ'],['كتب','فَعَلَ','هم','كَتَبُوا'],['علم','فَعِلَ','هي','عَلِمَتْ'],['علم','فَعَّلَ','نحن','عَلَّمْنَا'],['درس','فَاعَلَ','أنتم','دَارَسْتُمْ'],['نصر','أَفْعَلَ','هنّ','أَنْصَرْنَ']];
for(const [r,w,pr,exp] of ex){const p=M.PATTERNS.find(x=>x.وزن===w&&/^ماضٍ/.test(x.نوع));t(!!p&&C.conjugate(r,p,pr)===exp.normalize('NFC'),'مثال '+exp+' ← '+(p&&C.conjugate(r,p,pr)))}
const L=[...'بتثجحخدذرزسشصضطظعغفقكلمنه'];let seed=11;const rnd=()=>(seed=(seed*1103515245+12345)&0x7fffffff)/0x7fffffff;const pk=()=>L[Math.floor(rnd()*L.length)];
let n=0,miss=0;const pats=M.PATTERNS.filter(C.PAST_SOUND);
for(let i=0;i<300;i++){const a=pk(),b=pk(),d=pk(),e=pk();const roots=[];if(a!==b&&b!==d&&a!==d)roots.push(a+b+d);if(new Set([a,b,d,e]).size===4)roots.push(a+b+d+e);
 for(const root of roots)for(const p of pats){if(!M.applies(root,p))continue;for(const [pr] of C.PRONOUNS){const w=C.conjugate(root,p,pr);n++;if(!C.analyze(w).some(x=>x.جذر===root&&x.وزن===p.وزن&&x.ضمير===pr)){miss++;if(miss<6)console.log('غائب',root,p.وزن,pr,w)}}}}
t(miss===0,'إغلاق: غائب '+miss+' من '+n);
console.log('صيغ مسندة',n,'غائب',miss,'| نجح',ok,'فشل',bad);process.exit(bad?1:0);
