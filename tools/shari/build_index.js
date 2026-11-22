'use strict';
// node tools/shari/build_index.js <ملف-OpenITI> <معرّف-الكتاب> <خرج.jsonl>
const fs = require('fs');
const { parse } = require('./pages');
const [,, src, book, out] = process.argv;
if (!src || !book || !out) { console.error('usage: build_index.js <file> <bookId> <out.jsonl>'); process.exit(2); }
const pages = parse(fs.readFileSync(src, 'utf8'));
fs.writeFileSync(out, pages.map(p => JSON.stringify({ book, ...p })).join('\n') + '\n');
console.log(pages.length + ' pages');
