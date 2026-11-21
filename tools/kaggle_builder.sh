#!/bin/bash
# حلقة البناء بإشراف على Kaggle: MODEL=Qwen/Qwen3-8B (افتراضي). النتائج: /kaggle/working/builder/summary.txt وresults.json
set -e
cd /kaggle/working
nvidia-smi -L || { echo "فعّل GPU"; exit 1; }
pip -q install -U transformers accelerate huggingface_hub 2>&1 | tail -1
rm -rf dhad; git clone -q --depth 1 https://github.com/kaledgmal71-commits/dhad.git
python3 dhad/tools/builder/loop.py "${MODEL:-Qwen/Qwen3-8B}" dhad/tools/builder/tasks /kaggle/working/builder
cat /kaggle/working/builder/summary.txt
