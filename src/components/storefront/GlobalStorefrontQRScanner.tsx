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
  const { data: store } = useQuery({
    queryKey: ['global-store-check', slug],
    queryFn: async () => {
      if (!slug) return null;
      const { data, error } = await supabase
        .from('stores')
        .select('id, category, name')
        .eq('slug', slug)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!slug,
  });

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
            const size = Math.min(width, height) * 0.7;
            return { width: size, height: size };
          }
        },
        (decodedText) => {
          // Success callback
          stopScanner();
          setIsOpen(false);
          handleScannedUrl(decodedText);
        },
        () => {
          // Failure callback (silent)
        }
      )
      .then(() => setScannerLoading(false))
      .catch((err) => {
        console.error('Html5Qrcode initialization error', err);
        setScannerLoading(false);
        toast.error('Failed to access camera. Check permissions.');
        setIsOpen(false);
      });
    }, 300);

    return () => {
      clearTimeout(timer);
      stopScanner();
    };
  }, [isOpen]);

  const stopScanner = () => {
    if (html5QrCodeRef.current && html5QrCodeRef.current.isScanning) {
      html5QrCodeRef.current.stop()
        .then(() => {
          html5QrCodeRef.current = null;
        })
        .catch(err => console.error('Failed to stop html5Qrcode', err));
    }
  };

  const handleScannedUrl = (url: string) => {
    try {
      const parsedUrl = new URL(url);
      const pathname = parsedUrl.pathname;
      if (pathname.includes('/q/')) {
        // Redirection route
        const redirectSlug = pathname.split('/q/')[1];
        if (redirectSlug) {
          navigate(`/q/${redirectSlug}`);
          toast.success('QR Code Scanned successfully!');
        }
      } else {
        // Fallback for absolute links
        navigate(pathname + parsedUrl.search);
        toast.success('QR Code Scanned!');
      }
    } catch {
      // In case it's a relative path or text
      if (url.startsWith('/')) {
        navigate(url);
        toast.success('QR Code Scanned!');
      } else {
        toast.error('Invalid QR code format');
      }
    }
  };

  // Submit assistance request to call waiter
  const handleCallWaiter = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!store?.id || !slug) return;
    const finalTable = tableLabel || tableInput.trim();
    if (!finalTable) {
      toast.error('Please enter your table number');
      return;
    }

    try {
      const { error } = await supabase
        .from('store_assistance_requests' as any)
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
        <button
          onClick={() => setIsOpen(true)}
          className="h-12 w-12 rounded-full bg-primary text-primary-foreground shadow-lg flex items-center justify-center hover:bg-primary/90 transition-colors border border-primary/20"
          title="Scan Table QR"
        >
          <Camera className="h-5 w-5" />
        </button>
      </div>

      {/* Camera QR Scanner Dialog */}
      <Dialog open={isOpen} onOpenChange={(val) => !val && setIsOpen(false)}>
        <DialogContent className="max-w-md p-6">
          <DialogHeader>
            <DialogTitle>Scan Table QR Code</DialogTitle>
            <DialogDescription>
              Align the QR code inside the box to check in and view menu.
            </DialogDescription>
          </DialogHeader>

          <div className="relative mt-4 bg-black rounded-xl overflow-hidden aspect-square flex items-center justify-center">
            {scannerLoading && (
              <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-black/60 text-white gap-2">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <span className="text-sm font-medium">Opening camera...</span>
              </div>
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
