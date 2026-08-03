import fs from 'fs';

const content = fs.readFileSync('d:\\store-on-tips\\src\\pages\\staff\\ManagerDashboard.tsx', 'utf8');
const lines = content.split('\n');

lines.forEach((line, idx) => {
  if (line.includes('manager-waiter-orders') || line.includes('manager-kitchen-orders') || line.includes('TableBody') || line.includes('TableHead')) {
    console.log(`Line ${idx + 1}: ${line.trim()}`);
  }
});
