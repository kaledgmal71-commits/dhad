// نموذج أولي بالجافاسكربت لتحديد معاملات المصنِّف قبل نقله إلى ضاد (نفس الخوارزمية بالضبط).
const T=require('../tests/data/intents-train.js'),H=require('../tests/data/intents-heldout.js');
const D=4096,CL=Object.keys(T);
const norm=s=>s.replace(/[ً-ْـ]/g,'').replace(/[أإآ]/g,'ا').replace(/ى/g,'ي').replace(/ة/g,'ه').toLowerCase().replace(/[^ء-غف-يa-z0-9٠-٩ ]+/g,' ').replace(/\s+/g,' ').trim();
const h=(s)=>{let x=5381;for(let i=0;i<s.length;i++){x=(x*33+s.charCodeAt(i))%1000003}return x%D};
function feats(q){const t=norm(q),ws=t.split(' ').filter(Boolean),f={};const add=k=>{const i=h(k);f[i]=(f[i]||0)+1};
 ws.forEach(w=>{add('w:'+w);const p=' '+w+' ';for(let n=3;n<=4;n++)for(let i=0;i+n<=p.length;i++)add('c:'+p.slice(i,i+n))});
 for(let i=0;i+1<ws.length;i++)add('b:'+ws[i]+' '+ws[i+1]);add('n:'+Math.min(ws.length,8));
 let nrm=0;for(const k in f)nrm+=f[k]*f[k];nrm=Math.sqrt(nrm);for(const k in f)f[k]/=nrm;return f}
function train(data,ep,lr,l2){const W=CL.map(()=>new Float64Array(D)),B=new Float64Array(CL.length);
 const cnt={};data.forEach(d=>cnt[d[1]]=(cnt[d[1]]||0)+1);
 for(let e=0;e<ep;e++){const idx=data.map((_,i)=>i);let s=e*7919+13;idx.sort(()=>{s=(s*1103515245+12345)%2147483648;return s/2147483648-.5});
  for(const i of idx){const [f,y]=[data[i][0],CL.indexOf(data[i][1])];const z=CL.map((_,c)=>{let a=B[c];for(const k in f)a+=W[c][k]*f[k];return a});const m=Math.max(...z),ex=z.map(v=>Math.exp(v-m)),sm=ex.reduce((a,b)=>a+b),p=ex.map(v=>v/sm);
   const wt=data.length/(CL.length*cnt[data[i][1]]);for(let c=0;c<CL.length;c++){const g=(p[c]-(c===y?1:0))*wt;for(const k in f)W[c][k]-=lr*(g*f[k]+l2*W[c][k]);B[c]-=lr*g}}}
 return{W,B}}
const prob=(m,f)=>{const z=CL.map((_,c)=>{let a=m.B[c];for(const k in f)a+=m.W[c][k]*f[k];return a});const mx=Math.max(...z),ex=z.map(v=>Math.exp(v-mx)),s=ex.reduce((a,b)=>a+b);return ex.map(v=>v/s)};
const all=[];for(const k in T)T[k].forEach(q=>all.push([feats(q),k,q]));
// تحقق: كل خامس مثال
const tr=all.filter((_,i)=>i%5!==0),va=all.filter((_,i)=>i%5===0);
const EP=+process.argv[2]||40,LR=+process.argv[3]||.5,L2=+process.argv[4]||1e-4;
let m=train(tr,EP,LR,L2);
const acc=(m,set,tau)=>{let ok=0;set.forEach(([f,y])=>{const p=prob(m,f),i=p.indexOf(Math.max(...p));const pred=Math.max(...p)<tau?'خارج_النطاق':CL[i];if(pred===y)ok++});return ok/set.length};
console.log('تحقق',acc(m,va,0).toFixed(3));
let best=0,bt=0;for(let t=0;t<=.8;t+=.05){const a=acc(m,va,t);if(a>best+1e-9){best=a;bt=t}}console.log('عتبة التحقق',bt.toFixed(2),best.toFixed(3));
m=train(all,EP,LR,L2);
const ho=[];for(const k in H)H[k].forEach(q=>ho.push([feats(q),k,q]));
let ok=0;const bad=[];const oo={n:0,ok:0};ho.forEach(([f,y,q])=>{const p=prob(m,f),mx=Math.max(...p);const pred=mx<bt?'خارج_النطاق':CL[p.indexOf(mx)];if(pred===y)ok++;else bad.push(y+' ← '+pred+' ('+mx.toFixed(2)+') :: '+q);if(y==='خارج_النطاق'){oo.n++;if(pred===y)oo.ok++}});
require('fs').writeFileSync('/tmp/claude-0/-home-claude/8835fa8e-9b62-5eb7-ba37-054b17485938/scratchpad/learn.json',JSON.stringify(ho.map(([f,y,q])=>{const p=prob(m,f),mx=Math.max(...p);return [y,q,mx<bt?'خارج_النطاق':CL[p.indexOf(mx)]]})));
console.log('محجوزة',ok+'/'+ho.length,(100*ok/ho.length).toFixed(1)+'%','خارج النطاق',oo.ok+'/'+oo.n);console.log(bad.join('\n'));
