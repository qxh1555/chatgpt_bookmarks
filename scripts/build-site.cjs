const fs = require('node:fs');
const path = require('node:path');
const packageExtension = require('./package-extension.cjs');
const root = path.resolve(__dirname, '..');
const manifest = JSON.parse(fs.readFileSync(path.join(root,'manifest.json'),'utf8'));
const out = path.join(root, 'out');
fs.mkdirSync(path.join(out, 'assets'), {recursive:true});
fs.mkdirSync(path.join(out, 'downloads'), {recursive:true});
for (const file of ['index.html','styles.css','page.js','favicon.svg']) fs.copyFileSync(path.join(root,'docs',file),path.join(out,file));
fs.copyFileSync(path.join(root,'tests','preview.png'),path.join(out,'assets','preview.png'));
fs.copyFileSync(path.join(root,'privacy.html'),path.join(out,'privacy.html'));
const runtimeFiles = ['manifest.json','anchors.js','content.js','background.js','privacy.html', ...new Set(Object.values(manifest.icons))];
for (const file of runtimeFiles) if (!fs.existsSync(path.join(root,file))) throw new Error(`Missing extension file: ${file}`);
const zip = path.join(out, 'downloads', `chatgpt-bookmarks-v${manifest.version}.zip`);
packageExtension(root,zip,runtimeFiles);
const html = fs.readFileSync(path.join(out,'index.html'),'utf8');
for (const match of html.matchAll(/(?:src|href)="([^"#]+)"/g)) {
  if (/^(https?:|mailto:)/.test(match[1])) continue;
  if (!fs.existsSync(path.join(out,match[1]))) throw new Error(`Broken local link: ${match[1]}`);
}
console.log('Site built: out/ (all local assets and plugin download verified)');
