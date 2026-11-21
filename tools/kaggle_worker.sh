#!/bin/bash
# العامل المستمر على Kaggle. يكتب حالته وسجله في فرع builder-results (status/) ليقرأها Claude دون تدخل المستخدم.
cd /kaggle/working
LOG=/kaggle/working/worker.log; : > $LOG
URL="https://x-access-token:${GH_TOKEN}@github.com/kaledgmal71-commits/dhad.git"
push_status() {
  [ -n "$GH_TOKEN" ] || return 0
  rm -rf st; git clone -q --depth 1 -b builder-results "$URL" st 2>/dev/null || { git init -q st; (cd st && git checkout -q --orphan builder-results && git remote add origin "$URL"); }
  mkdir -p st/status; { date -u; echo "$1"; echo ---; tail -n 60 $LOG | sed "s/${GH_TOKEN}/***/g"; } > st/status/worker.txt
  (cd st && git add status && git -c user.email=b@n -c user.name=nawa-builder commit -qm "حالة العامل: $1" && git push -q origin builder-results) >/dev/null 2>&1 || true
}
trap 'push_status "انتهى أو توقف (رمز $?)"' EXIT
{
  nvidia-smi -L || { echo "لا GPU: فعّل GPU"; exit 1; }
  [ -n "$GH_TOKEN" ] || { echo "GH_TOKEN غير موجود في البيئة"; exit 1; }
  pip -q install -U transformers accelerate huggingface_hub 2>&1 | tail -1
  rm -rf dhad; git clone -q --depth 1 "$URL" dhad
  push_status "بدأ"
  python3 dhad/tools/builder/worker.py
} 2>&1 | tee -a $LOG
