import { useState } from 'react';
import { Loader2, CheckCircle2, XCircle, MapPin } from 'lucide-react';

interface PincodeCheckerProps {
  storeId: string;
  colors: { primary: string; text: string; card: string; secondary: string };
  borderRadius: number;
  onDeliveryInfo?: (info: { serviceable: boolean; estimated_days: number | null }) => void;
  title?: string;
  placeholder?: string;
  cta?: string;
}

const formatETD = (etdStr: string) => {
  if (!etdStr) return null;
  try {
    const normalized = etdStr.replace(' ', 'T');
    const date = new Date(normalized);
    if (isNaN(date.getTime())) return null;

    const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    
    const dayName = daysOfWeek[date.getDay()];
    const dayOfMonth = date.getDate();
    const monthName = months[date.getMonth()];
    
    let hours = date.getHours();
    const minutes = date.getMinutes();
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12;
    const minutesStr = minutes < 10 ? '0' + minutes : minutes;
    
    const hasTime = date.getHours() !== 0 || date.getMinutes() !== 0;
    const timeFormatted = hasTime ? ` (before ${hours}:${minutesStr} ${ampm})` : '';
    
    return `${dayName}, ${dayOfMonth} ${monthName}${timeFormatted}`;
  } catch {
    return null;
  }
};

const getFallbackETD = (days: number) => {
  const date = new Date();
  date.setDate(date.getDate() + days);
  
  const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  
  const dayName = daysOfWeek[date.getDay()];
  const dayOfMonth = date.getDate();
  const monthName = months[date.getMonth()];
  
  return `${dayName}, ${dayOfMonth} ${monthName}`;
};

const PincodeChecker = ({
  storeId,
  colors,
  borderRadius,
  onDeliveryInfo,
  title,
  placeholder,
  cta
}: PincodeCheckerProps) => {
  const [pincode, setPincode] = useState('');
  const [checking, setChecking] = useState(false);
  const [result, setResult] = useState<{
    serviceable: boolean;
    estimated_days: number | null;
    etd?: string | null;
    courier?: string | null;
  } | null>(null);

  const handleCheck = async () => {
    if (pincode.length !== 6) return;
    setChecking(true);
    setResult(null);

    try {
      const { supabase } = await import('@/integrations/supabase/client');
      const { data, error } = await supabase.functions.invoke('shiprocket-proxy', {
        body: {
          action: 'check-serviceability',
          store_id: storeId,
          destination_pincode: pincode,
        },
      });

      if (error || !data) {
        setResult({ serviceable: false, estimated_days: null });
        return;
      }

      const info = {
        serviceable: data.serviceable ?? false,
        estimated_days: data.estimated_days ?? null,
        etd: data.etd || null,
        courier: data.courier || null,
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
        <MapPin className="h-3 w-3" /> {title || "Check Delivery Availability"}
      </div>
      <div className="flex gap-2">
        <input
          type="text"
          inputMode="numeric"
          maxLength={6}
          placeholder={placeholder || "Enter pincode"}
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
          {checking ? <Loader2 className="h-4 w-4 animate-spin" /> : (cta || 'Check')}
        </button>
      </div>

      {result && (
        <div className="space-y-1 pt-1">
          {result.serviceable ? (
            <>
              <div className="flex items-center gap-2 text-sm text-green-600 font-medium">
                <CheckCircle2 className="h-4 w-4 shrink-0" />
                <span>Delivery available</span>
              </div>
              <div className="text-xs opacity-80 pl-6 space-y-0.5">
                <p>
                  Estimated delivery:{' '}
                  <span className="font-semibold text-foreground">
                    {result.etd ? formatETD(result.etd) : (result.estimated_days ? getFallbackETD(result.estimated_days) : '')}
                  </span>
                  {result.estimated_days && (
                    <span className="text-[10px] opacity-70 block sm:inline sm:ml-1">
                      (Approx. {result.estimated_days} {result.estimated_days === 1 ? 'day' : 'days'})
                    </span>
                  )}
                </p>
                {result.courier && (
                  <p className="text-[10px] opacity-60">
                    Delivery partner: <span className="capitalize">{result.courier.toLowerCase()}</span>
                  </p>
                )}
              </div>
            </>
          ) : (
            <div className="flex items-center gap-2 text-sm text-red-500 font-medium">
              <XCircle className="h-4 w-4 shrink-0" />
              <span>Delivery not available for this pincode</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default PincodeChecker;
