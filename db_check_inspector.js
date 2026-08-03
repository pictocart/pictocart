import fs from 'fs';

const content = fs.readFileSync('d:\\store-on-tips\\src\\pages\\CustomiserV2.tsx', 'utf8');
const lines = content.split('\n');

let start = -1;
lines.forEach((line, idx) => {
  if (line.includes('function SectionInspector')) {
    start = idx;
    console.log(`Found SectionInspector at line ${idx + 1}`);
  }
});

if (start !== -1) {
  // Print next 100 lines
  for (let i = start; i < start + 100; i++) {
    console.log(`${i + 1}: ${lines[i]}`);
  }
}
