import json, random, subprocess, sys
from playwright.sync_api import sync_playwright
random.seed(5)
d = json.load(open('/tmp/claude-0/-home-claude/6494e871-c500-5582-b604-40c260c38260/scratchpad/arramooz.json', encoding='utf-8'))
words = [x['v'] for x in random.sample(d['verbs'], 250)] + [x['v'] for x in random.sample(d['nouns'], 250)]
words = [w for w in words if len(w) > 1]
enc = subprocess.run(['node', '-e', "const A=require('./tools/atomic_ar.js');const w=JSON.parse(require('fs').readFileSync(0,'utf8'));console.log(JSON.stringify(w.map(x=>A.toDisplay(x))))"], input=json.dumps(words), capture_output=True, text=True, cwd='/home/claude/dhad').stdout
atom = json.loads(enc)
html = "<!doctype html><meta charset=utf-8><style>@font-face{font-family:NA;src:url(file:///home/claude/dhad/font/NawaAtomic.ttf)} span{font-size:40px;white-space:nowrap;position:absolute}</style><body></body>"
with sync_playwright() as p:
    b = p.chromium.launch(); pg = b.new_page(); open('font/measure.html','w',encoding='utf-8').write(html); pg.goto('file:///home/claude/dhad/font/measure.html'); pg.wait_for_timeout(500)
    res = pg.evaluate("""async ([w,a])=>{await document.fonts.load('40px NA');await document.fonts.ready;const out=[];
      for(let i=0;i<w.length;i++){const s1=document.createElement('span');s1.style.fontFamily="'DejaVu Sans'";s1.textContent=w[i].replace(/[\u064B-\u0652]/g,'');s1.dir='rtl';
       const s2=document.createElement('span');s2.style.fontFamily='NA';s2.style.unicodeBidi='bidi-override';s2.style.direction='rtl';s2.textContent=a[i];
       document.body.append(s1,s2);out.push([s1.getBoundingClientRect().width,s2.getBoundingClientRect().width]);s1.remove();s2.remove()}return out}""", [words, atom])
    b.close()
ok = 0; lamalef = 0; diffs = []
for w, (a, c) in zip(words, res):
    r = abs(a - c) / max(a, 1)
    if 'لا' in w or 'لأ' in w or 'لإ' in w or 'لآ' in w: lamalef += 1; continue
    if r <= 0.02: ok += 1
    else: diffs.append((w, round(a), round(c)))
tot = len(words) - lamalef
print('كلمات', len(words), 'بلا لام-ألف', tot, 'عرض مطابق ±2٪', ok, '(%.1f٪)' % (100 * ok / tot), '| لام-ألف', lamalef)
print(diffs[:25])
