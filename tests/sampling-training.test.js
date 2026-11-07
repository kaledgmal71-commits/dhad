// العيّنات (حرارة/top-k/top-p/سحب) مقابل مرجع JS مستقل، وحلقة التدريب (جدولة، خسارة، حيرة، توليد)
const R=require('../site/run.js');
let pass=0,fail=0;const ok=(c,m)=>{if(c)pass++;else{fail++;console.log('FAIL',m)}};
const AR='٠١٢٣٤٥٦٧٨٩';const num=s=>Number(s.replace(/[٠-٩]/g,d=>AR.indexOf(d)).replace(/٫/g,'.').replace(/−/g,'-'));
const A=x=>String(x).replace(/\d/g,d=>AR[d]).replace(/\./g,'٫');
const lit=v=>'['+v.map(x=>(x<0?'-':'')+A(Math.abs(x))).join('،')+']';
const PRE=`
متغير ع = استورد("ضاد/عيّنات")
متغير ر = استورد("ضاد/رياضيات")
`;
function refDist(l,T,k,p){const m=Math.max(...l);let e=l.map(v=>Math.exp((v-m)/T));const s=e.reduce((a,b)=>a+b,0);e=e.map(v=>v/s);
 const ord=e.map((v,i)=>i).sort((a,b)=>e[b]-e[a]||a-b);let keep=e.length;if(k>0&&k<keep)keep=k;
 if(p<1){let c=0,n=0;for(const i of ord){if(n>=keep)break;c+=e[i];n++;if(c>=p)break}keep=n}
 const out=e.map(()=>0);const tot=ord.slice(0,keep).reduce((a,i)=>a+e[i],0);for(const i of ord.slice(0,keep))out[i]=e[i]/tot;return out}
const L=[2.0,1.0,0.5,-1.0,0.0,1.5,-0.3];
for(const [T,k,p] of [[1,0,1],[0.7,0,1],[1.5,0,1],[1,3,1],[1,0,0.8],[0.8,4,0.9],[1,1,1],[2,0,0.5]]){
 const r=R.run(PRE+`اطبع(${A(T)}، ${A(k)}، ${A(p)})\nمتغير د = ع.توزيع(${lit(L)}، ${A(T)}، ${A(k)}، ${A(p)})\nمن_أجل (ب في د) { اطبع(ب) }`,{});
 if(!r.ok){ok(false,'توزيع '+JSON.stringify(r).slice(0,200));continue}
 const got=r.out.slice(1).map(num),ref=refDist(L,T,k,p);let e=0;ref.forEach((v,i)=>e=Math.max(e,Math.abs(v-got[i])));
 ok(e<1e-9,`توزيع T=${T} k=${k} p=${p}: فرق ${e}`);ok(Math.abs(got.reduce((a,b)=>a+b,0)-1)<1e-9,'المجموع ١')}
// السحب: تواتر ٢٠٠٠ عينة قرب الاحتمالات (مولّد حتمي)
{const r=R.run(PRE+`
متغير غ = ر.مولّد(٩)
متغير د = ع.توزيع(${lit(L)}، ١، ٠، ١)
متغير ع٢ = [٠، ٠، ٠، ٠، ٠، ٠، ٠]
من_أجل (ي من ١ إلى ٢٠٠٠) { متغير س = ع.اسحب(د، غ); ع٢[س] = ع٢[س] + ١ }
من_أجل (ب في ع٢) { اطبع(ب) }`,{maxMs:120000,maxSteps:900000000});
 if(!r.ok)ok(false,'سحب '+JSON.stringify(r).slice(0,200));else{const f=r.out.map(num).map(v=>v/2000),ref=refDist(L,1,0,1);let e=0;ref.forEach((v,i)=>e=Math.max(e,Math.abs(v-f[i])));ok(e<0.03,'تواتر السحب قرب الاحتمال: '+e)}}
