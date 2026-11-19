# تحليل أخطاء المُشكِّل: مصفوفة الالتباس لحركة آخر الكلمة، والأخطاء حسب الحرف الأخير والكلمات الأكثر خطأً.
# python3 dia_errors.py model_prefix file.txt
import sys; sys.path.insert(0, __file__.rsplit('/', 1)[0])
import numpy as np, collections, dia_model as M, dia_train as T
from diacritizer_data import CLS, LET
m = M.Model.load(sys.argv[1]); X, Y = T.load_eval(sys.argv[2]); pr = T.predict(m, X); L = X > 1
nxt = np.append(X[1:], 1); last = L & (nxt == 1); bad = (pr != Y) & L
nm = lambda c: ('∅' if CLS[c] == '' else CLS[c])
tot = int(bad.sum()); fin = int(bad[last].sum())
print('أخطاء الحروف', tot, '| منها في آخر الكلمة', fin, round(fin / tot, 3))
conf = collections.Counter((nm(Y[i]), nm(pr[i])) for i in np.where(bad & last)[0])
print('أكثر التباسات آخر الكلمة (صحيح ← متوقَّع):')
for (g, p), c in conf.most_common(10): print(' ', g, '←', p, c, round(c / fin, 3))
byl = collections.Counter(LET[X[i] - 2] for i in np.where(bad & last)[0])
print('حسب الحرف الأخير:', byl.most_common(8))
wid = np.cumsum(X == 1); words = collections.defaultdict(list)
for i in np.where(L)[0]: words[wid[i]].append(i)
wb = collections.Counter()
for w, idx in words.items():
    if any(bad[i] and last[i] for i in idx): wb[''.join(LET[X[i] - 2] for i in idx)] += 1
print('كلمات أكثر خطأً في حركة آخرها:', wb.most_common(15))
