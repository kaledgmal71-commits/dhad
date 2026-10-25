const R=require(require('path').join(__dirname,'..','site','run.js'));
let pass=0,fail=0;
function t(name, code, files, expectOut, expectErr){
  const r=R.run(code,{files});
  let ok;
  if(expectErr!==undefined) ok=!r.ok && r.error.includes(expectErr);
  else ok=r.ok && JSON.stringify(r.out)===JSON.stringify(expectOut);
  if(ok)pass++; else {fail++; console.log('FAIL',name,JSON.stringify(r));}
}
// basic
t('basic','متغير م = استورد("أدوات")\nاطبع(م.ضعف(٤))\nاطبع(م.اسم)',
 {'أدوات.dhad':'صدّر دالة ضعف(س) { ارجع س * ٢ }\nصدّر متغير اسم = "مكتبة"\nدالة خاصة() { ارجع ١ }'},['٨','مكتبة']);
// unexported hidden
t('hidden','متغير م = استورد("أ")\nاطبع(م.خاصة)\nاطبع(مفاتيح(م))',
 {'أ.dhad':'دالة خاصة() { ارجع ١ }\nصدّر دالة عامة() { ارجع ٢ }'},['لاشيء','[عامة]']);
// cached once
t('once','متغير أ = استورد("ب")\nمتغير ج = استورد("ب")\nاطبع(أ == ج)',{'ب.dhad':'اطبع("تحميل")\nصدّر متغير س = ١'},['تحميل','صحيح']);
// isolation: module can't see main vars
t('iso','متغير سر = ٥\nمتغير م = استورد("ب")\nاطبع(م.ف())',{'ب.dhad':'صدّر دالة ف() { ارجع سر }'},undefined,'متغير غير معرّف: سر');
// main redefines builtin does not affect module
t('builtin','دالة طول(س) { ارجع ٩٩ }\nمتغير م = استورد("ب")\nاطبع(م.ف(), طول(1))',{'ب.dhad':'صدّر دالة ف() { ارجع طول("اب") }'},['٢ ٩٩']);
// same names in two modules
t('names','متغير أ = استورد("أ")\nمتغير ب = استورد("ب")\nاطبع(أ.ف(), ب.ف())',{'أ.dhad':'متغير ع = ١\nصدّر دالة ف() { ارجع ع }','ب.dhad':'متغير ع = ٢\nصدّر دالة ف() { ارجع ع }'},['١ ٢']);
// class export
t('class','متغير م = استورد("ح")\nمتغير ع = م.عداد()\nع.زد()\nع.زد()\nاطبع(ع.ن)',{'ح.dhad':'صدّر صنف عداد {\n دالة جديد() { هذا.ن = ٠ }\n دالة زد() { هذا.ن++ }\n}'},['٢']);
// nested + relative
t('rel','متغير م = استورد("مجلد/أ")\nاطبع(م.ف())',{'مجلد/أ.dhad':'متغير ب = استورد("./ب")\nصدّر دالة ف() { ارجع ب.ك() + ١ }','مجلد/ب.dhad':'صدّر دالة ك() { ارجع ٤١ }'},['٤٢']);
// root-relative from nested
t('rootrel','متغير م = استورد("مجلد/أ")\nاطبع(م.ف())',{'مجلد/أ.dhad':'متغير ب = استورد("ب")\nصدّر دالة ف() { ارجع ب.ك() }','ب.dhad':'صدّر دالة ك() { ارجع "جذر" }'},['جذر']);
// ../
t('dotdot','متغير م = استورد("د/أ")\nاطبع(م.ف())',{'د/أ.dhad':'متغير ب = استورد("../ب")\nصدّر دالة ف() { ارجع ب.ك() }','ب.dhad':'صدّر دالة ك() { ارجع "فوق" }'},['فوق']);
// escape root
t('escape','استورد("../x")',{},undefined,'يخرج من مجلد المشروع');
// missing
t('missing','استورد("غائب")',{},undefined,'لم أجد الملف «غائب»');
// cycle
t('cycle','استورد("أ")',{'أ.dhad':'استورد("ب")','ب.dhad':'استورد("أ")'},undefined,'استيراد دائري: أ.dhad ← ب.dhad ← أ.dhad');
// import main
t('main','استورد("main")',{'main.dhad':'اطبع(١)'},undefined,'الملف الرئيسي');
// stdlib reserved
t('std','استورد("ضاد/غير_موجودة")',{},undefined,'الوحدة القياسية');
// error file/line in module at load
t('errload','استورد("أ")',{'أ.dhad':'\n\nاطبع(١ - "س")'},undefined,'أ.dhad، السطر 3');
// error in module function called from main
t('errfn','متغير م = استورد("أ")\nم.ف()',{'أ.dhad':'صدّر دالة ف() {\n ارجع ١ / ٠\n}'},undefined,'أ.dhad، السطر 2: قسمة على صفر');
// main error format unchanged
t('mainerr','اطبع(١ - "س")',{},undefined,'السطر 1: العملية');
// parse error in module
t('parseerr','استورد("أ")',{'أ.dhad':'متغير = ٥'},undefined,'في الملف أ.dhad');
// export in block rejected
t('blockexp','إذا (صحيح) {\n صدّر دالة س() {}\n}',{},undefined,'المستوى الأعلى');
t('funcexp','دالة ف() {\n صدّر متغير س = ١\n}',{},undefined,'المستوى الأعلى');
// صدر as identifier still works
t('ident','متغير صدر = ٣\nصدر = صدر + ١\nاطبع(صدر)',{},['٤']);
// export in main is a no-op
t('mainexp','صدّر دالة ف() { ارجع ١ }\nاطبع(ف())',{},['١']);
// try catches import error
t('trycatch','حاول { استورد("غائب") } التقط (خ) { اطبع("لُقط") }',{},['لُقط']);
// failed module can be retried (not cached)
t('retry','حاول { استورد("أ") } التقط (خ) { اطبع("١") }\nحاول { استورد("أ") } التقط (خ) { اطبع("٢") }',{'أ.dhad':'أطلق_خطأ("س")'},['١','٢']);
// callbacks across modules
t('cb','متغير م = استورد("أ")\nاطبع(م.كل([١،٢،٣], دالة(س) { ارجع س * ١٠ }))',{'أ.dhad':'صدّر دالة كل(ق, ف) { ارجع طبّق(ق, ف) }'},['[١٠، ٢٠، ٣٠]']);
// module-level state live via functions
t('state','متغير م = استورد("أ")\nم.زد()\nم.زد()\nاطبع(م.قيمة())',{'أ.dhad':'متغير ن = ٠\nصدّر دالة زد() { ن += ١ }\nصدّر دالة قيمة() { ارجع ن }'},['٢']);
// recursion in module
t('rec','متغير م = استورد("أ")\nاطبع(م.عاملي(٥))',{'أ.dhad':'صدّر دالة عاملي(ن) { إذا (ن <= ١) { ارجع ١ }\n ارجع ن * عاملي(ن - ١) }'},['١٢٠']);
// no readModule
const r=R.run('استورد("أ")'); if(!r.ok&&r.error.includes('غير متاح')) pass++; else {fail++;console.log('FAIL nofiles',r);}
// extension explicit
t('ext','متغير م = استورد("أ.dhad")\nاطبع(م.ف())',{'أ.dhad':'صدّر دالة ف() { ارجع ٧ }'},['٧']);
// anonymous function exported var
t('fnvar','متغير م = استورد("أ")\nاطبع(م.ز(٣))',{'أ.dhad':'صدّر متغير ز = دالة(س) { ارجع س + ١ }'},['٤']);
// inheritance within module file ok
t('inh','متغير م = استورد("أ")\nاطبع(م.قط().صوت())',{'أ.dhad':'صنف حيوان { دالة صوت() { ارجع "..." } }\nصدّر صنف قط يرث حيوان { دالة صوت() { ارجع "مياو" } }'},['مياو']);
console.log('pass',pass,'fail',fail);
