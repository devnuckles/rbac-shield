const fs = require('fs');
const path = require('path');

// Copy .js files from cjs directory to dist root
const cjsDir = path.join(__dirname, '../dist/cjs');
const distDir = path.join(__dirname, '../dist');

function copyFiles(dir) {
  const files = fs.readdirSync(dir);
  
  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory()) {
      copyFiles(filePath);
    } else if (file.endsWith('.js')) {
      const newPath = path.join(distDir, path.basename(file));
      fs.copyFileSync(filePath, newPath);
    }
  });
}

if (fs.existsSync(cjsDir)) {
  copyFiles(cjsDir);
  // Clean up cjs directory
  fs.rmSync(cjsDir, { recursive: true, force: true });
  console.log('CJS files copied to dist');
}
