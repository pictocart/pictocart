import { useState } from 'react';
import { Loader2, CheckCircle2, XCircle, MapPin } from 'lucide-react';

interface PincodeCheckerProps {
  storeId: string;
  colors: { primary: string; text: string; card: string; secondary: string };
  borderRadius: number;
  onDeliveryInfo?: (info: { serviceable: boolean; estimated_days: number | null }) => void;
}

const PincodeChecker = ({
  storeId,
  colors,
  borderRadius,
  onDeliveryInfo,
}: PincodeCheckerProps) => {
  const [pincode, setPincode] = useState('');
  const [checking, setChecking] = useState(false);
  const [result, setResult] = useState<{
    serviceable: boolean;
    estimated_days: number | null;
  } | null>(null);

  const handleCheck = async () => {
    if (pincode.length !== 6) return;
    setChecking(true);
    setResult(null);

    try {
      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
      const res = await fetch(
        `https://${projectId}.supabase.co/functions/v1/shiprocket-proxy`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'check-serviceability',
            store_id: storeId,
            destination_pincode: pincode,
          }),
        }
      );

      const data = await res.json();
      const info = {
        serviceable: data.serviceable ?? false,
        estimated_days: data.estimated_days ?? null,
      };
      setResult(info);
      onDeliveryInfo?.(info);
    } catch {
      setResult({ serviceable: false, estimated_days: null });
    }
    setChecking(false);
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-1 text-xs font-medium opacity-70">
        <MapPin className="h-3 w-3" /> Check Delivery Availability
      </div>
      <div className="flex gap-2">
        <input
          type="text"
          inputMode="numeric"
          maxLength={6}
          placeholder="Enter pincode"
          value={pincode}
          onChange={(e) => {
            setPincode(e.target.value.replace(/\D/g, '').slice(0, 6));
            setResult(null);
          }}
          className="flex-1 px-3 py-2 text-sm border"
          style={{
            backgroundColor: colors.card,
            borderColor: colors.secondary,
            borderRadius: `${borderRadius / 2}px`,
            color: colors.text,
          }}
        />
        <button
          onClick={handleCheck}
          disabled={pincode.length !== 6 || checking}
          className="px-4 py-2 text-sm font-medium disabled:opacity-50"
          style={{
            backgroundColor: colors.primary,
            color: '#fff',
            borderRadius: `${borderRadius / 2}px`,
          }}
        >
          {checking ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Check'}
        </button>
      </div>

      {result && (
        <div className="flex items-center gap-2 text-sm pt-1">
          {result.serviceable ? (
            <>
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <span>
                Delivery available
                {result.estimated_days ? ` — Est. ${result.estimated_days} days` : ''}
              </span>
            </>
          ) : (
            <>
              <XCircle className="h-4 w-4 text-red-500" />
              <span>Delivery not available for this pincode</span>
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default PincodeChecker;
