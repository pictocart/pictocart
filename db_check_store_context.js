import fs from 'fs';

const filepath = 'd:\\store-on-tips\\src\\contexts\\StoreContext.tsx';
const content = fs.readFileSync(filepath, 'utf8');
const lines = content.split('\n');

for (let i = 0; i < 120; i++) {
  console.log(`${i + 1}: ${lines[i]}`);
}
