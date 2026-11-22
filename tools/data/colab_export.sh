#!/bin/bash
# يُشغَّل من خلية Colab بعد ربط درايف؛ يتحقق من كل شرط ويقف برسالة واضحة.
set -e
D=/content/drive/MyDrive/nawa-libraries/hadith-pg
O=/content/drive/MyDrive/nawa-libraries/hadith-export
[ -f "$D/manifest.json" ] || { echo "خطأ: لا يوجد $D/manifest.json — درايف غير مربوط أو التنزيل لم يكتمل"; exit 1; }
N=$(ls "$D" | grep -c '\.gz$' || true); echo "قطع موجودة: $N"
mkdir -p "$O" /content/w && cd /content/w
V=$(node -v 2>/dev/null | sed 's/v\([0-9]*\).*/\1/' || echo 0)
if [ "${V:-0}" -lt 18 ]; then curl -fsSL https://deb.nodesource.com/setup_20.x | bash - >/dev/null 2>&1; apt-get install -y nodejs >/dev/null 2>&1; fi
node -v
[ -d node_modules/@electric-sql ] || npm i @electric-sql/pglite@0.5.13 2>&1 | tail -2
curl -fsSL https://raw.githubusercontent.com/kaledgmal71-commits/dhad/main/tools/data/export_pg.mjs -o run.mjs
node run.mjs "$D" "$O"
