

# Custom Domain Auto-Pilot v2 — Zero-Touch Onboarding

## Goal
Make `indilipi.shop` (and every future merchant domain) go live in under 5 minutes with the absolute minimum DNS effort from the merchant. Two parallel tracks:

1. **Fix the current flow** so merchants who keep DNS at their registrar (Hostinger, GoDaddy, Namecheap…) succeed deterministically.
2. **Build an "Entri-style" one-click connector** so most merchants never touch DNS at all.

---

## Part 1 — Fix indilipi.shop right now (immediate)

You moved nameservers to Cloudflare (`margo.ns.cloudflare.com` / `thea.ns.cloudflare.com`). That changes everything: Cloudflare now owns the zone, so we don't need Custom Hostnames / SaaS for this domain at all. We can serve it directly.

Steps the agent will do automatically when it detects `NS = *.ns.cloudflare.com`:
1. Detect the zone is in **the merchant's own Cloudflare account** (not ours) → switch strategy from "SaaS Custom Hostname" to "Direct DNS".
2. Show merchant a single instruction: add **one CNAME** `@ → store-on-tips.lovable.app` (proxied) and `www → store-on-tips.lovable.app` (proxied) in their Cloudflare DNS.
3. Health-probe and mark active.

For indilipi.shop specifically (manual one-time fix in this turn):
- In your Cloudflare dashboard for indilipi.shop, add: `CNAME @ → store-on-tips.lovable.app` (proxied ☁️) and `CNAME www → store-on-tips.lovable.app` (proxied ☁️). SSL is automatic via Cloudflare Universal SSL — Active in ~60 seconds.
- Remove the old SaaS Custom Hostname entry from `pictocart.in` zone (it's stale and causing the "down" + "not found" noise).

---

## Part 2 — Train the agent with a deterministic state machine

Replace the ad-hoc agent with an explicit per-domain state machine. Every merchant domain lives in exactly one state at a time, and the agent's only job is to advance it.

```text
[ENTERED] → [DNS_DETECT] → ┬─ [NS_AT_CLOUDFLARE_OURS]   → SaaS Custom Hostname flow
                           ├─ [NS_AT_CLOUDFLARE_THEIRS] → Direct CNAME flow
                           └─ [NS_AT_REGISTRAR]         → Entri flow OR manual A/CNAME flow
                                       ↓
                                [DNS_PROPAGATING]
                                       ↓
                                [SSL_PENDING] → [SSL_ACTIVE] → [HEALTHY]
                                                                   ↓
                                                    [DEGRADED]/[DOWN] → auto-heal
```

Per-state, the agent knows: required DNS record, validation method (HTTP/TXT), expected TTL, retry budget, and merchant-facing message.

**Key new behaviors**
- On every cron tick, the agent first runs `dig NS <domain>` (via DNS-over-HTTPS to Cloudflare 1.1.1.1) to detect which branch the domain is on. Strategy switches automatically if the merchant changes nameservers mid-flow.
- For SaaS branch: when SSL is stuck >5 min in `pending_validation`, agent auto-PATCHes from `http` to `txt` validation method (this is what fixed indilipi.shop earlier — make it automatic).
- Token rotation: agent always re-fetches the live TXT token from Cloudflare on every check and stores it in `stores.ssl_validation_token` so the merchant UI always shows the current value.
- "Custom hostname not found" → agent self-heals by clearing `cloudflare_hostname_id` and re-provisioning on next tick.
- ALIAS/ANAME detection: if merchant's apex record is ALIAS-flattened (no real CNAME at apex visible to CF), agent flags it and instructs to either (a) move NS to Cloudflare or (b) use the registrar's IP-based A record path.

---

## Part 3 — "Entri-style" Domain Connect (one-click DNS)

Two layers, shipped together:

### 3a. Real one-click via the **Domain Connect** open standard
Domain Connect is supported natively by GoDaddy, Google Domains, IONOS, 1&1, Namecheap (partial), and a few others. Flow:

1. Merchant enters `indilipi.shop` → we query `_domainconnect.indilipi.shop` TXT to discover their registrar's Domain Connect endpoint.
2. If found, we redirect them to `https://{registrar}/v2/domainTemplates/providers/pictocart.in/services/storefront/apply?domain=...&host=@&IP=185.158.133.1` — they log in with their registrar, click "Approve", records are written automatically, control returns to our app.
3. We register a **Domain Connect template** (a small JSON manifest hosted at `https://pictocart.in/.well-known/domainconnect/v2/...`) describing the records we need (A @ 185.158.133.1, CNAME www, TXT _acme-challenge placeholder).
4. Agent polls until DNS propagates, then activates SSL.

This is exactly what Entri/Vercel/Shopify use under the hood — no SDK fee, it's an open spec.

### 3b. Fallback: Cloudflare-hosted DNS offer
For registrars without Domain Connect (Hostinger, BigRock, many Indian registrars), offer a guided "Move to Cloudflare in 90 seconds" flow:
1. We create the zone in **our** Cloudflare account via API.
2. Pre-populate all required records.
3. Show merchant their two new nameservers + a deep-link to their registrar's NS-change page.
4. Agent polls `dig NS` until propagated, then auto-activates.

### 3c. Universal fallback: copy-paste with live verification
For everyone else: show the exact records with copy buttons + a real-time "✓ Detected" indicator that polls every 10s. Merchant sees green checkmarks appear as they paste each record. Already partly built — finish it.

---

## Part 4 — Merchant UI (`/settings/domain`)

Replace the current page with a stepper that mirrors the state machine:

```text
1. Enter domain        → [indilipi.shop ✓ available]
2. Choose connection   → ◉ One-click (Domain Connect detected)
                          ○ Move to our DNS  (recommended)
                          ○ Manual records
3. Authorize / paste   → live progress with green checkmarks
4. SSL provisioning    → progress bar with ETA
5. Live ✅              → Open store button
```

Each step shows what the agent is doing right now ("Detecting nameservers…", "Issuing SSL via TXT validation, ~3 min").

---

## Part 5 — Admin UI (`/admin/cloudflare`)

Add per-row:
- Current state machine state + age in state.
- Live TXT validation name+value with copy buttons (no more digging in network logs).
- Detected NS provider (Cloudflare-ours / Cloudflare-theirs / Registrar name).
- "Force advance" button per state.
- Stale-ID self-heal banner when `cloudflare_hostname_id` 404s.

---

## Technical implementation

**Database (migration)**
- `stores`: add `domain_state text` (enum-ish), `domain_strategy text` ('saas'|'direct'|'cloudflare_managed'), `ns_provider text`, `ssl_validation_name text`, `ssl_validation_value text`, `state_entered_at timestamptz`.
- New table `domain_connect_sessions` (id, store_id, registrar, status, callback_token, created_at) for Domain Connect OAuth-style returns.

**Edge functions (new + updated)**
- `cloudflare-agent` (rewrite): state-machine driven; runs every 2 min; per-state handlers; auto TXT-method switch; NS detection via DoH (`https://cloudflare-dns.com/dns-query?name=<domain>&type=NS`).
- `domain-connect-discover` (new): public, takes domain → returns discovered registrar template URL or null.
- `domain-connect-apply` (new): builds the signed Domain Connect URL with our template + redirect.
- `domain-connect-callback` (new): registrar redirects merchant back here; we mark session complete and trigger immediate agent run.
- `domain-template` (new, GET only, public): serves `.well-known/domainconnect/v2/pictocart.in/settings.json` and the `storefront/apply` template JSON.
- `cloudflare-zone-create` (new): for "Move to our DNS" flow — creates zone in our CF account, returns nameservers.
- `admin-cloudflare-action`: add `force_state`, `refresh_validation_token`, `clear_stale_id` actions.

**Frontend**
- New `/settings/domain` stepper component using the state machine.
- New `useDomainState` hook (realtime subscription on `stores.domain_state`).
- Admin row expansion panel with live TXT values + state badge.

**Cron**
- Lower agent cron from 5 min → 2 min while any domain is in a non-terminal state; back to 10 min when all are HEALTHY.

**Domain Connect template (hosted)**
- Add `public/.well-known/domainconnect/v2/pictocart.in/settings.json` and `services/storefront/apply.json` to the Lovable project (served by Vite). Templates are static JSON, signed later with our private key for production hardening.

---

## What you (merchant) will see for indilipi.shop after this ships

1. Open `/settings/domain` → already shows `indilipi.shop` detected on **Cloudflare nameservers (yours)**.
2. One-click "Add records to my Cloudflare" via Cloudflare API token (you authorize once).
3. ~60 seconds later: green ✅ Live at https://indilipi.shop.

For the immediate fix (before this ships), I'll do Part 1 manually: add the two CNAMEs in your Cloudflare zone, clear the stale Custom Hostname, and you'll be live in a minute.

---

## Rollout order (when you approve)

1. Migration + agent state machine rewrite + indilipi.shop manual fix → live tonight.
2. Merchant `/settings/domain` stepper + admin row improvements → next.
3. Domain Connect template + discover/apply/callback functions → after.
4. "Move to our Cloudflare" zone-create flow → last (needs CF account quota planning).

