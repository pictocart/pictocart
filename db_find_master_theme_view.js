import fs from 'fs';

const content = fs.readFileSync('d:\\store-on-tips\\src\\pages\\Storefront.tsx', 'utf8');
const lines = content.split('\n');

lines.forEach((line, idx) => {
  if (line.includes('MasterThemeView')) {
    console.log(`Line ${idx + 1}: ${line.trim()}`);
  }
});
