# Theme Research Agent + Pic To Cart Theme Pipeline

A two-project system: an autonomous **Theme Research Agent** living in the `theme-master-bazaar` project that researches the web, plans a monthly theme calendar, generates themes with extreme token reuse, and pushes them to **Pic To Cart**, where merchants can deploy, customise deeply, and pay for premium themes — with full cost/revenue tracking.

---

## Part A — Master Agent Prompt (paste into theme-master-bazaar)

A single, copy-paste-ready prompt is delivered at the end of this plan. It instructs that project to:

1. Build a **Theme Research Agent** (Edge Function + admin chat UI) that scrapes/analyses Themeforest, TemplateMonster, CodeCanyon, Shopify Theme Store, Wix, Squarespace, WordPress.org and Webflow templates via Perplexity/Firecrawl + Lovable AI.
2. Maintain a `theme_research_corpus` (categories, layouts, color trends, section archetypes, copy patterns) and a `theme_monthly_calendar` (planned releases per category per week).
3. Generate themes via the existing two-tier optimisation (blueprint library + image pool + remix) and **publish them to Pic To Cart** via a signed REST endpoint (`POST /functions/v1/ingest-master-theme`).
4. Provide an **Admin Chat Console** (`/admin/agent`) where the admin can:
  - Type freely (`"Add WhatsApp Business chat widget UI to all fashion themes"`) → agent updates the relevant blueprint + creates a new section type + emits patches to existing themes.
  - `@mention` a specific theme (`"@Dark Luxe make hero video-first"`) → patches only that theme's pages JSON.
5. Stream a token-cost ledger to Pic To Cart after every generation.

The two projects communicate using:

- **Outbound from bazaar → pictocart**: signed POST with `THEME_INGEST_SECRET` (HMAC).
- **Inbound from pictocart → bazaar**: webhook (`/functions/v1/agent-webhook`) for admin commands originating in Pic To Cart's UI.

---

## Part B — Changes in Pic To Cart (this project)

### B1. Database (new tables)

```sql
-- Inbound theme deliveries from the bazaar agent
create table public.master_theme_deliveries (
  id uuid primary key default gen_random_uuid(),
  master_id uuid references theme_master_projects(id) on delete cascade,
  payload jsonb not null,            -- pages, theme_config, sections, images
  generation_cost_inr numeric(10,4),
  tokens_used int,
  reused_components int default 0,
  reused_images int default 0,
  source_research jsonb,             -- which competitor patterns inspired it
  status text default 'pending',     -- pending | published | rejected
  delivered_at timestamptz default now()
);

-- Token-saving timeline for the cost matrix graph
create table public.theme_generation_metrics (
  id uuid primary key default gen_random_uuid(),
  theme_pack_id uuid references theme_packs(id) on delete cascade,
  category text,
  tokens_used int,
  cost_inr numeric(10,4),
  reuse_ratio numeric(5,2),          -- % of components/images reused
  generated_at timestamptz default now()
);

-- Monthly calendar mirrored from the agent
create table public.theme_release_calendar (
  id uuid primary key default gen_random_uuid(),
  category text,
  planned_for date,
  status text default 'planned',     -- planned | generating | shipped
  theme_pack_id uuid references theme_packs(id),
  research_brief jsonb
);

-- Admin chat log (shared with agent via webhook)
create table public.agent_admin_messages (
  id uuid primary key default gen_random_uuid(),
  author text,                        -- 'admin' | 'agent'
  scoped_theme_id uuid,               -- null = global
  message text,
  attachments jsonb,
  created_at timestamptz default now()
);

-- Granular deployable feature flags per theme (drives Customise page)
alter table theme_master_projects
  add column features jsonb default '{}'::jsonb,   -- { whatsapp_chat: true, video_hero: false, ... }
  add column customisable_slots jsonb default '[]'::jsonb; -- list of swappable hero/section slots
```

All tables get RLS: admin-only writes; `master_theme_deliveries` readable to admins; published rows surface to merchants via existing `theme_packs`.

### B2. Edge Functions (new)

- `ingest-master-theme` — HMAC-verified inbound from bazaar. Creates a `theme_packs` row (unpublished), records metrics, and notifies admin.
- `agent-command-relay` — admin types in Pic To Cart's chat box → forwarded to bazaar's `agent-webhook`, response streamed back via SSE.
- `theme-deploy-to-store` — merchant clicks "Use this theme": clones pages JSON into `stores.theme`, applies feature toggles, fires Razorpay order if premium.

### B3. Admin pages

