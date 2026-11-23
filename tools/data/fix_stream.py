# عامل بايثون دائم: يقرأ من stdin أسطر JSON [نص,...] ويكتب سطرًا لكل مدخل: النص بعد الإصلاح الآمن (fix_for_app) أو null إن لم يتغير.
import sys, json, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from clean_ar import fix_for_app
import collections
st = collections.Counter()
for line in sys.stdin:
    arr = json.loads(line)
    out = []
    for x in arr:
        if isinstance(x, str) and x:
            y, _ = fix_for_app(x, st)
            out.append(y if y != x else None)
        else:
            out.append(None)
    sys.stdout.write(json.dumps(out, ensure_ascii=False) + '\n'); sys.stdout.flush()
sys.stderr.write(json.dumps(st, ensure_ascii=False) + '\n')
