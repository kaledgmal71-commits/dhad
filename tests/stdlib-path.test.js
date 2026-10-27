const R=require(require('path').join(__dirname,'..','site','run.js'));
const P=require('path').posix;
let pass=0,fail=0;
function t(name, body, expect){
  const r=R.run('متغير م = استورد("ضاد/مسارات")\n'+body,{});
  const ok=expect===null?!r.ok:(typeof expect==='function'?expect(r):(r.ok&&JSON.stringify(r.out)===JSON.stringify(expect)));
  if(ok)pass++; else {fail++; console.log('FAIL',name,JSON.stringify(r).slice(0,500));}
}
const err=(f)=>r=>!r.ok&&String(r.error).includes(f);
// نص عادي إلى تعبير ضاد (الهروب: \n \t \\ \" فقط)
const dh=(x)=>'"'+x.replace(/\\/g,'\\\\').replace(/"/g,'\\"')+'"';
// ---------- مقارنة مع path.posix على عيّنة كبيرة مولّدة ----------
let seed=777; const rnd=()=>{seed=(seed*1103515245+12345)&0x7fffffff;return seed/0x7fffffff;};
const segs=['a','b','..','.','','c.txt','.hid','x.tar.gz','a.','..a','d','ملف.txt','..'];
const gen=()=>{ const n=Math.floor(rnd()*6); let s=[]; for(let i=0;i<n;i++) s.push(segs[Math.floor(rnd()*segs.length)]); let p=s.join('/'); const r=rnd(); if(r<0.35) p='/'+p; if(rnd()<0.25) p+='/'; return p; };
const paths=['','/','.','..','a','a/','/a','a/b','a//b','/a/b/','./a','../a','a/..','a/../..','/..','/../a','a/./b/../c','.bashrc','a.b.c','a.','..a','x/.hid','/a/b.txt','//x'.slice(1)];
for(let i=0;i<500;i++) paths.push(gen());
const uniq=[...new Set(paths)];
const uniqNoDouble=uniq.filter(p=>!p.includes('//'));
// القوائم الناتجة من Node تُكتب كنصوص ضاد
const exp={norm:[],dir:[],base:[],ext:[],abs:[],res:[]};
for(const p of uniq){
  exp.norm.push(P.normalize(p)); exp.dir.push(P.dirname(p)); exp.base.push(P.basename(p)); exp.ext.push(P.extname(p)); exp.abs.push(P.isAbsolute(p));
  exp.res.push(P.resolve('/base/dir',p));
}
const L=(a)=>'['+a.map(x=>typeof x==='boolean'?(x?'صحيح':'خطأ'):dh(x)).join('،')+']';
function run1(name,fnExpr,key){
  t('oracle-'+name,`متغير ق = ${L(uniq)}
متغير ن = ${L(exp[key])}
متغير بدائل = ٠
متغير أول = ""
متغير ي = ٠
طالما (ي < طول(ق)) {
    متغير ناتج = ${fnExpr}
    إذا (ناتج != ن[ي]) {
        بدائل = بدائل + ١
        إذا (أول == "") { أول = "[" + ق[ي] + "] → [" + نص(ناتج) + "] المتوقع [" + نص(ن[ي]) + "]" }
    }
    ي = ي + ١
}
اطبع(بدائل)
اطبع(أول)`,r=>r.ok&&r.out[0]==='٠'||(console.log(name,JSON.stringify(r).slice(0,600)),false));
}
run1('normalize','م.طبّع(ق[ي])','norm');
run1('basename','م.اسم_الملف(ق[ي])','base');
run1('extname','م.الامتداد(ق[ي])','ext');
run1('isabs','م.هل_مطلق(ق[ي])','abs');
run1('resolve','م.حلّ(ق[ي]، "/base/dir")','res');
// dirname: ينحرف Node عمدًا في حالة «//» بادئة، ونحن نستبعدها من العيّنة
{
  const bad=[];
  uniq.forEach((p,i)=>{ if(/^\/\//.test(p)) bad.push(i); });
}
t('oracle-dirname',`متغير ق = ${L(uniqNoDouble)}
متغير ن = ${L(uniqNoDouble.map(p=>P.dirname(p)))}
متغير بدائل = ٠
متغير أول = ""
متغير ي = ٠
طالما (ي < طول(ق)) {
    متغير ناتج = م.المجلد(ق[ي])
    إذا (ناتج != ن[ي]) {
        بدائل = بدائل + ١
        إذا (أول == "") { أول = "[" + ق[ي] + "] → [" + ناتج + "] المتوقع [" + ن[ي] + "]" }
    }
    ي = ي + ١
}
اطبع(بدائل)
اطبع(أول)`,r=>r.ok&&r.out[0]==='٠'||(console.log('dirname',JSON.stringify(r).slice(0,600)),false));
// join مقابل Node: قوائم من ٠–٤ أجزاء
{
  const lists=[]; for(let i=0;i<300;i++){ const n=Math.floor(rnd()*5); const l=[]; for(let j=0;j<n;j++) l.push(segs[Math.floor(rnd()*segs.length)]+(rnd()<0.3?'/':'')); if(rnd()<0.3&&l.length) l[0]='/'+l[0]; lists.push(l); }
  const e=lists.map(l=>P.join(...l));
  t('oracle-join',`متغير ق = [${lists.map(l=>'['+l.map(dh).join('،')+']').join('،')}]
متغير ن = ${L(e)}
متغير بدائل = ٠
متغير أول = ""
متغير ي = ٠
طالما (ي < طول(ق)) {
    متغير ناتج = م.ادمج(ق[ي])
    إذا (ناتج != ن[ي]) {
        بدائل = بدائل + ١
        إذا (أول == "") { أول = نص(ق[ي]) + " → [" + ناتج + "] المتوقع [" + ن[ي] + "]" }
    }
    ي = ي + ١
}
اطبع(بدائل)
اطبع(أول)`,r=>r.ok&&r.out[0]==='٠'||(console.log('join',JSON.stringify(r).slice(0,600)),false));
}
// relative بين مسارين مطلقين مطبَّعين
{
  const abs=[]; for(let i=0;i<400;i++){ const p='/'+gen().replace(/^\//,''); abs.push(P.resolve(p)); }
  const pairs=[]; for(let i=0;i<abs.length-1;i++) pairs.push([abs[i],abs[i+1]]); pairs.push(['/','/a'],['/a','/'],['/a','/a'],['/a/b','/a/b/c'],['/a/b/c','/a/b']);
  const e=pairs.map(([a,b])=>P.relative(a,b));
  t('oracle-relative',`متغير ق = [${pairs.map(([a,b])=>'['+dh(a)+'،'+dh(b)+']').join('،')}]
متغير ن = ${L(e)}
متغير بدائل = ٠
متغير أول = ""
متغير ي = ٠
طالما (ي < طول(ق)) {
    متغير ناتج = م.نسبي(ق[ي][٠]، ق[ي][١])
    إذا (ناتج != ن[ي]) {
        بدائل = بدائل + ١
        إذا (أول == "") { أول = نص(ق[ي]) + " → [" + ناتج + "] المتوقع [" + ن[ي] + "]" }
    }
    ي = ي + ١
}
اطبع(بدائل)
اطبع(أول)`,r=>r.ok&&r.out[0]==='٠'||(console.log('relative',JSON.stringify(r).slice(0,600)),false));
  // التكامل: طبّع(ادمج([أصل، نسبي(أصل، هدف)])) == هدف
  t('relative-roundtrip',`متغير ق = [${pairs.map(([a,b])=>'['+dh(a)+'،'+dh(b)+']').join('،')}]
متغير بدائل = ٠
من_أجل (ز في ق) {
    إذا (م.حلّ(م.ادمج([ز[٠]، م.نسبي(ز[٠]، ز[١])])، "/") != م.حلّ(ز[١]، "/")) { بدائل = بدائل + ١ }
}
اطبع(بدائل)`,['٠']);
}
// ---------- حالات مكتوبة بيد ----------
t('normalize-hand','اطبع(م.طبّع("a/./b/../c//d"))\nاطبع(م.طبّع("/../../a"))\nاطبع(م.طبّع("../../a/b/.."))\nاطبع(م.طبّع("a/.."))\nاطبع(م.طبّع("./"))\nاطبع(م.طبّع("/a/b/"))',['a/c/d','/a','../../a','.','./','/a/b/']);
t('arabic-names','اطبع(م.اسم_الملف("/مشاريع/تقرير ٢٠٢٦.pdf"))\nاطبع(م.الامتداد("/مشاريع/تقرير ٢٠٢٦.pdf"))\nاطبع(م.المجلد("/مشاريع/تقرير ٢٠٢٦.pdf"))\nاطبع(م.اسم_الملف("/مشاريع/تقرير ٢٠٢٦.pdf"، ".pdf"))',['تقرير ٢٠٢٦.pdf','.pdf','/مشاريع','تقرير ٢٠٢٦']);
t('basename-suffix','اطبع(م.اسم_الملف("a/b.txt"، ".txt"))\nاطبع(م.اسم_الملف(".txt"، ".txt"))\nاطبع(م.اسم_الملف("a/b.txt"، ".md"))\nاطبع(م.اسم_الملف("a/b/"، "b"))\nاطبع("[" + م.اسم_الملف("") + "]")\nاطبع("[" + م.اسم_الملف("/") + "]")',['b','.txt','b.txt','b','[]','[]']);
t('extname-edge','اطبع("[" + م.الامتداد(".bashrc") + "]")\nاطبع("[" + م.الامتداد("a.") + "]")\nاطبع("[" + م.الامتداد("a.tar.gz") + "]")\nاطبع("[" + م.الامتداد("..") + "]")\nاطبع("[" + م.الامتداد("a") + "]")\nاطبع("[" + م.الامتداد("a/b.d/c") + "]")',['[]','[.]','[.gz]','[]','[]','[]']);
t('dirname-hand','اطبع(م.المجلد("/a/b/c"))\nاطبع(م.المجلد("a/b"))\nاطبع(م.المجلد("a"))\nاطبع(م.المجلد("/a"))\nاطبع(م.المجلد("/"))\nاطبع(م.المجلد(""))',['/a/b','a','.','/','/','.']);
t('join-hand','اطبع(م.ادمج(["أ"، "ب"، "../ج"]))\nاطبع(م.ادمج(["/"، "أ"]))\nاطبع(م.ادمج([]))\nاطبع(م.ادمج(["", ""]))\nاطبع(م.ادمج(["a/"، "/b"]))',['أ/ج','/أ','.','.','a/b']);
t('parse','اطبع(م.حلّل("/home/u/ملف.tar.gz"))\nاطبع(م.حلّل("a.txt"))\nاطبع(م.حلّل("/a"))\nاطبع(م.حلّل(".bashrc"))',['{جذر: /، مجلد: /home/u، اسم: ملف.tar.gz، امتداد: .gz، أصل: ملف.tar}','{جذر: ، مجلد: ، اسم: a.txt، امتداد: .txt، أصل: a}','{جذر: /، مجلد: /، اسم: a، امتداد: ، أصل: a}','{جذر: ، مجلد: ، اسم: .bashrc، امتداد: ، أصل: .bashrc}']);
t('relative-hand','اطبع(م.نسبي("/أ/ب"، "/أ/ج/د"))\nاطبع("[" + م.نسبي("/أ"، "/أ") + "]")\nاطبع(م.نسبي("أ/ب"، "أ/ج"))\nاطبع(م.نسبي("/"، "/x/y"))\nاطبع(م.نسبي("."، "a/b"))',['../ج/د','[]','../ج','x/y','a/b']);
t('relative-mixed',"اطبع(م.نسبي('/a'، 'b'))",err('مطلقين'));
t('relative-up',"اطبع(م.نسبي('../a'، 'b'))",err('يصعد'));
t('resolve-hand','اطبع(م.حلّ("x/y"، "/a/b"))\nاطبع(م.حلّ("/x/"، "/a"))\nاطبع(م.حلّ("../../.."، "/a/b"))\nاطبع(م.حلّ(""، "/a"))',['/a/b/x/y','/x','/','/a']);
t('resolve-base-rel','اطبع(م.حلّ("x"، "a"))',err('أساسًا مطلقًا'));
t('dirname-double-slash','اطبع(م.المجلد("a//b"))\nاطبع(م.المجلد("/a//b//"))',['a','/a']);
t('segments','اطبع(م.أجزاء("/a//b/./c/"))\nاطبع(م.أجزاء(""))',['[a، b، .، c]','[]']);
// ---------- الحدود الآمنة (لا هروب من الجذر) ----------
t('inside-ok','اطبع(م.ادمج_داخل("/ملفاتي"، "تقارير/٢٠٢٦.txt"))\nاطبع(م.ادمج_داخل("/ملفاتي"، "أ/../ب"))\nاطبع(م.ادمج_داخل("/ملفاتي/"، "ب/"))\nاطبع(م.ادمج_داخل("/ملفاتي"، ""))\nاطبع(م.ادمج_داخل("/ملفاتي"، "."))',['/ملفاتي/تقارير/٢٠٢٦.txt','/ملفاتي/ب','/ملفاتي/ب','/ملفاتي','/ملفاتي']);
for(const [n,j,c] of [
 ['dotdot','/ملفاتي','../سر'],['dotdot-deep','/ملفاتي','أ/../../سر'],['dotdot-only','/ملفاتي','..'],['absolute','/ملفاتي','/etc/passwd'],
 ['sibling-prefix','/ملفاتي','../ملفاتي٢/x'],['hidden-escape','/a/b','c/../../d'],
]) t('inside-rej-'+n,'اطبع(م.ادمج_داخل('+dh(j)+'، '+dh(c)+'))',err('الجذر'));
t('inside-sibling-prefix-name','اطبع(م.ادمج_داخل("/a/b"، "../bc/x"))',err('الجذر'));
t('inside-root-slash','اطبع(م.ادمج_داخل("/"، "a/b"))\nاطبع(م.ادمج_داخل("/"، "../a"))',['/a/b','/a']);
t('inside-root-rel','اطبع(م.ادمج_داخل("ملفاتي"، "a"))',err('جذرًا مطلقًا'));
t('inside-deep-ok','اطبع(م.ادمج_داخل("/r"، "a/b/../../c"))',['/r/c']);
// ---------- الأخطاء ----------
for(const [n,c] of [['norm-num','م.طبّع(٥)'],['dir-null','م.المجلد(لاشيء)'],['base-list','م.اسم_الملف(["a"])'],['join-text','م.ادمج("a")'],['join-item','م.ادمج(["a"، ٥])'],['ext-num','م.الامتداد(١)'],['abs-num','م.هل_مطلق(١)'],['suffix-num','م.اسم_الملف("a"، ٥)']])
  t('err-'+n,'اطبع('+c+')',err('مسارات'));
t('blame-user-line','\nاطبع(1)\nاطبع(م.طبّع(٥))',r=>!r.ok&&String(r.error).startsWith('السطر 4: مسارات:'));
t('with-text-lib','متغير ن = استورد("ضاد/نصوص")\nاطبع(ن.يبدأ_ب(م.طبّع("/a/../b")، "/"))',['صحيح']);
t('twice-same','متغير ز = استورد("ضاد/مسارات")\nاطبع(ز == م)',['صحيح']);
console.log('pass',pass,'fail',fail);
process.exit(fail?1:0);
