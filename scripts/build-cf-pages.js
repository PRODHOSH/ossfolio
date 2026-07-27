const fs = require('fs');
const path = require('path');

const openNextDir = path.join(__dirname, '..', '.open-next');
const assetsDir = path.join(openNextDir, 'assets');

// 1. Rename worker.js to _worker.js
const workerJsPath = path.join(openNextDir, 'worker.js');
const underscoreWorkerJsPath = path.join(openNextDir, '_worker.js');

if (fs.existsSync(workerJsPath)) {
  fs.renameSync(workerJsPath, underscoreWorkerJsPath);
  console.log('Renamed worker.js to _worker.js');
}

// 2. Move all contents of assets/ into .open-next/
if (fs.existsSync(assetsDir)) {
  const items = fs.readdirSync(assetsDir);
  for (const item of items) {
    const src = path.join(assetsDir, item);
    const dest = path.join(openNextDir, item);
    // If destination already exists (e.g. if script ran twice), overwrite/ignore
    if (fs.existsSync(dest) && fs.statSync(dest).isDirectory()) {
      // just a simple mv, we don't handle recursive merge for simplicity, assuming clean build
      fs.rmSync(dest, { recursive: true, force: true });
    }
    fs.renameSync(src, dest);
    console.log(`Moved ${item} to .open-next/`);
  }
  fs.rmdirSync(assetsDir);
  console.log('Removed empty assets directory');
}

console.log('Successfully structured .open-next for Cloudflare Pages!');
