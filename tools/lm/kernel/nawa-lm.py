# سكربت تدريب نموذج نواة على Kaggle (يُدفع بواسطة GitHub Actions). القيم __X__ تُستبدل عند الدفع فقط؛ لا أسرار في المستودع.
import os, subprocess
def sh(c): print('$', c.split('|')[0][:100], flush=True); subprocess.run(c, shell=True, check=True)
sh('nvidia-smi -L || true')
sh('pip -q install tokenizers datasets huggingface_hub 2>&1 | tail -1')
sh('rm -rf /kaggle/working/dhad && git clone -q --depth 1 https://github.com/kaledgmal71-commits/dhad.git /kaggle/working/dhad')
os.makedirs('/kaggle/temp', exist_ok=True)
os.environ.update(DATA='/kaggle/temp/data', OUT='/kaggle/temp/ckpt', PRESET='__PRESET__', HOURS='__HOURS__', HF_TOKEN='__HF__', CENTURIES='__CENT__', WIKI_DOCS='__WIKI__', MAX_STEPS='__STEPS__')
sh('python3 /kaggle/working/dhad/tools/lm/prep.py')
sh('python3 /kaggle/working/dhad/tools/lm/train.py')
