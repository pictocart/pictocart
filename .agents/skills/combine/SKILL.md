---
name: combine
description: Merge frontend dev to main branch and automatically deploy all migrations and modified Edge Functions to the production Supabase database.
---

# Combine: Automated Dev to Main & Production Deployment

This workspace skill is triggered whenever the user asks to "combine", "deploy", "merge and push to production", or run the deployment script.

## Procedure to Execute

When the user requests this action, follow these steps:

1. **Verify Sandbox Permissions**:
   Make sure you have permissions to run commands in the workspace `d:\store-on-tips`.

2. **Execute the Combine Script**:
   Run the following terminal command using the `run_command` tool in the workspace directory:
   ```bash
   node combine.js
   ```

3. **Handle Stdin Inputs (Password)**:
   The command will run asynchronously in the background and prompt for the database password:
   `Enter production database password [Default: Anveshi@1912022]: `
   
   * Use the `manage_task` tool with action `send_input` to send the password (or just an empty newline `\n` to select the default password `Anveshi@1912022`).

4. **Monitor Completion**:
   Wait for the command to finish. The script will automatically:
   * Build the frontend locally (`npm run build`) to ensure no compilation errors exist.
   * Switch to `main` branch and merge `dev`.
   * Configure `.env` temporarily with production credentials.
   * Link Supabase CLI to `wuqznkpaldtvpfpdtllp`.
   * Push all pending SQL migrations to the production database.
   * Detect and deploy modified Edge Functions.
   * Push git `main` changes to remote repository (`origin/main`).
   * Revert `.env` and switch the local workspace branch back to `dev` for active development.

5. **Report to User**:
   Summarize the output logs showing successful deployment completion.
