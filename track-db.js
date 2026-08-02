import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

// Read feature name argument
const featureName = process.argv[2];

if (!featureName) {
  console.error("❌ Please provide a migration feature name.");
  console.error("Usage: node track-db.js \"your_feature_name\"");
  process.exit(1);
}

const cleanName = featureName.toLowerCase().replace(/[^a-z0-9]+/g, '_');
const projectRef = 'ylvvvcqnenbaangyzojl';
const accessToken = process.env.SUPABASE_ACCESS_TOKEN;

if (!accessToken) {
  console.error("❌ SUPABASE_ACCESS_TOKEN environment variable is not set.");
  console.error("Please run the script as: SUPABASE_ACCESS_TOKEN=your_token node track-db.js \"your_feature_name\"");
  process.exit(1);
}

try {
  console.log("Checking database schema differences on Dev Supabase...");
  
  // Step 1: Run db diff to check if there are actual changes
  const diffOutput = execSync(`npx supabase db diff --project-ref ${projectRef}`, {
    env: { ...process.env, SUPABASE_ACCESS_TOKEN: accessToken },
    encoding: 'utf-8'
  });

  // If the diff only contains empty lines or comments, there are no changes
  const lines = diffOutput.split('\n').map(l => l.trim()).filter(l => l && !l.startsWith('--'));
  if (lines.length === 0) {
    console.log("✅ Database schema is up to date. No changes detected.");
    process.exit(0);
  }

  console.log("Changes detected! Generating SQL migration file...");

  // Step 2: Generate the migration file
  execSync(`npx supabase db diff -f ${cleanName} --project-ref ${projectRef}`, {
    env: { ...process.env, SUPABASE_ACCESS_TOKEN: accessToken },
    stdio: 'inherit'
  });

  // Step 3: Find the newly created migration file
  const migrationsDir = './supabase/migrations';
  const files = fs.readdirSync(migrationsDir).filter(f => f.endsWith('.sql')).sort();
  const latestFile = files[files.length - 1];
  const latestFilePath = path.join(migrationsDir, latestFile);

  console.log(`New migration file created: ${latestFilePath}`);

  // Step 4: Parse SQL file contents for a quick summary
  const sql = fs.readFileSync(latestFilePath, 'utf-8');
  const sqlLines = sql.split('\n').map(l => l.trim()).filter(l => l && !l.startsWith('--'));
  
  let summary = [];
  sqlLines.forEach(line => {
    if (line.toLowerCase().startsWith('create table')) {
      const match = line.match(/create table(?:\s+if\s+not\s+exists)?\s+([a-zA-Z0-9_\.]+)/i);
      if (match) summary.push(`Created table ${match[1]}`);
    } else if (line.toLowerCase().startsWith('alter table')) {
      const match = line.match(/alter table\s+([a-zA-Z0-9_\.]+)/i);
      if (match) summary.push(`Altered table ${match[1]}`);
    } else if (line.toLowerCase().startsWith('create index')) {
      const match = line.match(/create index(?:\s+if\s+not\s+exists)?\s+([a-zA-Z0-9_\.]+)/i);
      if (match) summary.push(`Created index ${match[1]}`);
    } else if (line.toLowerCase().startsWith('create policy')) {
      const match = line.match(/create policy\s+"?([^"]+)"?/i);
      if (match) summary.push(`Created policy "${match[1]}"`);
    }
  });

  if (summary.length === 0) {
    summary.push("Schema updates / function modifications");
  }

  // Step 5: Append to SUPABASE_MIGRATIONS.md
  const dateStr = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });
  const mdEntry = `| ${dateStr} | [${latestFile}](file:///d:/store-on-tips/supabase/migrations/${latestFile}) | ${featureName} | ${summary.join(', ')} |\n`;

  fs.appendFileSync('./SUPABASE_MIGRATIONS.md', mdEntry);
  console.log("✅ Successfully updated SUPABASE_MIGRATIONS.md!");

} catch (err) {
  console.error("❌ Error tracking database changes:", err.message);
}
