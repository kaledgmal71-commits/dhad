# سكربت دفعة البناء على Kaggle (يُدفع بواسطة GitHub Actions عبر Kaggle API). لا أسرار فيه؛ المستودع عام.
import os, subprocess
def sh(c): print('$', c.split('|')[0][:90], flush=True); subprocess.run(c, shell=True, check=True)
sh('nvidia-smi -L')
sh('pip -q install -U transformers accelerate huggingface_hub 2>&1 | tail -1')
sh('rm -rf /kaggle/working/dhad && git clone -q --depth 1 https://github.com/kaledgmal71-commits/dhad.git /kaggle/working/dhad')
os.environ.update(OUT='/kaggle/working/out', WORK='/kaggle/working/w', HOURS='1', MODEL='__MODEL__', DONE_PATH='__DONEPATH__', ONLY='__ONLY__')
sh('python3 /kaggle/working/dhad/tools/builder/worker.py')
