import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useStore } from "@/hooks/useStore";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Plus, Trash2, Loader2, Upload, Star } from "lucide-react";
import { toast } from "sonner";

interface Testimonial {
  id: string;
  customer_name: string;
  customer_role: string | null;
  content: string;
  rating: number;
  photo_url: string | null;
  is_featured: boolean;
  display_order: number;
}

const empty = { customer_name: "", customer_role: "", content: "", rating: 5, photo_url: "" };

export default function Testimonials() {
  const { store } = useStore();
  const [items, setItems] = useState<Testimonial[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState<typeof empty>(empty);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  async function load() {
    if (!store?.id) return;
    setLoading(true);
    const { data } = await supabase
      .from("store_testimonials")
      .select("*")
      .eq("store_id", store.id)
      .order("display_order", { ascending: true });
    setItems((data as any) || []);
    setLoading(false);
  }

  useEffect(() => { load(); }, [store?.id]);

  async function uploadPhoto(file: File) {
    if (!store?.id) return;
    setUploading(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `${store.id}/testimonials/${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from("store-assets").upload(path, file, { upsert: true });
      if (error) throw error;
      const { data } = supabase.storage.from("store-assets").getPublicUrl(path);
      setForm((f) => ({ ...f, photo_url: data.publicUrl }));
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setUploading(false);
    }
  }

  async function save() {
    if (!store?.id) return;
    if (!form.customer_name.trim() || !form.content.trim()) {
      toast.error("Name and content are required");
      return;
    }
    setSaving(true);
    const { error } = await supabase.from("store_testimonials").insert({
      store_id: store.id,
      customer_name: form.customer_name.trim(),
      customer_role: form.customer_role.trim() || null,
      content: form.content.trim(),
      rating: form.rating,
      photo_url: form.photo_url || null,
      display_order: items.length,
    });
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    setForm(empty);
    toast.success("Testimonial added");
    load();
  }

  async function remove(id: string) {
    if (!confirm("Delete this testimonial?")) return;
    const { error } = await supabase.from("store_testimonials").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    load();
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Testimonials</h1>
        <p className="text-sm text-muted-foreground">
          Add customer reviews that show up in the Testimonials section of your storefront.
        </p>
      </div>

      <Card>
        <CardContent className="p-6 space-y-4">
          <h2 className="font-semibold">Add a new testimonial</h2>
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <Label>Customer name *</Label>
              <Input value={form.customer_name} onChange={(e) => setForm({ ...form, customer_name: e.target.value })} />
            </div>
            <div>
              <Label>Role / Location</Label>
              <Input placeholder="e.g. Verified Buyer, Mumbai" value={form.customer_role} onChange={(e) => setForm({ ...form, customer_role: e.target.value })} />
            </div>
          </div>
          <div>
            <Label>Testimonial *</Label>
            <Textarea rows={3} value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} />
          </div>
          <div className="flex flex-wrap items-end gap-6">
            <div>
              <Label>Rating</Label>
              <div className="flex gap-1 mt-2">
                {[1, 2, 3, 4, 5].map((r) => (
                  <button key={r} type="button" onClick={() => setForm({ ...form, rating: r })}>
                    <Star className={`h-6 w-6 ${r <= form.rating ? "fill-amber-400 text-amber-400" : "text-muted-foreground"}`} />
                  </button>
                ))}
              </div>
            </div>
            <div>
              <Label>Photo (optional)</Label>
              <div className="flex items-center gap-3 mt-2">
                {form.photo_url && <img src={form.photo_url} className="h-12 w-12 rounded-full object-cover" />}
                <label className="inline-flex items-center gap-2 px-3 py-2 text-sm border rounded cursor-pointer hover:bg-muted">
                  {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                  Upload
                  <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && uploadPhoto(e.target.files[0])} />
                </label>
              </div>
            </div>
            <Button onClick={save} disabled={saving} className="ml-auto">
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Plus className="h-4 w-4 mr-2" />} Add
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-3">
        <h2 className="font-semibold">Your testimonials ({items.length})</h2>
        {loading ? (
          <div className="py-8 flex justify-center"><Loader2 className="h-5 w-5 animate-spin" /></div>
        ) : items.length === 0 ? (
          <Card><CardContent className="p-6 text-sm text-muted-foreground">No testimonials yet.</CardContent></Card>
        ) : (
          items.map((t) => (
            <Card key={t.id}>
              <CardContent className="p-4 flex gap-4 items-start">
                {t.photo_url ? (
                  <img src={t.photo_url} className="h-12 w-12 rounded-full object-cover shrink-0" />
                ) : (
                  <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center text-sm font-semibold shrink-0">
                    {t.customer_name.charAt(0).toUpperCase()}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{t.customer_name}</span>
                    {t.customer_role && <span className="text-xs text-muted-foreground">· {t.customer_role}</span>}
                  </div>
                  <div className="flex gap-0.5 my-1">
                    {[...Array(t.rating)].map((_, i) => <Star key={i} className="h-3 w-3 fill-amber-400 text-amber-400" />)}
                  </div>
                  <p className="text-sm">{t.content}</p>
                </div>
                <Button variant="ghost" size="icon" onClick={() => remove(t.id)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
