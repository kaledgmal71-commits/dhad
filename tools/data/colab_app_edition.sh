#!/bin/bash
# Colab (يُشغَّل بعد أن تضع الخلية HF_TOKEN في البيئة): يبني «نسخة التطبيق المصلَّحة» من قاعدة الجامع: تجميع القاعدة → إصلاحات آمنة بالمفتاح الأساسي → تغليف قطع → رفع إلى Hugging Face خاص.
# يمكن إعادة تشغيله: الإصلاح متساوي القوة (لا يغيّر ما أُصلح) والرفع يتخطى الموجود.
set -e
D=/content/drive/MyDrive/nawa-libraries
[ -f "$D/hadith-pg/manifest.json" ] || { echo "خطأ: درايف غير مربوط أو القطع غير موجودة"; exit 1; }
[ -f "$D/hadith-clean-v2/clean_report.json" ] || { echo "خطأ: clean_report.json (النسخة v2) غير موجود"; exit 1; }
mkdir -p /content/w /content/out && cd /content/w
V=$(node -v 2>/dev/null | sed 's/v\([0-9]*\).*/\1/' || echo 0)
if [ "${V:-0}" -lt 18 ]; then curl -fsSL https://deb.nodesource.com/setup_20.x | bash - >/dev/null 2>&1; apt-get install -y nodejs >/dev/null 2>&1; fi
[ -d node_modules/@electric-sql ] || npm i @electric-sql/pglite@0.5.13 2>&1 | tail -2
pip -q install huggingface_hub 2>&1 | tail -1
B=https://raw.githubusercontent.com/kaledgmal71-commits/dhad/main/tools/data
for f in export_pg.mjs apply_fixes.mjs pack_pglite.mjs fix_stream.py clean_ar.py; do curl -fsSL $B/$f -o $f; done
ONLY_REASSEMBLE=1 node export_pg.mjs "$D/hadith-pg" /content/w
node apply_fixes.mjs /content/pgdata "$D/hadith-clean-v2/clean_report.json" /content/w/fix_stream.py "$D/hadith-sample/app_fixes_report.json"
VER=2026-11-23-fixed1
rm -rf /content/out/*; node pack_pglite.mjs /content/pgdata /content/out $VER
ls /content/out | head -3; ls /content/out | wc -l
[ -n "$HF_TOKEN" ] || { echo "خطأ: لم يُدخَل رمز Hugging Face"; exit 1; }
python3 - <<'PY'
import os
from huggingface_hub import HfApi
api=HfApi(token=os.environ['HF_TOKEN'])
repo='kaledgmal/aljami-private'
api.create_repo(repo, repo_type='dataset', private=True, exist_ok=True)
api.upload_folder(folder_path='/content/out', repo_id=repo, repo_type='dataset', commit_message='نسخة التطبيق المصلَّحة 2026-11-23-fixed1')
print('رُفع إلى', repo, '(خاص)')
PY
echo "تم"
