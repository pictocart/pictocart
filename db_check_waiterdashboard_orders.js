import fs from 'fs';

const content = fs.readFileSync('d:\\store-on-tips\\src\\pages\\staff\\WaiterDashboard.tsx', 'utf8');
const lines = content.split('\n');

lines.forEach((line, idx) => {
  if (line.includes('waiter-pending-orders') || line.includes('active-orders') || line.includes('TableBody') || line.includes('status')) {
    console.log(`Line ${idx + 1}: ${line.trim()}`);
  }
});
