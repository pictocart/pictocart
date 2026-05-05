import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Pause, Play, Gauge } from 'lucide-react';
import { toast } from 'sonner';

interface Budget {
  id: number;
  is_enabled: boolean;
  hourly_inr_cap: number;
  daily_inr_cap: number;
  per_job_inr_estimate: number;
  current_hour_spent_inr: number;
  current_day_spent_inr: number;
  paused_until: string | null;
}

export const ProvisioningBudgetPanel = () => {
  const qc = useQueryClient();
  const { data: budget } = useQuery({
    queryKey: ['provisioning-budget'],
    queryFn: async () => {
      const { data, error } = await supabase.from('provisioning_budget').select('*').eq('id', 1).maybeSingle();
      if (error) throw error;
      return data as Budget | null;
    },
    refetchInterval: 30_000,
  });

  const [form, setForm] = useState<Partial<Budget>>({});
  useEffect(() => { if (budget) setForm(budget); }, [budget]);

  const save = useMutation({
    mutationFn: async (patch: Partial<Budget>) => {
      const { error } = await supabase.from('provisioning_budget').update({
        ...patch, updated_at: new Date().toISOString(),
      }).eq('id', 1);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['provisioning-budget'] });
      toast.success('Budget updated');
    },
    onError: (e: any) => toast.error(e?.message ?? 'Save failed'),
  });

  if (!budget) return null;

  const hourPct = Math.min(100, Math.round((Number(budget.current_hour_spent_inr) / Math.max(1, Number(budget.hourly_inr_cap))) * 100));
  const dayPct = Math.min(100, Math.round((Number(budget.current_day_spent_inr) / Math.max(1, Number(budget.daily_inr_cap))) * 100));
  const isPaused = budget.paused_until && new Date(budget.paused_until) > new Date();

  return (
    <Card className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Gauge className="h-5 w-5 text-primary" />
          <h2 className="font-semibold">Runner Budget</h2>
          {!budget.is_enabled && <Badge variant="destructive">DISABLED</Badge>}
          {isPaused && <Badge variant="secondary">Paused</Badge>}
        </div>
        <div className="flex items-center gap-2">
          <Label className="text-xs text-muted-foreground">Enabled</Label>
          <Switch checked={budget.is_enabled} onCheckedChange={(v) => save.mutate({ is_enabled: v })} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 text-xs">
        <div>
          <div className="flex justify-between mb-1"><span>Hour spend</span><span>₹{Number(budget.current_hour_spent_inr).toFixed(2)} / ₹{Number(budget.hourly_inr_cap)}</span></div>
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div className={`h-full transition-all ${hourPct >= 100 ? 'bg-destructive' : 'bg-primary'}`} style={{ width: `${hourPct}%` }} />
          </div>
        </div>
        <div>
          <div className="flex justify-between mb-1"><span>Day spend</span><span>₹{Number(budget.current_day_spent_inr).toFixed(2)} / ₹{Number(budget.daily_inr_cap)}</span></div>
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div className={`h-full transition-all ${dayPct >= 100 ? 'bg-destructive' : 'bg-primary'}`} style={{ width: `${dayPct}%` }} />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div>
          <Label className="text-xs">Hourly cap (₹)</Label>
          <Input type="number" value={form.hourly_inr_cap ?? ''} onChange={(e) => setForm({ ...form, hourly_inr_cap: Number(e.target.value) })} />
        </div>
        <div>
          <Label className="text-xs">Daily cap (₹)</Label>
          <Input type="number" value={form.daily_inr_cap ?? ''} onChange={(e) => setForm({ ...form, daily_inr_cap: Number(e.target.value) })} />
        </div>
        <div>
          <Label className="text-xs">Per-job estimate (₹)</Label>
          <Input type="number" step="0.1" value={form.per_job_inr_estimate ?? ''} onChange={(e) => setForm({ ...form, per_job_inr_estimate: Number(e.target.value) })} />
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button size="sm" onClick={() => save.mutate({
          hourly_inr_cap: form.hourly_inr_cap, daily_inr_cap: form.daily_inr_cap, per_job_inr_estimate: form.per_job_inr_estimate,
        })}>Save caps</Button>
        {isPaused ? (
          <Button size="sm" variant="outline" className="gap-1" onClick={() => save.mutate({ paused_until: null })}>
            <Play className="h-3 w-3" /> Resume now
          </Button>
        ) : (
          <Button size="sm" variant="outline" className="gap-1" onClick={() => save.mutate({
            paused_until: new Date(Date.now() + 60 * 60_000).toISOString(),
          })}>
            <Pause className="h-3 w-3" /> Pause 1 hour
          </Button>
        )}
        <Button size="sm" variant="ghost" onClick={() => save.mutate({
          current_hour_spent_inr: 0, current_day_spent_inr: 0,
          hour_window_started_at: new Date().toISOString(),
          day_window_started_at: new Date().toISOString(),
        } as any)}>Reset counters</Button>
      </div>
      <p className="text-xs text-muted-foreground">
        Runner ticks every 5 minutes. When a cap is hit it skips silently until the window rolls over or you resume.
      </p>
    </Card>
  );
};
