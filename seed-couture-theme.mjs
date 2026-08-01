import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Load environment variables from .env if running locally
if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
  try {
    const __dirname = path.dirname(fileURLToPath(import.meta.url));
    const envPath = path.resolve(__dirname, '.env');
    if (fs.existsSync(envPath)) {
      fs.readFileSync(envPath, 'utf8').split(/\r?\n/).forEach(line => {
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

const SUPABASE_URL = process.env.SUPABASE_URL || "https://wuqznkpaldtvpfpdtllp.supabase.co";
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SERVICE_KEY) {
  console.error("Error: SUPABASE_SERVICE_ROLE_KEY environment variable is not defined.");
  process.exit(1);
}
const H = { "apikey": SERVICE_KEY, "Authorization": `Bearer ${SERVICE_KEY}`, "Content-Type": "application/json" };

async function main() {
  // 1. Upsert theme_master_projects
  const upsertRes = await fetch(`${SUPABASE_URL}/rest/v1/theme_master_projects?theme_id=eq.couture`, {
    method: "PATCH",
    headers: { ...H, "Prefer": "return=representation" },
    body: JSON.stringify({
      name: "Couture — Fashion Edit",
      description: "Dark editorial theme with full-screen hero, lookbook, and hover-reveal cards. Made for clothing & fashion brands.",
      category: "bold",
      is_default: false,
      is_active: true,
      is_premium: false,
      price: 0,
      preview_image: "/theme-previews/couture.svg",
      lovable_project_url: "/admin/themes/preview/couture",
      client_patch_prompt: "",
    }),
  });

  if (!upsertRes.ok) {
    // If not found, do INSERT instead
    const insertRes = await fetch(`${SUPABASE_URL}/rest/v1/theme_master_projects`, {
      method: "POST",
      headers: { ...H, "Prefer": "return=representation" },
      body: JSON.stringify({
        theme_id: "couture",
        name: "Couture — Fashion Edit",
        description: "Dark editorial theme with full-screen hero, lookbook, and hover-reveal cards. Made for clothing & fashion brands.",
        category: "bold",
        is_default: false,
        is_active: true,
        is_premium: false,
        price: 0,
        preview_image: "/theme-previews/couture.svg",
        client_patch_prompt: "",
      }),
    });
    if (!insertRes.ok) {
      console.error("Failed to insert theme_master_projects:", insertRes.status, await insertRes.text());
      return;
    }
    console.log("✓ Couture theme inserted (new)");
  } else {
    console.log("✓ Couture theme updated (existing)");
  }

  // 2. Upload SVG preview to Supabase Storage
  const fs = await import("fs");
  const path = await import("path");
  const { fileURLToPath } = await import("url");
  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  const svgPath = path.join(__dirname, "public", "theme-previews", "couture.svg");
  if (fs.existsSync(svgPath)) {
    const svg = fs.readFileSync(svgPath, "utf-8");
    const path = `layout-themes/couture.svg`;

    const uploadRes = await fetch(
      `${SUPABASE_URL}/storage/v1/object/theme-previews/${path}`,
      {
        method: "PUT",
        headers: {
          "apikey": SERVICE_KEY,
          "Authorization": `Bearer ${SERVICE_KEY}`,
          "Content-Type": "image/svg+xml",
        },
        body: svg,
      }
    );

    if (uploadRes.ok) {
      const publicUrl = `${SUPABASE_URL}/storage/v1/object/public/theme-previews/${path}`;
      console.log("✓ SVG uploaded:", publicUrl);

      // Update preview_image to use storage URL
      const updateRes = await fetch(
        `${SUPABASE_URL}/rest/v1/theme_master_projects?theme_id=eq.couture`,
        {
          method: "PATCH",
          headers: H,
          body: JSON.stringify({ preview_image: publicUrl }),
        }
      );

      if (updateRes.ok) {
        console.log("✓ preview_image updated to storage URL");
      } else {
        console.error("✗ Failed to update preview_image:", await updateRes.text());
      }
    } else {
      console.error("✗ SVG upload failed:", await uploadRes.text());
    }
  } else {
    console.log("⚠ SVG file not found at", svgPath);
  }
}

main().catch(console.error);
