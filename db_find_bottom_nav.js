import fs from 'fs';

const files = [
  'd:\\store-on-tips\\src\\components\\storefront\\StorefrontLayout.tsx',
  'd:\\store-on-tips\\src\\pages\\storefront\\StorefrontMenu.tsx',
  'd:\\store-on-tips\\src\\pages\\StorefrontCheckout.tsx',
  'd:\\store-on-tips\\src\\pages\\Storefront.tsx'
];

files.forEach(f => {
  if (!fs.existsSync(f)) return;
  const content = fs.readFileSync(f, 'utf8');
  const lines = content.split('\n');
  lines.forEach((line, idx) => {
    if (line.includes('Home') && line.includes('Menu') && line.includes('Search')) {
      console.log(`${f} Line ${idx + 1}: ${line.trim()}`);
    }
  });
});
