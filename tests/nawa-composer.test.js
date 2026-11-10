// المؤلّف داخل المنسّق: طلب برنامج يُجاب ببرنامج مُشغَّل مع شرحه؛ وما خرج عن النيات لا يُخطَف
const R=require('../site/run.js');let pass=0,fail=0;const ok=(c,m)=>{if(c)pass++;else{fail++;console.log('FAIL',m)}};
const run=src=>{const r=R.run(src,{maxMs:120000,maxSteps:2e9});if(!r.ok)throw new Error(JSON.stringify(r).slice(0,400));return r.out};
const ask=t=>{const o=run('متغير س = استورد("ضاد/نواة_منسق")\nس.جهّز()\nمتغير ن = س.نفّذ_الطلب('+JSON.stringify(t)+')\nاطبع(ن["نوع"])\nاطبع(ن["رد"])');return {kind:o[0],text:o.slice(1).join('\n')}};
let r=ask('اكتب برنامجا بضاد يحسب مضروب ٥');
ok(r.kind==='تأليف'&&/١٢٠/.test(r.text)&&/ناتج/.test(r.text)&&/شرحه/.test(r.text),'مضروب: '+r.kind);
r=ask('برنامج بضاد يجمع ٤ و٦');ok(r.kind==='تأليف'&&/١٠/.test(r.text),'جمع');
r=ask('اكتب برنامجا بضاد يطبع جدول ضرب ٤');ok(r.kind==='تأليف'&&/٤ × ١٠ = ٤٠/.test(r.text),'جدول');
r=ask('اكتب لي لعبة ثعبان');ok(r.kind!=='تأليف','طلب خارج النيات لا يُخطف: '+r.kind);
r=ask('كيف أكتب حلقة في ضاد');ok(r.kind==='تعليم','التعليم يسبق: '+r.kind);
console.log('نجح',pass,'فشل',fail);process.exit(fail?1:0);
