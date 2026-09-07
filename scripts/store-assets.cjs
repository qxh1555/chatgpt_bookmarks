// Rasterize the project's existing bookmark mark; requires Sharp only for asset authoring.
const fs = require('node:fs');
const path = require('node:path');
const sharp = require(process.env.SHARP_MODULE_PATH || 'sharp');
const root = path.resolve(__dirname,'..');
const icon = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128"><rect x="16" y="16" width="96" height="96" rx="22" fill="#173e30"/><path d="M47 36h34v62L64 85 47 98V36Z" fill="none" stroke="#c5edb0" stroke-width="5" stroke-linejoin="round"/></svg>';
const promo = '<svg xmlns="http://www.w3.org/2000/svg" width="440" height="280" viewBox="0 0 440 280"><rect width="440" height="280" fill="#173e30"/><path d="M52 46h53v104l-26.5-19L52 150V46Z" fill="none" stroke="#c5edb0" stroke-width="5" stroke-linejoin="round"/><text x="140" y="99" font-family="Microsoft YaHei,sans-serif" font-size="34" font-weight="600" fill="white">对话书签</text><text x="142" y="133" font-family="Segoe UI,sans-serif" font-size="15" letter-spacing="2" fill="#c5edb0">FOR CHATGPT</text><path d="M52 189h336" stroke="#50765e"/><text x="52" y="226" font-family="Microsoft YaHei,sans-serif" font-size="19" fill="#e4eedf">回到刚刚读到的那一句。</text></svg>';
(async()=>{
  fs.mkdirSync(path.join(root,'icons'),{recursive:true});
  fs.mkdirSync(path.join(root,'store','assets'),{recursive:true});
  for (const size of [16,32,48,128]) await sharp(Buffer.from(icon)).resize(size,size).png().toFile(path.join(root,'icons',`icon${size}.png`));
  await sharp(Buffer.from(promo)).png().toFile(path.join(root,'store','assets','promo-440x280.png'));
  fs.copyFileSync(path.join(root,'icons','icon128.png'),path.join(root,'store','assets','icon-128.png'));
  console.log('Created extension icons and 440×280 store promotion.');
})().catch(error=>{console.error(error);process.exitCode=1});
