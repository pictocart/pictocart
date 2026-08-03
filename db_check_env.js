import fs from 'fs';

['.env', '.env.local', '.env.development', '.env.production'].forEach(file => {
  if (fs.existsSync(file)) {
    console.log(`=== ${file} ===`);
    console.log(fs.readFileSync(file, 'utf8'));
  }
});