- `**/admin/themes` → new tab "Cost Matrix"** already exists; extend with a Recharts line graph from `theme_generation_metrics` showing **declining tokens-per-theme over time** (proof of optimisation), plus per-category cost average and cumulative ₹ saved.
- `**/admin/themes` → new tab "Pipeline"** — Kanban of `theme_release_calendar` (Planned / Generating / Shipped). Clicking a card opens delivery details.
- `**/admin/agent**` — chat UI mirroring the bazaar agent. `@theme-name` autocomplete from `theme_master_projects`. Messages persist via `agent_admin_messages`; replies stream from relay function.
- `**/admin/revenue` → add "Theme Earnings" card** — ₹ per theme = `(price × purchases) − ai_generation_cost`. Sortable table + sparkline.

### B4. Merchant experience — deeper Customise page

Replace the current limited Customise page with a **WordPress/Shopify-grade editor**:

- **Section library drawer (left)** — drag any section (hero variants, product grids, testimonials, WhatsApp chat widget, video block, lookbook, FAQ, countdown, etc.) into the page. Sections come from the `customisable_slots` defined by the theme + a global library.
- **Hero swap** — first slot is always "Hero". Merchant can switch between: image, image-carousel, video, product-spotlight, lookbook, full-bleed quote. Pulls from theme's `features.hero_variants`.
- **Inline edit (right panel)** — every selected block exposes its props (text, image, CTA, colours, padding) through a generated form derived from the section's JSON schema.
- **Add/remove freely** — sections are stored as an ordered array in `stores.theme.pages.home.sections`. No hard cap.
- **Brand tokens panel** — colours, fonts, radius live-tweak (already partly present via ThemeTemplate overrides — extend to all theme tokens).
- **"Reset to theme default"** button — restores the master theme's `pages` snapshot.
- **Preview & Publish** — Preview iframe at `/{slug}?preview=1`; Publish writes to `stores.theme` and triggers cache bust.

### B5. Pricing & revenue

- Admin marks each delivered theme **Free / Premium** with price (₹0 / ₹299 / ₹499 / ₹999) directly from the Cost Matrix row.
- Suggested price auto-computed: `max(299, round(generation_cost × margin_multiplier × 50))`.
- `theme_purchases` already exists — extend Revenue page to plot earnings per theme alongside cost, surfacing **gross margin % per theme**.

---

## Part C — Token-optimisation flywheel

The agent enforces:

1. **Research first** — Perplexity/Firecrawl scrape → store distilled patterns in `theme_research_corpus` (free of large blobs; only structured insights).
2. **Plan once a month** — single `gemini-2.5-pro` call (≈₹3) produces 30-day calendar with category, archetype, hero style.
3. **Generate via blueprints** — for every planned theme, reuse `theme_section_blueprints` first; only call AI for the ~20% that's novel.
4. **Image pool reuse** — only generate new images when pool < 3 for that `category+section_type`.
5. **Remix path** — every 3rd theme is a remix (≈₹0.30) instead of a fresh build.
6. **Metric recorded** — `theme_generation_metrics.reuse_ratio` proves the trend; the Cost Matrix graph visibly slopes down.

Target curve shown to admin:

```text
Cost ₹
 18 |*
 12 | *
  8 |   *
  4 |      *  *
  1 |           *  *  *  *  *  *
    +--------------------------------> theme #
```

---

## Part D — Admin chat protocol (shared schema)

Message envelope sent both ways:

```json
{
  "id": "uuid",
  "scope": { "type": "global" | "theme", "theme_id": "..." },
  "intent": "add_feature" | "edit_section" | "regenerate" | "ask",
  "text": "Add WhatsApp Business chat to all fashion themes",
  "attachments": []
}
```

Agent response includes:

```json
{
  "summary": "Added whatsapp_chat slot to 4 fashion themes; patches queued.",
  "patches": [{ "theme_id": "...", "diff": {...} }],
  "cost_inr": 0.42
}
```

Patches land in Pic To Cart as new `theme_versions` rows, so merchants get the existing update banner.

---

## Part E — Rollout order (in this project)

1. Migrations + RLS for the 4 new tables and 2 new columns.
2. `ingest-master-theme` edge function + `THEME_INGEST_SECRET`.
3. Cost Matrix graph + Pipeline tab on `/admin/themes`.
4. `/admin/agent` chat UI + `agent-command-relay` function.
5. Revenue tab "Theme Earnings" card.
6. Customise page rebuild (section library, hero swap, inline edit, schema-driven props).
7. `theme-deploy-to-store` for one-click activation, premium → Razorpay flow reusing existing wallet/payment infra.

---

## Part F — Master prompt (paste into theme-master-bazaar)

