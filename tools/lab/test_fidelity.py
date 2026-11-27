import sys; sys.path.insert(0, 'tools/lab')
from fidelity import Index, score, norm
corpus = 'حدثنا مالك عن نافع عن ابن عمر رضي الله عنهما أن رسول الله صلى الله عليه وسلم قال إنما الأعمال بالنيات وإنما لكل امرئ ما نوى'
ix = Index(6); ix.add_text(corpus); ix.freeze()
real = 'قال رسول الله صلى الله عليه وسلم إنما الأعمال بالنيات وإنما لكل امرئ ما نوى'
fake = 'قال رسول الله صلى الله عليه وسلم ألا إن العرق العظام سود من آثار الوضوء فمن أعان من أولياء الله فاقتلوه'
a = score([real], ix); b = score([fake], ix); c = score([real, fake], ix)
assert a['attributed_fabricated'] == 0 and a['copy_rate'] > 0.3, a
assert b['attributed_fabricated'] == 1 and b['copy_rate'] < 0.2, b
assert c['attributed'] == 2 and c['fabricated_rate'] == 0.5, c
assert norm('الْحَمْدُ لِلّٰهِ') == ['الحمد', 'لله'] or norm('الْحَمْدُ لِلّٰهِ')[0] == 'الحمد'
print('نجح الاختبار')
