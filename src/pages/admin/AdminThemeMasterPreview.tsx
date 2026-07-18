import { useEffect, useState } from "react";
import { useParams, useSearchParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, ExternalLink } from "lucide-react";
import { THEMES } from "@/themes";
import MasterThemeRenderer from "@/components/theme/MasterThemeRenderer";
import { Button } from "@/components/ui/button";

export default function AdminThemePreview() {
  const { themeId } = useParams();
  const [params] = useSearchParams();
  const page = params.get("page") ?? "home";
  const embed = params.get("embed") === "1";
  const [manifest, setManifest] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("theme_master_versions").select("files_manifest").eq("theme_id", themeId).order("version", { ascending: false }).limit(1).maybeSingle();
      setManifest(data?.files_manifest ?? null);
      setLoading(false);
    })();
  }, [themeId]);

  const isDedicated = themeId ? themeId in THEMES : false;

  if (loading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="h-6 w-6 animate-spin" /></div>;
  if (!manifest) {
    if (isDedicated) {
      return (
        <div className="min-h-screen flex flex-col items-center justify-center gap-4 p-8 text-center">
          <h2 className="text-xl font-bold">{themeId === 'couture' ? 'Couture' : themeId} — Dedicated Theme</h2>
          <p className="text-muted-foreground max-w-md">This is a dedicated React theme without a manifest. Preview it on the storefront by installing it from the merchant Themes page, or visit the store with <code className="bg-muted px-2 py-0.5 rounded text-sm">?preview_theme={themeId}</code>.</p>
          <Button asChild variant="outline">
            <Link to="/admin/themes"><ExternalLink className="mr-1 h-4 w-4" /> Back to Themes</Link>
          </Button>
        </div>
      );
    }
    return <div className="p-8 text-center text-muted-foreground">Theme not found.</div>;
  }

  return (
    <div>
      {!embed && (
        <div className="bg-background border-b px-4 py-2 flex items-center justify-between gap-4 text-sm">
          <Link to="/admin/themes" className="text-primary">← Back to Themes</Link>
          <div className="flex gap-2">
            {["home","shop","product","about","contact"].map(p => (
              <Link key={p} to={`?page=${p}`} className={`px-3 py-1 rounded ${page === p ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}>{p}</Link>
            ))}
          </div>
        </div>
      )}
      <MasterThemeRenderer manifest={manifest} page={page} />
    </div>
  );
}