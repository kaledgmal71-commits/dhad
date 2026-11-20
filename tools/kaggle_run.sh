#!/bin/bash
# تدريب المُشكِّل كاملًا على Kaggle بأمر واحد: بيانات ← تدريب ٧ ساعات ← تقييم الاختبار مرة واحدة. النتائج في /kaggle/working
set -e
cd /kaggle/working
nvidia-smi -L || { echo "لا توجد بطاقة رسوم: فعّل GPU من إعدادات الجلسة (Accelerator) ثم أعد"; exit 1; }
pip -q install cupy-cuda12x
rm -rf dhad Open-Hadith-Data arabic-text-diacritization
git clone -q --depth 1 https://github.com/kaledgmal71-commits/dhad.git
git clone -q --depth 1 https://github.com/mhashim6/Open-Hadith-Data.git
git clone -q --depth 1 https://github.com/AliOsm/arabic-text-diacritization.git
test -f dhad/tools/dia_train.py && test -f arabic-text-diacritization/dataset/test.txt
python3 dhad/tools/diacritizer_data.py Open-Hadith-Data hadith.npz
test -f hadith.npz
python3 -c "import sys; sys.path.insert(0,'dhad/tools'); import dia_model as M; assert M.GPU, 'cupy لا يرى البطاقة'; print('GPU OK')"
python3 dhad/tools/dia_train.py hadith.npz dia_big --minutes 420 --d 384 --layers 6 --heads 6 --ff 1536 --T 256 --batch 64 --lr 5e-4 --mask-final-none --val arabic-text-diacritization/dataset/val.txt
test -f dia_big.npz
python3 dhad/tools/dia_eval.py dia_big arabic-text-diacritization/dataset/test.txt | tee test_result.txt
tail -n 5 dia_big.log
rm -rf Open-Hadith-Data hadith.npz
echo "تم: النتيجة في test_result.txt والنموذج dia_big.npz/json والسجل dia_big.log"
