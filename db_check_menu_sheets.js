import fs from 'fs';

const filepath = 'd:\\store-on-tips\\src\\pages\\storefront\\StorefrontMenu.tsx';
const content = fs.readFileSync(filepath, 'utf8');
const lines = content.split('\n');

lines.forEach((line, idx) => {
  if (line.includes('<Sheet') || line.includes('</Sheet') || line.includes('<SheetContent') || line.includes('SheetContent')) {
    console.log(`Line ${idx + 1}: ${line.trim()}`);
  }
});
