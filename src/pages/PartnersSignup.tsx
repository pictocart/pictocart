import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { Sparkles, IndianRupee, Users, TrendingUp } from 'lucide-react';

const PartnersSignup = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [existing, setExisting] = useState<any>(null);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [upi, setUpi] = useState('');
  const [pan, setPan] = useState('');

  useEffect(() => {
    if (!user) return;
    setEmail(user.email ?? '');
    supabase
      .from('partners')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle()
      .then(({ data }) => setExisting(data));
  }, [user]);

  useEffect(() => {
    if (existing) navigate('/partners/dashboard', { replace: true });
  }, [existing, navigate]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      navigate(`/auth?redirect=/partners/signup`);
      return;
    }
    setLoading(true);
    try {
      // Prevent store owners (merchants) from becoming partners
      // Check by the form email — not just the logged-in user_id — so even
      // if someone types a different email, we verify that email has no store.
      const { data: targetUserId } = await supabase
        .rpc('get_user_id_by_email', { p_email: email.trim() });
      if (targetUserId) {
        const { data: existingStore } = await supabase
          .from('stores')
          .select('id')
          .eq('user_id', targetUserId)
          .limit(1)
          .maybeSingle();
        if (existingStore) {
          toast.error('This email already owns a store. A merchant account cannot also be a partner account. Please use a different email to register as a partner.');
          setLoading(false);
          return;
        }
      }

      const { data: codeRow, error: codeErr } = await supabase.rpc('generate_referral_code');
      if (codeErr) throw codeErr;
      const referral_code = codeRow as unknown as string;
      const { error } = await supabase.from('partners').insert({
        user_id: user.id,
        type: 'freelancer',
        referral_code,
        name,
        email,
        phone: phone || null,
        upi_id: upi || null,
        pan: pan || null,
      });
      if (error) throw error;
      toast.success('Welcome aboard! Your referral link is ready.');
      navigate('/partners/dashboard');
    } catch (err: any) {
      toast.error(err.message ?? 'Could not create partner profile');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-indigo-50 via-white to-violet-50">
      <div className="mx-auto max-w-5xl px-4 py-16">
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 rounded-full bg-violet-100 px-4 py-1.5 text-sm font-medium text-violet-700 mb-4">
            <Sparkles className="h-4 w-4" /> Partner Program
          </div>
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight bg-gradient-to-r from-indigo-600 to-violet-600 bg-clip-text text-transparent">
            Earn recurring income by bringing sellers to Pic To Cart
          </h1>
          <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">
            Get a unique referral link. Every seller who joins through it earns you 20% commission for 12 months.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-4 mb-12">
          {[
            { icon: IndianRupee, title: '20% recurring', body: 'Of every monthly subscription for 12 months.' },
            { icon: Users, title: 'Unlimited referrals', body: 'No cap on how many sellers you can bring.' },
            { icon: TrendingUp, title: 'Live dashboard', body: 'Track signups, MRR and pending payouts.' },
          ].map((f) => (
            <Card key={f.title} className="border-0 shadow-sm">
              <CardContent className="p-6">
                <f.icon className="h-6 w-6 text-violet-600 mb-3" />
                <div className="font-semibold mb-1">{f.title}</div>
                <p className="text-sm text-muted-foreground">{f.body}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card className="max-w-xl mx-auto shadow-lg">
          <CardHeader>
            <CardTitle>Create your partner account</CardTitle>
            <CardDescription>It takes under a minute. KYC required only before first payout.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={submit} className="space-y-4">
              <div>
                <Label>Full name</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} required />
              </div>
              <div>
                <Label>Email</Label>
                <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
              </div>
              <div>
                <Label>Phone (optional)</Label>
                <Input value={phone} onChange={(e) => setPhone(e.target.value)} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>UPI ID (optional now)</Label>
                  <Input value={upi} onChange={(e) => setUpi(e.target.value)} placeholder="name@upi" />
                </div>
                <div>
                  <Label>PAN (optional now)</Label>
                  <Input value={pan} onChange={(e) => setPan(e.target.value.toUpperCase())} maxLength={10} />
                </div>
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? 'Creating...' : user ? 'Become a Partner' : 'Sign in to continue'}
              </Button>
              {!user && (
                <p className="text-xs text-center text-muted-foreground">
                  Don't have an account?{' '}
                  <Link to="/auth" className="text-violet-600 underline">Sign up first</Link>
                </p>
              )}
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default PartnersSignup;
