import fs from 'fs';

const filepath = 'd:\\store-on-tips\\src\\pages\\storefront\\StorefrontMenu.tsx';
const content = fs.readFileSync(filepath, 'utf8');
const lines = content.split('\n');

lines.forEach((line, idx) => {
  if (line.toLowerCase().includes('bell') || line.toLowerCase().includes('camera') || line.toLowerCase().includes('qr') || line.toLowerCase().includes('call') || line.toLowerCase().includes('waiter') || line.toLowerCase().includes('float')) {
    console.log(`Line ${idx + 1}: ${line.trim()}`);
  }
});
