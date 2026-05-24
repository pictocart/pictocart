import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar, Clock, User, Phone, Home, Video } from 'lucide-react';
import PageHeader from '@/components/ui/PageHeader';
import { useAppointments, useProviders, useIsHealthcareStore } from '@/hooks/useServiceIndustry';

const STATUS_COLOR: Record<string, string> = {
  pending: 'bg-amber-500/15 text-amber-700',
  confirmed: 'bg-blue-500/15 text-blue-700',
  en_route: 'bg-indigo-500/15 text-indigo-700',
  in_progress: 'bg-purple-500/15 text-purple-700',
  completed: 'bg-emerald-500/15 text-emerald-700',
  cancelled: 'bg-muted text-muted-foreground',
  no_show: 'bg-destructive/15 text-destructive',
};

const NEXT_STATUS: Record<string, string[]> = {
  pending: ['confirmed', 'cancelled'],
  confirmed: ['in_progress', 'en_route', 'cancelled', 'no_show'],
  en_route: ['in_progress', 'cancelled'],
  in_progress: ['completed', 'cancelled'],
  completed: [],
  cancelled: [],
  no_show: [],
};

const fmt = (iso: string) => {
  const d = new Date(iso);
  return d.toLocaleString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
};

export default function Appointments() {
  const isHealth = useIsHealthcareStore();
  const today = useMemo(() => {
    const d = new Date(); d.setHours(0,0,0,0); return d.toISOString();
  }, []);
  const future = useMemo(() => {
    const d = new Date(); d.setDate(d.getDate() + 60); return d.toISOString();
  }, []);
  const { appointments, loading, updateStatus } = useAppointments(today, future);
  const { providers } = useProviders();
  const [filter, setFilter] = useState<string>('all');

  const providerName = (id: string) => providers.find((p: any) => p.id === id)?.name ?? '—';

  const filtered = filter === 'all' ? appointments : appointments.filter((a: any) => a.status === filter);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Appointments"
        subtitle={isHealth ? 'Upcoming consultations and visits' : 'Upcoming bookings'}
        actions={
          <Select value={filter} onValueChange={setFilter}>
            <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="confirmed">Confirmed</SelectItem>
              <SelectItem value="in_progress">In progress</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>
        }
      />

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : filtered.length === 0 ? (
        <Card className="p-10 text-center">
          <Calendar className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
          <p className="text-sm text-muted-foreground">No appointments in this view.</p>
        </Card>
      ) : (
        <div className="space-y-2">
          {filtered.map((a: any) => (
            <Card key={a.id} className="p-4">
              <div className="flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
                <div className="space-y-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold">{a.service_name_snapshot ?? 'Service'}</span>
                    <Badge className={STATUS_COLOR[a.status]} variant="secondary">{a.status.replace('_',' ')}</Badge>
                    {a.mode === 'home_visit' && <Badge variant="outline"><Home className="h-3 w-3 mr-1" />Home</Badge>}
                    {a.mode === 'teleconsult' && <Badge variant="outline"><Video className="h-3 w-3 mr-1" />Tele</Badge>}
                  </div>
                  <div className="text-sm text-muted-foreground flex flex-wrap gap-x-4 gap-y-1">
                    <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" />{fmt(a.slot_start)}</span>
                    <span className="flex items-center gap-1"><User className="h-3.5 w-3.5" />{a.customer_name || 'Walk-in'}</span>
                    {a.customer_phone && <span className="flex items-center gap-1"><Phone className="h-3.5 w-3.5" />{a.customer_phone}</span>}
                    {a.provider_id && <span>· with {providerName(a.provider_id)}</span>}
                  </div>
                  {a.special_request && (
                    <p className="text-xs text-amber-700 bg-amber-50 dark:bg-amber-950/20 rounded px-2 py-1 inline-block">
                      ⚠ {a.special_request}
                    </p>
                  )}
                </div>
                <div className="flex flex-wrap gap-2 shrink-0">
                  <div className="text-right text-sm font-semibold">₹{Number(a.total).toFixed(0)}</div>
                  {NEXT_STATUS[a.status]?.map((s) => (
                    <Button key={s} size="sm" variant={s === 'completed' ? 'default' : 'outline'} onClick={() => updateStatus({ id: a.id, status: s })}>
                      {s.replace('_', ' ')}
                    </Button>
                  ))}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
