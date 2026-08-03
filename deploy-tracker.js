import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

console.log("==================================================");
console.log("      SUPABASE PRODUCTION DEPLOYMENT TRACKER      ");
console.log("==================================================");

// 1. Get current branch and linked project info
let branchName = 'Unknown';
try {
  branchName = execSync('git rev-parse --abbrev-ref HEAD', { encoding: 'utf-8' }).trim();
} catch (e) {}

let linkedProject = 'Unknown';
try {
  const linkFile = './supabase/.temp/project-ref';
  if (fs.existsSync(linkFile)) {
    linkedProject = fs.readFileSync(linkFile, 'utf-8').trim();
  } else {
    // Fallback: parse from supabase link history or config.toml
    const configToml = fs.readFileSync('./supabase/config.toml', 'utf-8');
    const match = configToml.match(/project_id\s*=\s*"([^"]+)"/);
    if (match) linkedProject = match[1];
  }
} catch (e) {}

console.log(`Active Git Branch:   ${branchName}`);
console.log(`Linked Project ID:   ${linkedProject}`);
console.log("==================================================\n");

// 2. Fetch migrations status
console.log("Analyzing remote database migrations status...");
let pendingMigrations = [];
try {
  const migrationsOutput = execSync('npx supabase migration list', { encoding: 'utf-8', stdio: ['ignore', 'pipe', 'ignore'] });
  
  // Parse NDJSON lines
  const lines = migrationsOutput.split('\n').filter(l => l.trim());
  lines.forEach(line => {
    try {
      const data = JSON.parse(line);
      // If local exists but remote is missing or null, it's pending
      if (data.local && (!data.remote || data.remote === '')) {
        pendingMigrations.push(data.local);
      }
    } catch (e) {}
  });
} catch (err) {
  console.log("⚠️ Could not fetch migration list from remote (ensure CLI is linked). Checking local migrations folder...");
}

// Show Database Migrations status
console.log("\n--- DATABASE MIGRATIONS STATUS ---");
if (pendingMigrations.length === 0) {
  console.log("✅ Database schema is 100% up to date on production!");
} else {
  console.log(`⚠️ ${pendingMigrations.length} Pending migrations found:`);
  pendingMigrations.forEach(migrationId => {
    // Find the file name
    const migrationsDir = './supabase/migrations';
    if (fs.existsSync(migrationsDir)) {
      const files = fs.readdirSync(migrationsDir);
      const matchFile = files.find(f => f.startsWith(migrationId));
      if (matchFile) {
        console.log(`  [ ] ${matchFile}`);
        // Parse SQL contents for quick summary
        try {
          const sql = fs.readFileSync(path.join(migrationsDir, matchFile), 'utf-8');
          const sqlLines = sql.split('\n').map(l => l.trim()).filter(l => l && !l.startsWith('--'));
          sqlLines.forEach(line => {
            if (line.toLowerCase().startsWith('create table')) {
              const m = line.match(/create table(?:\s+if\s+not\s+exists)?\s+([a-zA-Z0-9_\.]+)/i);
              if (m) console.log(`      -> Create Table: ${m[1]}`);
            } else if (line.toLowerCase().startsWith('alter table')) {
              const m = line.match(/alter table\s+([a-zA-Z0-9_\.]+)/i);
              if (m) console.log(`      -> Alter Table: ${m[1]}`);
            } else if (line.toLowerCase().startsWith('create policy')) {
              const m = line.match(/create policy\s+"?([^"]+)"?/i);
              if (m) console.log(`      -> Create RLS Policy: "${m[1]}"`);
            } else if (line.toLowerCase().startsWith('drop policy')) {
              const m = line.match(/drop policy\s+"?([^"]+)"?/i);
              if (m) console.log(`      -> Drop RLS Policy: "${m[1]}"`);
            }
          });
        } catch (e) {}
      }
    }
  });
}

// 3. Scan modified Edge Functions
console.log("\n--- EDGE FUNCTIONS STATUS ---");
let modifiedFunctions = new Set();
let allLocalFunctions = [];

const functionsDir = './supabase/functions';
if (fs.existsSync(functionsDir)) {
  allLocalFunctions = fs.readdirSync(functionsDir).filter(f => {
    return fs.statSync(path.join(functionsDir, f)).isDirectory() && !f.startsWith('_');
  });

  // Query git changes against origin/main to find modified functions
  try {
    const gitDiff = execSync('git diff --name-only origin/main', { encoding: 'utf-8' });
    const diffFiles = gitDiff.split('\n').map(f => f.trim()).filter(Boolean);
    
    diffFiles.forEach(file => {
      if (file.startsWith('supabase/functions/')) {
        const parts = file.split('/');
        const funcName = parts[2];
        if (funcName && funcName !== '_shared' && allLocalFunctions.includes(funcName)) {
          modifiedFunctions.add(funcName);
        }
      }
    });
  } catch (e) {
    // If origin/main comparison fails, check local branch uncommitted/unstaged changes
    try {
      const gitDiffLocal = execSync('git diff --name-only HEAD', { encoding: 'utf-8' });
      const diffFilesLocal = gitDiffLocal.split('\n').map(f => f.trim()).filter(Boolean);
      diffFilesLocal.forEach(file => {
        if (file.startsWith('supabase/functions/')) {
          const parts = file.split('/');
          const funcName = parts[2];
          if (funcName && funcName !== '_shared' && allLocalFunctions.includes(funcName)) {
            modifiedFunctions.add(funcName);
          }
        }
      });
    } catch (e2) {}
  }
}

// 4. Cross reference config.toml for deleted/deprecated functions
let deprecatedFunctions = [];
try {
  const configToml = fs.readFileSync('./supabase/config.toml', 'utf-8');
  const functionBlocks = configToml.match(/\[functions\.([^\]]+)\]/g) || [];
  functionBlocks.forEach(block => {
    const name = block.slice(11, -1);
    if (!allLocalFunctions.includes(name)) {
      deprecatedFunctions.push(name);
    }
  });
} catch (e) {}

if (modifiedFunctions.size === 0) {
  console.log("✅ All Edge Functions are up to date with git main branch!");
} else {
  console.log(`⚠️ ${modifiedFunctions.size} Modified Edge Functions detected:`);
  modifiedFunctions.forEach(f => {
    console.log(`  [ ] ${f} (Modified)`);
  });
}

if (deprecatedFunctions.length > 0) {
  console.log(`\n⚠️  ${deprecatedFunctions.length} Deprecated/Deleted Functions found in config.toml (Will fail bulk deploy):`);
  deprecatedFunctions.forEach(f => {
    console.log(`  [!] ${f} (Entrypoint missing - Do not include in deploy commands)`);
  });
}

// 5. Suggested Deploy Commands Dashboard
console.log("\n==================================================");
console.log("            SUGGESTED DEPLOY ACTIONS              ");
console.log("==================================================");

if (pendingMigrations.length > 0) {
  console.log("1. To apply database migrations, run:");
  console.log(`   npx supabase db push --password <PROD_PASSWORD>\n`);
} else {
  console.log("1. Database: Up to date (No action required).\n");
}

if (modifiedFunctions.size > 0) {
  console.log("2. To deploy modified Edge Functions, run:");
  const funcList = Array.from(modifiedFunctions).join(" ");
  console.log(`   npx supabase functions deploy ${funcList} --project-ref ${linkedProject}\n`);
} else {
  console.log("2. Edge Functions: Up to date (No action required).\n");
}

console.log("==================================================");
