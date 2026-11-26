# مقارنة نماذج التوليد المفتوحة على Kaggle (تُدفع بواسطة GitHub Actions). لا أسرار فيه؛ المستودع عام.
import subprocess
def sh(c): print('$', c[:90], flush=True); subprocess.run(c, shell=True, check=True)
sh('nvidia-smi -L')
sh('pip -q install -U transformers accelerate bitsandbytes huggingface_hub 2>&1 | tail -1')
sh('rm -rf /kaggle/working/dhad && git clone -q --depth 1 https://github.com/kaledgmal71-commits/dhad.git /kaggle/working/dhad')
sh('python3 /kaggle/working/dhad/tools/gen_compare.py /kaggle/working/out/gen')
