// طبقات المحوّل: (١) مطابقة المخرجات لمرجع JS مستقل بالأوزان نفسها (٢) تدرجات بالفروق المنتهية لكل معامل (٣) السببية (٤) تدريب فعلي يتعلّم نمطًا يحتاج سياقًا
const R=require('../site/run.js');
let pass=0,fail=0;const ok=(c,m)=>{if(c)pass++;else{fail++;console.log('FAIL',m)}};
const AR='٠١٢٣٤٥٦٧٨٩';const num=s=>Number(s.replace(/[٠-٩]/g,d=>AR.indexOf(d)).replace(/٫/g,'.').replace(/−/g,'-'));
const PRE=`
متغير م = استورد("ضاد/مصفوفات")
متغير ت = استورد("ضاد/تفاضل")
متغير ر = استورد("ضاد/رياضيات")
متغير ط = استورد("ضاد/طبقات")
متغير ح = استورد("ضاد/محسنات")
متغير غ = ر.مولّد(٤٢)
متغير إعداد = {"مفردات": ٥، "د": ٤، "رؤوس": ٢، "طبقات": ١، "مخفي": ٦، "أقصى_طول": ٨}
متغير ن = ط.نموذج(إعداد، غ)
`;
const V=5,D=4,H=2,L=1,HID=6,DH=D/H;
// ---------- (١) مطابقة المرجع ----------
const toks=[1,3,0,4];
const r1=R.run(PRE+`
متغير ق = ط.معاملات(ن)
من_أجل (ع في ق) { من_أجل (ب في ع["قيمة"]["بيانات"]) { اطبع(ب) } }
متغير سج = ط.أمام(ن، [١، ٣، ٠، ٤])["قيمة"]
من_أجل (ب في سج["بيانات"]) { اطبع(ب) }
متغير سج٢ = ط.أمام(ن، [١، ٣، ٠، ٢])["قيمة"]
متغير أقصى = ٠
من_أجل (ك من ٠ إلى ٣ * ٥ - ١) { إذا (مطلق(سج["بيانات"][ك] - سج٢["بيانات"][ك]) > أقصى) { أقصى = مطلق(سج["بيانات"][ك] - سج٢["بيانات"][ك]) } }
اطبع(أقصى)
متغير آخر = ٠
من_أجل (ك من ٣ * ٥ إلى ٤ * ٥ - ١) { آخر = آخر + مطلق(سج["بيانات"][ك] - سج٢["بيانات"][ك]) }
اطبع(آخر)
`,{maxMs:240000,maxSteps:900000000});
if(!r1.ok){ok(false,'تشغيل '+JSON.stringify(r1).slice(0,300))}else{
  const nums=r1.out.map(num);let p=0;const take=(n)=>{const a=nums.slice(p,p+n);p+=n;return a};
  const mat=(r,c)=>{const a=take(r*c);return Array.from({length:r},(_,i)=>a.slice(i*c,(i+1)*c))};
  const emb=mat(V,D);const blocks=[];
  for(let l=0;l<L;l++)blocks.push({g1:take(D),wq:mat(D,D),wk:mat(D,D),wv:mat(D,D),wo:mat(D,D),g2:take(D),w1:mat(D,HID),w3:mat(D,HID),w2:mat(HID,D)});
  const gf=take(D);const got=mat(4,V);const causal=take(1)[0],lastDiff=take(1)[0];
  const mm=(A,B)=>A.map(r=>B[0].map((_,j)=>r.reduce((s,v,k)=>s+v*B[k][j],0)));
  const rms=(X,g)=>X.map(r=>{const m=r.reduce((s,v)=>s+v*v,0)/r.length;const k=1/Math.sqrt(m+1e-6);return r.map((v,i)=>v*k*g[i])});
  const rope=(X)=>X.map((r,pos)=>{const out=[];const half=DH/2;for(let k=0;k<DH;k++){const i=k%half;const ang=pos*Math.pow(10000,-2*i/DH);const rot=k<half?-r[k+half]:r[k-half];out.push(r[k]*Math.cos(ang)+rot*Math.sin(ang))}return out});
  const sm=r=>{const m=Math.max(...r);const e=r.map(v=>Math.exp(v-m));const s=e.reduce((a,b)=>a+b,0);return e.map(v=>v/s)};
  let x=toks.map(t=>emb[t].slice());
  for(const b of blocks){
    const n1=rms(x,b.g1);const q=mm(n1,b.wq),k=mm(n1,b.wk),v=mm(n1,b.wv);const heads=[];
    for(let h=0;h<H;h++){const sl=M=>M.map(r=>r.slice(h*DH,(h+1)*DH));const qh=rope(sl(q)),kh=rope(sl(k)),vh=sl(v);
      const sc=qh.map((qr,i)=>kh.map((kr,j)=>j<=i?qr.reduce((s,a,c)=>s+a*kr[c],0)/Math.sqrt(DH):-1e9));heads.push(mm(sc.map(sm),vh))}
    const cat=x.map((_,i)=>[].concat(...heads.map(hh=>hh[i])));const at=mm(cat,b.wo);x=x.map((r,i)=>r.map((v,j)=>v+at[i][j]));
    const n2=rms(x,b.g2);const a=mm(n2,b.w1),bb=mm(n2,b.w3);const gate=a.map((r,i)=>r.map((v,j)=>v/(1+Math.exp(-v))*bb[i][j]));const ff=mm(gate,b.w2);x=x.map((r,i)=>r.map((v,j)=>v+ff[i][j]))}
  const ref=mm(rms(x,gf),emb.map(r=>r)[0].map((_,j)=>emb.map(r=>r[j])));
  let err=0;for(let i=0;i<4;i++)for(let j=0;j<V;j++)err=Math.max(err,Math.abs(ref[i][j]-got[i][j]));
  ok(err<1e-9,'مطابقة المرجع المستقل: أقصى فرق '+err);
  ok(causal===0,'السببية: تغيير الرمز الأخير لا يغيّر سجلات ما قبله (فرق '+causal+')');
  ok(lastDiff>1e-6,'ضابط سلبي: تغيير الرمز الأخير يغيّر سجلاته هو ('+lastDiff+')');
}
// ---------- (٢) تدرجات بالفروق المنتهية ----------
const r2=R.run(PRE+`
متغير ق = ط.معاملات(ن)
دالة بناء() { ارجع ط.خسارة_التسلسل(ن، [١، ٣، ٠، ٤، ٢]) }
ت.صفّر_تدرجات(ق)
ت.انتشر_خلفا(بناء())
متغير أقصى = ٠
متغير عدد = ٠
من_أجل (ع في ق) {
    متغير تحليلي = ع["تدرج"]
    إذا (تحليلي == لاشيء) { أطلق_خطأ("معامل بلا تدرج") }
    متغير ب = ع["قيمة"]["بيانات"]
    من_أجل (ي من ٠ إلى طول(ب) - ١) {
        متغير ق٠ = ب[ي]
        ب[ي] = ق٠ + ٠.٠٠٠٠١
        متغير أ١ = بناء()["قيمة"]["بيانات"][٠]
        ب[ي] = ق٠ - ٠.٠٠٠٠١
        متغير أ٢ = بناء()["قيمة"]["بيانات"][٠]
        ب[ي] = ق٠
        متغير عددي = (أ١ - أ٢) / ٠.٠٠٠٠٢
        متغير خ = مطلق(عددي - تحليلي["بيانات"][ي]) / (١ + مطلق(عددي))
        إذا (خ > أقصى) { أقصى = خ }
        عدد = عدد + ١
    }
}
اطبع(أقصى، عدد)`,{maxMs:600000,maxSteps:4000000000});
if(!r2.ok)ok(false,'تدرجات '+JSON.stringify(r2).slice(0,300));else{const [e,n]=r2.out[r2.out.length-1].split(' ').map(num);ok(e<1e-6&&n>150,`تدرجات كل المعاملات: أقصى خطأ نسبي ${e} على ${n} معاملًا`)}
// ---------- (٤) تدريب فعلي: نمط يحتاج سياقًا (بعد ٠ يأتي ١ ثم ٢ ثم ٣ بالتناوب) ----------
const r4=R.run(`
متغير م = استورد("ضاد/مصفوفات")
متغير ت = استورد("ضاد/تفاضل")
متغير ر = استورد("ضاد/رياضيات")
متغير ط = استورد("ضاد/طبقات")
متغير ح = استورد("ضاد/محسنات")
متغير غ = ر.مولّد(٧)
متغير ن = ط.نموذج({"مفردات": ٤، "د": ١٦، "رؤوس": ٢، "طبقات": ١، "مخفي": ٣٢، "أقصى_طول": ١٦}، غ)
متغير ق = ط.معاملات(ن)
متغير مح = ح.آدم(ق، ٠.٠٢)
متغير تسلسل = [٠، ١، ٠، ٢، ٠، ٣، ٠، ١، ٠، ٢، ٠، ٣]
متغير أولى = ٠
متغير أخيرة = ٠
من_أجل (خ من ١ إلى ٢٠٠) {
    ت.صفّر_تدرجات(ق)
    متغير خسارة = ط.خسارة_التسلسل(ن، تسلسل)
    ت.انتشر_خلفا(خسارة)
    إذا (خ == ١) { أولى = خسارة["قيمة"]["بيانات"][٠] }
    أخيرة = خسارة["قيمة"]["بيانات"][٠]
    ح.خطوة(مح)
}
اطبع(أولى، أخيرة)
متغير خرج = ط.ولّد_جشعا(ن، [٠، ١، ٠، ٢]، ٨)
من_أجل (ك في خرج) { اطبع(ك) }`,{maxMs:900000,maxSteps:9000000000});
if(!r4.ok)ok(false,'تدريب '+JSON.stringify(r4).slice(0,400));else{const [l0,l1]=r4.out[0].split(' ').map(num);const gen=r4.out.slice(1).map(num).join('');
  ok(l1<l0*0.05,`التدريب يخفض الخسارة: ${l0} → ${l1}`);
  ok(gen==='010203010203','التوليد الجشع يكمل النمط السياقي: '+gen);}
console.log('pass',pass,'fail',fail);process.exit(fail?1:0);