```text
You are taking over the project "theme-master-bazaar". Build an autonomous Theme Research Agent that designs and ships e-commerce themes to a sister project "Pic To Cart" (project id a3325225-6388-4957-8895-4bfad76eba30).

GOAL
Become the most cost-efficient theme factory in India. Every new theme must cost less than the previous average, by aggressively reusing components, blueprints, copy, and images you have produced before.

WHAT TO BUILD

1. Research layer
   - Edge function `research-themes` using Perplexity (PERPLEXITY_API_KEY) + Lovable AI (google/gemini-2.5-flash) to scan: themeforest.net, codecanyon.net, templatemonster.com, themes.shopify.com, wix.com/website-template, squarespace.com/templates, wordpress.org/themes, webflow.com/templates.
   - Persist structured insights only (no scraped HTML) to table `theme_research_corpus(category, archetype, color_palette, section_order, copy_motifs, source_url, captured_at)`.
   - Run weekly via pg_cron.

2. Planning layer
   - Edge function `plan-monthly-calendar` runs on the 28th of each month. One gemini-2.5-pro call producing 30 entries: { date, category, archetype, hero_style, expected_cost_inr }. Write to `theme_release_calendar` and POST a copy to Pic To Cart `/functions/v1/ingest-calendar` (HMAC signed with THEME_INGEST_SECRET).

3. Generation layer
   - Reuse the existing two-tier prompting + blueprint library + image pool + remix function already in this project.
   - After each generation, POST the full theme bundle (pages, theme_config, preview image, features map, customisable_slots, generation_cost, tokens, reuse_ratio, source_research) to Pic To Cart `/functions/v1/ingest-master-theme` (HMAC signed). Do not publish locally.
   - Maintain `theme_generation_metrics` mirror locally.

4. Admin chat agent
   - Page `/agent` with a chat UI. Stream responses via Lovable AI Gateway with tool-calling.
   - Tools the agent can call:
     • `list_themes()` / `get_theme(id)`
     • `patch_theme(theme_id, json_patch)` — writes a new `theme_versions` row + ships patch to Pic To Cart.
     • `add_global_feature(name, schema, default_props)` — registers a new section type into the blueprint library and emits patches to all themes that opt in.
     • `regenerate_theme(theme_id, hints)` — full rebuild via remix-theme.
     • `query_research(category)` — summarises corpus.
   - Parse `@theme-name` mentions in the user message; when present, scope every tool call to that theme.
   - Persist every exchange in `agent_admin_messages` AND POST to Pic To Cart `/functions/v1/agent-mirror` so the admin can read the same thread there.
   - Listen on `/functions/v1/agent-webhook` for admin messages originating in Pic To Cart and process them identically.

5. Cost discipline
   - Hard budget per theme: ₹3 by month 3. Reject generations exceeding it; instead, force a remix.
   - Always record `tokens_used`, `reuse_ratio`, `cost_inr` and ship to Pic To Cart so the Cost Matrix graph slopes down visibly.

6. Auth + secrets
   - Use Lovable Cloud. Required secrets: PERPLEXITY_API_KEY, THEME_INGEST_SECRET, PICTOCART_BASE_URL=https://qxeyndsvkfsmkilkzmuc.supabase.co.
   - All cross-project requests sign body with HMAC-SHA256 using THEME_INGEST_SECRET, header `x-agent-signature`.

7. UI
   - Minimal admin-only app: Dashboard (calendar + cost graph), Research Corpus browser, Themes list with Remix/Patch buttons, and the Agent chat at `/agent`.
   - Use shadcn + Tailwind, dark cockpit aesthetic.

DELIVERABLES
- Migrations for: theme_research_corpus, theme_release_calendar, theme_generation_metrics, agent_admin_messages.
- Edge functions: research-themes, plan-monthly-calendar, generate-and-ship-theme, agent-chat (SSE), agent-webhook, ingest-from-pictocart.
- Cron jobs for research (weekly) and planning (monthly).
- Admin pages: /, /research, /themes, /agent.
- README explaining how Pic To Cart consumes the deliveries.

CONSTRAINTS
- Never call AI from the client.
- Never store raw scraped HTML, only distilled JSON insights.
- Every AI call logs to `ai_call_log(function, model, tokens, cost_inr, reuse_hit)`.
- Default model: google/gemini-2.5-flash. Reasoning calls: google/gemini-2.5-pro. Cheap remixes: google/gemini-2.5-flash-lite.
- Image generation: google/gemini-2.5-flash-image, batched in parallel groups of 3.

Begin by setting up Lovable Cloud, creating the migrations, then scaffolding the agent chat page first so I can talk to you immediately. Confirm the plan, then build.
```

---

## Open question before I build (Pic To Cart side)

Should I **rebuild the Customise page from scratch** with the drag-and-drop section library described in B4 (richer, but ~1 day of work and replaces current Customise.tsx), or **layer the new capabilities onto the existing page** progressively (faster, but the editor will feel inconsistent for a release or two)? My recommendation is full rebuild — it's the centerpiece of the "Shopify-grade" promise.  
  
yes kindly rebuild it from scratch. 