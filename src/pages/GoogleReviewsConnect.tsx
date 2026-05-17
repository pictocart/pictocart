import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useStore } from "@/hooks/useStore";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Star, MapPin, RefreshCcw, Crown, ExternalLink, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

declare global { interface Window { Razorpay: any } }

function loadRazorpay(): Promise<boolean> {
  return new Promise((resolve) => {
    if (window.Razorpay) return resolve(true);
    const s = document.createElement("script");
    s.src = "https://checkout.razorpay.com/v1/checkout.js";
    s.onload = () => resolve(true);
    s.onerror = () => resolve(false);
    document.body.appendChild(s);
  });
}

// Extract place_id or take user pasted ID. We accept either a raw place_id or a Google Maps URL.
function parsePlaceInput(input: string): string | null {
  const trimmed = input.trim();
  if (/^ChIJ[\w-]+/.test(trimmed)) return trimmed;
  const m = trimmed.match(/place_id[=:]([\w-]+)/);
  if (m) return m[1];
  return null;
}

export default function GoogleReviewsConnect() {
  const { store } = useStore();
  const [connection, setConnection] = useState<any>(null);
  const [reviews, setReviews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [input, setInput] = useState("");
  const [preview, setPreview] = useState<any>(null);
  const [busy, setBusy] = useState(false);

  async function load() {
    if (!store?.id) return;
    setLoading(true);
    const { data: c } = await supabase
      .from("store_google_reviews_connections")
      .select("*").eq("store_id", store.id).maybeSingle();
    setConnection(c);
    if (c?.is_paid) {
      const { data: r } = await supabase
        .from("store_google_reviews_cache")
        .select("*").eq("store_id", store.id).order("time_unix", { ascending: false });
      setReviews((r as any) || []);
    }
    setLoading(false);
  }
  useEffect(() => { load(); }, [store?.id]);

  async function fetchPreview() {
    const place_id = parsePlaceInput(input);
    if (!place_id) {
      toast.error("Paste a valid Google place_id (starts with ChIJ...) or a Google Maps URL containing one.");
      return;
    }
    setBusy(true);
    const { data, error } = await supabase.functions.invoke("sync-google-reviews", { body: { place_id } });
    setBusy(false);
    if (error || !data?.success) { toast.error(data?.error || error?.message || "Failed"); return; }
    setPreview({ place_id, ...data });
  }

  async function unlock() {
    if (!store?.id || !preview) return;
    setBusy(true);
    try {
      const { data, error } = await supabase.functions.invoke("create-google-reviews-order", {
        body: {
          store_id: store.id,
          place_id: preview.place_id,
          business_name: preview.business.name,
          business_address: preview.business.address,
          business_url: preview.business.url,
        },
      });
      if (error) throw error;
      const ok = await loadRazorpay();
      if (!ok) throw new Error("Could not load Razorpay");
      const rzp = new window.Razorpay({
        key: data.key_id,
        amount: data.amount,
        currency: data.currency,
        order_id: data.order_id,
        name: "Google Reviews unlock",
        description: preview.business.name,
        handler: async (resp: any) => {
          const { error: vErr } = await supabase.functions.invoke("verify-google-reviews-payment", {
            body: {
              razorpay_order_id: resp.razorpay_order_id,
              razorpay_payment_id: resp.razorpay_payment_id,
              razorpay_signature: resp.razorpay_signature,
              store_id: store.id,
            },
          });
          if (vErr) { toast.error(vErr.message); return; }
          toast.success("Google Reviews connected!");
          setPreview(null);
          setInput("");
          load();
        },
        modal: { ondismiss: () => setBusy(false) },
      });
      rzp.open();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setBusy(false);
    }
  }

  async function resync() {
    if (!store?.id) return;
    setBusy(true);
    const { data, error } = await supabase.functions.invoke("sync-google-reviews", { body: { store_id: store.id } });
    setBusy(false);
    if (error || !data?.success) { toast.error(data?.error || error?.message || "Failed"); return; }
    toast.success("Synced");
    load();
  }

  if (loading) return <div className="py-12 flex justify-center"><Loader2 className="h-6 w-6 animate-spin" /></div>;

  // Paid + active state
  if (connection?.is_paid) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2"><Crown className="h-5 w-5 text-amber-500" /> Google Reviews</h1>
          <p className="text-sm text-muted-foreground">Live Google reviews syncing into your storefront.</p>
        </div>
        <Card>
          <CardContent className="p-6 space-y-3">
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div>
                <div className="font-semibold flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-green-600" /> {connection.business_name}</div>
                <div className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5"><MapPin className="h-3 w-3" /> {connection.business_address}</div>
                <div className="text-sm mt-2 flex items-center gap-2">
                  <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                  <span className="font-semibold">{connection.average_rating ?? "—"}</span>
                  <span className="text-muted-foreground">({connection.total_reviews ?? 0} reviews)</span>
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  Last synced: {connection.last_synced_at ? new Date(connection.last_synced_at).toLocaleString() : "never"}
                </div>
              </div>
              <Button onClick={resync} disabled={busy} variant="outline">
                {busy ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <RefreshCcw className="h-4 w-4 mr-2" />} Sync now
              </Button>
            </div>
          </CardContent>
        </Card>

        <div>
          <h2 className="font-semibold mb-3">Latest cached reviews ({reviews.length})</h2>
          <div className="space-y-2">
            {reviews.map((r) => (
              <Card key={r.id}>
                <CardContent className="p-4 flex gap-3">
                  {r.author_photo_url ? (
                    <img src={r.author_photo_url} className="h-10 w-10 rounded-full object-cover" />
                  ) : (
                    <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center font-semibold">{r.author_name?.charAt(0)}</div>
                  )}
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{r.author_name}</span>
                      <div className="flex gap-0.5">{[...Array(r.rating)].map((_, i) => <Star key={i} className="h-3 w-3 fill-amber-400 text-amber-400" />)}</div>
                      <span className="text-xs text-muted-foreground">{r.relative_time}</span>
                    </div>
                    <p className="text-sm mt-1">{r.text}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Not paid yet
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2"><Crown className="h-5 w-5 text-amber-500" /> Google Reviews</h1>
        <p className="text-sm text-muted-foreground">Pull verified Google Business reviews into your storefront. One-time unlock.</p>
      </div>

      <Card>
        <CardContent className="p-6 space-y-4">
          <div>
            <Label>Google Place ID or Maps URL</Label>
            <p className="text-xs text-muted-foreground mb-2">
              Find your Place ID at <a href="https://developers.google.com/maps/documentation/places/web-service/place-id" target="_blank" rel="noreferrer" className="underline inline-flex items-center gap-1">place-id finder <ExternalLink className="h-3 w-3" /></a>
            </p>
            <div className="flex gap-2">
              <Input value={input} onChange={(e) => setInput(e.target.value)} placeholder="ChIJ..." />
              <Button onClick={fetchPreview} disabled={busy || !input.trim()}>
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Preview"}
              </Button>
            </div>
          </div>

          {preview && (
            <div className="border rounded p-4 space-y-3 bg-muted/30">
              <div>
                <div className="font-semibold">{preview.business.name}</div>
                <div className="text-xs text-muted-foreground">{preview.business.address}</div>
                <div className="text-sm flex items-center gap-2 mt-1">
                  <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                  <span className="font-semibold">{preview.business.average_rating ?? "—"}</span>
                  <span className="text-muted-foreground">({preview.business.total_reviews ?? 0} reviews)</span>
                </div>
              </div>
              <div className="space-y-2">
                {preview.reviews.slice(0, 3).map((r: any, i: number) => (
                  <div key={i} className="text-sm border-l-2 border-amber-400 pl-3">
                    <div className="flex items-center gap-2 text-xs">
                      <span className="font-medium">{r.author_name}</span>
                      <div className="flex">{[...Array(r.rating)].map((_, k) => <Star key={k} className="h-3 w-3 fill-amber-400 text-amber-400" />)}</div>
                    </div>
                    <p className="line-clamp-2">{r.text}</p>
                  </div>
                ))}
              </div>
              <div className="flex items-center justify-between border-t pt-3">
                <div>
                  <div className="text-xs text-muted-foreground">One-time unlock</div>
                  <div className="text-2xl font-bold">₹1,499</div>
                </div>
                <Button onClick={unlock} disabled={busy} size="lg" className="bg-gradient-to-r from-amber-500 to-orange-500 hover:opacity-90">
                  {busy ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Crown className="h-4 w-4 mr-2" />} Unlock for ₹1,499
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
