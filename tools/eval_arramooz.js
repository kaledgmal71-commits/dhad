// يقيس محلل الأوزان الذري (tools/morph_ar.js) على أفعال Arramooz (بيانات مرجعية خارجية، GPL-3.0، تُستورد ولا تُودَع هنا).
// الاستعمال: node tools/eval_arramooz.js /path/arramooz.json   (JSON: {verbs:[{v,r,fut,tri}],nouns:[...]} مصدَّر من arabicdictionary.sqlite)
const M=require('/home/claude/dhad/tools/morph_ar.js');const D=JSON.parse(require('fs').readFileSync(process.argv[2],'utf8')); // JSON مصدَّر من Arramooz (GPL-3.0): لا يُودَع في المستودع
const weak=/[اويءأإؤئآى]/;
const norm=s=>s.normalize('NFC').replace(/^اِ(?=[^ً-ْ]ْ)/,'ٱ');
const st={all:0,sound:0,hit:0,miss:0,multi:0,tri3:0};const cat={};const miss=[];
for(const x of D.verbs){st.all++;const r=x.r;const isSound=[...r].length===3&&!weak.test(r)&&r[1]!==r[2];
 if(!isSound){const k=[...r].length!==3?'رباعي/غير ثلاثي':(weak.test(r)?'معتل/مهموز':'مضعّف');cat[k]=(cat[k]||0)+1;continue}
 st.sound++;const a=M.analyze(norm(x.v));
 if(a.some(y=>y.جذر===r))st.hit++;else{st.miss++;if(miss.length<12)miss.push([x.v,r,a.map(y=>y.جذر+'/'+y.وزن).join(',')])}
 if(a.length>1)st.multi++}
console.log(st);console.log('خارج النطاق الحالي:',cat);console.log(miss)
