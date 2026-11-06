// اختبار ضاد/مصفوفات على مرجع مستقل بجافاسكربت (فكّ/جمع الفهارس بدل عدّاد المنازل)
const R=require('../site/run.js');
let pass=0,fail=0;const ok=(c,m)=>{if(c)pass++;else{fail++;console.log('FAIL',m)}};
const AR='٠١٢٣٤٥٦٧٨٩';
const toJS=s=>JSON.parse(s.replace(/[٠-٩]/g,d=>AR.indexOf(d)).replace(/٫/g,'.').replace(/،/g,','));
// ---- مرجع ----
const prod=a=>a.reduce((x,y)=>x*y,1);
const unravel=(i,sh)=>{const r=[];for(let d=sh.length-1;d>=0;d--){r[d]=i%sh[d];i=Math.floor(i/sh[d])}return r};
const ravel=(ix,sh)=>{let o=0;for(let d=0;d<sh.length;d++)o=o*sh[d]+ix[d];return o};
const T=(data,shape)=>({data,shape});
const flat=(x)=>Array.isArray(x)?x.flatMap(flat):[x];
const shapeOf=x=>{const s=[];while(Array.isArray(x)){s.push(x.length);x=x[0]}return s};
const fromNested=x=>T(flat(x),shapeOf(x));
function bshape(a,b){const n=Math.max(a.length,b.length),o=[];for(let i=0;i<n;i++){const x=a[a.length-n+i]??1,y=b[b.length-n+i]??1;if(x!==y&&x!==1&&y!==1)throw 0;o.push(Math.max(x,y))}return o}
function src(ix,out,sh){const n=out.length,o=[];for(let d=0;d<sh.length;d++){const od=d+n-sh.length;o.push(sh[d]===1?0:ix[od])}return ravel(o,sh)}
function bin(a,b,f){const sh=bshape(a.shape,b.shape),n=prod(sh),d=[];for(let i=0;i<n;i++){const ix=unravel(i,sh);d.push(f(a.data[src(ix,sh,a.shape)],b.data[src(ix,sh,b.shape)]))}return T(d,sh)}
function perm(a,p){const sh=p.map(i=>a.shape[i]),n=prod(sh),d=[];for(let i=0;i<n;i++){const ix=unravel(i,sh),o=[];p.forEach((src,k)=>o[src]=ix[k]);d.push(a.data[ravel(o,a.shape)])}return T(d,sh)}
function red(a,ax,f,init,keep){if(ax<0)ax+=a.shape.length;const sh=a.shape.filter((_,i)=>i!==ax),n=prod(sh),d=[];for(let i=0;i<n;i++){const ix=unravel(i,sh);let acc=init;for(let k=0;k<a.shape[ax];k++){const full=[...ix.slice(0,ax),k,...ix.slice(ax)];acc=f(acc,a.data[ravel(full,a.shape)])}d.push(acc)}const os=keep?a.shape.map((v,i)=>i===ax?1:v):sh;return T(d,os)}
function matmul(a,b){const ra=a.shape.length,rb=b.shape.length,n=a.shape[ra-2],k=a.shape[ra-1],m=b.shape[rb-1];const bs=bshape(a.shape.slice(0,-2),b.shape.slice(0,-2)),nb=prod(bs),d=[];for(let q=0;q<nb;q++){const ix=unravel(q,bs);const ao=src(ix,bs,a.shape.slice(0,-2)),bo=src(ix,bs,b.shape.slice(0,-2));for(let i=0;i<n;i++)for(let j=0;j<m;j++){let s=0;for(let t=0;t<k;t++)s+=a.data[ao*n*k+i*k+t]*b.data[bo*k*m+t*m+j];d.push(s)}}return T(d,[...bs,n,m])}
function softmax(a,ax){if(ax<0)ax+=a.shape.length;const mx=red(a,ax,Math.max,-Infinity,true),e=bin(a,mx,(x,y)=>Math.exp(x-y)),s=red(e,ax,(x,y)=>x+y,0,true);return bin(e,s,(x,y)=>x/y)}
// ---- أدوات التشغيل ----
let seed=12345;const rnd=()=>{seed=(seed*1103515245+12345)%2147483648;return seed/2147483648*4-2};
const rt=sh=>fromNested((function g(d){return d===sh.length?Math.round(rnd()*1000)/1000:Array.from({length:sh[d]},()=>g(d+1))})(0));
const lit=x=>Array.isArray(x)?'['+x.map(lit).join('،')+']':String(x);
const nestedOf=t=>{function b(d,off){if(d===t.shape.length)return t.data[off];const st=prod(t.shape.slice(d+1));return Array.from({length:t.shape[d]},(_,i)=>b(d+1,off+i*st))}return b(0,0)};
const A=t=>`م.من_متداخلة(${lit(nestedOf(t))})`;
function dh(expr){const r=R.run('متغير م = استورد("ضاد/مصفوفات")\nمتغير ن = '+expr+'\nاطبع(ن["شكل"])\nاطبع(م.إلى_متداخلة(ن))',{maxMs:120000,maxSteps:300000000});if(!r.ok)throw new Error(JSON.stringify(r)+'\n'+expr.slice(0,200));return{shape:toJS(r.out[0]),nested:toJS(r.out[1])}}
function cmp(name,got,exp,tol=1e-12){ok(JSON.stringify(got.shape)===JSON.stringify(exp.shape),name+' shape '+got.shape+' vs '+exp.shape);const g=flat(got.nested),e=exp.data;ok(g.length===e.length,name+' size');let bad=0;for(let i=0;i<e.length;i++)if(Math.abs(g[i]-e[i])>tol*(1+Math.abs(e[i])))bad++;ok(bad===0,name+' values mismatched '+bad)}
// ---- حالات ----
const cases=[[[2,3],[3]],[[4,1,3],[2,1]],[[3,1],[1,4]],[[2,3,4],[2,3,4]],[[5],[5]],[[2,1,3],[4,1]],[[],[3,2]]];
for(const [sa,sb] of cases){const a=rt(sa),b=rt(sb);const ea=sa.length?A(a):String(a.data[0]),eb=sb.length?A(b):String(b.data[0]);
  cmp(`جمع ${sa}+${sb}`,dh(`م.جمع(${ea}،${eb})`),bin(a,b,(x,y)=>x+y));
  cmp(`ضرب ${sa}*${sb}`,dh(`م.ضرب(${ea}،${eb})`),bin(a,b,(x,y)=>x*y));
  cmp(`طرح ${sa}-${sb}`,dh(`م.طرح(${ea}،${eb})`),bin(a,b,(x,y)=>x-y));}
{const a=rt([3,2]),b=rt([4]);let threw=false;try{dh(`م.جمع(${A(a)}،${A(b)})`)}catch(e){threw=true}ok(threw,'incompatible broadcast throws')}
for(const [sa,sb] of [[[2,3],[3,4]],[[1,5],[5,1]],[[2,3,4],[2,4,5]],[[2,3,4],[4,2]],[[3,2],[5,2,4]],[[2,1,3,2],[1,4,2,3]]]){const a=rt(sa),b=rt(sb);cmp(`matmul ${sa}x${sb}`,dh(`م.ضرب_مصفوفي(${A(a)}،${A(b)})`),matmul(a,b))}
for(const [sh,p] of [[[2,3],[1,0]],[[2,3,4],[2,0,1]],[[2,3,4],[0,2,1]],[[2,2,2,3],[3,1,0,2]]]){const a=rt(sh);cmp(`permute ${sh}/${p}`,dh(`م.بدّل_محاور(${A(a)}،[${p.join('،')}])`),perm(a,p))}
{const a=rt([2,3,4]);const t=perm(a,[0,2,1]);cmp('منقول',dh(`م.منقول(${A(a)})`),t)}
for(const [sh,ax,keep] of [[[2,3,4],0,false],[[2,3,4],1,false],[[2,3,4],-1,true],[[3,5],1,true]]){const a=rt(sh);
  cmp(`مجموع ${sh}/${ax}`,dh(`م.مجموع(${A(a)}،${ax}،${keep?'صحيح':'خطأ'})`),red(a,ax,(x,y)=>x+y,0,keep));
  cmp(`أكبر ${sh}/${ax}`,dh(`م.أكبر_قيمة(${A(a)}،${ax}،${keep?'صحيح':'خطأ'})`),red(a,ax,Math.max,-Infinity,keep));
  cmp(`أصغر ${sh}/${ax}`,dh(`م.أصغر_قيمة(${A(a)}،${ax}،${keep?'صحيح':'خطأ'})`),red(a,ax,Math.min,Infinity,keep));
  const n=sh[ax<0?ax+sh.length:ax];const mean=red(a,ax,(x,y)=>x+y,0,keep);mean.data=mean.data.map(v=>v/n);cmp(`متوسط ${sh}/${ax}`,dh(`م.متوسط(${A(a)}،${ax}،${keep?'صحيح':'خطأ'})`),mean)}
{const a=rt([2,3,4]);const s=red(a,null??0,(x,y)=>x+y,0,false);const tot=a.data.reduce((x,y)=>x+y,0);const g=dh(`م.مجموع(${A(a)}،لاشيء،خطأ)`);ok(g.shape.length===0&&Math.abs(g.nested-tot)<1e-12,'total sum scalar')}
{const a=rt([3,4,5]);for(const ax of [0,1,2]){const e=a.shape.length;const out=[];const g=dh(`م.موضع_الأكبر(${A(a)}،${ax})`);const mx=red(a,ax,Math.max,-Infinity,false);const sh=a.shape.filter((_,i)=>i!==ax);const idx=[];for(let i=0;i<prod(sh);i++){const ix=unravel(i,sh);let best=0,bv=-Infinity;for(let k=0;k<a.shape[ax];k++){const v=a.data[ravel([...ix.slice(0,ax),k,...ix.slice(ax)],a.shape)];if(v>bv){bv=v;best=k}}idx.push(best)}cmp('argmax axis '+ax,g,T(idx,sh))}}
for(const [sh,ax] of [[[3,4],-1],[[2,3,4],1],[[2,3,4],0]]){const a=rt(sh);cmp(`softmax ${sh}/${ax}`,dh(`م.سوفت_ماكس(${A(a)}،${ax})`),softmax(a,ax),1e-12);
  const sm=softmax(a,ax);const lsm=T(sm.data.map(Math.log),sm.shape);cmp(`log_softmax ${sh}/${ax}`,dh(`م.لوغ_سوفت_ماكس(${A(a)}،${ax})`),lsm,1e-11)}
{const a=T([1000,1001,1002],[3]);const g=dh(`م.سوفت_ماكس(م.من_متداخلة([١٠٠٠،١٠٠١،١٠٠٢])،٠)`);cmp('softmax stable large',g,softmax(a,0))}
{const a=rt([3,6]);const eps=1e-5;const out=[];for(let r=0;r<3;r++){const row=a.data.slice(r*6,r*6+6),mu=row.reduce((x,y)=>x+y)/6,v=row.reduce((s,x)=>s+(x-mu)**2,0)/6;row.forEach(x=>out.push((x-mu)/Math.sqrt(v+eps)))}cmp('layernorm',dh(`م.تطبيع_طبقة(${A(a)}،٠.٠٠٠٠١)`),T(out,[3,6]),1e-12)}
{const a=rt([2,3,4]),b=rt([2,2,4]);const cat=[];for(let i=0;i<2;i++){cat.push(...a.data.slice(i*12,i*12+12),...b.data.slice(i*8,i*8+8))}cmp('concat axis1',dh(`م.ضمّ([${A(a)}،${A(b)}]،١)`),T(cat,[2,5,4]));
  const c=rt([2,3,4]);cmp('concat axis0',dh(`م.ضمّ([${A(a)}،${A(c)}]،٠)`),T([...a.data,...c.data],[4,3,4]))}
{const a=rt([2,5,3]);const out=[];for(let i=0;i<2;i++)for(let k=1;k<4;k++)for(let d=0;d<3;d++)out.push(a.data[i*15+k*3+d]);cmp('slice',dh(`م.شريحة(${A(a)}،١،١،٤)`),T(out,[2,3,3]))}
{const a=rt([2,6]);cmp('reshape',dh(`م.أعد_تشكيل(${A(a)}،[٣،-١،٢])`),T(a.data,[3,2,2]))}
{const g=dh('م.هوية(٣)');cmp('هوية',g,T([1,0,0,0,1,0,0,0,1],[3,3]));cmp('مدى_خطي',dh('م.مدى_خطي(٠،١،٥)'),T([0,0.25,0.5,0.75,1],[5]))}
{const a=rt([2,3]);for(const [fn,f] of [['أس_عناصر',Math.exp],['ظل_قطعي_عناصر',Math.tanh],['سيني_عناصر',x=>1/(1+Math.exp(-x))],['ريلو',x=>Math.max(0,x)],['مربع',x=>x*x],['سالب',x=>-x]])cmp(fn,dh(`م.${fn}(${A(a)})`),T(a.data.map(f),a.shape),1e-12)}
{const a=rt([2,2]);const g=R.run('متغير م = استورد("ضاد/مصفوفات")\nمتغير ن = م.من_متداخلة([[١،٢]،[٣،٤]])\nاطبع(م.عنصر(ن،[١،٠])،م.عنصر(ن،[-١،-١]))\nم.ضع(ن،[٠،١]،٩)\nاطبع(م.إلى_متداخلة(ن))\nاطبع(م.قريب(ن،م.من_متداخلة([[١،٩]،[٣،٤.٠٠٠٠٠١]])،١e-٥))',{});ok(g.ok&&g.out[0]==='٣ ٤'&&g.out[1]==='[[١، ٩]، [٣، ٤]]'&&g.out[2]==='صحيح','element access, set, near: '+JSON.stringify(g))}
{let t=0;for(const bad of ['م.من_قائمة([١،٢،٣]،[٢،٢])','م.أعد_تشكيل(م.أصفار([٢،٣])،[٤،-١])','م.ضرب_مصفوفي(م.أصفار([٢،٣])،م.أصفار([٢،٣]))','م.من_متداخلة([[١،٢]،[٣]])','م.عنصر(م.أصفار([٢،٢])،[٢،٠])']){try{dh(bad);}catch(e){t++}}ok(t===5,'invalid input throws '+t+'/5')}
console.log('pass',pass,'fail',fail);process.exit(fail?1:0);
