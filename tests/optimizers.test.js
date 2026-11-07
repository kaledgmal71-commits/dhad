// المحسّنات: كل صيغة تُقارَن قيمةً بقيمة بتنفيذ JS مستقل كُتب من تعريف PyTorch، ثم اختبارات سلوك (انحدار خطي، روزنبروك، قص، جدولة)
const R=require('../site/run.js');
let pass=0,fail=0;const ok=(c,m)=>{if(c)pass++;else{fail++;console.log('FAIL',m)}};
const AR='٠١٢٣٤٥٦٧٨٩';const num=s=>Number(s.replace(/[٠-٩]/g,d=>AR.indexOf(d)).replace(/٫/g,'.'));
const A=x=>String(x).replace(/\d/g,d=>AR[d]).replace(/\./g,'٫').replace(/-/g,'-');
const lit=v=>'['+v.map(x=>(x<0?'-':'')+A(Math.abs(x))).join('،')+']';
const PRE=`
متغير م = استورد("ضاد/مصفوفات")
متغير ت = استورد("ضاد/تفاضل")
متغير ح = استورد("ضاد/محسنات")
متغير ر = استورد("ضاد/رياضيات")
`;
const w0=[0.5,-1.2,2.0,0.3],tg=[1,0.5,-0.7,2],cc=[1,2,0.5,3],N=25;
// مرجع JS مستقل (PyTorch semantics)
function refSGD(o){const w=w0.slice(),buf=w.map(()=>0);for(let t=1;t<=N;t++){for(let i=0;i<w.length;i++){let g=2*cc[i]*(w[i]-tg[i])+o.wd*w[i];if(o.mom){buf[i]=t===1?g:o.mom*buf[i]+g;g=o.nest?g+o.mom*buf[i]:buf[i];}w[i]-=o.lr*g;}}return w}
function refAdam(o){const w=w0.slice(),m=w.map(()=>0),v=w.map(()=>0);for(let t=1;t<=N;t++){for(let i=0;i<w.length;i++){let g=2*cc[i]*(w[i]-tg[i]);if(o.wd){if(o.decoupled)w[i]*=1-o.lr*o.wd;else g+=o.wd*w[i];}m[i]=.9*m[i]+.1*g;v[i]=.999*v[i]+.001*g*g;const mh=m[i]/(1-Math.pow(.9,t)),vh=v[i]/(1-Math.pow(.999,t));w[i]-=o.lr*mh/(Math.sqrt(vh)+1e-8);}}return w}
const PROG=(make)=>PRE+`
متغير وم = ت.معامل(م.من_قائمة(${lit(w0)}، [٤]))
متغير هدف = ت.ثابت(م.من_قائمة(${lit(tg)}، [٤]))
متغير أوزان = ت.ثابت(م.من_قائمة(${lit(cc)}، [٤]))
متغير مح = ${make}
من_أجل (خ من ١ إلى ${N}) {
    ت.صفّر_تدرجات([وم])
    متغير خسارة = ت.مجموع(ت.ضرب(أوزان، ت.مربع(ت.طرح(وم، هدف))))
    ت.انتشر_خلفا(خسارة)
    ح.خطوة(مح)
}
اطبع(وم["قيمة"]["بيانات"][٠]، وم["قيمة"]["بيانات"][١]، وم["قيمة"]["بيانات"][٢]، وم["قيمة"]["بيانات"][٣])
`;
const fix=s=>s;
function cmp(name,make,ref){const r=R.run(fix(PROG(make)),{maxMs:240000,maxSteps:900000000});if(!r.ok){ok(false,name+' '+JSON.stringify(r).slice(0,300));return}
  const got=r.out[r.out.length-1].split(' ').map(num);let err=0;for(let i=0;i<4;i++)err=Math.max(err,Math.abs(got[i]-ref[i])/(1+Math.abs(ref[i])));ok(err<1e-9,`${name}: أقصى فرق نسبي ${err} got=${got} ref=${ref}`);return got}
