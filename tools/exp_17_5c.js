// تجربة ١٧-٥ج — نموذج أولي (مشتق من ١٧-٥ب: تدريب ميتا مستقل لكل ذراع وتحديثات متساوية) بجافاسكربت (معلن في docs/سجل-النواقص.md). الإعداد مثبَّت قبل التشغيل؛ لا يُعدَّل بعد رؤية النتيجة.
const mkrng=seed=>{let s=seed;return()=>{s=(s*1103515245+12345)%2147483648;return s/2147483648;};};
const D=8,NC=16,NO=4;
const perms=[];(function g(a,r){if(!r.length){perms.push(a);return;}r.forEach((x,i)=>g([...a,x],[...r.slice(0,i),...r.slice(i+1)]));})([],[0,1,2,3]);
const task=rnd=>{const p=perms[Math.floor(rnd()*24)];const cells=[...Array(NC).keys()];for(let i=NC-1;i>0;i--){const j=Math.floor(rnd()*(i+1));[cells[i],cells[j]]=[cells[j],cells[i]];}
  const y=c=>p[((c>>2)+(c&3))%4];return{y,support:cells.slice(0,8)};};
const zeros=()=>Array.from({length:NO},()=>new Array(D).fill(0));
const mul=(W,f)=>W.map(r=>r.reduce((s,v,j)=>s+v*f[j],0));
const upd=(W,f,yv,rate)=>{const p=mul(W,f);for(let i=0;i<NO;i++){const e=(i===yv?1:0)-p[i];for(let j=0;j<D;j++)W[i][j]+=rate*e*f[j];}};
const delta=(phi,t)=>{const W=zeros();for(let k=0;k<2;k++)for(const c of t.support)upd(W,phi[c],t.y(c),0.5);return W;};
const grad=(phi,t,steps)=>{const W=zeros();for(let k=0;k<steps;k++){const c=t.support[k%8];upd(W,phi[c],t.y(c),0.5);}return W;};
const acc=(phi,W,t)=>{let ok=0;for(let c=0;c<NC;c++){const p=mul(W,phi[c]);let a=0;for(let i=1;i<NO;i++)if(p[i]>p[a])a=i;if(a===t.y(c))ok++;}return ok/NC;};
const loss=(phi,ts)=>{let L=0;for(const t of ts){const W=delta(phi,t);for(let c=0;c<NC;c++){const p=mul(W,phi[c]);for(let i=0;i<NO;i++){const e=(i===t.y(c)?1:0)-p[i];L+=e*e;}}}return L/(ts.length*NC);};
const init=()=>{const r=mkrng(2026);return Array.from({length:NC},()=>Array.from({length:D},()=>r()-0.5));};

const writers={'دلتا':(phi,t)=>delta(phi,t),'تدرّج١٦':(phi,t)=>grad(phi,t,16),'تدرّج٥':(phi,t)=>grad(phi,t,5)};
const lossW=(wr,phi,ts)=>{let L=0;for(const t of ts){const W=wr(phi,t);for(let c=0;c<NC;c++){const p=mul(W,phi[c]);for(let i=0;i<NO;i++){const e=(i===t.y(c)?1:0)-p[i];L+=e*e;}}}return L/(ts.length*NC);};
const train=wr=>{let phi=init();const rnd=mkrng(2026),rs=mkrng(99);
  for(let it=0;it<3000;it++){const ts=Array.from({length:8},()=>task(rnd));
    const dl=phi.map(r=>r.map(()=>rs()<0.5?-1:1));
    const P=phi.map((r,i)=>r.map((v,j)=>v+0.1*dl[i][j])),M=phi.map((r,i)=>r.map((v,j)=>v-0.1*dl[i][j]));
    const g=(lossW(wr,P,ts)-lossW(wr,M,ts))/(2*0.1);
    phi=phi.map((r,i)=>r.map((v,j)=>v-0.05*g*dl[i][j]));}
  return phi;};
const er=mkrng(2027);const ev=Array.from({length:50},()=>task(er));
const mean=f=>ev.reduce((s,t)=>s+f(t),0)/ev.length;
const res={};
for(const k in writers){const phi=train(writers[k]);res[k]=mean(t=>acc(phi,writers[k](phi,t),t));
  const e=mkrng(31);res[k+' (خسارة ميتا نهائية)']=lossW(writers[k],phi,Array.from({length:50},()=>task(e)));}
const phi0=init();res['(تشخيص) دلتا بمفاتيح عشوائية']=mean(t=>acc(phi0,delta(phi0,t),t));
for(const k in res)console.log(k.padEnd(36),res[k].toFixed(3));
const d=res['دلتا'],g16=res['تدرّج١٦'];
console.log('عتبة١ (دلتا≥0.85):',d>=0.85,' عتبة٢ (دلتا≥تدرّج١٦+0.05):',d>=g16+0.05,' الفارق:',(d-g16).toFixed(3));
