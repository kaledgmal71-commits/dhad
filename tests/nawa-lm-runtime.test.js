// محرك تشغيل نواة الخاص: تطابق لوجِتات JS (ذاكرة مفاتيح/قيم) مع مرجع numpy الكامل، وتكميم int8 قريب من fp32، وتجزئة BPE ذهابًا وإيابًا.
const {execFileSync}=require('child_process'),fs=require('fs'),path=require('path'),os=require('os');
const LM=require('../tools/runtime/nawa_lm.js');
let pass=0,fail=0;const ok=(c,m)=>{if(c)pass++;else{fail++;console.log('FAIL',m)}};
const dir=fs.mkdtempSync(path.join(os.tmpdir(),'nwt-'));
const py=`
import sys,json,numpy as np;sys.path.insert(0,'tools/runtime')
from export_nwt import export,dequant;from reference import forward
rng=np.random.default_rng(3);cfg={'d':64,'L':2,'H':4,'T':32,'V':50};d=64;V=50;hid=int(8*d/3/64)*64 or 64
hid=max(hid,64)
W={'emb.weight':rng.normal(0,.3,(V,d)),'nf.w':1+rng.normal(0,.1,d)}
for i in range(2):
  p=f'blocks.{i}.';W[p+'n1.w']=1+rng.normal(0,.1,d);W[p+'n2.w']=1+rng.normal(0,.1,d)
  W[p+'qkv.weight']=rng.normal(0,.2,(3*d,d));W[p+'o.weight']=rng.normal(0,.2,(d,d));W[p+'g.weight']=rng.normal(0,.2,(hid,d));W[p+'u.weight']=rng.normal(0,.2,(hid,d));W[p+'dn.weight']=rng.normal(0,.2,(d,hid))
W={k:v.astype(np.float32) for k,v in W.items()}
ids=[3,17,5,44,9,1,30,2,11,8]
export(W,cfg,'${dir}/f32.bin');export(W,cfg,'${dir}/i8.bin',int8=True)
json.dump({'ids':ids,'f32':forward(W,cfg,ids)[-1].tolist(),'i8':forward(dequant(W),cfg,ids)[-1].tolist(),'f32_full':forward(W,cfg,ids)[:3].tolist()},open('${dir}/ref.json','w'))
`;
execFileSync('python3',['-c',py],{cwd:path.join(__dirname,'..')});
const ref=JSON.parse(fs.readFileSync(dir+'/ref.json','utf8'));
function run(file){const b=fs.readFileSync(dir+'/'+file);const m=LM.Model(LM.readNwt(b.buffer.slice(b.byteOffset,b.byteOffset+b.length)));const st=m.newState();let lg;for(const i of ref.ids)lg=Float32Array.from(m.step(st,i));return lg;}
const maxd=(a,b)=>{let m=0;for(let i=0;i<a.length;i++)m=Math.max(m,Math.abs(a[i]-b[i]));return m;};
const a=run('f32.bin'),c=run('i8.bin');
ok(maxd(a,ref.f32)<2e-3,'لوجِتات fp32 تطابق المرجع: '+maxd(a,ref.f32));
ok(maxd(c,ref.i8)<2e-3,'لوجِتات int8 تطابق مرجع التكميم: '+maxd(c,ref.i8));
ok(maxd(a,c)<0.5&&maxd(a,c)>0,'int8 قريب من fp32 ولا يساويه: '+maxd(a,c));
// تجزئة: مفردات بايتية كاملة + دمج واحد
const bu=[];for(let i=33;i<=126;i++)bu.push(i);for(let i=161;i<=172;i++)bu.push(i);for(let i=174;i<=255;i++)bu.push(i);const cs=bu.slice();let n=0;for(let i=0;i<256;i++)if(!bu.includes(i)){bu.push(i);cs.push(256+n);n++;}
const vocab={'<pad>':0,'<eos>':1};cs.forEach((c,i)=>{vocab[String.fromCharCode(c)]=2+i;});
const sp=String.fromCharCode(cs[bu.indexOf(32)]);const d8=String.fromCharCode(cs[bu.indexOf(0xD8)]);vocab[sp+d8]=300;
const tk=LM.Tokenizer({model:{vocab,merges:[[sp,d8]]}});
const txt='قال الله تعالى: {بسم الله} abc 123\nسطر';
ok(tk.decode(tk.encode(txt))===txt,'تجزئة بايتية ذهابًا وإيابًا');
ok(tk.encode(' ا').length===2&&tk.encode(' ا')[0]===300,'الدمج يُطبَّق');
const g=LM.generate(LM.Model(LM.readNwt((()=>{const b=fs.readFileSync(dir+'/f32.bin');return b.buffer.slice(b.byteOffset,b.byteOffset+b.length);})())),{encode:()=>[3,4],decode:x=>x.join(','),eos:-1},'x',{max:5,rnd:()=>0.3});
ok(typeof g==='string'&&g.split(',').length===5,'التوليد يخرج العدد المطلوب: '+g);
console.log('نجح',pass,'فشل',fail);process.exit(fail?1:0);
