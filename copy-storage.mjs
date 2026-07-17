// Storage copy script — purane Supabase se naye Supabase mein files copy karta hai
import https from 'https';
import http from 'http';
import fs from 'fs';
import path from 'path';

const OLD_URL = 'https://qxeyndsvkfsmkilkzmuc.supabase.co';
const NEW_URL = 'https://wuqznkpaldtvpfpdtllp.supabase.co';

// Purane project ka service_role key chahiye — purane project ke Legacy API tab se lo
const OLD_SERVICE_KEY = process.env.OLD_SERVICE_KEY;
const NEW_SERVICE_KEY = process.env.NEW_SERVICE_KEY;

const BUCKETS = ['product-images', 'store-assets', 'product-media'];

function fetchJson(url, headers) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, { headers }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); }
        catch (e) { reject(new Error(`Parse error: ${data}`)); }
      });
    });
    req.on('error', reject);
  });
}

function downloadFile(url, headers) {
  return new Promise((resolve, reject) => {
    const lib = url.startsWith('https') ? https : http;
    lib.get(url, { headers }, (res) => {
      if (res.statusCode === 302 || res.statusCode === 301) {
        return downloadFile(res.headers.location, {}).then(resolve).catch(reject);
      }
      const chunks = [];
      res.on('data', chunk => chunks.push(chunk));
      res.on('end', () => resolve(Buffer.concat(chunks)));
      res.on('error', reject);
    }).on('error', reject);
  });
}

function uploadFile(url, headers, buffer, contentType) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const options = {
      hostname: urlObj.hostname,
      path: urlObj.pathname + urlObj.search,
      method: 'POST',
      headers: {
        ...headers,
        'Content-Type': contentType || 'application/octet-stream',
        'Content-Length': buffer.length,
      }
    };
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ status: res.statusCode, body: data }));
    });
    req.on('error', reject);
    req.write(buffer);
    req.end();
  });
}

async function listFiles(baseUrl, serviceKey, bucket, prefix = '') {
  const url = `${baseUrl}/storage/v1/object/list/${bucket}`;
  const body = JSON.stringify({ prefix, limit: 1000, offset: 0 });
  
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const options = {
      hostname: urlObj.hostname,
      path: urlObj.pathname,
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${serviceKey}`,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body),
      }
    };
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); }
        catch (e) { reject(new Error(data)); }
      });
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

async function copyBucket(bucket) {
  console.log(`\n📦 Bucket: ${bucket}`);
  
  // List all files in old bucket
  const files = await listFiles(OLD_URL, OLD_SERVICE_KEY, bucket);
  
  if (!Array.isArray(files)) {
    console.log(`  ⚠️  No files or error:`, files);
    return;
  }
  
  console.log(`  Found ${files.length} items`);
  
  for (const file of files) {
    if (file.id === null) {
      // It's a folder — list recursively
      const subFiles = await listFiles(OLD_URL, OLD_SERVICE_KEY, bucket, file.name);
      files.push(...subFiles.map(f => ({ ...f, name: `${file.name}/${f.name}` })));
      continue;
    }
    
    const filePath = file.name;
    console.log(`  📄 Copying: ${filePath}`);
    
    try {
      // Download from old
      const downloadUrl = `${OLD_URL}/storage/v1/object/public/${bucket}/${filePath}`;
      const buffer = await downloadFile(downloadUrl, {
        'Authorization': `Bearer ${OLD_SERVICE_KEY}`
      });
      
      // Upload to new
      const uploadUrl = `${NEW_URL}/storage/v1/object/${bucket}/${filePath}`;
      const result = await uploadFile(uploadUrl, {
        'Authorization': `Bearer ${NEW_SERVICE_KEY}`,
      }, buffer, file.metadata?.mimetype);
      
      if (result.status === 200 || result.status === 201) {
        console.log(`    ✅ Done`);
      } else {
        console.log(`    ❌ Failed: ${result.status} ${result.body}`);
      }
    } catch (err) {
      console.log(`    ❌ Error: ${err.message}`);
    }
  }
}

async function main() {
  if (!OLD_SERVICE_KEY || !NEW_SERVICE_KEY) {
    console.error('❌ Environment variables missing!');
    console.error('Run: $env:OLD_SERVICE_KEY="..."; $env:NEW_SERVICE_KEY="..."; node copy-storage.mjs');
    process.exit(1);
  }
  
  console.log('🚀 Storage copy starting...');
  for (const bucket of BUCKETS) {
    await copyBucket(bucket);
  }
  console.log('\n✅ Storage copy complete!');
}

main().catch(console.error);
