import { useEffect, useState } from "react";
import { useParams, useSearchParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";
import MasterThemeRenderer from "@/components/theme/MasterThemeRenderer";

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

  if (loading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="h-6 w-6 animate-spin" /></div>;
  if (!manifest) return <div className="p-8 text-center text-muted-foreground">Theme not found.</div>;

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