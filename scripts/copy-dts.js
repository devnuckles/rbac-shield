const fs = require('fs');
const path = require('path');

const distDir = path.join(__dirname, '../dist');

function copyDts(dir) {
  if (!fs.existsSync(dir)) return;

  const files = fs.readdirSync(dir);
  
  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory()) {
      copyDts(filePath);
    } else if (file.endsWith('.d.ts')) {
      const newPath = path.join(dir, path.basename(file, '.d.ts') + '.d.mts');
      
      let content = fs.readFileSync(filePath, 'utf8');
      
      // Rewrite relative imports/exports to add .mjs extension
      // Matches: from "./file" or from '../file'
      content = content.replace(/from ['"](\.{1,2}\/[^'"]+)['"]/g, (match, p1) => {
        // Don't add if already has extension
        if (p1.endsWith('.mjs') || p1.endsWith('.js')) return match;
        return `from '${p1}.mjs'`;
      });

      // Handle dynamic imports or import() types if necessary, but usually standard imports cover it
      // Also match: import("...")
      content = content.replace(/import\(['"](\.{1,2}\/[^'"]+)['"]\)/g, (match, p1) => {
         if (p1.endsWith('.mjs') || p1.endsWith('.js')) return match;
         return `import('${p1}.mjs')`;
      });

      fs.writeFileSync(newPath, content);
    }
  });
}

copyDts(distDir);
console.log('Created .d.mts files for ESM compatibility');
