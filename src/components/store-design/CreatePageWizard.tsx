import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Upload, X, Wallet, Loader2, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useCustomPages, useCreditEstimate, useWalletBalance } from "@/hooks/useCustomPages";
import { Link } from "react-router-dom";

const RESERVED = ["home","shop","product","products","cart","checkout","journal","about","contact","account","auth","blog","menu","book","collections","wishlist","reset-password","preview-theme","p"];

const slugify = (s: string) => s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60);

export default function CreatePageWizard({ storeId, open, onOpenChange }: { storeId: string; open: boolean; onOpenChange: (v: boolean) => void }) {
  const { create, generate } = useCustomPages(storeId);
  const { data: cost } = useCreditEstimate();
  const { data: balance } = useWalletBalance(storeId);

  const [step, setStep] = useState(1);
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [description, setDescription] = useState("");
  const [brief, setBrief] = useState("");
  const [styleHint, setStyleHint] = useState("match_theme");
  const [images, setImages] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const reset = () => {
    setStep(1); setTitle(""); setSlug(""); setDescription(""); setBrief(""); setStyleHint("match_theme"); setImages([]);
  };

  const handleUpload = async (files: FileList | null) => {
    if (!files?.length) return;
    setUploading(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      const uid = userData.user?.id;
      if (!uid) throw new Error("Please sign in to upload images");
      const next: string[] = [];
      for (const file of Array.from(files).slice(0, 8 - images.length)) {
        const ext = file.name.split(".").pop() || "jpg";
        const path = `${uid}/stores/${storeId}/custom-pages/${crypto.randomUUID()}.${ext}`;
        const { error } = await supabase.storage.from("store-assets").upload(path, file, { upsert: false, contentType: file.type });
        if (error) throw error;
        const { data } = supabase.storage.from("store-assets").getPublicUrl(path);
        next.push(data.publicUrl);
      }
      setImages([...images, ...next]);
    } catch (e: any) {
      toast.error(e?.message || "Upload failed");
    } finally {
      setUploading(false);
    }
  };


  const slugError = (() => {
    if (!slug) return "Slug is required";
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) return "Use lowercase letters, numbers, and dashes only";
    if (RESERVED.includes(slug)) return `"${slug}" is reserved for built-in pages`;
    return null;
  })();

  const cost1 = cost?.generate ?? 25;
  const insufficient = (balance ?? 0) < cost1;

  const handleGenerate = async () => {
    if (slugError) { toast.error(slugError); return; }
    setSubmitting(true);
    try {
      const page = await create.mutateAsync({ title, slug, description, brief, uploaded_images: images, style_hint: styleHint });
      await generate.mutateAsync({ page_id: page.id });
      toast.success("Page generated! Review and publish when ready.");
      reset();
      onOpenChange(false);
    } catch (e: any) {
      const msg = e?.message || "Generation failed";
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) reset(); }}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" /> Create a page with AI
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5">
          {/* Step 1: Basics */}
          <div className="space-y-3">
            <div>
              <Label>Page title</Label>
              <Input value={title} onChange={(e) => { setTitle(e.target.value); if (!slug) setSlug(slugify(e.target.value)); }} placeholder="e.g. Investors, Our Team, Press, Sustainability" />
            </div>
            <div>
              <Label>URL slug</Label>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground shrink-0">/store/.../p/</span>
                <Input value={slug} onChange={(e) => setSlug(slugify(e.target.value))} placeholder="investors" />
              </div>
              {slugError && <p className="text-xs text-destructive mt-1">{slugError}</p>}
            </div>
            <div>
              <Label>Short description (shown in nav & search)</Label>
              <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="One-line summary of what this page is about" maxLength={160} />
            </div>
            <div>
              <Label>Tell the AI what to include</Label>
              <Textarea
                rows={5}
                value={brief}
                onChange={(e) => setBrief(e.target.value)}
                placeholder="Mention the sections, tone, key facts, links, or numbers the page should highlight. The more specific, the better."
              />
            </div>
            <div>
              <Label>Style hint</Label>
              <div className="flex flex-wrap gap-2 mt-1">
                {[
                  { id: "match_theme", label: "Match my theme" },
                  { id: "editorial", label: "Editorial" },
                  { id: "bold", label: "Bold" },
                  { id: "minimal", label: "Minimal" },
                  { id: "story", label: "Story" },
                ].map((s) => (
                  <Button key={s.id} size="sm" type="button" variant={styleHint === s.id ? "default" : "outline"} onClick={() => setStyleHint(s.id)}>
                    {s.label}
                  </Button>
                ))}
              </div>
            </div>
          </div>

          {/* Images */}
          <div>
            <Label>Images ({images.length}/8)</Label>
            <p className="text-xs text-muted-foreground mb-2">Upload photos the AI can place across sections (hero, gallery, team…).</p>
            <div className="grid grid-cols-4 gap-2">
              {images.map((url, i) => (
                <div key={i} className="relative aspect-square rounded-md overflow-hidden border bg-muted">
                  <img src={url} alt="" className="w-full h-full object-cover" />
                  <button type="button" onClick={() => setImages(images.filter((_, k) => k !== i))} className="absolute top-1 right-1 bg-black/60 text-white rounded-full p-0.5">
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
              {images.length < 8 && (
                <label className="aspect-square rounded-md border-2 border-dashed flex items-center justify-center cursor-pointer hover:bg-muted/40">
                  {uploading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Upload className="h-5 w-5 text-muted-foreground" />}
                  <input type="file" accept="image/*" multiple className="hidden" onChange={(e) => handleUpload(e.target.files)} />
                </label>
              )}
            </div>
          </div>

          {/* Cost */}
          <div className="rounded-lg border p-4 bg-muted/30 flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <Wallet className="h-5 w-5 text-primary" />
              <div>
                <div className="text-sm font-semibold">Cost: {cost1} credits</div>
                <div className="text-xs text-muted-foreground">Your balance: {balance ?? 0} credits</div>
              </div>
            </div>
            {insufficient && (
              <Button asChild variant="outline" size="sm"><Link to="/credits"><AlertTriangle className="h-3.5 w-3.5 mr-1" /> Top up</Link></Button>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleGenerate} disabled={submitting || !title || !!slugError || insufficient}>
            {submitting ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Generating…</> : <><Sparkles className="h-4 w-4 mr-2" />Generate page</>}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
