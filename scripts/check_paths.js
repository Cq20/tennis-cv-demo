// 部署前检查：app/index.html 的 DOM id 引用完整性 + 相对路径资源存在性
// 用法：node scripts/check_paths.js（在仓库根目录运行）
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');          // 仓库根（GitHub Pages 部署根）
const pageDir = path.join(root, 'app');              // 页面所在目录（相对路径基准）
const html = fs.readFileSync(path.join(pageDir, 'index.html'), 'utf8');

const scripts = [...html.matchAll(/<script(?: type="module")?>([\s\S]*?)<\/script>/g)].map(m => m[1]);
const js = scripts.join('\n');
const htmlOnly = html.replace(/<script[\s\S]*?<\/script>/g, '');

// 1) DOM id 引用完整性
const refs = new Set();
for (const m of js.matchAll(/\$\('([A-Za-z0-9_-]+)'\)/g)) refs.add(m[1]);
for (const m of js.matchAll(/getElementById\('([A-Za-z0-9_-]+)'\)/g)) refs.add(m[1]);
const ids = new Set([...htmlOnly.matchAll(/id="([A-Za-z0-9_-]+)"/g)].map(m => m[1]));
const dyn = new Set([...js.matchAll(/\.id\s*=\s*'([A-Za-z0-9_-]+)'/g)].map(m => m[1]));
const missingIds = [...refs].filter(r => !ids.has(r) && !dyn.has(r));
console.log(`DOM id 引用: ${refs.size} 个, HTML 定义: ${ids.size} 个`);
if (missingIds.length) {
  console.log('✗ 缺失 id: ' + missingIds.join(', '));
  process.exitCode = 1;
} else {
  console.log('✓ 所有引用的 id 均存在');
}

// 2) 相对路径资源存在性（以 app/ 为基准解析）
const relRefs = new Set();
for (const m of html.matchAll(/(?:src|data-src|href)="(\.\.?\/[^"]+)"/g)) relRefs.add(m[1]);
for (const m of js.matchAll(/"(\.\.?\/[^"]+\.(?:html|task|mp4|json))"/g)) relRefs.add(m[1]);
let bad = 0;
for (const r of relRefs) {
  const resolved = path.resolve(pageDir, r);
  const okfs = fs.existsSync(resolved);
  console.log((okfs ? '✓ ' : '✗ ') + r + (okfs ? '' : '  → 缺失: ' + resolved));
  if (!okfs) bad++;
}
if (bad) {
  console.log(`✗ ${bad} 个相对路径资源缺失`);
  process.exitCode = 1;
} else {
  console.log('✓ 所有相对路径资源均存在');
}
