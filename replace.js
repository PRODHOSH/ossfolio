const fs = require('fs');
const files = [
  'src/app/api/profile/sync/route.ts',
  'src/app/compare/page.tsx',
  'src/app/[username]/opengraph-image.tsx',
  'src/lib/digest.ts',
  'src/lib/github.ts',
  'src/lib/org-data.ts',
  'src/lib/profile-data.ts'
];

for (const file of files) {
  const content = fs.readFileSync(file, 'utf8');
  
  let newContent = content;
  // Replace template literals: `https://api.github.com/...
  newContent = newContent.replace(/`https:\/\/api\.github\.com/g, '`\\${GITHUB_API_BASE}');
  
  // Replace standard strings: "https://api.github.com/..."
  newContent = newContent.replace(/["']https:\/\/api\.github\.com([^"']*)["']/g, '`\\${GITHUB_API_BASE}$1`');
  
  // If we mistakenly created `${GITHUB_API_BASE}` without template literals
  newContent = newContent.replace(/`\$\{GITHUB_API_BASE\}`/g, 'GITHUB_API_BASE');
  
  if (content !== newContent) {
    if (!content.includes('GITHUB_API_BASE')) {
      const importPath = file.startsWith('src/lib/') ? './constants' : '@/lib/constants';
      const importStmt = `import { GITHUB_API_BASE } from '${importPath}';\n`;
      // Put import after the last import, or at top
      const lastImportIndex = newContent.lastIndexOf('import ');
      if (lastImportIndex !== -1) {
        const endOfLastImport = newContent.indexOf('\n', lastImportIndex);
        newContent = newContent.slice(0, endOfLastImport + 1) + importStmt + newContent.slice(endOfLastImport + 1);
      } else {
        newContent = importStmt + newContent;
      }
    }
    fs.writeFileSync(file, newContent);
    console.log('Updated ' + file);
  }
}
