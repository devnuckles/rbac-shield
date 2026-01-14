const fs = require('fs');
const path = require('path');

// Rename .js files to .mjs in the esm directory
const esmDir = path.join(__dirname, '../dist/esm');
const distDir = path.join(__dirname, '../dist');

function renameFiles(dir) {
  const files = fs.readdirSync(dir);
  
  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory()) {
      renameFiles(filePath);
    } else if (file.endsWith('.js')) {
      const newPath = path.join(distDir, path.basename(file, '.js') + '.mjs');
      fs.copyFileSync(filePath, newPath);
    }
  });
}

if (fs.existsSync(esmDir)) {
  renameFiles(esmDir);
  // Clean up esm directory
  fs.rmSync(esmDir, { recursive: true, force: true });
  console.log('ESM files renamed to .mjs');
}
