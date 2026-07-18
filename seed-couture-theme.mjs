const SUPABASE_URL = "https://wuqznkpaldtvpfpdtllp.supabase.co";
const SERVICE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind1cXpua3BhbGR0dnBmcGR0bGxwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NDIwMzYzMywiZXhwIjoyMDk5Nzc5NjMzfQ.IlrtNrVbIEbcQCQxv1ZRFEb6Y3DNlykAR1-EjaxEaP0";
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