const g1=cmp('SGD',`ح.سجد([وم]، ٠.٠٥)`,refSGD({lr:.05,mom:0,wd:0}));
cmp('SGD + زخم',`ح.سجد([وم]، ٠.٠٢، ٠.٩)`,refSGD({lr:.02,mom:.9,wd:0}));
cmp('SGD + نستيروف + اضمحلال',`ح.سجد([وم]، ٠.٠٢، ٠.٩، صحيح، ٠.٠١)`,refSGD({lr:.02,mom:.9,nest:true,wd:.01}));
const g4=cmp('Adam',`ح.آدم([وم]، ٠.١)`,refAdam({lr:.1,wd:0}));
cmp('Adam + L2',`ح.آدم([وم]، ٠.١، ٠.٩، ٠.٩٩٩، ٠.٠٠٠٠٠٠٠١، ٠.٠١)`,refAdam({lr:.1,wd:.01}));
cmp('AdamW',`ح.آدم_ث([وم]، ٠.١، ٠.٠١)`,refAdam({lr:.1,wd:.01,decoupled:true}));
ok(g1&&g4&&Math.max(...g1.map((x,i)=>Math.abs(x-g4[i])))>1e-3,'ضابط سلبي: Adam يختلف عن SGD فالمقارنة ليست تافهة');
// انحدار خطي: y = 3x + 2
{const xs=[],ys=[];for(let i=0;i<20;i++){const x=i/5-2;xs.push(x);ys.push(3*x+2)}
const r=R.run(PRE+`
متغير غ = ر.مولّد(٧)
متغير س = ت.ثابت(م.من_قائمة(${lit(xs)}، [٢٠، ١]))
متغير ص = م.من_قائمة(${lit(ys)}، [٢٠، ١])
متغير ميل = ت.معامل(م.من_قائمة([٠]، [١، ١]))
متغير جزء = ت.معامل(م.من_قائمة([٠]، [١]))
متغير مح = ح.آدم([ميل، جزء]، ٠.٠٥)
متغير أولى = ٠
متغير أخيرة = ٠
من_أجل (خ من ١ إلى ٤٠٠) {
    ت.صفّر_تدرجات([ميل، جزء])
    متغير خسارة = ت.مربع_الأخطاء(ت.جمع(ت.ضرب_مصفوفي(س، ميل)، جزء)، ص)
    ت.انتشر_خلفا(خسارة)
    إذا (خ == ١) { أولى = خسارة["قيمة"]["بيانات"][٠] }
    أخيرة = خسارة["قيمة"]["بيانات"][٠]
    ح.خطوة(مح)
}
اطبع(ميل["قيمة"]["بيانات"][٠]، جزء["قيمة"]["بيانات"][٠]، أولى، أخيرة)`,{maxMs:240000,maxSteps:900000000});
 if(!r.ok)ok(false,'انحدار '+JSON.stringify(r).slice(0,300));else{const [a,b,l0,l1]=r.out[r.out.length-1].split(' ').map(num);ok(Math.abs(a-3)<0.02&&Math.abs(b-2)<0.02&&l1<l0*1e-4,`انحدار خطي: ميل=${a} جزء=${b} خسارة ${l0}→${l1}`)}}
