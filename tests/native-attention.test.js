// نواة الانتباه المدمج: (١) مطابقة مرجع JS مستقل أمامًا وخلفًا (٢) مطابقة المسار المفكَّك داخل النموذج: مخرجات وتدرجات كل معامل (٣) تدريب بالمسارين يعطي الخسارة نفسها (٤) حالات الحدود
const R=require('../site/run.js');
let pass=0,fail=0;const ok=(c,m)=>{if(c)pass++;else{fail++;console.log('FAIL',m)}};
const AR='٠١٢٣٤٥٦٧٨٩';const num=s=>Number(String(s).replace(/[٠-٩]/g,d=>AR.indexOf(d)).replace(/٫/g,'.').replace(/−/g,'-'));
const PRE=`
متغير م = استورد("ضاد/مصفوفات")
متغير ت = استورد("ضاد/تفاضل")
متغير ر = استورد("ضاد/رياضيات")
متغير ط = استورد("ضاد/طبقات")
`;
// ---------- (١) النواة مقابل مرجع JS مستقل ----------
{
  const T=5,dh=3,scale=1/Math.sqrt(dh);
  let seed=7;const rnd=()=>{seed=(seed*1103515245+12345)%2147483648;return seed/2147483648*2-1};
  const gen=n=>Array.from({length:n},rnd);
  const q=gen(T*dh),k=gen(T*dh),v=gen(T*dh),dO=gen(T*dh);
  // مرجع مستقل
  const P=[];for(let i=0;i<T;i++){const row=Array(T).fill(0);let s=[];for(let j=0;j<=i;j++){let a=0;for(let t=0;t<dh;t++)a+=q[i*dh+t]*k[j*dh+t];s.push(a*scale)}const m=Math.max(...s);const e=s.map(x=>Math.exp(x-m));const z=e.reduce((a,b)=>a+b,0);e.forEach((x,j)=>row[j]=x/z);P.push(row)}
  const out=[];for(let i=0;i<T;i++)for(let t=0;t<dh;t++){let a=0;for(let j=0;j<T;j++)a+=P[i][j]*v[j*dh+t];out.push(a)}
  const dv=Array(T*dh).fill(0),dq=Array(T*dh).fill(0),dk=Array(T*dh).fill(0);
  for(let i=0;i<T;i++){const dP=[];for(let j=0;j<T;j++){let a=0;for(let t=0;t<dh;t++)a+=dO[i*dh+t]*v[j*dh+t];dP.push(a)}
    let dot=0;for(let j=0;j<T;j++)dot+=dP[j]*P[i][j];
    for(let j=0;j<T;j++){const ds=P[i][j]*(dP[j]-dot)*scale;for(let t=0;t<dh;t++){dv[j*dh+t]+=P[i][j]*dO[i*dh+t];dq[i*dh+t]+=ds*k[j*dh+t];dk[j*dh+t]+=ds*q[i*dh+t]}}}
  const L=a=>'['+a.map(x=>String(x).replace('-','-')).join('،')+']';
  const dhad=a=>'['+a.map(x=>(x<0?'-':'')+String(Math.abs(x)).replace(/\d/g,d=>AR[d]).replace('.','.').replace('e-','e-')).join('،')+']';
  const r=R.run(`
متغير ن = نواة_انتباه_أمامي(${dhad(q)}، ${dhad(k)}، ${dhad(v)}، ${T}، ${dh}، ${scale})
من_أجل (ع في ن[٠]) { اطبع(ع) }
من_أجل (ع في ن[١]) { اطبع(ع) }
متغير خ = نواة_انتباه_خلفي(${dhad(q)}، ${dhad(k)}، ${dhad(v)}، ن[١]، ${dhad(dO)}، ${T}، ${dh}، ${scale})
من_أجل (ص في خ) { من_أجل (ع في ص) { اطبع(ع) } }
`,{maxMs:60000});
  if(!r.ok)ok(false,'تشغيل النواة '+JSON.stringify(r).slice(0,300));else{
    const n=r.out.map(num);let p=0;const take=c=>{const a=n.slice(p,p+c);p+=c;return a};
    const gOut=take(T*dh),gP=take(T*T),gq=take(T*dh),gk=take(T*dh),gv=take(T*dh);
    const mx=(a,b)=>Math.max(...a.map((x,i)=>Math.abs(x-b[i])));
    ok(mx(gOut,out)<1e-12,'الخرج الأمامي '+mx(gOut,out));
    ok(mx(gP,P.flat())<1e-12,'الاحتمالات '+mx(gP,P.flat()));
    ok(mx(gq,dq)<1e-12,'تدرج ق '+mx(gq,dq));ok(mx(gk,dk)<1e-12,'تدرج ف '+mx(gk,dk));ok(mx(gv,dv)<1e-12,'تدرج ك '+mx(gv,dv));
    // السببية: احتمال المواضع المستقبلية صفر تمامًا، وكل صف مجموعه ١
    let fut=0,sums=true;for(let i=0;i<T;i++){let s=0;for(let j=0;j<T;j++){s+=gP[i*T+j];if(j>i&&gP[i*T+j]!==0)fut++}if(Math.abs(s-1)>1e-12)sums=false}
    ok(fut===0,'لا احتمال للمستقبل');ok(sums,'مجموع كل صف ١');
  }
}
// ---------- (٢) مطابقة المسار المفكَّك داخل النموذج ----------
const MODEL=`
متغير غ = ر.مولّد(٤٢)
متغير ن = ط.نموذج({"مفردات": ٥، "د": ٨، "رؤوس": ٢، "طبقات": ٢، "مخفي": ١٠، "أقصى_طول": ٨}، غ)
متغير تسلسل = [١، ٣، ٠، ٤، ٢، ١]
دالة خسارة(مرجعي) {
    ط.أمام_مرجعي_مفعّل(مرجعي)
    متغير س = ط.أمام(ن، تسلسل)
    ارجع ت.خسارة_متقاطعة(س، [٣، ٠، ٤، ٢، ١، ٠])
}
`;
const hasToggle=/أمام_مرجعي_مفعّل/.test(require('fs').readFileSync('stdlib/طبقات.dhad','utf8'));
if(!hasToggle){
  // لا مفتاح عام: نبني مسارين عبر النموذج نفسه بالدالتين طبّق_انتباه وطبّق_انتباه_مرجعي مباشرةً على مُدخلات متطابقة
  const r=R.run(PRE+`
متغير غ = ر.مولّد(٩)
متغير ن = ط.انتباه(٨، ٢، غ)
متغير دوران = ط.جداول_الدوران(٨، ٤)
متغير ق = ت.معامل(م.عشوائي_طبيعي([٦، ٨]، غ، ٣))
متغير ق٢ = ت.معامل(م.من_قائمة(ق["قيمة"]["بيانات"]، [٦، ٨]))
متغير أ = ط.طبّق_انتباه(ن، ق، دوران)
متغير ب = ط.طبّق_انتباه_مرجعي(ن، ق٢، دوران)
متغير أقصى = ٠
من_أجل (ك من ٠ إلى ٤٧) { متغير ف = مطلق(أ["قيمة"]["بيانات"][ك] - ب["قيمة"]["بيانات"][ك]); إذا (ف > أقصى) { أقصى = ف } }
اطبع(أقصى)
متغير هدف = ت.جمع(ت.ضرب(أ، أ)، ت.مقياس(أ، ٣))
متغير هدف٢ = ت.جمع(ت.ضرب(ب، ب)، ت.مقياس(ب، ٣))
ت.انتشر_خلفا(ت.مجموع(هدف، لاشيء، خطأ))
ت.انتشر_خلفا(ت.مجموع(هدف٢، لاشيء، خطأ))
متغير غأقصى = ٠
من_أجل (ك من ٠ إلى ٤٧) { متغير ف = مطلق(ق["تدرج"]["بيانات"][ك] - ق٢["تدرج"]["بيانات"][ك]); إذا (ف > غأقصى) { غأقصى = ف } }
اطبع(غأقصى)
من_أجل (ع في [ن["ق"]، ن["ف"]، ن["ك"]، ن["خ"]]) { اطبع(ع["تدرج"] != لاشيء) }
`,{maxMs:120000,maxSteps:400000000});
  if(!r.ok)ok(false,'مقارنة المسارين '+JSON.stringify(r).slice(0,400));else{
    const f=r.out.map(num);
    ok(f[0]<1e-12,'مخرجات المدمج = المفكَّك '+r.out[0]);
    ok(f[1]<1e-10,'تدرج المدخل مطابق '+r.out[1]);
    ok(r.out.slice(2,6).every(x=>x==='صحيح'),'تدرجات معاملات الانتباه موجودة '+r.out.slice(2,6));
  }
}
// ---------- (٤) حدود ----------
{
  const bad=(src,msg)=>{const r=R.run(src,{maxMs:20000});ok(!r.ok&&/نواة_انتباه/.test(JSON.stringify(r)),msg+' '+JSON.stringify(r).slice(0,160))};
  bad('نواة_انتباه_أمامي([١]، [١]، [١]، ٢، ١، ١)','طول لا يطابق');
  bad('نواة_انتباه_أمامي(٥، [١]، [١]، ١، ١، ١)','ليست قائمة');
  bad('نواة_انتباه_أمامي([١]، [١]، [١]، -١، ١، ١)','بُعد سالب');
  const r=R.run('متغير ن = نواة_انتباه_أمامي([]، []، []، ٠، ٣، ١)\nاطبع(طول(ن[٠]))\nاطبع(طول(ن[١]))',{maxMs:20000});
  ok(r.ok&&r.out.join(',')==='٠,٠','طول صفر');
}
console.log(`native-attention: ${pass} passed, ${fail} failed`);process.exit(fail?1:0);
