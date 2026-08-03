import fs from 'fs';
import path from 'path';

function findFile(dir, filename) {
  let result = null;
  fs.readdirSync(dir).forEach(file => {
    let filepath = path.join(dir, file);
    let stat = fs.statSync(filepath);
    if (stat.isDirectory()) {
      if (file !== 'node_modules' && file !== '.git') {
        let res = findFile(filepath, filename);
        if (res) result = res;
      }
    } else if (file === filename) {
      result = filepath;
    }
  });
  return result;
}

const filepath = findFile('.', 'useStoreByHost.ts') || findFile('.', 'useStoreByHost.tsx') || findFile('.', 'useStoreByHost.js');
if (filepath) {
  console.log(`Found file at: ${filepath}`);
  console.log(fs.readFileSync(filepath, 'utf8'));
} else {
  // Let's grep for useStoreByHost
  console.log("Hook file not found, searching codebase for references...");
}
