#!/bin/bash
# العامل المستمر على Kaggle. يُشغَّل من خلية تضع السرّ في البيئة أولًا (انظر docs/تسليم-الجلسة.md).
set -e
cd /kaggle/working
nvidia-smi -L || { echo "فعّل GPU"; exit 1; }
[ -n "$GH_TOKEN" ] || { echo "GH_TOKEN غير موجود في البيئة"; exit 1; }
pip -q install -U transformers accelerate huggingface_hub 2>&1 | tail -1
rm -rf dhad; git clone -q --depth 1 "https://x-access-token:${GH_TOKEN}@github.com/kaledgmal71-commits/dhad.git" dhad
python3 dhad/tools/builder/worker.py