// روزنبروك بـ Adam: الخسارة تهبط بأكثر من ٩٨٪
{const r=R.run(PRE+`
متغير ص = ت.معامل(م.من_قائمة([-١.٢، ١]، [٢]))
متغير مح = ح.آدم([ص]، ٠.٠٢٥)
متغير أولى = ٠
متغير أخيرة = ٠
من_أجل (خ من ١ إلى ١٢٠٠) {
    ت.صفّر_تدرجات([ص])
    متغير س١ = ت.شريحة(ص، ٠، ٠، ١)
    متغير س٢ = ت.شريحة(ص، ٠، ١، ٢)
    متغير خسارة = ت.مجموع(ت.جمع(ت.مربع(ت.جمع(ت.مقياس(س١، -١)، ت.ثابت(م.من_قائمة([١]، [١])))), ت.مقياس(ت.مربع(ت.طرح(س٢، ت.مربع(س١))), ١٠٠)), لاشيء, خطأ)
    ت.انتشر_خلفا(خسارة)
    إذا (خ == ١) { أولى = خسارة["قيمة"]["بيانات"][٠] }
    أخيرة = خسارة["قيمة"]["بيانات"][٠]
    ح.خطوة(مح)
}
اطبع(أولى، أخيرة)`.replace(/لاشيء, خطأ/g,'لاشيء،خطأ'),{maxMs:300000,maxSteps:2000000000});
 if(!r.ok)ok(false,'روزنبروك '+JSON.stringify(r).slice(0,400));else{const [l0,l1]=r.out[r.out.length-1].split(' ').map(num);ok(l1<l0*0.02,`روزنبروك: ${l0} → ${l1}`)}}
// قصّ التدرجات
{const r=R.run(PRE+`
متغير ب = ت.معامل(م.من_قائمة([٠، ٠]، [٢]))
ب["تدرج"] = م.من_قائمة([٣، ٤]، [٢])
متغير معيار = ح.قصّ_التدرجات([ب]، ١)
اطبع(معيار، ب["تدرج"]["بيانات"][٠]، ب["تدرج"]["بيانات"][١])
ب["تدرج"] = م.من_قائمة([٠.٣، ٠.٤]، [٢])
ح.قصّ_التدرجات([ب]، ١)
اطبع(ب["تدرج"]["بيانات"][٠]، ب["تدرج"]["بيانات"][١])`,{});
 if(!r.ok)ok(false,'قص '+JSON.stringify(r).slice(0,300));else{const [n,a,b]=r.out[0].split(' ').map(num),[c,d]=r.out[1].split(' ').map(num);ok(Math.abs(n-5)<1e-9&&Math.abs(a-.6)<1e-5&&Math.abs(b-.8)<1e-5,`قص: ${r.out[0]}`);ok(c===0.3&&d===0.4,'لا يُقصّ ما دون الحد '+r.out[1])}}
// جدولة جيب التمام مع احماء
{const steps=[0,4,9,10,30,55,99,100,150];const exp=steps.map(s=>{const W=10,T=100,mx=.001,mn=.0001;if(s<W)return mx*(s+1)/W;if(s>=T)return mn;const p=(s-W)/(T-W);return mn+.5*(mx-mn)*(1+Math.cos(Math.PI*p))});
 const r=R.run(PRE+steps.map(s=>`اطبع(ح.جدول_جيبي(${A(s)}، ١٠٠، ١٠، ٠.٠٠١، ٠.٠٠٠١))`).join('\n'),{});
 if(!r.ok)ok(false,'جدولة '+JSON.stringify(r).slice(0,300));else{let e=0;r.out.forEach((o,i)=>{e=Math.max(e,Math.abs(num(o)-exp[i])/exp[i])});ok(e<1e-9,'جدولة جيبية: أقصى فرق نسبي '+e)}}
// معامل بلا تدرج لا يُحدَّث ولا يُسقط الخطوة
{const r=R.run(PRE+`
متغير ب = ت.معامل(م.من_قائمة([١، ٢]، [٢]))
متغير مح = ح.آدم([ب]، ٠.١)
ح.خطوة(مح)
اطبع(ب["قيمة"]["بيانات"][٠]، ب["قيمة"]["بيانات"][١])`,{});ok(r.ok&&r.out[0]==='١ ٢','معامل بلا تدرج لا يتغير '+JSON.stringify(r).slice(0,200))}
console.log('pass',pass,'fail',fail);process.exit(fail?1:0);
