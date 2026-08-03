import fs from 'fs';

const content = fs.readFileSync('d:\\store-on-tips\\src\\components\\theme\\MasterThemeRenderer.tsx', 'utf8');
const lines = content.split('\n');

lines.forEach((line, idx) => {
  if (line.includes('overrides?.pages') || line.includes('overrides.pages') || line.includes('pageSections')) {
    console.log(`Line ${idx + 1}: ${line.trim()}`);
  }
});
