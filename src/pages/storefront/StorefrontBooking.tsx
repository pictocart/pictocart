import { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useStorefront } from '@/hooks/useStorefront';
import StorefrontLayout, { resolveTheme } from '@/components/storefront/StorefrontLayout';
import { useCustomerAuth } from '@/hooks/useCustomerAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, Calendar, Clock, MapPin, Home, Building2, Video, ChevronLeft, Check } from 'lucide-react';
import { toast } from 'sonner';

type Mode = 'in_store' | 'home_visit' | 'teleconsult';
type Step = 'service' | 'provider' | 'slot' | 'details' | 'confirm' | 'done';

export default function StorefrontBooking() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { store, loading: storeLoading } = useStorefront(slug || '');
  const { user } = useCustomerAuth(slug || '');
  const theme = useMemo(() => (store ? resolveTheme(store) : null), [store]);

  const [step, setStep] = useState<Step>('service');
  const [services, setServices] = useState<any[]>([]);
  const [providers, setProviders] = useState<any[]>([]);
  const [serviceId, setServiceId] = useState<string>('');
  const [providerId, setProviderId] = useState<string>('');
  const [date, setDate] = useState<string>(() => new Date().toISOString().slice(0, 10));
  const [slots, setSlots] = useState<{ start: string; end: string }[]>([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [slotStart, setSlotStart] = useState<string>('');
  const [mode, setMode] = useState<Mode>('in_store');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [addrLine, setAddrLine] = useState('');
  const [pincode, setPincode] = useState('');
  const [special, setSpecial] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [confirmedId, setConfirmedId] = useState<string>('');

  useEffect(() => {
    if (user) {
      setName(user.user_metadata?.full_name || '');
      setPhone(user.phone || user.user_metadata?.phone || '');
      setEmail(user.user_metadata?.customer_email || user.email || '');
    }
  }, [user]);

  useEffect(() => {
    if (!store?.id) return;
    (async () => {
      const [{ data: svc }, { data: prov }] = await Promise.all([
        supabase.from('services' as any).select('*').eq('store_id', store.id).eq('is_active', true).order('sort_order'),
        supabase.from('service_providers' as any).select('*').eq('store_id', store.id).eq('is_active', true).order('sort_order'),
      ]);
      setServices((svc as any[]) ?? []);
      setProviders((prov as any[]) ?? []);
    })();
  }, [store?.id]);

  const selectedService = services.find((s) => s.id === serviceId);
  const selectedProvider = providers.find((p) => p.id === providerId);
  const eligibleProviders = useMemo(() => {
    if (!selectedService) return providers;
    const allowed: string[] = selectedService.allowed_provider_ids ?? [];
    return allowed.length ? providers.filter((p) => allowed.includes(p.id)) : providers;
  }, [providers, selectedService]);

  useEffect(() => {
    if (step !== 'slot' || !store?.id || !providerId || !serviceId || !date) return;
    setSlotsLoading(true);
    setSlots([]);
    supabase.functions
      .invoke('compute-slots', { body: { store_id: store.id, provider_id: providerId, service_id: serviceId, date } })
      .then(({ data, error }) => {
        if (error) toast.error(error.message);
        setSlots(((data as any)?.slots ?? []) as any);
      })
      .finally(() => setSlotsLoading(false));
  }, [step, store?.id, providerId, serviceId, date]);

  const submit = async () => {
    if (!store?.id || !slotStart) return;
    setSubmitting(true);
    try {
      const { data, error } = await supabase.functions.invoke('book-appointment', {
        body: {
          store_id: store.id,
          service_id: serviceId,
          provider_id: providerId,
          slot_start: slotStart,
          mode,
          customer_name: name,
          customer_phone: phone,
          customer_email: email || undefined,
          customer_user_id: user?.id,
          address: mode === 'home_visit' ? { line1: addrLine, pincode } : null,
          special_request: special || undefined,
        },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      setConfirmedId((data as any)?.appointment?.appointment_number || '');
      setStep('done');
    } catch (e: any) {
      toast.error(e.message || 'Booking failed');
    } finally {
      setSubmitting(false);
    }
  };

  if (storeLoading || !store || !theme) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin" />
      </div>
    );
  }

  const colors = theme.colors;

  return (
    <StorefrontLayout store={store}>
      <div className="max-w-2xl mx-auto px-4 py-6 pb-24">
        <div className="flex items-center gap-2 mb-4">
          <Link to={`/store/${slug}`} className="text-sm text-muted-foreground hover:underline">← Back to store</Link>
        </div>
        <h1 className="text-2xl font-bold mb-1" style={{ color: colors.primary }}>Book an Appointment</h1>
        <p className="text-sm text-muted-foreground mb-6">{store.name}</p>

        {/* Step indicator */}
        <div className="flex items-center gap-1 mb-6 text-xs">
          {(['service', 'provider', 'slot', 'details', 'confirm'] as Step[]).map((s, i) => (
            <div key={s} className={`flex-1 h-1 rounded ${step === s || ['service', 'provider', 'slot', 'details', 'confirm'].indexOf(step) > i ? '' : 'opacity-30'}`}
                 style={{ backgroundColor: colors.primary }} />
          ))}
        </div>

        {step === 'service' && (
          <div className="space-y-3">
            <h2 className="font-semibold">1. Pick a service</h2>
            {services.length === 0 && <p className="text-sm text-muted-foreground">No services available yet.</p>}
            {services.map((s) => (
              <Card key={s.id} className="p-4 cursor-pointer hover:shadow-md transition"
                    onClick={() => { setServiceId(s.id); setStep('provider'); }}>
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="font-medium">{s.name}</div>
                    <div className="text-xs text-muted-foreground">{s.duration_min} min · ₹{Number(s.price).toFixed(0)}</div>
                    {s.description && <div className="text-xs text-muted-foreground mt-1 line-clamp-2">{s.description}</div>}
                  </div>
                  <Button size="sm" style={{ backgroundColor: colors.primary }}>Select</Button>
                </div>
              </Card>
            ))}
          </div>
        )}

        {step === 'provider' && (
          <div className="space-y-3">
            <Button variant="ghost" size="sm" onClick={() => setStep('service')}><ChevronLeft className="w-4 h-4 mr-1" />Back</Button>
            <h2 className="font-semibold">2. Choose provider</h2>
            {eligibleProviders.length === 0 && <p className="text-sm text-muted-foreground">No providers available.</p>}
            {eligibleProviders.map((p) => (
              <Card key={p.id} className="p-4 cursor-pointer hover:shadow-md transition"
                    onClick={() => { setProviderId(p.id); setStep('slot'); }}>
                <div className="flex items-center gap-3">
                  {p.photo_url ? (
                    <img src={p.photo_url} alt={p.name} className="w-12 h-12 rounded-full object-cover" />
                  ) : (
                    <div className="w-12 h-12 rounded-full flex items-center justify-center font-semibold text-white" style={{ backgroundColor: colors.primary }}>
                      {p.name?.[0] ?? '?'}
                    </div>
                  )}
                  <div className="flex-1">
                    <div className="font-medium">{p.name}</div>
                    <div className="text-xs text-muted-foreground">{p.role_label || (p.specialization || []).join(', ') || '—'}</div>
                    <div className="flex gap-1 mt-1">
                      {p.accepts_home_visit && <Badge variant="outline" className="text-[10px]">Home visit</Badge>}
                      {p.accepts_teleconsult && <Badge variant="outline" className="text-[10px]">Teleconsult</Badge>}
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}

        {step === 'slot' && (
          <div className="space-y-3">
            <Button variant="ghost" size="sm" onClick={() => setStep('provider')}><ChevronLeft className="w-4 h-4 mr-1" />Back</Button>
            <h2 className="font-semibold">3. Pick a date & time</h2>
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} min={new Date().toISOString().slice(0, 10)} />
            {slotsLoading ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="w-4 h-4 animate-spin" />Loading slots…</div>
            ) : slots.length === 0 ? (
              <p className="text-sm text-muted-foreground">No slots on this day. Try another date.</p>
            ) : (
              <div className="grid grid-cols-3 gap-2">
                {slots.map((sl) => {
                  const t = new Date(sl.start).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
                  const active = slotStart === sl.start;
                  return (
                    <button key={sl.start}
                            onClick={() => { setSlotStart(sl.start); setStep('details'); }}
                            className="py-2 px-3 rounded text-sm border transition"
                            style={{ borderColor: active ? colors.primary : undefined, backgroundColor: active ? colors.primary : undefined, color: active ? '#fff' : undefined }}>
                      {t}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {step === 'details' && (
          <div className="space-y-4">
            <Button variant="ghost" size="sm" onClick={() => setStep('slot')}><ChevronLeft className="w-4 h-4 mr-1" />Back</Button>
            <h2 className="font-semibold">4. Your details</h2>

            <div className="grid grid-cols-3 gap-2">
              {([
                { v: 'in_store', label: 'In Store', icon: Building2, enabled: true },
                { v: 'home_visit', label: 'Home Visit', icon: Home, enabled: !!selectedProvider?.accepts_home_visit },
                { v: 'teleconsult', label: 'Teleconsult', icon: Video, enabled: !!selectedProvider?.accepts_teleconsult },
              ] as const).map((m) => {
                const Icon = m.icon;
                return (
                  <button key={m.v} disabled={!m.enabled} onClick={() => setMode(m.v as Mode)}
                          className="p-3 rounded border text-xs flex flex-col items-center gap-1 transition disabled:opacity-30"
                          style={{ borderColor: mode === m.v ? colors.primary : undefined, backgroundColor: mode === m.v ? `${colors.primary}10` : undefined }}>
                    <Icon className="w-4 h-4" />
                    {m.label}
                  </button>
                );
              })}
            </div>

            <div className="space-y-3">
              <div><Label>Full name *</Label><Input value={name} onChange={(e) => setName(e.target.value)} /></div>
              <div><Label>Phone *</Label><Input value={phone} onChange={(e) => setPhone(e.target.value)} /></div>
              <div><Label>Email</Label><Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} /></div>
              {mode === 'home_visit' && (
                <>
                  <div><Label>Address</Label><Textarea value={addrLine} onChange={(e) => setAddrLine(e.target.value)} rows={2} /></div>
                  <div><Label>Pincode</Label><Input value={pincode} onChange={(e) => setPincode(e.target.value)} /></div>
                </>
              )}
              <div><Label>Special request (optional)</Label><Textarea value={special} onChange={(e) => setSpecial(e.target.value)} rows={2} placeholder="e.g. wheelchair access, female stylist only" /></div>
            </div>

            <Button onClick={() => setStep('confirm')} disabled={!name || !phone || (mode === 'home_visit' && (!addrLine || !pincode))}
                    className="w-full" style={{ backgroundColor: colors.primary }}>
              Review booking
            </Button>
          </div>
        )}

        {step === 'confirm' && selectedService && selectedProvider && (
          <div className="space-y-3">
            <Button variant="ghost" size="sm" onClick={() => setStep('details')}><ChevronLeft className="w-4 h-4 mr-1" />Back</Button>
            <h2 className="font-semibold">5. Confirm</h2>
            <Card className="p-4 space-y-2 text-sm">
              <div className="flex items-center gap-2"><Calendar className="w-4 h-4 text-muted-foreground" />{new Date(slotStart).toLocaleString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</div>
              <div><span className="text-muted-foreground">Service:</span> {selectedService.name} ({selectedService.duration_min} min)</div>
              <div><span className="text-muted-foreground">Provider:</span> {selectedProvider.name}</div>
              <div><span className="text-muted-foreground">Mode:</span> {mode.replace('_', ' ')}</div>
              <div className="border-t pt-2 flex justify-between"><span>Price</span><span>₹{Number(selectedService.price).toFixed(0)}</span></div>
              {mode === 'home_visit' && Number(selectedService.home_visit_addon) > 0 && (
                <div className="flex justify-between"><span>Home visit fee</span><span>₹{Number(selectedService.home_visit_addon).toFixed(0)}</span></div>
              )}
              <div className="flex justify-between font-semibold"><span>Total (incl. GST)</span><span>₹{(Number(selectedService.price) + (mode === 'home_visit' ? Number(selectedService.home_visit_addon || 0) : 0)).toFixed(0)}</span></div>
            </Card>
            <Button onClick={submit} disabled={submitting} className="w-full" style={{ backgroundColor: colors.primary }}>
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Confirm booking'}
            </Button>
            <p className="text-xs text-muted-foreground text-center">Payment is collected at the appointment unless the store contacts you.</p>
          </div>
        )}

        {step === 'done' && (
          <Card className="p-6 text-center space-y-3">
            <div className="w-16 h-16 mx-auto rounded-full flex items-center justify-center" style={{ backgroundColor: `${colors.primary}20` }}>
              <Check className="w-8 h-8" style={{ color: colors.primary }} />
            </div>
            <h2 className="text-xl font-bold">Booking requested</h2>
            <p className="text-sm text-muted-foreground">Reference: <span className="font-mono">{confirmedId}</span></p>
            <p className="text-sm">{store.name} will confirm shortly. You will receive an email once confirmed.</p>
            <Button onClick={() => navigate(`/store/${slug}`)} variant="outline">Back to store</Button>
          </Card>
        )}
      </div>
    </StorefrontLayout>
  );
}
