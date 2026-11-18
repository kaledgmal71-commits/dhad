// الوزن قراءةً مباشرة على الحروف الذرية: توليد (جذر × وزن) ثم تحليله عكسيًّا؛ إغلاق عكوس + أمثلة معروفة + غياب الغموض.
const M=require('../tools/morph_ar.js');let ok=0,bad=0;const t=(c,m)=>{if(c)ok++;else{bad++;console.log('فشل:',m)}};
// كل قالب فيه الفاء والعين واللام مرة واحدة بالضبط
for(const p of M.PATTERNS){const s=new Set(p.units.filter(u=>'slot' in u).map(u=>u.slot));const need=p.quad?[0,1,2,3]:p.dbl?[0,1]:p.missing!=null?[0,1,2].filter(i=>i!==p.missing):[0,1,2];t(need.every(i=>s.has(i))&&s.size===need.length,'مواضع الجذر '+p.وزن)}
// أمثلة معروفة
const ex=[['كتب','فَعَلَ','كَتَبَ'],['كتب','يَفْعُلُ','يَكْتُبُ'],['كتب','فَاعِلٌ','كَاتِبٌ'],['كتب','مَفْعُولٌ','مَكْتُوبٌ'],['علم','فَعِلَ','عَلِمَ'],['علم','فَعَّلَ','عَلَّمَ'],['علم','تَفْعِيلٌ','تَعْلِيمٌ'],['علم','ٱسْتَفْعَلَ','ٱسْتَعْلَمَ'],['درس','مُفَاعَلَةٌ','مُدَارَسَةٌ'],['شرح','يَتَفَعَّلُ','يَتَشَرَّحُ'],['فهم','ٱفْتَعَلَ','ٱفْتَهَمَ'],['نصر','أَفْعَلَ','أَنْصَرَ']];
for(const [r,pw,w] of ex){const p=M.PATTERNS.find(x=>x.وزن.replace('ا','ٱ')===pw||x.وزن===pw);t(!!p&&M.generate(r,p).normalize('NFC')===w.normalize('NFC'),'مثال '+r+' '+pw+' → '+w+' (الناتج '+(p&&M.generate(r,p))+')')}
// ملاحظة: مصدر الرباعي الثالث والرابع متطابق الشكل ويحسمه معجم الجذور
// إغلاق عكوس عشوائي على جذور صحيحة
const L=[...'بتثجحخدذرزسشصضطظعغفقكلمنه'];let seed=7;const rnd=()=>(seed=(seed*1103515245+12345)&0x7fffffff)/0x7fffffff;
let words=0,multi=0,miss=0,other=0;const WK=['و','ي'];const pick=a=>a[Math.floor(rnd()*a.length)];
const roots=[];for(let i=0;i<400;i++){const c=()=>pick(L);const a=c(),b=c(),d=c();if(a!==b&&b!==d&&a!==d)roots.push(a+b+d);
 roots.push(a+pick(WK)+d);                 // أجوف
 roots.push(a+b+pick(WK));                 // ناقص
 roots.push(a+b+b);                        // مضعّف
 roots.push(pick(['و','ي','ء'])+b+d);      // مثال/مهموز الفاء
 const e=c();if(new Set([a,b,d,e]).size===4)roots.push(a+b+d+e); // رباعي
 roots.push(a+b+a+b);                       // رباعي مضعّف (زلزل)
}
for(const root of roots){
 for(const p of M.PATTERNS){if(!M.applies(root,p))continue;const w=M.generate(root,p);const a=M.analyze(w);words++;
  if(!a.some(x=>x.جذر===root&&x.وزن===p.وزن))miss++;
  const extra=a.filter(x=>(x.جذر!==root||x.وزن!==p.وزن)&&!x.معتل); // تحليلات بجذور معتلة تُعلَّم وتُرجأ إلى معجم الجذور
  if(extra.length){multi++;const ok=bb=>bb==='VII'||bb==='VIII'||bb==='مجزوم'||bb==='اشتقاق من اسم'||bb.startsWith('رباعي')||bb==='X';if(!(extra.every(x=>ok(x.باب))&&ok(p.باب)))other++}}}
t(miss===0,'إغلاق عكوس: غائب '+miss+' من '+words);
t(other===0,'غموض خارج (السابع/الثامن، الاشتقاق من اسم): '+other);
console.log('كلمات مولَّدة',words,'غائب',miss,'متعدد',multi);
console.log('نجح',ok,'فشل',bad);process.exit(bad?1:0);
