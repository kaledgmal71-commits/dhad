const P=require('../tools/morph_particles.js');const A=require('../tools/atomic_ar.js');let ok=0,bad=0;const t=(c,m)=>{if(c)ok++;else{bad++;console.log('فشل:',m)}};
// كل مدخل يحلَّل إلى نفسه وفئته
for(const [cat,l] of Object.entries(P.T))for(const w of l){const a=P.analyze(w);t(a.some(x=>x.نوع===cat&&x.ثقة==='تام'),'تام '+cat+' '+w)}
// غير مشكَّل وجزئي
t(P.analyze('على').some(x=>x.نوع==='حرف جر'),'غير مشكَّل: على');
t(P.analyze('الذي').some(x=>x.نوع==='اسم موصول'),'غير مشكَّل: الذي');
t(P.analyze('إِلى').some(x=>x.نوع==='حرف جر'),'جزئي: إِلى');
t(P.analyze('هذا').some(x=>x.نوع==='اسم إشارة'),'هذا');
t(P.analyze('أنا').some(x=>x.نوع==='ضمير منفصل'),'أنا');
t(P.analyze('هَذَا').length>0&&P.analyze('هُذَا').length===0,'علامة تخالف الجدول تُرفض');
t(P.analyze('كتاب').length===0,'غير جامد لا يُحلَّل: كتاب');
t(P.analyze('قال').length===0,'غير جامد: قال');
// الألفات الموحَّدة
t(P.analyze('الى').some(x=>x.نوع==='حرف جر'),'الى بلا همزة');
// المدخل الذري ناتج عن encode ويحلَّل
t(P.analyze(A.decode(A.encode('مِنْ'))).length>0,'ذهاب وإياب');
// الحجم
console.log('مداخل',P.size(),'صيغ ذرية فريدة',P.forms());
t(P.size()>=250,'حجم الجدول');
console.log('نجح',ok,'فشل',bad);process.exit(bad?1:0);
