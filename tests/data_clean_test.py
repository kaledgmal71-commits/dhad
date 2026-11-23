import sys; sys.path.insert(0,'tools/data')
from clean_ar import clean, fix_orthography, split_markup, fix_for_app
import re
def canon(x): return re.sub('([\u064B-\u0650\u0652])\u0651','\u0651\\1',x)
def eq(a,b):
    b=canon(b) if isinstance(b,str) else b
    assert a==b, f'{a!r} != {b!r}'
# وسوم وحواشٍ
t,notes=split_markup('ذَيْلِ </علم_رجل></قول>. <نه/><Margin><FootNote ID="1">في طبعة دار</FootNote>نص</Margin>')
eq(t.replace(' ',''),'ذَيْلِ.نص'); eq(notes,['في طبعة دار'])
# تكرار الفتحة والشدة المكررة من العيّنة الحقيقية
eq(fix_orthography('الظََّّهِيرَةِ')[0],'الظ\u0651\u064eهِيرَةِ')  # شدة ثم حركة (الترتيب القياسي)
# علامة يتيمة تُلصق: «عُقَيْل ٍالنَّ»
eq(fix_orthography('عُقَيْل ٍالنَّيْسَابُورِيُّ')[0],'عُقَيْلٍ النَّيْسَابُورِيُّ')
# علامة يتيمة بعد كلمة مشكولة تُحذف: «قَوْلُهُ َتَعَالَى»
eq(fix_orthography('قَوْلُهُ َتَعَالَى')[0],'قَوْلُهُ تَعَالَى')
# تطويل ورموز اتجاه
eq(fix_orthography('وَنُنَـزِّلُ')[0],'وَنُنَزِّلُ')
eq(fix_orthography('عُمَرَ، ‏.‏ بِهَذِهِ')[0],'عُمَرَ، . بِهَذِهِ'.replace(' .','.'))
# حروف فارسية
eq(fix_orthography('عیسی')[0],'عيسي')  # ی→ي (ى الأصلية تبقى لأنها U+0649)
# أرقام
eq(clean('باب 67 - أذينة')[0],'باب ٦٧ - أذينة')
# لا يمسّ ما هو سليم
good='حَدَّثَنَا أَبُو الرَّبِيعِ الزَّهْرَانِيُّ، قَالَ: حَدَّثَنَا'
eq(fix_orthography(good)[0],good)
eq(clean('آخَرُ <رقم_حديث نوع="حرف">4403 </رقم_حديث><رقم_حديث نوع="مطبوع">118 </رقم_حديث>- <حديث>وَبِهِ</حديث>')[0],'آخَرُ - وَبِهِ')
# إصلاح التطبيق الآمن: الوسوم والأرقام والمسافة قبل الترقيم تبقى حرفيًّا
a='<حديث>عیسی ، قَوْلُهُ َتَعَالَى</حديث> 67 :'
r=fix_for_app(a)[0]
assert r.startswith('<حديث>') and '</حديث>' in r and '67 :' in r and '،' in r, r
assert 'عيسي' in r and 'َتَعَالَى' not in r.replace('تَعَالَى','')
eq(fix_for_app(good)[0],good)
eq(fix_for_app('نص  بمسافتين')[0],'نص بمسافتين')
assert fix_for_app('كلمة :')[0]=='كلمة :'
print('ok')