// القرار الحتمي وحالات الحدود
{const r=R.run(PRE+`اطبع(ع.اختر_الأكبر([١، ٥، ٥، ٢]))\nمتغير غ = ر.مولّد(٣)\nاطبع(ع.عيّن(${lit(L)}، غ، ٠))\nع.توزيع([١، ٢]، ٠)`,{});ok(!r.ok&&r.out[0]==='١'&&r.out[1]==='٠','حتمي وتعادل أصغر فهرس والحرارة ٠ في توزيع تخطئ')}
// ---------- التدريب ----------
const r=R.run(`
متغير ت = استورد("ضاد/تفاضل")
متغير ر = استورد("ضاد/رياضيات")
متغير ط = استورد("ضاد/طبقات")
متغير ع = استورد("ضاد/عيّنات")
متغير ب = استورد("ضاد/تدريب")
متغير غ = ر.مولّد(٥)
متغير ن = ط.نموذج({"مفردات": ٥، "د": ١٦، "رؤوس": ٢، "طبقات": ١، "مخفي": ٣٢، "أقصى_طول": ١٦}، غ)
متغير تدفق = [١، ٢، ٣، ١، ٢، ٤، ١، ٢، ٣، ١، ٢، ٤، ١، ٢، ٣، ١، ٢، ٤]
متغير نو = ب.نوافذ(تدفق، ٨، ٣)
اطبع(طول(نو)، نو[٠][٠]، نو[١][٠]، نو[طول(نو) - ١][٧])
متغير ح٠ = ب.حيرة(ن، نو)
متغير س = ب.درّب(ن، نو، {"معدل": ٠.٠٢، "خطوات": ٦٠، "دفعة": ٢، "احماء": ٥، "أدنى": ٠.٠٠١، "قص": ١})
متغير ح١ = ب.حيرة(ن، نو)
اطبع(ح٠، ح١)
اطبع(س["خسائر"][٠]، س["خسائر"][٥٩])
اطبع(س["معدلات"][٠]، س["معدلات"][٤]، س["معدلات"][٣٠]، س["معدلات"][٥٩])
متغير ق = ٠
من_أجل (م في س["معايير"]) { إذا (م > ق) { ق = م } }
اطبع(ق)
متغير ج = ط.ولّد_جشعا(ن، [١، ٢]، ٦)
متغير ك١ = ع.ولّد(ن، [١، ٢]، ٦، غ، {"حرارة": ٠})
متغير ك٢ = ع.ولّد(ن، [١، ٢]، ٦، غ، {"أعلى_ك": ١})
اطبع(نص(ج) == نص(ك١)، نص(ج) == نص(ك٢))
اطبع(نص(ج))
متغير ك٣ = ع.ولّد(ن، [١، ٢]، ٦، غ، {"حرارة": ٠، "توقف": [٣]})
اطبع(طول(ك٣) < طول(ج) أو ك٣[طول(ك٣) - ١] != ٣)`,{maxMs:900000,maxSteps:9000000000});
if(!r.ok)ok(false,'تدريب '+JSON.stringify(r).slice(0,400));else{
 const o=r.out;const [cnt,a,b,c]=o[0].split(' ').map(num);ok(cnt===4&&a===1&&b===1&&c===2,'نوافذ: '+o[0]);
 const [p0,p1]=o[1].split(' ').map(num);ok(p1<p0*0.5,`الحيرة تنخفض: ${p0} → ${p1}`);
 const [l0,l1]=o[2].split(' ').map(num);ok(l1<l0*0.5,`الخسارة: ${l0} → ${l1}`);
 const sch=(s)=>{const W=5,T=60,mx=.02,mn=.001;if(s<W)return mx*(s+1)/W;if(s>=T)return mn;const q=(s-W)/(T-W);return mn+.5*(mx-mn)*(1+Math.cos(Math.PI*q))};
 const ms=o[3].split(' ').map(num);let e=0;[0,4,30,59].forEach((s,i)=>e=Math.max(e,Math.abs(ms[i]-sch(s))/sch(s)));ok(e<1e-9,'جدولة المعدل في الحلقة '+e);
 ok(o[5]==='صحيح صحيح','حرارة٠ وtop-k=1 تساويان الجشع: '+o[5]);
 ok(o[7]==='صحيح','رمز التوقف لا يُضاف: '+o[7]);
 const gen=o[6];ok(/^\[[١٢٣٤]/.test(gen),'توليد: '+gen);}
console.log('pass',pass,'fail',fail);process.exit(fail?1:0);
