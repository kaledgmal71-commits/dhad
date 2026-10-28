// نظام ملفات حقيقي مقيَّد بمجلد واحد، لأداة سطر الأوامر (Node فقط، لا يدخل المتصفح).
// الواجهة نفسها لـ MemoryFS: read write append stat list remove mkdir، بمسارات نسبية إلى الجذر.
// الحماية: (١) المحرك يرفض «..» فوق الجذر قبل أن يصلنا المسار. (٢) هنا نحلّ المسار الحقيقي (realpath) لأقرب أب موجود
// ونرفض ما يخرج من الجذر، فلا تُخدعنا وصلة رمزية (symlink) تشير إلى خارجه.
// حدّ معروف: بين الفحص والتنفيذ نافذة سباق (TOCTOU) لو كان في الجذر مهاجم آخر يبدّل الوصلات أثناء التشغيل.
const fs = require("fs"), path = require("path");

class NodeFS {
  constructor(root) {
    this.root = fs.realpathSync(path.resolve(root));
    if (!fs.statSync(this.root).isDirectory()) throw new Error("الجذر ليس مجلدًا: " + root);
  }
  _err(code, p) { const e = new Error(code + ": " + p); e.code = code; return e; }
  _inside(real) { return real === this.root || real.startsWith(this.root + path.sep); }
  _abs(rel) {
    const full = path.resolve(this.root, rel);
    if (!this._inside(full)) throw this._err("ESCAPE", rel);
    let probe = full;
    for (;;) {
      try { fs.lstatSync(probe); break; } catch (e) { const up = path.dirname(probe); if (up === probe) break; probe = up; }
    }
    let real;
    try { real = fs.realpathSync(probe); } catch (e) { throw this._err("ESCAPE", rel); }
    if (!this._inside(real)) throw this._err("ESCAPE", rel);
    return full;
  }
  _map(e, p) { if (e && ["ENOENT", "EISDIR", "ENOTDIR", "ENOTEMPTY", "EEXIST", "ESCAPE"].includes(e.code)) return e; return this._err(e && e.code === "EACCES" ? "EACCES" : "EIO", p); }
  stat(p) { const f = this._abs(p); try { const s = fs.statSync(f); return s.isDirectory() ? "dir" : s.isFile() ? "file" : null; } catch (e) { if (e.code === "ENOENT" || e.code === "ENOTDIR") return null; throw this._map(e, p); } }
  read(p) { const f = this._abs(p); try { return fs.readFileSync(f, "utf8"); } catch (e) { throw this._map(e, p); } }
  write(p, t) { const f = this._abs(p); try { fs.writeFileSync(f, t); } catch (e) { throw this._map(e, p); } }
  append(p, t) { const f = this._abs(p); try { fs.appendFileSync(f, t); } catch (e) { throw this._map(e, p); } }
  mkdir(p) { const f = this._abs(p); try { fs.mkdirSync(f, { recursive: true }); } catch (e) { throw this._map(e, p); } }
  list(p) {
    const f = this._abs(p);
    try { return fs.readdirSync(f).sort((a, b) => (a < b ? -1 : a > b ? 1 : 0)); } catch (e) { throw this._map(e, p); }
  }
  remove(p) {
    const f = this._abs(p);
    try { const s = fs.lstatSync(f); if (s.isDirectory()) fs.rmdirSync(f); else fs.unlinkSync(f); } catch (e) { throw this._map(e, p); }
  }
}
module.exports = { NodeFS };
