// Returns a copy-paste-ready prompt for a fresh Lovable project so that
// a merchant storefront becomes a dumb shell that always reads the latest
// theme + content from Pictocart's Supabase backend.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, "Content-Type": "application/json" } });

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const { store_id } = await req.json().catch(() => ({}));
    if (!store_id) return json({ error: "store_id required" }, 400);

    const admin = createClient(SUPABASE_URL, SERVICE_KEY);
    const { data: store, error } = await admin
      .from("stores")
      .select("id, name, slug, custom_domain, logo_url")
      .eq("id", store_id)
      .maybeSingle();
    if (error) throw error;
    if (!store) return json({ error: "store not found" }, 404);

    const supabaseHost = SUPABASE_URL.replace(/^https?:\/\//, "");
    const domainNote = store.custom_domain
      ? `After publishing, point ${store.custom_domain} (and www.${store.custom_domain}) to this Lovable project via DNS, then add it as a custom domain in project settings.`
      : `After publishing, optionally attach a custom domain in project settings.`;

    const prompt = `You are building the live storefront for "${store.name}" (slug: ${store.slug}).

This project is a *dumb renderer*. ALL theme layout, copy, images, products, blog posts, customer accounts, cart, checkout, and authentication come from a Pictocart-managed Supabase backend. Do not hardcode any theme content. Every render must call \`get-storefront-bundle\` and pass through the shared renderer.

# Required setup

1. Stack: React + Vite + TypeScript + Tailwind + Shadcn UI + React Router + @tanstack/react-query + @supabase/supabase-js. Mobile-first.

2. Add these env values to \`.env\` (already public, safe to commit):
   VITE_SUPABASE_URL=${SUPABASE_URL}
   VITE_SUPABASE_PUBLISHABLE_KEY=${ANON_KEY}
   VITE_STORE_ID=${store.id}
   VITE_STORE_SLUG=${store.slug}

3. Create \`src/integrations/supabase/client.ts\`:
\`\`\`ts
import { createClient } from '@supabase/supabase-js';
export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL!,
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY!,
);
\`\`\`

4. Create \`src/hooks/useStorefrontBundle.ts\` that invokes the edge function \`get-storefront-bundle\` with \`{ slug: import.meta.env.VITE_STORE_SLUG }\` and returns \`{ store, theme, theme_manifest, products, categories, blog_recent, content }\`. Cache for 60 seconds via React Query.

5. Copy these files VERBATIM from the Pictocart source (ask the user to paste them or fetch from the Pictocart GitHub):
   - \`src/components/theme/MasterThemeRenderer.tsx\`  (the entire file)
   - \`src/hooks/useThemeManifest.ts\`
   - \`src/hooks/useCart.ts\`
   - \`src/hooks/useStorefrontBundle.ts\`
   - \`src/components/storefront/SEOHead.tsx\`

6. Router config in \`src/App.tsx\`:
\`\`\`tsx
import { BrowserRouter, Routes, Route, useParams } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useStorefrontBundle } from './hooks/useStorefrontBundle';
import { useThemeManifest } from './hooks/useThemeManifest';
import MasterThemeRenderer from './components/theme/MasterThemeRenderer';

const qc = new QueryClient();
const SLUG = import.meta.env.VITE_STORE_SLUG;

function Page({ page }: { page: string }) {
  const { data: bundle, isLoading } = useStorefrontBundle({ slug: SLUG });
  const themeId = bundle?.theme?.theme_id;
  const { data: manifest } = useThemeManifest(themeId);
  if (isLoading || !bundle || !manifest) return <div className="min-h-screen flex items-center justify-center">Loading…</div>;
  return (
    <MasterThemeRenderer
      manifest={manifest}
      page={page}
      overrides={(bundle.store.settings as any)?.theme_overrides}
      storeSlug={SLUG}
      products={bundle.products.featured as any}
    />
  );
}

export default function App() {
  return (
    <QueryClientProvider client={qc}>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Page page="home" />} />
          <Route path="/shop" element={<Page page="shop" />} />
          <Route path="/product/:id" element={<Page page="product" />} />
          <Route path="/cart" element={<Page page="cart" />} />
          <Route path="/checkout" element={<Page page="checkout" />} />
          <Route path="/journal" element={<Page page="journal" />} />
          <Route path="/journal/:slug" element={<Page page="journal" />} />
          <Route path="/about" element={<Page page="about" />} />
          <Route path="/contact" element={<Page page="contact" />} />
          <Route path="/account/*" element={<Page page="account" />} />
          <Route path="/auth/*" element={<Page page="auth" />} />
          <Route path="*" element={<Page page="home" />} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
\`\`\`

7. \`index.html\` head:
\`\`\`html
<title>${store.name}</title>
<meta name="description" content="${store.name} storefront" />
<link rel="icon" href="${store.logo_url ?? "/favicon.ico"}" />
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
\`\`\`

8. Tailwind: enable JIT, add no custom theme colors — the renderer reads colors from the manifest via CSS variables.

# Important rules

- NEVER hardcode product, page, theme, or copy data. Everything comes from \`get-storefront-bundle\` and \`theme_master_versions.files_manifest\`.
- NEVER add new section types in this project. New section types belong in Pictocart's \`MasterThemeRenderer\`.
- This project is one-time provisioning. After publishing, every change a merchant makes in Pictocart's Customise screen (or any theme update Pictocart pushes) shows up here automatically on next page load.
- ${domainNote}
- Supabase endpoint: ${supabaseHost}

# Acceptance test

Visit /, /shop, /journal, /about, /contact, /cart — each must render the correct manifest page with the merchant's branding (logo, name, palette). No "loading old then new" flash.

When all of the above is done, publish the project.`;

    return json({ ok: true, store, prompt });
  } catch (e) {
    return json({ ok: false, error: e instanceof Error ? e.message : String(e) }, 500);
  }
});
