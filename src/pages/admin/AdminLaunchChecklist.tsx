import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, XCircle, AlertTriangle, Loader2, ExternalLink } from 'lucide-react';
import { Link } from 'react-router-dom';

type CheckStatus = 'pass' | 'warn' | 'fail';

interface Check {
  group: string;
  label: string;
  status: CheckStatus;
  detail: string;
  href?: string;
  external?: boolean;
}

const AdminLaunchChecklist = () => {
  const { data: checks = [], isLoading } = useQuery({
    queryKey: ['admin-launch-checks'],
    queryFn: async (): Promise<Check[]> => {
      const [stores, plans, themes, themeMasters, orders, paying, domains, emailDomain] = await Promise.all([
        supabase.from('stores').select('id, is_published, custom_domain'),
        supabase.from('plan_configs').select('plan, price_inr, razorpay_plan_id'),
        supabase.from('theme_packs').select('id, is_published'),
        supabase.from('theme_master_projects').select('id, is_active, lovable_project_url'),
        supabase.from('orders').select('id, payment_status').limit(500),
        supabase.from('subscriptions').select('id, status').eq('status', 'active'),
        supabase.from('stores').select('id, custom_domain, ssl_status, domain_state').not('custom_domain', 'is', null),
        supabase.from('store_email_domains').select('id, status').limit(1),
      ]);

      const out: Check[] = [];
      const total = stores.data?.length || 0;
      const published = stores.data?.filter((s) => s.is_published).length || 0;
      out.push({
        group: 'Stores',
        label: 'At least one published store',
        status: published > 0 ? 'pass' : 'fail',
        detail: `${published} of ${total} stores published`,
        href: '/admin/stores',
      });

      const plansList = plans.data || [];
      const paid = plansList.filter((p) => p.price_inr > 0);
      const wired = paid.filter((p) => !!p.razorpay_plan_id).length;
      out.push({
        group: 'Billing',
        label: 'Razorpay plan IDs configured',
        status: wired === paid.length && paid.length > 0 ? 'pass' : wired > 0 ? 'warn' : 'fail',
        detail: `${wired}/${paid.length} paid plans linked to Razorpay`,
        href: '/admin/plans',
      });

      const masters = themeMasters.data || [];
      const activeMasters = masters.filter((t: any) => t.is_active && t.lovable_project_url).length;
      out.push({
        group: 'Themes',
        label: 'Active master themes with live preview',
        status: activeMasters >= 3 ? 'pass' : activeMasters >= 1 ? 'warn' : 'fail',
        detail: `${activeMasters} ready (need ≥3 for marketplace variety)`,
        href: '/admin/themes',
      });

      const publishedPacks = (themes.data || []).filter((t: any) => t.is_published).length;
      out.push({
        group: 'Themes',
        label: 'Published theme packs',
        status: publishedPacks > 0 ? 'pass' : 'warn',
        detail: `${publishedPacks} packs in marketplace`,
        href: '/admin/themes',
      });

      const ords = orders.data || [];
      const paidOrders = ords.filter((o) => o.payment_status === 'paid').length;
      out.push({
        group: 'Sales',
        label: 'First paid order received',
        status: paidOrders > 0 ? 'pass' : 'warn',
        detail: paidOrders > 0 ? `${paidOrders} paid orders` : 'No paid orders yet (test a checkout end-to-end)',
      });

      out.push({
        group: 'Subscriptions',
        label: 'Active paid subscription',
        status: (paying.data?.length || 0) > 0 ? 'pass' : 'warn',
        detail: `${paying.data?.length || 0} active subscriptions`,
      });

      const customDomains = domains.data || [];
      const healthy = customDomains.filter((d: any) => d.ssl_status === 'active' && d.domain_state === 'healthy').length;
      out.push({
        group: 'Domains',
        label: 'Custom domains healthy',
        status: customDomains.length === 0 ? 'warn' : healthy === customDomains.length ? 'pass' : 'fail',
        detail: customDomains.length === 0 ? 'No merchants on custom domains yet' : `${healthy}/${customDomains.length} domains healthy`,
        href: '/admin/cloudflare',
      });

      const emailDom = emailDomain.data?.[0];
      out.push({
        group: 'Notifications',
        label: 'Platform email sender verified (notify.pictocart.in)',
        status: emailDom?.status === 'verified' ? 'pass' : emailDom ? 'warn' : 'fail',
        detail: emailDom ? `Status: ${emailDom.status}` : 'No platform email domain configured',
      });

      // Hard-coded launch checks
      out.push({ group: 'Legal', label: 'Privacy Policy & Terms published', status: 'warn', detail: 'Verify pictocart.in/legal pages render', href: '/legal/privacy' });
      out.push({ group: 'Marketing', label: 'Landing page CTA copy reviewed', status: 'warn', detail: 'Confirm pricing/CTA are current', href: '/' });
      out.push({ group: 'Support', label: 'Support email / help center reachable', status: 'warn', detail: 'Test support@pictocart.in inbox' });
      out.push({
        group: 'Auth',
        label: 'Google OAuth consent screen branded "Pic to Cart"',
        status: 'warn',
        detail: 'Rename the OAuth client from "Instant Store AI" → "Pic to Cart" in Google Cloud Console / Lovable Cloud auth settings, and upload the Pic to Cart logo. Without this, signup shows "Grant permission to Instant Store AI".',
      });
      out.push({
        group: 'Themes',
        label: 'Storefronts render through the bazaar/marketplace theme components',
        status: 'warn',
        detail: 'Verify pictocart.in/store/fashion-street and /store/indilipi look identical to the Bazaar master.',
        href: '/admin/themes',
      });

      return out;
    },
  });

  const groups = Array.from(new Set(checks.map((c) => c.group)));
  const summary = checks.reduce(
    (acc, c) => ({ ...acc, [c.status]: (acc as any)[c.status] + 1 }),
    { pass: 0, warn: 0, fail: 0 } as Record<CheckStatus, number>
  );

  return (
    <div className="space-y-6 pb-20 md:pb-0">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Launch Readiness</h1>
        <p className="text-sm text-muted-foreground">End-to-end checklist before public launch.</p>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
      ) : (
        <>
          <div className="grid grid-cols-3 gap-3">
            <SummaryCard label="Passing" value={summary.pass} tone="emerald" icon={<CheckCircle2 className="h-5 w-5" />} />
            <SummaryCard label="Warnings" value={summary.warn} tone="amber" icon={<AlertTriangle className="h-5 w-5" />} />
            <SummaryCard label="Blockers" value={summary.fail} tone="destructive" icon={<XCircle className="h-5 w-5" />} />
          </div>

          {groups.map((g) => (
            <Card key={g}>
              <CardHeader><CardTitle className="text-base">{g}</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                {checks.filter((c) => c.group === g).map((c, i) => (
                  <div key={i} className="flex items-start justify-between gap-3 rounded-md border p-3">
                    <div className="flex items-start gap-3 min-w-0">
                      <StatusIcon s={c.status} />
                      <div className="min-w-0">
                        <p className="text-sm font-medium">{c.label}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{c.detail}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <StatusBadge s={c.status} />
                      {c.href && (
                        c.external ? (
                          <a href={c.href} target="_blank" rel="noreferrer" className="p-1.5 rounded-md hover:bg-muted">
                            <ExternalLink className="h-3.5 w-3.5" />
                          </a>
                        ) : (
                          <Link to={c.href} className="p-1.5 rounded-md hover:bg-muted">
                            <ExternalLink className="h-3.5 w-3.5" />
                          </Link>
                        )
                      )}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          ))}
        </>
      )}
    </div>
  );
};

const StatusIcon = ({ s }: { s: CheckStatus }) =>
  s === 'pass' ? <CheckCircle2 className="h-4 w-4 text-emerald-500 mt-0.5" /> :
  s === 'warn' ? <AlertTriangle className="h-4 w-4 text-amber-500 mt-0.5" /> :
  <XCircle className="h-4 w-4 text-destructive mt-0.5" />;

const StatusBadge = ({ s }: { s: CheckStatus }) =>
  s === 'pass' ? <Badge className="bg-emerald-500 hover:bg-emerald-500">Pass</Badge> :
  s === 'warn' ? <Badge variant="outline" className="border-amber-300 text-amber-700">Warn</Badge> :
  <Badge variant="destructive">Blocker</Badge>;

const SummaryCard = ({ label, value, tone, icon }: { label: string; value: number; tone: 'emerald' | 'amber' | 'destructive'; icon: React.ReactNode }) => {
  const cls = tone === 'emerald' ? 'text-emerald-600 bg-emerald-500/10' : tone === 'amber' ? 'text-amber-600 bg-amber-500/10' : 'text-destructive bg-destructive/10';
  return (
    <Card>
      <CardContent className="p-4 flex items-center gap-3">
        <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${cls}`}>{icon}</div>
        <div>
          <p className="text-xs text-muted-foreground uppercase tracking-wide">{label}</p>
          <p className="text-2xl font-bold">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
};

export default AdminLaunchChecklist;
