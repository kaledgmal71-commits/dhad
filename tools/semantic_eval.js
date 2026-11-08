// تقييم البحث الدلالي المتعلَّم مقابل BM25 على مقاطع الدليل: مهمة «مقطع قصير ← النص الذي أُخذ منه» على مقاطع محجوزة لم يرها التدريب.
// يحتاج dist/nawa/guide.json (node build.js && node site/pages.gen.js). الاستعمال:
//   MINW=15 node tools/semantic_eval.js [خطوات=250] [أبعاد=48] [مفردات=600]
const fs=require('fs'),path=require('path'),R=require('../site/run.js');
const steps=+(process.argv[2]||250),dim=+(process.argv[3]||48),vocab=+(process.argv[4]||600);
const g=JSON.parse(fs.readFileSync(path.join(__dirname,'..','dist','nawa','guide.json'),'utf8'));
let seed=12345;const rnd=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296};
const AR='٠١٢٣٤٥٦٧٨٩';const clean=s=>s.replace(/[ً-ْ]/g,'').replace(/\s+/g,' ').trim();
const passages=g['مقاطع'].map(p=>clean(p['نص'])).filter(t=>t.split(' ').length>=(+process.env.MINW||40));
const idx=passages.map((_,i)=>i).sort(()=>rnd()-.5);
const nTest=Math.floor(passages.length*0.2),testIdx=idx.slice(0,nTest),trainIdx=idx.slice(nTest);
const crop=(t,len)=>{const w=t.split(' ');const L=Math.min(len,Math.floor(w.length/3));const s=Math.floor(rnd()*(w.length-L));return {q:w.slice(s,s+L).join(' '),rest:w.slice(0,s).concat(w.slice(s+L)).join(' ')}};
const trainPairs=[];for(const i of trainIdx)for(let k=0;k<3;k++){const c=crop(passages[i],10+Math.floor(rnd()*10));trainPairs.push([c.q,c.rest])}
trainPairs.sort(()=>rnd()-.5);
const testQ=testIdx.map(i=>crop(passages[i],14)),testKeys=testQ.map(c=>c.rest),testQs=testQ.map(c=>c.q);
console.log('مقاطع',passages.length,'تدريب',trainIdx.length,'أزواج',trainPairs.length,'اختبار',nTest);
const tok=s=>s.toLowerCase().replace(/[^\p{L}\p{N}_]+/gu,' ').trim().split(' ').filter(Boolean);
const docs=testKeys.map(tok),N=docs.length,avg=docs.reduce((a,d)=>a+d.length,0)/N;const df={};docs.forEach(d=>new Set(d).forEach(t=>df[t]=(df[t]||0)+1));
const bm=(q)=>docs.map(d=>{const tf={};d.forEach(t=>tf[t]=(tf[t]||0)+1);let s=0;for(const t of new Set(tok(q))){if(!tf[t])continue;const idf=Math.log(1+(N-df[t]+.5)/(df[t]+.5));s+=idf*tf[t]*2.2/(tf[t]+1.2*(1-.75+.75*d.length/avg))}return s});
const rankOf=(scores,target)=>{let r=1;for(let i=0;i<scores.length;i++)if(i!==target&&(scores[i]>scores[target]||(scores[i]===scores[target]&&i<target)))r++;return r};
const metrics=(ranks)=>({r1:+(ranks.filter(r=>r<=1).length/ranks.length).toFixed(3),r5:+(ranks.filter(r=>r<=5).length/ranks.length).toFixed(3),mrr:+(ranks.reduce((a,r)=>a+1/r,0)/ranks.length).toFixed(3)});
const bmScores=testQs.map(q=>bm(q));const bmRanks=bmScores.map((s,i)=>rankOf(s,i));
console.log('BM25 مرجعي',JSON.stringify(metrics(bmRanks)));
const src=`
متغير م = استورد("ضاد/مصفوفات")
متغير ر = استورد("ضاد/رياضيات")
متغير ز = استورد("ضاد/نواة_مجزئ")
متغير ق = استورد("ضاد/نواة_تضمينات")
متغير نصوص_تدريب = ${JSON.stringify(trainIdx.map(i=>passages[i]))}
متغير أزواج = ${JSON.stringify(trainPairs)}
متغير اختبار_استعلام = ${JSON.stringify(testQs)}
متغير اختبار_مفاتيح = ${JSON.stringify(testKeys)}
متغير مج = ز.درّب(نصوص_تدريب، ${vocab})
متغير غ = ر.مولّد(٩١)
متغير ن = ق.نموذج(مج، ${dim}، غ، ١٢٨)
متغير أرموز = []
من_أجل (ز٢ في أزواج) { أضف(أرموز، [ق.رموز_نص(ن، ز٢[٠])، ق.رموز_نص(ن، ز٢[١])]) }
دالة قيّم(اسم) {
    متغير ف = ق.فهرس(ن، اختبار_مفاتيح)
    متغير ص = []
    من_أجل (ي في مدى(طول(اختبار_استعلام))) {
        متغير نتيجة = ق.استرجع(ف، ق.متجه_نص(ن، اختبار_استعلام[ي])، طول(ف))
        متغير صف = []
        من_أجل (ك في مدى(طول(نتيجة))) { أضف(صف، [نتيجة[ك][٠]، نتيجة[ك][١]]) }
        أضف(ص، صف)
    }
    اطبع(اسم، نص(ص))
}
قيّم("قبل")
متغير خسائر = ق.درّب(ن، أرموز، {"معدل": ٠.٠٥، "خطوات": ${steps}، "دفعة": ٣٢، "حرارة": ٠.٠٥}، غ)
اطبع("خسارة", خسائر[٠]، خسائر[طول(خسائر) - ١])
قيّم("بعد")
`;
const t0=Date.now();const r=R.run(src,{maxMs:3000000,maxSteps:9e12});
if(!r.ok){console.log('ERR',r.error);process.exit(1)}
const parse=l=>JSON.parse(l.split(' ').slice(1).join(' ').replace(/[٠-٩]/g,d=>AR.indexOf(d)).replace(/٫/g,'.').replace(/،/g,','));
const learned={};
for(const l of r.out){if(l.startsWith('قبل')||l.startsWith('بعد')){const rows=parse(l);learned[l.split(' ')[0]]=rows;const ranks=rows.map((row,q)=>row.findIndex(x=>x[0]===q)+1);console.log(l.split(' ')[0],JSON.stringify(metrics(ranks)))}else console.log(l)}
const z=a=>{const m=a.reduce((x,y)=>x+y,0)/a.length,sd=Math.sqrt(a.reduce((x,y)=>x+(y-m)**2,0)/a.length)||1;return a.map(v=>(v-m)/sd)};
const hz=learned['بعد'].map((row,q)=>{const l=new Array(N).fill(0);row.forEach(([i,s])=>l[i]=s);const a=z(l),b=z(bmScores[q]);return a.map((v,i)=>v+b[i])}).map((s,q)=>rankOf(s,q));
console.log('دمج z (BM25 + متعلَّم)',JSON.stringify(metrics(hz)));
console.log('الوقت',((Date.now()-t0)/1000).toFixed(0),'ث');
