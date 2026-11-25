# سكربت Kaggle لموسِّم القواعد (يُدفع بواسطة GitHub Actions). القيم __X__ تُستبدل عند الدفع فقط.
import os, subprocess
def sh(c): print('$', c.split('|')[0][:100], flush=True); subprocess.run(c, shell=True, check=True)
sh('nvidia-smi -L || true')
sh('pip -q install -U transformers accelerate bitsandbytes huggingface_hub 2>&1 | tail -1')
sh('rm -rf /kaggle/working/dhad && git clone -q --depth 1 https://github.com/kaledgmal71-commits/dhad.git /kaggle/working/dhad')
os.environ.update(HF_TOKEN='__HF__', MODEL='__MODEL__', PAGES='__PAGES__', OUT='/kaggle/working/rules')
sh('python3 /kaggle/working/dhad/tools/shari/annotate.py')
