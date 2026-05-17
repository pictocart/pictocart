import { useEffect, useMemo, useState } from "react";
import { useStore } from "@/hooks/useStore";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Sparkles, Save, FileText, Loader2, ExternalLink } from "lucide-react";
import { toast } from "sonner";

const POLICY_KEYS = [
  { key: "privacy",  label: "Privacy Policy",   slug: "privacy-policy"  },
  { key: "terms",    label: "Terms of Service", slug: "terms"           },
  { key: "refund",   label: "Refund Policy",    slug: "return-policy"   },
  { key: "shipping", label: "Shipping Policy",  slug: "shipping-policy" },
  { key: "about",    label: "About Us",         slug: "about"           },
  { key: "contact",  label: "Contact",          slug: "contact"         },
] as const;

type PolicyKey = (typeof POLICY_KEYS)[number]["key"];

export default function Policies() {
  const { store, setStore } = useStore();
  const settings = (store?.settings || {}) as any;
  const initial: Record<PolicyKey, string> = useMemo(() => {
    const p = settings.policies || {};
    return {
      privacy:  p.privacy  || "",
      terms:    p.terms    || "",
      refund:   p.refund   || "",
      shipping: p.shipping || "",
      about:    p.about    || "",
      contact:  p.contact  || "",
    };
  }, [store?.id]);

  const [policies, setPolicies] = useState(initial);
  const [active, setActive] = useState<PolicyKey>("privacy");
  const [saving, setSaving] = useState(false);
  const [genOpen, setGenOpen] = useState(false);
  const [generating, setGenerating] = useState(false);

  useEffect(() => { setPolicies(initial); }, [initial]);

  const [form, setForm] = useState({
    company_legal_name: settings.business_info?.company_legal_name || store?.name || "",
    store_name: store?.name || "",
    state: settings.business_info?.state || "",
    country: settings.business_info?.country || "India",
    email: settings.business_info?.email || settings.store_info?.email || "",
    phone: settings.business_info?.phone || settings.store_info?.phone || "",
    address: settings.business_info?.address || settings.store_info?.address || "",
    gst: settings.business_info?.gst || "",
    category: store?.category || "",
  });

  const save = async () => {
    if (!store) return;
    setSaving(true);
    const newSettings = {
      ...settings,
      policies,
      business_info: { ...(settings.business_info || {}), ...form },
    };
    const { error } = await supabase.from("stores").update({ settings: newSettings }).eq("id", store.id);
    if (error) toast.error("Failed to save");
    else {
      setStore({ ...store, settings: newSettings });
      toast.success("Policies saved — live on your store");
    }
    setSaving(false);
  };

  const generateAll = async () => {
    if (!form.company_legal_name || !form.state || !form.email) {
      toast.error("Company name, State, and Email are required");
      return;
    }
    setGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-store-policies", {
        body: { business: form },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setPolicies((p) => ({ ...p, ...data.policies }));
      toast.success("All 6 policies generated — review and click Save to publish");
      setGenOpen(false);
    } catch (e: any) {
      toast.error(e?.message || "Generation failed");
    } finally {
      setGenerating(false);
    }
  };

  const activeMeta = POLICY_KEYS.find((k) => k.key === active)!;
  const publicUrl = store?.slug ? `/store/${store.slug}/${activeMeta.slug}` : "#";

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold flex items-center gap-2"><FileText className="h-5 w-5" /> Store Policies & Pages</h1>
          <p className="text-sm text-muted-foreground mt-1">Google requires every storefront to publish a Privacy Policy, Terms, Refund and Shipping policies. Fill them in below — or let AI draft all six pages from your business details in 20 seconds.</p>
        </div>
        <Dialog open={genOpen} onOpenChange={setGenOpen}>
          <DialogTrigger asChild>
            <Button><Sparkles className="h-4 w-4 mr-1" /> Generate all with AI</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Generate policies with AI</DialogTitle>
              <DialogDescription>We use these details to write all six pages — they're saved to your store and reused for invoices.</DialogDescription>
            </DialogHeader>
            <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
              <Field label="Legal company name *" value={form.company_legal_name} onChange={(v) => setForm({ ...form, company_legal_name: v })} />
              <Field label="Public store name *"   value={form.store_name}         onChange={(v) => setForm({ ...form, store_name: v })} />
              <div className="grid grid-cols-2 gap-3">
                <Field label="State *"   value={form.state}   onChange={(v) => setForm({ ...form, state: v })} placeholder="Karnataka" />
                <Field label="Country"   value={form.country} onChange={(v) => setForm({ ...form, country: v })} />
              </div>
              <Field label="Support email *" value={form.email} onChange={(v) => setForm({ ...form, email: v })} />
              <div className="grid grid-cols-2 gap-3">
                <Field label="Phone" value={form.phone} onChange={(v) => setForm({ ...form, phone: v })} />
                <Field label="GSTIN" value={form.gst}   onChange={(v) => setForm({ ...form, gst: v })} />
              </div>
              <Field label="Registered address" value={form.address} onChange={(v) => setForm({ ...form, address: v })} />
              <Field label="Category"           value={form.category} onChange={(v) => setForm({ ...form, category: v })} placeholder="Apparel / Jewellery / Food …" />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setGenOpen(false)}>Cancel</Button>
              <Button onClick={generateAll} disabled={generating}>
                {generating ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Sparkles className="h-4 w-4 mr-1" />}
                {generating ? "Generating…" : "Generate all 6 pages"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between gap-3">
            <CardTitle className="text-base">Edit pages</CardTitle>
            <Button size="sm" onClick={save} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Save className="h-4 w-4 mr-1" />}
              {saving ? "Saving…" : "Save all"}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs value={active} onValueChange={(v) => setActive(v as PolicyKey)}>
            <TabsList className="grid grid-cols-3 md:grid-cols-6 h-auto">
              {POLICY_KEYS.map((p) => (
                <TabsTrigger key={p.key} value={p.key} className="text-xs">
                  <span className="flex items-center gap-1.5">
                    {p.label}
                    {policies[p.key]?.trim() ? <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> : <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />}
                  </span>
                </TabsTrigger>
              ))}
            </TabsList>
            {POLICY_KEYS.map((p) => (
              <TabsContent key={p.key} value={p.key} className="mt-4 space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-xs">Markdown content for <strong>{p.label}</strong></Label>
                  {store?.slug && (
                    <a href={publicUrl} target="_blank" rel="noreferrer" className="text-xs text-primary inline-flex items-center gap-1 hover:underline">
                      <ExternalLink className="h-3 w-3" /> View live page
                    </a>
                  )}
                </div>
                <Textarea
                  rows={20}
                  value={policies[p.key]}
                  onChange={(e) => setPolicies({ ...policies, [p.key]: e.target.value })}
                  placeholder={`Write your ${p.label.toLowerCase()} here, or use Generate all with AI.\n\nMarkdown supported (## Heading, **bold**, lists, etc.)`}
                  className="font-mono text-xs"
                />
                <p className="text-[10px] text-muted-foreground">Lives at <code>{publicUrl}</code> on your storefront and is linked from the footer automatically.</p>
              </TabsContent>
            ))}
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}

function Field({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <div className="space-y-1">
      <Label className="text-xs">{label}</Label>
      <Input value={value} onChange={(e) => onChange(e.target.value)} className="h-9 text-sm" placeholder={placeholder} />
    </div>
  );
}
