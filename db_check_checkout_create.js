import fs from 'fs';

const content = fs.readFileSync('d:\\store-on-tips\\src\\pages\\StorefrontCheckout.tsx', 'utf8');
const lines = content.split('\n');

lines.forEach((line, idx) => {
  if (line.includes('createOrder') || line.includes('placed_order_ids')) {
    console.log(`Line ${idx + 1}: ${line.trim()}`);
  }
});
