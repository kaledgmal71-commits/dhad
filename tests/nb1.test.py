# اختبار وحدة لمقياس NB-1 على متن اصطناعي صغير (لا نصوص حقيقية).
import sys, random; sys.path.insert(0, 'tools/lab'); import nb1
r = random.Random(3); V = [''.join(r.choice('ابتثجحخدذرزسشصضطظعغفقكلمنهوي') for _ in range(r.randint(2, 5))) for _ in range(400)]
verses = [' '.join(r.choice(V) for _ in range(14)) for _ in range(300)]
hads = [' '.join(r.choice(V) for _ in range(20)) for _ in range(300)]
it = nb1.build(verses, hads, n=100)
assert len(it['Q_complete']) >= 90 and len(it['H_pair']) >= 90, {k: len(v) for k, v in it.items()}
assert it == nb1.build(verses, hads, n=100), 'غير حتمي'
assert all(len(i['gold']) == 6 for i in it['Q_complete'])
real = set(' '.join(nb1.norm(t)) for t in verses + hads)
assert all(' '.join(nb1.norm(i['fake'])) not in real for k in ('Q_pair', 'H_pair') for i in it[k]), 'المزيَّف موجود في المتن'
g = nb1.run(nb1.IndexSystem(verses + hads), it); v = nb1.verdict(g)
assert len(it['Q_pairhard']) >= 90 and all(len(nb1.norm(i['real'])) == len(nb1.norm(i['fake'])) for i in it['Q_pairhard'])
assert v['all_pass'] and g['Q_complete']['strict'] == 1.0 and g['H_pair']['acc'] >= 0.97, g
z = nb1.run(nb1.RandomSystem(), it)
assert z['Q_complete']['strict'] == 0 and 0.35 < z['Q_pair']['acc'] < 0.65 and not nb1.verdict(z)['all_pass'], z
assert nb1.score_complete('وعليكم', ['وعليكم', 'السلام'])['prefix'] == 0.5
assert nb1.norm('قَالَ رَسُولُ ٱللَّهِ') == ['قال', 'رسول', 'الله']
print('NB-1: 9/9', g['Q_complete'], z['Q_pair'])
