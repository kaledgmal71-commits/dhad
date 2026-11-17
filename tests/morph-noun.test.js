// صرف الأسماء: توليد (جذر × وزن اسمي × حالة إعرابية) ثم تحليل؛ يجب أن يعود الجذر والوزن.
const N=require('../tools/morph_noun.js'),M=require('../tools/morph_ar.js');let ok=0,bad=0;const t=(c,m)=>{if(c)ok++;else{bad++;if(bad<20)console.log('فشل:',m)}};
const ex=[['كَاتِبٌ','كتب'],['مَكْتُوبٌ','كتب'],['كُتُبٌ','كتب'],['مَكْتَبَةٌ','كتب'],['كِتَابَةٌ','كتب'],['مُسْتَخْرِجٌ','خرج'],['قَائِلٌ','قول'],['إِقَامَةٌ','قوم'],['قَاضِي','قضي'],['مَرْمًى','رمي'],['بَرٌّ','برر'],['مِيعَادٌ','وعد'],['مَدَارِسُ','درس'],['مُسْلِمُونَ','سلم'],['كَاتِبَاتٌ','كتب'],['كَاتِبَانِ','كتب']];
for(const [w,r] of ex)t(N.analyzeBare(w).some(x=>N.HAM(x.جذر)===N.HAM(r)),'مثال '+w+' ← '+r+' : '+JSON.stringify(N.analyzeBare(w).map(x=>x.جذر)));
const L=[...'بتثجحخدذرزسشصضطظعغفقكلمنه'];let seed=23;const rnd=()=>(seed=(seed*1103515245+12345)&0x7fffffff)/0x7fffffff;const pk=a=>a[Math.floor(rnd()*a.length)];
let n=0,miss=0;const bad2={};
const cases=w=>{const out=[w];const m=w.match(/^(.*[^ً-ْ])([ٌ])$/);if(/ٌ$/.test(w)&&!/(ٌّ)$/.test(w)){const b=w.slice(0,-1);out.push(b+'ُ',b+'ِ');if(!/[ةءىاي]$/.test(b))out.push(b+'ٍ');if(!/[ءىا]$/.test(b))out.push(b+'ً'+(/ة$/.test(b)?'':'ا'));}return out};
for(let i=0;i<120;i++){const a=pk(L),b=pk(L),d=pk(L),e=pk(L);if(a===b||b===d||a===d)continue;const roots=[a+b+d,a+pk(['و','ي'])+d,a+b+pk(['و','ي']),pk(['و','ي'])+b+d,a+b+b];
 for(const root of roots)for(const p of N.NP){if(!M.applies(root,p))continue;const w=M.generate(root,p);
  // الممنوع من الصرف يُنتَج بضمة؛ المنوَّن بتنوين
  for(const v of cases(w)){n++;if(!N.analyzeBare(v).some(x=>x.جذر===root)){miss++;const k=p.وزن;bad2[k]=(bad2[k]||0)+1;if(miss<6)console.log('غائب',root,p.وزن,v)}}}}
t(miss===0,'إغلاق الأسماء: غائب '+miss+' من '+n);
if(miss)console.log(Object.entries(bad2).sort((a,b)=>b[1]-a[1]).slice(0,15));
console.log('كلمات',n,'غائب',miss,'| نجح',ok,'فشل',bad);process.exit(bad?1:0);
