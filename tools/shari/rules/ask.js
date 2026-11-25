// بحث في مخزن القواعد: BM25 بتطبيع عربي (مستفاد من ScholarlyIndex في مستودع GPT) بفهرس معكوس حقيقي، مع ترشيح بالمدرسة،
// ويعيد كل قاعدة باقتباسها الحرفي ومصدرها (كتاب/جزء/صفحة) والاستثناءات والخلاف كما وردت، بلا حكم نهائي من عندنا.
const fs = require('fs'), path = require('path');
const norm = s => String(s || '').normalize('NFKC').replace(/[ً-ٰٟـ]/g, '').replace(/[إأآٱ]/g, 'ا').replace(/ى/g, 'ي').replace(/ؤ/g, 'و').replace(/ئ/g, 'ي').replace(/ة/g, 'ه');
const tok = s => (norm(s).match(/[ء-ي0-9]+/g) || []).map(t => t.replace(/^(?:وال|فال|بال|لل|ال|و|ف|ب|ل)(?=.{3,})/, ''));
const STOP = new Set('من في على عن الي الى ان انه هو هي ما لا لم اذا او ثم قد كان ذلك هذا التي الذي فيه به لو كل بين'.split(' '));
class Index {
  constructor(rules, { k1 = 1.2, b = 0.75 } = {}) {
    this.rules = rules; this.k1 = k1; this.b = b; this.post = new Map(); this.len = new Float32Array(rules.length);
    rules.forEach((r, i) => {
      const text = [].concat(r.if, r.then, r.except, r.basis, r.src && r.src.quote).join(' '), tf = new Map();
      for (const t of tok(text)) { if (STOP.has(t)) continue; tf.set(t, (tf.get(t) || 0) + 1); this.len[i]++; }
      for (const [t, c] of tf) { if (!this.post.has(t)) this.post.set(t, []); this.post.get(t).push([i, c]); }
    });
    this.avg = this.len.reduce((a, x) => a + x, 0) / (rules.length || 1);
  }
  search(q, { limit = 5, school = null, kind = null } = {}) {
    const terms = [...new Set(tok(q).filter(t => !STOP.has(t)))], N = this.rules.length, sc = new Map();
    for (const t of terms) {
      const p = this.post.get(t); if (!p) continue; const idf = Math.log(1 + (N - p.length + .5) / (p.length + .5));
      for (const [i, c] of p) { const r = this.rules[i]; if (school && r.school !== school) continue; if (kind && r.kind !== kind) continue;
        sc.set(i, (sc.get(i) || 0) + idf * c * (this.k1 + 1) / (c + this.k1 * (1 - this.b + this.b * this.len[i] / this.avg))); }
    }
    return [...sc].sort((a, b) => b[1] - a[1]).slice(0, limit).map(([i, s]) => { const r = this.rules[i];
      return { id: r.id, score: +s.toFixed(3), school: r.school, quote: r.src.quote, src: { book: r.src.book, vol: r.src.vol, page: r.src.page }, except: r.except, disputed: r.disputed, basis: r.basis }; });
  }
}
function load(dir = path.join(__dirname, 'out')) {
  const rules = []; for (const f of fs.readdirSync(dir)) if (f.endsWith('.jsonl')) for (const l of fs.readFileSync(path.join(dir, f), 'utf8').split('\n')) if (l.trim()) rules.push(JSON.parse(l));
  return new Index(rules);
}
module.exports = { Index, load, norm, tok };
if (require.main === module) { const I = load(), q = process.argv.slice(2).join(' '); console.log(I.rules.length, 'rules'); for (const r of I.search(q, { school: 'shafii' })) console.log(r.score, r.src.book, r.src.vol + '/' + r.src.page, '|', r.quote.slice(0, 140)); }
