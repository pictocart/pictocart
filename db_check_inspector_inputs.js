import fs from 'fs';

const content = fs.readFileSync('d:\\store-on-tips\\src\\pages\\CustomiserV2.tsx', 'utf8');
const lines = content.split('\n');

// Search from line 1875 to 2200 for product_grid, grid_clean, style, etc.
for (let i = 1870; i < 2150; i++) {
  const line = lines[i];
  if (line.includes('product_grid') || line.includes('product-grid') || line.includes('Choose Products') || line.includes('style') || line.includes('isChooseProductSection')) {
    console.log(`${i + 1}: ${line.trim()}`);
  }
}
