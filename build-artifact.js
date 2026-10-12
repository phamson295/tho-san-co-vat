// Tạo trang để đăng lên claude.ai (Artifact): node build-artifact.js
// claude.ai tự bọc trang trong <!doctype html><head>…<body>, nên ta chỉ giữ <title>, các <link>
// và nội dung <body>. Các file css/ và js/ được đăng kèm theo đúng đường dẫn tương đối.
const fs = require('fs');
const path = require('path');

const src = fs.readFileSync(path.join(__dirname, 'index.html'), 'utf8');
const title = src.match(/<title>[\s\S]*?<\/title>/)[0];
const head = src.match(/<head>([\s\S]*?)<\/head>/)[1];
const links = head.match(/<link[^>]*>/g).join('\n');
const body = src.match(/<body>([\s\S]*?)<\/body>/)[1].trim();

const out = `${title}\n${links}\n${body}\n`;
fs.mkdirSync(path.join(__dirname, 'dist'), { recursive: true });
const file = path.join(__dirname, 'dist', 'tho-san-co-vat.html');
fs.writeFileSync(file, out);
console.log('Đã tạo', path.relative(__dirname, file), `(${out.length} ký tự)`);
