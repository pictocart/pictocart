import { useState, useEffect } from 'react';
import { useStore } from '@/hooks/useStore';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { Smartphone, Download, Loader2, CheckCircle2, AlertCircle, QrCode, Play, Info } from 'lucide-react';

const MobileAppSettings = () => {
  const { store, refetchStore } = useStore();
  const [appName, setAppName] = useState('');
  const [appDesc, setAppDesc] = useState('');
  const [requestState, setRequestState] = useState<any>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [buildStep, setBuildStep] = useState(0);

  const storefrontUrl = store
    ? `${window.location.origin}/store/${store.slug}/menu`
    : '';

  useEffect(() => {
    if (store) {
      setAppName(store.name);
      setAppDesc(`Official ordering app for ${store.name}. Browse menu and place orders instantly.`);
      
      const settings = (store as any).settings || {};
      if (settings.apk_build_request) {
        setRequestState(settings.apk_build_request);
      }
    }
  }, [store]);

  const handleRequestBuild = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!store?.id) return;
    if (!appName.trim()) {
      toast.error('App Name is required');
      return;
    }

    setIsSubmitting(true);
    setBuildStep(1);

    try {
      // Simulate submission progression steps
      const steps = [
        'Registering app package request...',
        'Configuring Android package manifest...',
        'Submitting request details to build server...',
      ];

      for (let i = 0; i < steps.length; i++) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
        setBuildStep(i + 2);
      }

      // Save build request details with 'pending' status
      const currentRequest = {
        app_name: appName,
        app_description: appDesc,
        status: 'pending',
        requested_at: new Date().toISOString(),
        download_url: null,
      };

      const settings = (store as any).settings || {};
      const updatedSettings = {
        ...settings,
        apk_build_request: currentRequest,
      };

      await supabase
        .from('stores')
        .update({ settings: updatedSettings } as any)
        .eq('id', store.id);

      setRequestState(currentRequest);
      toast.success('App build request submitted successfully!');
      await refetchStore();
    } catch (err: any) {
      toast.error(err.message || 'Build request failed');
    } finally {
      setIsSubmitting(false);
      setBuildStep(0);
    }
  };

  const handleResetRequest = async () => {
    if (!store?.id) return;
    
    try {
      const settings = (store as any).settings || {};
      delete settings.apk_build_request;

      await supabase
        .from('stores')
        .update({ settings } as any)
        .eq('id', store.id);

      setRequestState(null);
      await refetchStore();
      toast.success('Request form reset');
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  if (!store) return null;

  return (
    <div className="space-y-6 max-w-5xl pb-24 md:pb-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Mobile Application</h1>
        <p className="text-sm text-muted-foreground">
          Deploy and package your digital storefront as an installable mobile application.
        </p>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        {/* Left Column: Form & Request Status */}
        <div className={`space-y-6 ${requestState && requestState.status === 'completed' ? 'md:col-span-2' : 'md:col-span-3'}`}>
          
          {/* Custom Android APK Build */}
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Smartphone className="h-4.5 w-4.5 text-primary" />
                    Custom Android App (.APK)
                  </CardTitle>
                  <CardDescription>
                    Compile a standalone Android application file (.apk) customized with your store name and logo.
                  </CardDescription>
                </div>
                {requestState && (
                  <Badge variant={requestState.status === 'completed' ? 'default' : 'secondary'} className="capitalize">
                    {requestState.status === 'building' ? 'Building...' : requestState.status}
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {isSubmitting ? (
                <div className="py-8 flex flex-col items-center justify-center text-center space-y-4">
                  <Loader2 className="h-8 w-8 text-primary animate-spin" />
                  <div className="space-y-2">
                    <p className="font-semibold text-sm">Compiling Custom Android App Package</p>
                    <p className="text-xs text-muted-foreground animate-pulse">
                      {buildStep === 1 && 'Initializing cloud compiler container...'}
                      {buildStep === 2 && 'Configuring android package manifest...'}
                      {buildStep === 3 && 'Resizing store logo to launcher icons (mipmaps)...'}
                      {buildStep === 4 && 'Bundling assets and caching service workers...'}
                      {buildStep === 5 && 'Running gradle release compiler (./gradlew assembleRelease)...'}
                      {buildStep === 6 && 'Signing APK with PicToCart keystore credentials...'}
                      {buildStep === 7 && 'Aligning zip alignment & verifying app integrity...'}
                    </p>
                  </div>
                  <div className="w-64 h-1.5 bg-stone-100 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-primary transition-all duration-1000"
                      style={{ width: `${(buildStep / 7) * 100}%` }}
                    />
                  </div>
                </div>
              ) : requestState ? (
                requestState.status === 'completed' ? (
                  <div className="space-y-4">
                    <div className="flex items-start gap-3 p-4 bg-emerald-50 text-emerald-950 rounded-xl border border-emerald-200">
                      <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
                      <div>
                        <p className="font-semibold text-sm">Your App has been compiled successfully!</p>
                        <p className="text-xs text-emerald-900/80 mt-1">
                          Download the package below and distribute it directly to your customers, or upload it to Google Play Store.
                        </p>
                      </div>
                    </div>

                    <div className="border rounded-xl p-4 bg-stone-50/50 space-y-2 text-sm">
                      <div className="grid grid-cols-3 py-1 border-b text-xs text-muted-foreground">
                        <span>App Name</span>
                        <span className="col-span-2 text-stone-900 font-medium">{requestState.app_name}</span>
                      </div>
                      <div className="grid grid-cols-3 py-1 border-b text-xs text-muted-foreground">
                        <span>Requested Date</span>
                        <span className="col-span-2 text-stone-900 font-medium">
                          {new Date(requestState.requested_at).toLocaleDateString()}
                        </span>
                      </div>
                      <div className="grid grid-cols-3 py-1 text-xs text-muted-foreground">
                        <span>File Format</span>
                        <span className="col-span-2 text-stone-900 font-medium">Android Package (.APK)</span>
                      </div>
                    </div>

                    <div className="flex gap-3">
                      <Button 
                        onClick={() => window.open(requestState.download_url)}
                        className="flex-1 gap-2"
                      >
                        <Download className="h-4 w-4" />
                        Download APK File
                      </Button>
                      <Button 
                        variant="outline" 
                        onClick={handleResetRequest}
                        className="text-stone-500 hover:text-red-600"
                      >
                        Reset / Rebuild App
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="flex items-start gap-3 p-4 bg-amber-50 text-amber-950 rounded-xl border border-amber-200">
                      <AlertCircle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                      <div>
                        <p className="font-semibold text-sm">App Compilation Pending</p>
                        <p className="text-xs text-amber-900/80 mt-1">
                          Our admin team is compiling your custom Android package (.apk) file. Once generated and uploaded by the admin, the download button will appear here.
                        </p>
                      </div>
                    </div>

                    <div className="border rounded-xl p-4 bg-stone-50/50 space-y-2 text-sm">
                      <div className="grid grid-cols-3 py-1 border-b text-xs text-muted-foreground">
                        <span>App Name</span>
                        <span className="col-span-2 text-stone-900 font-medium">{requestState.app_name}</span>
                      </div>
                      <div className="grid grid-cols-3 py-1 border-b text-xs text-muted-foreground">
                        <span>Requested Date</span>
                        <span className="col-span-2 text-stone-900 font-medium">
                          {new Date(requestState.requested_at).toLocaleDateString()}
                        </span>
                      </div>
                      <div className="grid grid-cols-3 py-1 text-xs text-muted-foreground">
                        <span>Current Status</span>
                        <span className="col-span-2 text-amber-700 font-semibold uppercase tracking-wider text-[10px]">
                          Pending Admin Upload
                        </span>
                      </div>
                    </div>

                    <div className="flex gap-3">
                      <Button 
                        variant="outline" 
                        onClick={handleResetRequest}
                        className="w-full text-stone-500 hover:text-red-600"
                      >
                        Cancel / Edit Request Details
                      </Button>
                    </div>
                  </div>
                )
              ) : (
                <form onSubmit={handleRequestBuild} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="appName">App Launcher Name *</Label>
                    <Input 
                      id="appName"
                      value={appName}
                      onChange={(e) => setAppName(e.target.value)}
                      placeholder="e.g. My Food Store"
                      maxLength={30}
                    />
                    <p className="text-[10px] text-muted-foreground">
                      This name appears directly below your app icon on mobile home screens (max 30 characters).
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="appDesc">Description</Label>
                    <Textarea 
                      id="appDesc"
                      value={appDesc}
                      onChange={(e) => setAppDesc(e.target.value)}
                      placeholder="App store description..."
                      rows={3}
                    />
                  </div>

                  <div className="flex gap-4 p-4 border bg-stone-50/50 rounded-xl items-center">
                    <div className="h-12 w-12 rounded-xl bg-white shadow-sm flex items-center justify-center border overflow-hidden shrink-0">
                      {store.logo_url ? (
                        <img src={store.logo_url} alt="Logo" className="object-contain h-full w-full" />
                      ) : (
                        <Smartphone className="h-6 w-6 text-stone-400" />
                      )}
                    </div>
                    <div className="text-xs">
                      <p className="font-semibold text-stone-700">App Icon (Launcher Icon)</p>
                      <p className="text-stone-500 mt-0.5">
                        Uses your current store logo. To change it, update your logo in account settings.
                      </p>
                    </div>
                  </div>

                  <Button type="submit" className="w-full gap-2">
                    <Play className="h-4 w-4" />
                    Request App Compilation
                  </Button>
                </form>
              )}
            </CardContent>
          </Card>
        </div>
        {/* Right Column: Information & Help (Only visible when compiled and download link is ready) */}
        {requestState && requestState.status === 'completed' && (
          <div className="space-y-6">
            <Card className="bg-primary/5 border-primary/20">
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-1.5">
                  <Info className="h-4 w-4 text-primary" />
                  How to Distribute
                </CardTitle>
              </CardHeader>
              <CardContent className="text-xs space-y-3 text-stone-600 leading-relaxed">
                <p>
                  Once you download your custom Android `.apk` file:
                </p>
                <ol className="list-decimal list-inside space-y-2">
                  <li>
                    **Direct Link:** Upload the APK to Google Drive, Dropbox, or your store, and share the link via WhatsApp/SMS with your customers.
                  </li>
                  <li>
                    **Google Play Store:** You can publish this exact APK file on your Google Play Store developer account to make it globally searchable.
                  </li>
                  <li>
                    **Automatic Sync:** Any changes you make to your menu, categories, or colors will update **instantly** inside installed apps without requiring customers to re-download.
                  </li>
                </ol>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
};

export default MobileAppSettings;
