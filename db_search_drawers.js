import fs from 'fs';
import path from 'path';

function walk(dir, callback) {
  fs.readdirSync(dir).forEach(file => {
    let filepath = path.join(dir, file);
    let stat = fs.statSync(filepath);
    if (stat.isDirectory()) {
      if (file !== 'node_modules' && file !== '.git' && file !== 'dist' && file !== 'brain' && file !== '.agents') {
        walk(filepath, callback);
      }
    } else {
      callback(filepath);
    }
  });
}

walk('.', filepath => {
  if (filepath.endsWith('.tsx') || filepath.endsWith('.ts')) {
    const content = fs.readFileSync(filepath, 'utf8');
    if (content.includes('inset-y-0') && (content.includes('w-72') || content.includes('w-80') || content.includes('w-64') || content.includes('w-96'))) {
      console.log(`Matching file: ${filepath}`);
      // Find lines with inset-y-0
      content.split('\n').forEach((line, idx) => {
        if (line.includes('inset-y-0')) {
          console.log(`  Line ${idx + 1}: ${line.trim()}`);
        }
      });
    }
  }
});
