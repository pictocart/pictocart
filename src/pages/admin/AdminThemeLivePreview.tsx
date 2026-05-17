import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";
import MasterThemeRenderer from "@/components/theme/MasterThemeRenderer";

/**
 * Live preview surface for Customiser v2.
 * Loads a theme manifest and listens for postMessage({ type: 'customiser:update', overrides, page })
 * from the parent window so edits reflect instantly without a reload.
 */
export default function AdminThemeLivePreview() {
  const { themeId } = useParams();
  const [params] = useSearchParams();
  const initialPage = params.get("page") ?? "home";
  const storeSlug = params.get("storeSlug") ?? undefined;

  const [manifest, setManifest] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [overrides, setOverrides] = useState<any>({});
  const [page, setPage] = useState<string>(initialPage);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("theme_master_versions")
        .select("files_manifest")
        .eq("theme_id", themeId!)
        .order("version", { ascending: false })
        .limit(1)
        .maybeSingle();
      setManifest(data?.files_manifest ?? null);
      setLoading(false);
      // Tell parent we're ready
      window.parent?.postMessage({ type: "customiser:ready" }, "*");
    })();
  }, [themeId]);

  useEffect(() => {
    const handler = (ev: MessageEvent) => {
      const msg = ev.data;
      if (!msg || msg.type !== "customiser:update") return;
      if (msg.overrides !== undefined) setOverrides(msg.overrides ?? {});
      if (msg.page !== undefined) setPage(msg.page);
    };
    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }
  if (!manifest) {
    return <div className="p-8 text-center text-muted-foreground">Theme not found.</div>;
  }

  return <MasterThemeRenderer manifest={manifest} page={page} overrides={overrides} storeSlug={storeSlug} />;
}
