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

    const publicSite = Deno.env.get("PUBLIC_SITE_URL") || "https://pictocart.in";
    const storefrontUrl = `${publicSite}/s/${store.slug}`;

    const prompt = `You are building the live storefront shell for "${store.name}" (slug: ${store.slug}).

This project is a thin custom-domain host for a Pictocart storefront. The actual storefront — theme, products, cart, checkout, customer accounts, blog — is already fully rendered and maintained at ${storefrontUrl}. This project's only job is to surface that storefront under the merchant's own domain.

# STACK — DO NOT ASK, JUST DO

Use **React 18 + Vite + TypeScript + Tailwind + React Router DOM v6**. This is the Lovable default. If the starter template uses TanStack Start, file-based routing, Next.js, or any other framework, **remove it** and switch to plain Vite + React Router DOM. Do not ask the user which stack to use — the answer is always Vite + React Router DOM.

Do **NOT** ask the user to paste any files from another project. Everything you need is in this prompt.

# Implementation

1. \`index.html\` head:
\`\`\`html
<title>${store.name}</title>
<meta name="description" content="${store.name} — shop online" />
<link rel="icon" href="${store.logo_url ?? "/favicon.ico"}" />
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
\`\`\`

2. \`src/App.tsx\` — a single component that proxies every path to the Pictocart-hosted storefront via a full-viewport iframe, syncing the URL so deep-links and back/forward work:

\`\`\`tsx
import { useEffect, useRef } from "react";

const STOREFRONT_BASE = "${storefrontUrl}";

export default function App() {
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    const onMsg = (e: MessageEvent) => {
      if (typeof e.data !== "object" || !e.data) return;
      if (e.data.type === "pictocart:navigate" && typeof e.data.path === "string") {
        const next = e.data.path;
        if (window.location.pathname + window.location.search !== next) {
          window.history.pushState({}, "", next);
        }
      }
    };
    window.addEventListener("message", onMsg);
    return () => window.removeEventListener("message", onMsg);
  }, []);

  const initialPath = window.location.pathname + window.location.search;
  const src = STOREFRONT_BASE + (initialPath === "/" ? "" : initialPath);

  return (
    <iframe
      ref={iframeRef}
      src={src}
      title="${store.name}"
      style={{ border: 0, width: "100vw", height: "100vh", display: "block" }}
      allow="payment; clipboard-write; geolocation"
    />
  );
}
\`\`\`

3. \`src/main.tsx\`:
\`\`\`tsx
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
createRoot(document.getElementById("root")!).render(<StrictMode><App /></StrictMode>);
\`\`\`

4. \`src/index.css\`: just \`html, body, #root { margin: 0; height: 100%; }\` plus Tailwind base/components/utilities.

5. Remove any starter sample pages, routes folders, or extra components — keep only \`App.tsx\`, \`main.tsx\`, \`index.css\`, \`index.html\`.

# Rules

- Do **not** add @supabase/supabase-js, react-router-dom routes, theme renderers, or business logic here. The Pictocart storefront handles all of that already.
- Do **not** ask the user for file contents, API keys, or stack choices.
- ${domainNote}

# Acceptance test

Visiting / shows the ${store.name} storefront. Clicking around inside the storefront updates correctly. Refreshing on /shop or /product/anything still loads the right page.

When done, publish the project.`;

    return json({ ok: true, store, prompt });
  } catch (e) {
    return json({ ok: false, error: e instanceof Error ? e.message : String(e) }, 500);
  }
});
