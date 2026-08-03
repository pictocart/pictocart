import { execSync } from 'child_process';
import fs from 'fs';
import readline from 'readline';

const projectRef = 'wuqznkpaldtvpfpdtllp';
const defaultPass = 'Anveshi@1912022';

console.log("==================================================");
console.log("          COMBINE: DEV TO MAIN DEPLOYMENT         ");
console.log("==================================================");

function runCmd(cmd, options = {}) {
  try {
    return execSync(cmd, { encoding: 'utf-8', stdio: 'inherit', ...options });
  } catch (err) {
    console.error(`❌ Command failed: ${cmd}`);
    process.exit(1);
  }
}

// Ask for the production database password
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

rl.question(`Enter production database password [Default: ${defaultPass}]: `, (passInput) => {
  const password = passInput.trim() || defaultPass;
  rl.close();

  try {
    // 1. Get current branch name
    const initialBranch = execSync('git rev-parse --abbrev-ref HEAD', { encoding: 'utf-8' }).trim();
    console.log(`\nStarting on branch: ${initialBranch}`);

    if (initialBranch !== 'dev') {
      console.log("⚠️ You are not on 'dev' branch. Switching to 'dev'...");
      runCmd('git checkout dev');
    }

    // 2. Build local frontend code to verify there are no compilation errors
    console.log("\nBuilding frontend to verify no compilation errors...");
    runCmd('npm run build');
    console.log("✅ Frontend compilation check passed!");

    // 3. Switch to main and merge dev
    console.log("\nSwitching to main branch...");
    runCmd('git checkout main');

    console.log("\nMerging dev into main...");
    runCmd('git merge dev --no-edit');

    // 4. Configure .env for production
    console.log("\nConfiguring production environment credentials in .env...");
    let envContent = fs.readFileSync('.env', 'utf-8');
    
    // Comment staging
    envContent = envContent.replace(/(^|\n)(SUPABASE_PUBLISHABLE_KEY|SUPABASE_URL|VITE_SUPABASE_PROJECT_ID|VITE_SUPABASE_PUBLISHABLE_KEY|VITE_SUPABASE_URL)\s*=/g, '$1# $2=');
    // Uncomment production
    envContent = envContent.replace(/(^|\n)#\s*(SUPABASE_PUBLISHABLE_KEY|SUPABASE_URL|VITE_SUPABASE_PROJECT_ID|VITE_SUPABASE_PUBLISHABLE_KEY|VITE_SUPABASE_URL|SUPABASE_SERVICE_ROLE_KEY)\s*=\s*"([^"]+)"/g, (match, p1, p2, p3) => {
      // Ensure we only uncomment production credentials (containing wuqznk)
      if (p3.includes('wuqznk') || p2 === 'SUPABASE_SERVICE_ROLE_KEY') {
        return `${p1}${p2}="${p3}"`;
      }
      return match;
    });
    fs.writeFileSync('.env', envContent);
    console.log("✅ .env file configured for production.");

    // 5. Connect/Link to production project ref
    console.log("\nLinking CLI workspace to production Supabase project...");
    runCmd(`npx supabase link --project-ref ${projectRef} --password "${password}"`, { stdio: 'ignore' });
    console.log(`✅ Linked to ${projectRef}`);

    // 6. Push database migrations to production
    console.log("\nPushing database migrations to production database...");
    runCmd(`npx supabase db push --password "${password}"`);
    console.log("✅ Database migrations applied successfully!");

    // 7. Find modified edge functions using git diff and deploy them
    console.log("\nDetecting modified Edge Functions...");
    const gitDiff = execSync('git diff --name-only origin/main HEAD', { encoding: 'utf-8' });
    const diffFiles = gitDiff.split('\n').map(f => f.trim()).filter(Boolean);
    let modifiedFunctions = new Set();
    
    diffFiles.forEach(file => {
      if (file.startsWith('supabase/functions/')) {
        const parts = file.split('/');
        const funcName = parts[2];
        if (funcName && funcName !== '_shared') {
          // Verify folder exists and is not a deleted function
          if (fs.existsSync(`./supabase/functions/${funcName}/index.ts`)) {
            modifiedFunctions.add(funcName);
          }
        }
      }
    });

    if (modifiedFunctions.size > 0) {
      const funcList = Array.from(modifiedFunctions);
      console.log(`Deploying modified Edge Functions: ${funcList.join(', ')}`);
      funcList.forEach(func => {
        runCmd(`npx supabase functions deploy ${func} --project-ref ${projectRef}`);
      });
      console.log("✅ Edge Functions deployed successfully!");
    } else {
      console.log("✅ No modified Edge Functions detected.");
    }

    // 8. Push main to origin main
    console.log("\nPushing main branch to remote repository (production)...");
    runCmd('git push origin main');
    console.log("✅ Code pushed to production successfully!");

    // 9. Revert .env to staging credentials for dev
    console.log("\nReverting .env credentials back to staging...");
    let envRevert = fs.readFileSync('.env', 'utf-8');
    // Comment production
    envRevert = envRevert.replace(/(^|\n)(SUPABASE_PUBLISHABLE_KEY|SUPABASE_URL|VITE_SUPABASE_PROJECT_ID|VITE_SUPABASE_PUBLISHABLE_KEY|VITE_SUPABASE_URL|SUPABASE_SERVICE_ROLE_KEY)\s*=\s*"([^"]+)"/g, (match, p1, p2, p3) => {
      if (p3.includes('wuqznk') || p2 === 'SUPABASE_SERVICE_ROLE_KEY') {
        return `${p1}# ${p2}="${p3}"`;
      }
      return match;
    });
    // Uncomment staging
    envRevert = envRevert.replace(/(^|\n)#\s*(SUPABASE_PUBLISHABLE_KEY|SUPABASE_URL|VITE_SUPABASE_PROJECT_ID|VITE_SUPABASE_PUBLISHABLE_KEY|VITE_SUPABASE_URL)\s*=\s*"([^"]+)"/g, (match, p1, p2, p3) => {
      if (p3.includes('ylvvvcq')) {
        return `${p1}${p2}="${p3}"`;
      }
      return match;
    });
    fs.writeFileSync('.env', envRevert);
    console.log("✅ .env file reverted back to staging credentials.");

    // 10. Return to dev branch
    console.log("\nSwitching back to dev branch...");
    runCmd('git checkout dev');
    console.log("\n🎉 COMBINE DEPLOYMENT COMPLETED SUCCESSFULLY!");

  } catch (err) {
    console.error("\n❌ Deployment failed:", err.message);
    process.exit(1);
  }
});
