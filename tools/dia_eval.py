# تقييم نموذج المُشكِّل على ملف مستقل: DER بحركة آخر الكلمة وبدونها، وWER. python3 dia_eval.py model_prefix file.txt
import sys; sys.path.insert(0, __file__.rsplit('/', 1)[0])
import numpy as np, dia_model as M, dia_train as T
m = M.Model.load(sys.argv[1]); X, Y = T.load_eval(sys.argv[2]); pr = T.predict(m, X); L = X > 1
nxt = np.append(X[1:], 1); last = L & (nxt == 1); bad = (pr != Y) & L; word = np.cumsum(X == 1); nw = len(set(word[L]))
print('letters', int(L.sum())); print('DER (all)', round(float(bad[L].mean()), 4)); print('DER (no case ending)', round(float(bad[L & ~last].mean()), 4))
print('WER', round(len(set(word[bad])) / nw, 4)); print('WER (no case ending)', round(len(set(word[bad & ~last])) / nw, 4))
