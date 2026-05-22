## Schedule commission invoice cron at 02:00 IST on the 1st

**What changes**
- Schedule `generate-commission-invoices` via `pg_cron` + `pg_net` to run **monthly at 02:00 IST on the 1st of every month**.
- 02:00 IST = **20:30 UTC on the last day of the previous month** (IST = UTC+5:30).
- Cron expression: `30 20 L * *` — but standard `pg_cron` doesn't support `L` (last day). Workaround: run **daily at 20:30 UTC** and have the edge function check "is tomorrow the 1st in IST?" before proceeding.

**Approach (recommended)**
Schedule a daily trigger at 20:30 UTC; the edge function guards execution so it only generates invoices when the IST date of `now + 30min` is the 1st.

```sql
select cron.schedule(
  'generate-commission-invoices-monthly-ist',
  '30 20 * * *',  -- daily 20:30 UTC = 02:00 IST next day
  $$
  select net.http_post(
    url := 'https://qxeyndsvkfsmkilkzmuc.supabase.co/functions/v1/generate-commission-invoices',
    headers := '{"Content-Type":"application/json","apikey":"<ANON_KEY>"}'::jsonb,
    body := jsonb_build_object('scheduled', true, 'triggered_at', now())
  );
  $$
);
```

**Edge function guard** (added to `generate-commission-invoices/index.ts`):
```ts
if (body?.scheduled) {
  const istNow = new Date(Date.now() + 5.5 * 3600 * 1000);
  if (istNow.getUTCDate() !== 1) {
    return json({ ok: true, skipped: 'not 1st IST' });
  }
}
```
Manual runs (no `scheduled` flag, or with explicit `period_start`/`period_end`) bypass the guard — keeping the "Run now" admin button working.

**Files**
1. `supabase--insert` to create the cron job (contains anon key → not a migration, per project rules).
2. Edit `supabase/functions/generate-commission-invoices/index.ts` to add the IST-1st guard.
3. Ensure `pg_cron` and `pg_net` extensions are enabled (migration if not already).

**Why not a simpler `0 X 1 * *`?**
`pg_cron` evaluates the schedule in UTC. Running on UTC 1st at 20:30 would fire at 02:00 IST on the **2nd**, not the 1st. The daily-trigger + guard pattern is the standard fix.
