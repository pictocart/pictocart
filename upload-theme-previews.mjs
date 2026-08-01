/**
 * Upload theme SVGs to Supabase Storage.
 * Requires the 'theme-previews' bucket to be public (created via Supabase dashboard).
 * Uses service_role key if available, else anon key.
 */
import { createClient } from '@supabase/supabase-js';
import { readFileSync, existsSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Load environment variables from .env if running locally
if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
  try {
    const __dirname = path.dirname(fileURLToPath(import.meta.url));
    const envPath = path.resolve(__dirname, '.env');
    if (existsSync(envPath)) {
      readFileSync(envPath, 'utf8').split(/\r?\n/).forEach(line => {
        const parts = line.split('=');
        if (parts.length >= 2) {
          const key = parts[0].trim();
          let val = parts.slice(1).join('=').trim();
          if (val.startsWith('"') && val.endsWith('"')) val = val.slice(1, -1);
          process.env[key] = val;
        }
      });
    }
  } catch (e) {}
}

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://wuqznkpaldtvpfpdtllp.supabase.co';
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const ANON_KEY = process.env.SUPABASE_PUBLISHABLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind1cXpua3BhbGR0dnBmcGR0bGxwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQyMDM2MzMsImV4cCI6MjA5OTc3OTYzM30.lxhNQMmXDF7_BNSyCLtg8uhgMqnUNvwU_8FRy-7lxkE';

if (!SERVICE_KEY) {
  console.error("Error: SUPABASE_SERVICE_ROLE_KEY environment variable is not defined.");
  process.exit(1);
}
const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

async function ensureBucket() {
  const { data: buckets } = await supabase.storage.listBuckets();
  const exists = buckets?.some(b => b.name === 'theme-previews');
  if (!exists) {
    const { error } = await supabase.storage.createBucket('theme-previews', { public: true });
    if (error) console.error('Bucket create error:', error.message);
    else console.log('✓ Bucket theme-previews created');
  } else {
    console.log('✓ Bucket theme-previews exists');
  }
}

await ensureBucket();

const files = [
  'noir-atelier',
  'ivory-luxe',
  'neon-drip',
  'blush-street',
];

for (const id of files) {
  const content = readFileSync(`public/theme-previews/${id}.svg`);
  const { error } = await supabase.storage
    .from('theme-previews')
    .upload(`layout-themes/${id}.svg`, content, {
      contentType: 'image/svg+xml',
      upsert: true,
    });
  if (error) {
    console.error(`✗ ${id}:`, error.message);
  } else {
    const { data } = supabase.storage
      .from('theme-previews')
      .getPublicUrl(`layout-themes/${id}.svg`);
    console.log(`✓ ${id}:`, data.publicUrl);
  }
}
