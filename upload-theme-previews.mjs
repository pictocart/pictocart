/**
 * Upload theme SVGs to Supabase Storage.
 * Requires the 'theme-previews' bucket to be public (created via Supabase dashboard).
 * Uses service_role key if available, else anon key.
 */
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

const SUPABASE_URL = 'https://wuqznkpaldtvpfpdtllp.supabase.co';
// Try service_role key from env, else fall back to anon key
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind1cXpua3BhbGR0dnBmcGR0bGxwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NDIwMzYzMywiZXhwIjoyMDk5Nzc5NjMzfQ.IlrtNrVbIEbcQCQxv1ZRFEb6Y3DNlykAR1-EjaxEaP0';
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind1cXpua3BhbGR0dnBmcGR0bGxwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQyMDM2MzMsImV4cCI6MjA5OTc3OTYzM30.lxhNQMmXDF7_BNSyCLtg8uhgMqnUNvwU_8FRy-7lxkE';

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
