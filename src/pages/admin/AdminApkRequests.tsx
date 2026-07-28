import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Smartphone, Download, Loader2, CheckCircle2, AlertCircle, Edit3, Trash2, Search, Play, Settings } from 'lucide-react';

const AdminApkRequests = () => {
  const [stores, setStores] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [editingStoreId, setEditingStoreId] = useState<string | null>(null);
  const [customLink, setCustomLink] = useState('');

  // GitHub Actions integration configurations
  const [gitHubPat, setGitHubPat] = useState(localStorage.getItem('admin_github_pat') || '');
  const [gitHubRepo, setGitHubRepo] = useState(localStorage.getItem('admin_github_repo') || '');
  const [triggeringStoreId, setTriggeringStoreId] = useState<string | null>(null);

  const saveGitHubSettings = () => {
    localStorage.setItem('admin_github_pat', gitHubPat.trim());
    localStorage.setItem('admin_github_repo', gitHubRepo.trim());
    toast.success('GitHub Actions builder settings saved!');
  };

  const handleTriggerBuild = async (storeRow: any) => {
    if (!gitHubPat.trim() || !gitHubRepo.trim()) {
      toast.error('Please configure GitHub PAT and Repository details at the top of the page first.');
      return;
    }

    setTriggeringStoreId(storeRow.id);
    try {
      const dispatchUrl = `https://api.github.com/repos/${gitHubRepo.trim()}/dispatches`;
      const response = await fetch(dispatchUrl, {
        method: 'POST',
        headers: {
          'Authorization': `token ${gitHubPat.trim()}`,
          'Accept': 'application/vnd.github.v3+json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          event_type: 'build-apk',
          client_payload: {
            store_id: storeRow.id,
            store_slug: storeRow.slug,
            app_name: storeRow.request.app_name,
            logo_url: storeRow.logo_url || null,
            base_url: window.location.origin,
          }
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || 'GitHub API returned error response');
      }

      // Update database status to 'building' (triggers loader on merchant side)
      const updatedRequest = {
        ...storeRow.request,
        status: 'building',
        download_url: null, // Clear old link while active compile runs
      };
      const updatedSettings = {
        ...storeRow.rawSettings,
        apk_build_request: updatedRequest,
      };

      const { error } = await supabase
        .from('stores')
        .update({ settings: updatedSettings } as any)
        .eq('id', storeRow.id);

      if (error) throw error;

      toast.success('GitHub build pipeline triggered successfully!');
      loadRequests();
    } catch (e: any) {
      toast.error(`GitHub Build Trigger Failed: ${e.message}`);
    } finally {
      setTriggeringStoreId(null);
    }
  };

  const loadRequests = async (showSpinner = true) => {
    if (showSpinner) setLoading(true);
    try {
      const { data, error } = await supabase
        .from('stores')
        .select('id, name, slug, logo_url, settings, created_at');
      
      if (error) throw error;

      const list = (data || [])
        .filter((s: any) => s.settings?.apk_build_request)
        .map((s: any) => ({
          id: s.id,
          name: s.name,
          slug: s.slug,
          logo_url: s.logo_url,
          request: s.settings.apk_build_request,
          rawSettings: s.settings,
        }));
      
      setStores(list);
    } catch (e: any) {
      toast.error(e.message || 'Failed to load APK requests');
    } finally {
      if (showSpinner) setLoading(false);
    }
  };

  useEffect(() => {
    loadRequests(true);
    
    // Auto refresh every 5 seconds silently to show real-time GitHub build status updates
    const interval = setInterval(() => {
      loadRequests(false);
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  const handleUpdateLink = async (storeId: string, currentSettings: any, requestData: any) => {
    try {
      const updatedRequest = {
        ...requestData,
        download_url: customLink.trim() || null,
        status: customLink.trim() ? 'completed' : 'pending',
      };

      const updatedSettings = {
        ...currentSettings,
        apk_build_request: updatedRequest,
      };

      const { error } = await supabase
        .from('stores')
        .update({ settings: updatedSettings } as any)
        .eq('id', storeId);

      if (error) throw error;

      toast.success('APK download link updated successfully!');
      setEditingStoreId(null);
      setCustomLink('');
      loadRequests();
    } catch (err: any) {
      toast.error(err.message || 'Failed to update link');
    }
  };

  const handleDeleteRequest = async (storeId: string, currentSettings: any) => {
    if (!confirm('Are you sure you want to delete this build request?')) return;

    try {
      const updatedSettings = { ...currentSettings };
      delete updatedSettings.apk_build_request;

      const { error } = await supabase
        .from('stores')
        .update({ settings: updatedSettings } as any)
        .eq('id', storeId);

      if (error) throw error;

      toast.success('APK Request deleted');
      loadRequests();
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete request');
    }
  };

  const filtered = stores.filter(
    (s) =>
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.slug.toLowerCase().includes(search.toLowerCase()) ||
      s.request.app_name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6 pb-24">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Android APK Requests</h1>
        <p className="text-sm text-muted-foreground">
          Manage, compile, and upload custom signed APK packages requested by store owners.
        </p>
      </div>

      {/* GitHub Actions Settings Config Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Settings className="h-4.5 w-4.5 text-primary" />
            GitHub Actions Automated Builder Settings
          </CardTitle>
          <CardDescription>
            Configure your GitHub Personal Access Token (PAT) and repository path to automate WebView APK builds.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid sm:grid-cols-3 gap-4 items-end">
          <div className="space-y-2">
            <label className="text-xs font-bold text-stone-600 block">GitHub PAT</label>
            <Input
              type="password"
              placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
              value={gitHubPat}
              onChange={(e) => setGitHubPat(e.target.value)}
              className="text-xs h-9"
            />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-bold text-stone-600 block">GitHub Repository (owner/repo)</label>
            <Input
              placeholder="e.g. username/repo-name"
              value={gitHubRepo}
              onChange={(e) => setGitHubRepo(e.target.value)}
              className="text-xs h-9"
            />
          </div>
          <Button onClick={saveGitHubSettings} className="h-9 text-xs">
            Save Builder Settings
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <CardTitle className="text-base">Requested APK Builds</CardTitle>
            <CardDescription>
              A list of merchants who have applied for custom Android applications.
            </CardDescription>
          </div>
          <div className="relative w-full md:w-72">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search store or app name..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 text-sm"
            />
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="py-12 flex justify-center items-center">
              <Loader2 className="h-8 w-8 text-primary animate-spin" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-12 text-center text-sm text-muted-foreground">
              No APK requests found.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm border-collapse">
                <thead>
                  <tr className="border-b text-xs uppercase text-muted-foreground">
                    <th className="py-3 px-4">Store Info</th>
                    <th className="py-3 px-4">App Configuration</th>
                    <th className="py-3 px-4">Requested At</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Download / Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((s) => (
                    <tr key={s.id} className="border-b hover:bg-stone-50/50 transition">
                      {/* Store Info */}
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-lg bg-stone-100 flex items-center justify-center border overflow-hidden shrink-0">
                            {s.logo_url ? (
                              <img src={s.logo_url} alt="Logo" className="object-contain h-full w-full" />
                            ) : (
                              <Smartphone className="h-5 w-5 text-stone-400" />
                            )}
                          </div>
                          <div>
                            <p className="font-semibold text-stone-900 leading-none">{s.name}</p>
                            <p className="text-xs text-muted-foreground mt-1">slug: {s.slug}</p>
                          </div>
                        </div>
                      </td>

                      {/* App Config */}
                      <td className="py-4 px-4 max-w-xs">
                        <p className="font-semibold text-stone-800">{s.request.app_name}</p>
                        <p className="text-xs text-stone-500 truncate mt-1">{s.request.app_description}</p>
                      </td>

                      {/* Requested At */}
                      <td className="py-4 px-4 text-xs text-stone-600">
                        {new Date(s.request.requested_at).toLocaleString()}
                      </td>

                      {/* Status */}
                      <td className="py-4 px-4">
                        <div className="flex flex-col gap-1">
                          <Badge
                            variant={s.request.status === 'completed' ? 'default' : s.request.status === 'building' ? 'secondary' : 'outline'}
                            className="capitalize text-xs font-semibold w-fit"
                          >
                            {s.request.status === 'building' ? 'Building...' : s.request.status}
                          </Badge>
                          {s.request.status === 'building' && gitHubRepo && (
                            <a
                              href={`https://github.com/${gitHubRepo.trim()}/actions`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-[10px] text-primary hover:underline flex items-center gap-1 font-semibold"
                            >
                              View Live Logs ↗
                            </a>
                          )}
                        </div>
                      </td>

                      {/* Download / Actions */}
                      <td className="py-4 px-4">
                        {editingStoreId === s.id ? (
                          <div className="flex flex-col gap-2 max-w-xs">
                            <Input
                              placeholder="Paste compiled APK link..."
                              value={customLink}
                              onChange={(e) => setCustomLink(e.target.value)}
                              className="text-xs h-8"
                            />
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                className="text-[10px] h-7 px-2.5"
                                onClick={() => handleUpdateLink(s.id, s.rawSettings, s.request)}
                              >
                                Save Link
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-[10px] h-7 px-2.5"
                                onClick={() => {
                                  setEditingStoreId(null);
                                  setCustomLink('');
                                }}
                              >
                                Cancel
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            {s.request.status === 'completed' && s.request.download_url ? (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => window.open(s.request.download_url)}
                                className="gap-1.5 text-xs h-8"
                              >
                                <Download className="h-3.5 w-3.5" />
                                Download File
                              </Button>
                            ) : (
                              <span className="text-xs text-amber-600 font-semibold flex items-center gap-1">
                                <AlertCircle className="h-3.5 w-3.5" />
                                Pending Link
                              </span>
                            )}
                            
                            {/* Trigger GitHub Actions build */}
                            <Button
                              size="sm"
                              onClick={() => handleTriggerBuild(s)}
                              disabled={triggeringStoreId === s.id || s.request.status === 'building'}
                              className="gap-1 text-xs h-8 bg-black hover:bg-stone-850 text-white"
                            >
                              {triggeringStoreId === s.id ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              ) : (
                                <Play className="h-3.5 w-3.5" />
                              )}
                              Build via GitHub
                            </Button>

                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => {
                                setEditingStoreId(s.id);
                                setCustomLink(s.request.download_url || '');
                              }}
                              className="h-8 w-8 text-stone-500 hover:text-stone-900"
                              title="Edit APK Link"
                            >
                              <Edit3 className="h-3.5 w-3.5" />
                            </Button>

                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => handleDeleteRequest(s.id, s.rawSettings)}
                              className="h-8 w-8 text-stone-500 hover:text-red-600"
                              title="Delete Request"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminApkRequests;
