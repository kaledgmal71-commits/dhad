// الوزن قراءةً مباشرة على الحروف الذرية: توليد (جذر × وزن) ثم تحليله عكسيًّا؛ إغلاق عكوس + أمثلة معروفة + غياب الغموض.
const M=require('../tools/morph_ar.js');let ok=0,bad=0;const t=(c,m)=>{if(c)ok++;else{bad++;console.log('فشل:',m)}};
// كل قالب فيه الفاء والعين واللام مرة واحدة بالضبط
for(const p of M.PATTERNS){const s=p.units.filter(u=>'slot' in u).map(u=>u.slot).sort().join('');t(s==='012','مواضع الجذر '+p.وزن)}
// أمثلة معروفة
const ex=[['كتب','فَعَلَ','كَتَبَ'],['كتب','يَفْعُلُ','يَكْتُبُ'],['كتب','فَاعِلٌ','كَاتِبٌ'],['كتب','مَفْعُولٌ','مَكْتُوبٌ'],['علم','فَعِلَ','عَلِمَ'],['علم','فَعَّلَ','عَلَّمَ'],['علم','تَفْعِيلٌ','تَعْلِيمٌ'],['علم','ٱسْتَفْعَلَ','ٱسْتَعْلَمَ'],['درس','مُفَاعَلَةٌ','مُدَارَسَةٌ'],['شرح','يَتَفَعَّلُ','يَتَشَرَّحُ'],['فهم','ٱفْتَعَلَ','ٱفْتَهَمَ'],['نصر','أَفْعَلَ','أَنْصَرَ']];
for(const [r,pw,w] of ex){const p=M.PATTERNS.find(x=>x.وزن.replace('ا','ٱ')===pw||x.وزن===pw);t(!!p&&M.generate(r,p).normalize('NFC')===w.normalize('NFC'),'مثال '+r+' '+pw+' → '+w+' (الناتج '+(p&&M.generate(r,p))+')')}
// إغلاق عكوس عشوائي على جذور صحيحة
const L=[...'بتثجحخدذرزسشصضطظعغفقكلمنه'];let seed=7;const rnd=()=>(seed=(seed*1103515245+12345)&0x7fffffff)/0x7fffffff;
let words=0,multi=0,miss=0,other=0;
for(let i=0;i<400;i++){const r=[0,0,0].map(()=>L[Math.floor(rnd()*L.length)]);if(r[1]===r[2]||r[0]===r[1])continue;const root=r.join('');
 for(const p of M.PATTERNS){const w=M.generate(root,p);const a=M.analyze(w);words++;
  if(!a.some(x=>x.جذر===root&&x.وزن===p.وزن))miss++;
  const extra=a.filter(x=>(x.جذر!==root||x.وزن!==p.وزن)&&!x.معتل); // تحليلات بجذور معتلة تُعلَّم وتُرجأ إلى معجم الجذور
  if(extra.length){multi++;if(!(extra.every(x=>x.باب==='VII'||x.باب==='VIII')&&(p.باب==='VII'||p.باب==='VIII')))other++}}}
t(miss===0,'إغلاق عكوس: غائب '+miss+' من '+words);
t(other===0,'غموض خارج السابع/الثامن: '+other);
console.log('كلمات مولَّدة',words,'غائب',miss,'متعدد',multi);
console.log('نجح',ok,'فشل',bad);process.exit(bad?1:0);
