# اختبار انحدار: إعادة اسم الدالة المشكَّل كما ورد في المهمة، دون المساس بمعرّفات أطول.
src = open('tools/builder/worker.py', encoding='utf8').read()
ns = {}; exec(src[src.index('import re\nDIAC'):src.index('def solve')], ns)
f = ns['fix_name']; t = {'prompt': 'اكتب دالة باسم «بدّل_المسافات» تأخذ'}
assert f(t, 'دالة بدل_المسافات(ن) {}') == 'دالة بدّل_المسافات(ن) {}'
assert f(t, 'بدل_المسافات_x') == 'بدل_المسافات_x'
assert f({'prompt': 'بلا اقتباس'}, 'كود') == 'كود'
print('ok')
