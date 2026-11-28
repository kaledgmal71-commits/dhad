# تجربة ٤ (مسجَّلة في docs/سجل-النواقص.md): تثبيت أثر Muon وrelu² بثلاث بذور وحجم أكبر.
import os
os.environ.update(E3_SEEDS='3', E3_D='384', E3_L='6', E3_H='6', E3_STEPS='1500', E3_ONLY='أساس,relu²,Muon,Muon+relu²')
exec(open('/kaggle/working/dhad/tools/lab/e3_arch.py', encoding='utf8').read())
