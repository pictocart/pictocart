import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2, CheckCircle2, XCircle } from 'lucide-react';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string;
const FN_URL = `${SUPABASE_URL}/functions/v1/handle-email-unsubscribe`;

export default function Unsubscribe() {
  const [params] = useSearchParams();
  const token = params.get('token') || '';
  const [state, setState] = useState<'loading' | 'valid' | 'already' | 'invalid' | 'done' | 'error'>('loading');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!token) { setState('invalid'); return; }
    (async () => {
      try {
        const r = await fetch(`${FN_URL}?token=${encodeURIComponent(token)}`, { headers: { apikey: SUPABASE_KEY } });
        const j = await r.json();
        if (r.ok && j.valid) setState('valid');
        else if (j.reason === 'already_unsubscribed') setState('already');
        else setState('invalid');
      } catch { setState('error'); }
    })();
  }, [token]);

  const confirm = async () => {
    setSubmitting(true);
    try {
      const r = await fetch(FN_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', apikey: SUPABASE_KEY },
        body: JSON.stringify({ token }),
      });
      const j = await r.json();
      if (r.ok && j.success) setState('done');
      else if (j.reason === 'already_unsubscribed') setState('already');
      else setState('error');
    } catch { setState('error'); }
    setSubmitting(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="max-w-md w-full">
        <CardContent className="pt-8 pb-8 text-center space-y-4">
          {state === 'loading' && <><Loader2 className="h-8 w-8 animate-spin mx-auto text-muted-foreground" /><p>Checking your link…</p></>}
          {state === 'valid' && (
            <>
              <h1 className="text-xl font-semibold">Unsubscribe from emails</h1>
              <p className="text-sm text-muted-foreground">Click below to confirm you no longer want to receive emails from us.</p>
              <Button onClick={confirm} disabled={submitting} className="w-full">
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Confirm unsubscribe'}
              </Button>
            </>
          )}
          {state === 'done' && (<><CheckCircle2 className="h-10 w-10 text-emerald-500 mx-auto" /><h1 className="text-xl font-semibold">You're unsubscribed</h1><p className="text-sm text-muted-foreground">You won't receive any more emails from us.</p></>)}
          {state === 'already' && (<><CheckCircle2 className="h-10 w-10 text-emerald-500 mx-auto" /><h1 className="text-xl font-semibold">Already unsubscribed</h1><p className="text-sm text-muted-foreground">This email address is already removed from our list.</p></>)}
          {state === 'invalid' && (<><XCircle className="h-10 w-10 text-destructive mx-auto" /><h1 className="text-xl font-semibold">Invalid link</h1><p className="text-sm text-muted-foreground">This unsubscribe link is invalid or expired.</p></>)}
          {state === 'error' && (<><XCircle className="h-10 w-10 text-destructive mx-auto" /><h1 className="text-xl font-semibold">Something went wrong</h1><p className="text-sm text-muted-foreground">Please try again later.</p></>)}
        </CardContent>
      </Card>
    </div>
  );
}
