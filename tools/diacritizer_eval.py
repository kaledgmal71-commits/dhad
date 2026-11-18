# تقييم المُشكِّل على مجموعة مستقلة (مرة واحدة): DER بحركة آخر الكلمة وبدونها، وWER.
import sys, numpy as np
sys.path.insert(0, __file__.rsplit('/', 1)[0])
import diacritizer_train as T
w, path = sys.argv[1], sys.argv[2]
net = T.Net(); d = np.load(w)
for k in net.p: net.p[k] = d[k]
X, Y = T.load_eval(path); pr = T.predict(net, X); L = X > 1
nxt = np.append(X[1:], 1); last = L & (nxt == 1)
print('letters', int(L.sum()))
print('DER (all)', round(float((pr[L] != Y[L]).mean()), 4))
print('DER (no case ending)', round(float((pr[L & ~last] != Y[L & ~last]).mean()), 4))
# WER: كلمة خاطئة إن اختلف أي حرف فيها
bad = (pr != Y) & L; word = np.cumsum(X == 1); nw = len(set(word[L])); wb = len(set(word[bad]))
print('WER', round(wb / nw, 4), 'words', nw)
bad2 = bad & ~last; print('WER (no case ending)', round(len(set(word[bad2])) / nw, 4))
