import { useEffect, useState, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Html5Qrcode } from 'html5-qrcode';
import { Camera, Bell, X, Loader2, Play } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useCart } from '@/hooks/useCart';
import { toast } from 'sonner';

export default function GlobalStorefrontQRScanner() {
  const location = useLocation();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [isCalling, setIsCalling] = useState(false);
  const [tableInput, setTableInput] = useState('');
  const [countdown, setCountdown] = useState<number | null>(null);
  const [scannerLoading, setScannerLoading] = useState(false);
  const html5QrCodeRef = useRef<Html5Qrcode | null>(null);

  // Extract store slug from path (or custom domain global)
  const getSlugFromPath = () => {
    const parts = location.pathname.split('/');
    if (parts[1] === 'store' && parts[2]) {
      return parts[2];
    }
    return (window as any).__hostStoreSlug || '';
  };

  const slug = getSlugFromPath();
  const { tableLabel, setTableLabel, totalItems } = useCart(slug || '');

  // Fetch store details to verify category is food
  const { data: checkData } = useQuery({
    queryKey: ['global-store-check', slug],
    queryFn: async () => {
      if (!slug) return null;
      const { data: storeData, error: storeError } = await supabase
        .from('stores')
        .select('id, category, name')
        .eq('slug', slug)
        .maybeSingle();
      if (storeError || !storeData) return null;

      // Fetch fulfillment settings
      const { data: fullData } = await supabase
        .from('store_fulfillment_settings' as any)
        .select('dine_in_requires_table')
        .eq('store_id', storeData.id)
        .maybeSingle();

      return {
        store: storeData,
        dine_in_requires_table: fullData ? (fullData as any).dine_in_requires_table !== false : true,
      };
    },
    enabled: !!slug,
  });

  const store = checkData?.store;
  const requiresTable = checkData?.dine_in_requires_table !== false;

  // Load active countdown timer from sessionStorage on mount
  useEffect(() => {
    if (!slug) return;
    const savedEnd = sessionStorage.getItem(`waiter_call_end_${slug}`);
    if (savedEnd) {
      const remaining = Math.round((Number(savedEnd) - Date.now()) / 1000);
      if (remaining > 0) {
        setCountdown(remaining);
      } else {
        sessionStorage.removeItem(`waiter_call_end_${slug}`);
      }
    }
  }, [slug]);

  // Countdown timer decrement
  useEffect(() => {
    if (countdown === null) return;
    if (countdown <= 0) {
      setCountdown(null);
      if (slug) sessionStorage.removeItem(`waiter_call_end_${slug}`);
      return;
    }
    const t = setTimeout(() => setCountdown(c => c !== null ? c - 1 : null), 1000);
    return () => clearTimeout(t);
  }, [countdown, slug]);

  // Disable button if not a storefront route or not a food store
  const isStorefront = location.pathname.startsWith('/store/') || !!(window as any).__hostStoreSlug;
  const isFoodStore = store?.category === 'food';
  const showControls = isStorefront && isFoodStore;

  // Initialize and start scanner when modal opens
  useEffect(() => {
    if (!isOpen) {
      stopScanner();
      return;
    }

    setScannerLoading(true);
    // Tiny delay to ensure modal DOM is mounted
    const timer = setTimeout(() => {
      const scanner = new Html5Qrcode('qr-reader-element');
      html5QrCodeRef.current = scanner;

      scanner.start(
        { facingMode: 'environment' },
        {
          fps: 10,
          qrbox: (width, height) => {
            return {
              w: width,
              h: height
            };
          }
        },
        (decodedText) => {
          stopScanner();
          setIsOpen(false);
          // Parse table code
          let targetUrl = decodedText;
          if (!targetUrl.startsWith('http://') && !targetUrl.startsWith('https://')) {
            if (targetUrl.includes('/store/')) {
              targetUrl = window.location.origin + targetUrl;
            } else {
              targetUrl = window.location.origin + '/store/' + slug + '?table=' + encodeURIComponent(targetUrl);
            }
          }
          try {
            const urlObj = new URL(targetUrl);
            const tableParam = urlObj.searchParams.get('table');
            if (tableParam) {
              setTableLabel(tableParam);
              toast.success(`Checked in at Table ${tableParam}`);
              navigate(urlObj.pathname + urlObj.search);
            } else {
              window.location.href = targetUrl;
            }
          } catch (e) {
            toast.error('Invalid QR Code format');
          }
        },
        () => {}
      ).then(() => {
        setScannerLoading(false);
      }).catch(() => {
        setScannerLoading(false);
        toast.error('Failed to access camera. Please check permissions.');
        setIsOpen(false);
      });
    }, 300);

    return () => {
      clearTimeout(timer);
      stopScanner();
    };
  }, [isOpen]);

  const stopScanner = () => {
    if (html5QrCodeRef.current) {
      if (html5QrCodeRef.current.isScanning) {
        html5QrCodeRef.current.stop().catch(err => console.error('Error stopping scanner:', err));
      }
      html5QrCodeRef.current = null;
    }
  };

  // Submit assistance request to call waiter
  const handleCallWaiter = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!store?.id || !slug) return;

    const finalTable = tableLabel || tableInput;
    if (!finalTable) {
      toast.error('Please specify a table number');
      return;
    }

    try {
      const { error } = await supabase
        .from('waiter_calls' as any)
        .insert({
          store_id: store.id,
          table_label: finalTable,
          status: 'pending'
        });

      if (error) throw error;

      // Set table number locally if not already set
      if (!tableLabel) {
        setTableLabel(finalTable);
      }

      toast.success('Waiter called successfully!');
      setIsCalling(false);

      // Start 2-min countdown (120 seconds)
      const endTime = Date.now() + 120 * 1000;
      sessionStorage.setItem(`waiter_call_end_${slug}`, endTime.toString());
      setCountdown(120);
    } catch (err: any) {
      toast.error(err.message || 'Failed to request assistance');
    }
  };

  const formatTime = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const secs = sec % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  if (!showControls) return null;

  return (
    <>
      {/* Sticky Button Panel on Mobile/Tablet Screen Only */}
      <div 
        className={`fixed right-6 z-50 flex flex-col gap-3 md:flex lg:hidden transition-all duration-300 ${
          totalItems > 0 
            ? 'bottom-[148px] md:bottom-[96px]' 
            : 'bottom-[80px] md:bottom-[24px]'
        }`}
      >
        {/* Call Waiter Timer or Button */}
        {countdown !== null ? (
          <div className="flex h-12 px-3 rounded-full bg-orange-600 text-white font-mono text-xs font-bold items-center justify-center shadow-lg border border-orange-500 animate-pulse">
            <Bell className="h-4 w-4 mr-1 animate-bounce" />
            Wait: {formatTime(countdown)}
          </div>
        ) : (
          <button
            onClick={() => {
              if (tableLabel) {
                // If table is bound, call directly without prompt modal
                const e = { preventDefault: () => {} };
                handleCallWaiter(e as any);
              } else {
                setIsCalling(true);
              }
            }}
            className="h-12 w-12 rounded-full bg-orange-500 text-white shadow-lg flex items-center justify-center hover:bg-orange-600 transition-colors border border-orange-400"
            title="Call Waiter"
          >
            <Bell className="h-5 w-5" />
          </button>
        )}

        {/* Scan Camera Button */}
        {requiresTable && (
          <button
            onClick={() => setIsOpen(true)}
            className="h-12 w-12 rounded-full bg-primary text-primary-foreground shadow-lg flex items-center justify-center hover:bg-primary/90 transition-colors border border-primary/20"
            title="Scan Table QR"
          >
            <Camera className="h-5 w-5" />
          </button>
        )}
      </div>

      {/* Camera QR Scanner Dialog */}
      <Dialog open={isOpen} onOpenChange={(val) => !val && setIsOpen(false)}>
        <DialogContent className="max-w-md p-6">
          <DialogHeader>
            <DialogTitle>Scan Table QR Code</DialogTitle>
            <DialogDescription>
              Position the QR code anywhere in the camera view to check in and view menu.
            </DialogDescription>
          </DialogHeader>

          <style dangerouslySetInnerHTML={{ __html: `
            @keyframes scan-line-movement {
              0% { top: 10%; }
              50% { top: 90%; }
              100% { top: 10%; }
            }
            .scanner-laser-line {
              animation: scan-line-movement 2.5s infinite ease-in-out;
            }
          `}} />

          <div className="relative mt-4 bg-black rounded-xl overflow-hidden aspect-square flex items-center justify-center">
            {scannerLoading && (
              <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-black/60 text-white gap-2">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <span className="text-sm font-medium">Opening camera...</span>
              </div>
            )}
            
            {/* Scanning Visual Effect Overlay */}
            {!scannerLoading && (
              <>
                {/* Neon Green Laser Beam Line */}
                <div 
                  className="absolute left-0 right-0 h-[3px] scanner-laser-line z-20 pointer-events-none"
                  style={{
                    background: 'linear-gradient(to right, transparent, #10b981 30%, #10b981 70%, transparent)',
                    boxShadow: '0 0 10px #10b981, 0 0 4px #10b981'
                  }}
                />
                
                {/* Target Finder Brackets */}
                <div className="absolute inset-12 border border-white/10 rounded-lg pointer-events-none z-10">
                  {/* Top-Left Corner */}
                  <div className="absolute -top-1 -left-1 w-6 h-6 border-t-[3px] border-l-[3px] border-emerald-500 rounded-tl" />
                  {/* Top-Right Corner */}
                  <div className="absolute -top-1 -right-1 w-6 h-6 border-t-[3px] border-r-[3px] border-emerald-500 rounded-tr" />
                  {/* Bottom-Left Corner */}
                  <div className="absolute -bottom-1 -left-1 w-6 h-6 border-b-[3px] border-l-[3px] border-emerald-500 rounded-bl" />
                  {/* Bottom-Right Corner */}
                  <div className="absolute -bottom-1 -right-1 w-6 h-6 border-b-[3px] border-r-[3px] border-emerald-500 rounded-br" />
                </div>

                {/* Subtle Pulsing Scan Zone Glow */}
                <div className="absolute inset-0 bg-emerald-500/5 animate-pulse pointer-events-none z-10" />
              </>
            )}

            <div id="qr-reader-element" className="w-full h-full overflow-hidden" />
          </div>

          <div className="mt-4 flex justify-end">
            <Button variant="outline" onClick={() => setIsOpen(false)}>
              Cancel
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Call Waiter Dialog (Only when table is not yet set) */}
      <Dialog open={isCalling} onOpenChange={(val) => !val && setIsCalling(false)}>
        <DialogContent className="max-w-sm p-6">
          <DialogHeader>
            <DialogTitle>Call a Waiter</DialogTitle>
            <DialogDescription>
              Please enter your table number to request assistance.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCallWaiter} className="space-y-4 mt-2">
            <div className="space-y-2">
              <Label htmlFor="table-number">Table Number / Label</Label>
              <Input
                id="table-number"
                placeholder="e.g. T4"
                value={tableInput}
                onChange={(e) => setTableInput(e.target.value)}
                required
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setIsCalling(false)}>
                Cancel
              </Button>
              <Button type="submit" className="bg-orange-500 hover:bg-orange-600 text-white border-orange-400">
                Call Waiter
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
