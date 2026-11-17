// إسناد الماضي للضمائر: توليد (جذر × وزن × ضمير) ثم تحليل؛ يجب أن يعود الجذر والوزن والضمير.
const C=require('../tools/morph_conj.js'),M=require('../tools/morph_ar.js');let ok=0,bad=0;const t=(c,m)=>{if(c)ok++;else{bad++;if(bad<15)console.log('فشل:',m)}};
const ex=[['كتب','فَعَلَ','أنا','كَتَبْتُ'],['كتب','فَعَلَ','هم','كَتَبُوا'],['علم','فَعِلَ','هي','عَلِمَتْ'],['علم','فَعَّلَ','نحن','عَلَّمْنَا'],['درس','فَاعَلَ','أنتم','دَارَسْتُمْ'],['نصر','أَفْعَلَ','هنّ','أَنْصَرْنَ']];
for(const [r,w,pr,exp] of ex){const p=M.PATTERNS.find(x=>x.وزن===w&&/^ماضٍ/.test(x.نوع));t(!!p&&C.conjugate(r,p,pr)===exp.normalize('NFC'),'مثال '+exp+' ← '+(p&&C.conjugate(r,p,pr)))}
const L=[...'بتثجحخدذرزسشصضطظعغفقكلمنه'];let seed=11;const rnd=()=>(seed=(seed*1103515245+12345)&0x7fffffff)/0x7fffffff;const pk=()=>L[Math.floor(rnd()*L.length)];
let n=0,miss=0;const pats=M.PATTERNS.filter(C.PAST_SOUND);
for(let i=0;i<300;i++){const a=pk(),b=pk(),d=pk(),e=pk();const roots=[];if(a!==b&&b!==d&&a!==d)roots.push(a+b+d);if(new Set([a,b,d,e]).size===4)roots.push(a+b+d+e);
 for(const root of roots)for(const p of pats){if(!M.applies(root,p))continue;for(const [pr] of C.PRONOUNS){const w=C.conjugate(root,p,pr);n++;if(!C.analyze(w).some(x=>x.جذر===root&&x.وزن===p.وزن&&x.ضمير===pr)){miss++;if(miss<6)console.log('غائب',root,p.وزن,pr,w)}}}}
t(miss===0,'إغلاق: غائب '+miss+' من '+n);
// المضارع والأمر
let n2=0,miss2=0;const pp=M.PATTERNS.filter(C.PRES_SOUND),ip=M.PATTERNS.filter(C.IMP_SOUND);
for(let i=0;i<300;i++){const a=pk(),b=pk(),d=pk(),e=pk();const roots=[];if(a!==b&&b!==d&&a!==d)roots.push(a+b+d);if(new Set([a,b,d,e]).size===4)roots.push(a+b+d+e);
 for(const root of roots){for(const p of pp){if(!M.applies(root,p))continue;for(const [pr] of C.PRES){const w=C.conjPresent(root,p,pr);n2++;if(!C.analyze(w).some(x=>x.جذر===root&&x.وزن===p.وزن&&x.ضمير===pr)){miss2++;if(miss2<6)console.log('غائب مضارع',root,p.وزن,pr,w)}}}
  for(const p of ip){if(!M.applies(root,p))continue;for(const [pr] of C.IMP){const w=C.conjImperative(root,p,pr);n2++;if(!C.analyze(w).some(x=>x.جذر===root&&x.ضمير===pr&&x.نوع===p.نوع)){miss2++;if(miss2<6)console.log('غائب أمر',root,p.وزن,pr,w)}}}}}
t(miss2===0,'إغلاق المضارع والأمر: غائب '+miss2+' من '+n2);
t(C.conjPresent('كتب',M.PATTERNS.find(x=>x.وزن==='يَفْعُلُ'),'هم')==='يَكْتُبُونَ','يَكْتُبُونَ');
console.log('مضارع/أمر مسنَد',n2,'غائب',miss2);
console.log('صيغ مسندة',n,'غائب',miss,'| نجح',ok,'فشل',bad);process.exit(bad?1:0);
