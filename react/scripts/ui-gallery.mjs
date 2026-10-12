import {readdirSync,writeFileSync} from 'node:fs';
import path from 'node:path';

export function writeGallery(directory) {
 const shots=readdirSync(directory).filter(name=>name.endsWith('.png')&&name!=='failure.png').sort();
 writeFileSync(path.join(directory,'index.html'),`<!doctype html><html lang="vi"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Marixa · Giao diện mới</title><style>body{font:15px/1.6 system-ui,sans-serif;background:#f6f8fb;color:#172033;max-width:1600px;margin:0 auto;padding:24px}h1{font-size:28px}p{color:#526078}.gallery{display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:20px}figure{margin:0;background:white;border:1px solid #dce2eb;border-radius:8px;padding:16px}img{display:block;max-width:100%;height:400px;object-fit:contain;object-position:top;margin:auto}figcaption{overflow-wrap:anywhere;margin-top:12px}a{color:#1647c8}</style><h1>Marixa · Giao diện mới</h1><p>Ảnh chụp Chromium với dữ liệu giả cục bộ. Chọn ảnh để xem kích thước đầy đủ. Tông xanh lam đậm, logo gốc và bố cục theo vai trò.</p><div class="gallery">${shots.map(name=>`<figure><a href="${name}" target="_blank"><img loading="lazy" src="${name}" alt="${name.replaceAll('-',' ').replace('.png','')}"></a><figcaption>${name}</figcaption></figure>`).join('')}</div></html>`);
}
