// اختبار الترميز الذري للحرف العربي (tools/atomic_ar.js): اكتمال الجدول، التفرّد، والعكس بلا فقد.
const A=require('../tools/atomic_ar.js');let ok=0,bad=0;
const t=(c,m)=>{if(c)ok++;else{bad++;console.log('فشل:',m)}};
t(A.size===A.BASES.length*A.MARK_SETS.length,'حجم الجدول = حروف × تركيبات');
t(A.size===518,'٣٧ حرفًا × ١٤ تركيبة = ٥١٨');
t(new Set(A.TABLE.values()).size===A.size,'نقاط PUA فريدة');
t([...A.TABLE.values()].every(c=>{const p=c.codePointAt(0);return p>=0xE000&&p<=0xF8FF}),'كل النقاط داخل PUA');
for(const [k,v] of A.TABLE){t(A.decode(v)===k,'عكس '+k);t([...A.encode(k)].length===1,'نقطة واحدة '+k)}
// أمثلة المستخدم
for(const s of ['بَ','بِ','بُ','بْ','بَّ','بِّ','بُّ','بً','بٍ','بٌ','بًّ','بٍّ','بٌّ'])t(A.count(A.encode(s))===1,'مثال '+s);
// عشوائي: حروف وفراغات وعلامات بأي ترتيب (صالحة وغير صالحة)
let seed=12345;const rnd=()=>(seed=(seed*1103515245+12345)&0x7fffffff)/0x7fffffff;
const pool=[...A.BASES,' ',' ','ٰ','ـ',...'ًٌٍَُِّْ','a','1','،'];
for(let i=0;i<5000;i++){let s='';const n=1+Math.floor(rnd()*30);for(let j=0;j<n;j++)s+=pool[Math.floor(rnd()*pool.length)];
 t(A.decode(A.encode(s))===s.normalize('NFC'),'ذهاب وإياب عشوائي #'+i)}
// نص حقيقي مشكَّل (الفاتحة)
const F='بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ ٱلْحَمْدُ لِلَّهِ رَبِّ ٱلْعَٰلَمِينَ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ مَٰلِكِ يَوْمِ ٱلدِّينِ إِيَّاكَ نَعْبُدُ وَإِيَّاكَ نَسْتَعِينُ ٱهْدِنَا ٱلصِّرَٰطَ ٱلْمُسْتَقِيمَ';
t(A.decode(A.encode(F))===F.normalize('NFC'),'ذهاب وإياب نص مشكَّل');
t(A.utf8(A.encode(F))<A.utf8(F),'ينقص الحجم بالبايت');
t(A.count(A.encode(F))<A.count(F),'ينقص عدد الرموز');
console.log('نجح',ok,'فشل',bad);process.exit(bad?1:0);
