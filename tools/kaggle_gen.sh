#!/bin/bash
# مقارنة نماذج التوليد المفتوحة على Kaggle بأمر واحد. النتائج في /kaggle/working/gen (summary.txt وblind.txt وkey.txt)
set -e
cd /kaggle/working
nvidia-smi -L || { echo "لا توجد بطاقة رسوم: فعّل GPU"; exit 1; }
pip -q install -U transformers accelerate bitsandbytes huggingface_hub
rm -rf dhad; git clone -q --depth 1 https://github.com/kaledgmal71-commits/dhad.git
python3 dhad/tools/gen_compare.py /kaggle/working/gen
echo "تم: افتح Output ← gen ← summary.txt ثم blind.txt"
