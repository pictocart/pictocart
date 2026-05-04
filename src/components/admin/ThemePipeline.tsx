import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar, Wrench, CheckCircle2, Clock } from 'lucide-react';
import { toast } from 'sonner';

interface CalendarRow {
  id: string;
  category: string;
  archetype: string | null;
  hero_style: string | null;
  planned_for: string;
  status: 'planned' | 'generating' | 'shipped';
  expected_cost_inr: number;
  theme_pack_id: string | null;
  research_brief: any;
}

const ThemePipeline = () => {
  const qc = useQueryClient();
  const { data: rows = [], isLoading } = useQuery({
    queryKey: ['theme-release-calendar'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('theme_release_calendar')
        .select('*')
        .order('planned_for', { ascending: true });
      if (error) throw error;
      return (data || []) as CalendarRow[];
    },
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase.from('theme_release_calendar').update({ status }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['theme-release-calendar'] });
      toast.success('Status updated');
    },
  });

  const cols: Array<{ key: CalendarRow['status']; label: string; icon: any; color: string }> = [
    { key: 'planned', label: 'Planned', icon: Clock, color: 'bg-blue-50 border-blue-200' },
    { key: 'generating', label: 'Generating', icon: Wrench, color: 'bg-amber-50 border-amber-200' },
    { key: 'shipped', label: 'Shipped', icon: CheckCircle2, color: 'bg-emerald-50 border-emerald-200' },
  ];

  if (isLoading) return <p className="text-sm text-muted-foreground py-12 text-center">Loading…</p>;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Calendar className="h-4 w-4" /> Monthly Release Pipeline
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          Themes scheduled by the Master Bazaar agent. Drag-equivalent via the status buttons.
        </p>
      </CardHeader>
      <CardContent>
        {rows.length === 0 ? (
          <div className="text-center py-12 text-sm text-muted-foreground">
            No releases planned yet — the agent ships one calendar per month.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {cols.map((col) => {
              const items = rows.filter((r) => r.status === col.key);
              const Icon = col.icon;
              return (
                <div key={col.key} className={`rounded-lg border p-3 space-y-2 ${col.color}`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-sm font-semibold">
                      <Icon className="h-4 w-4" /> {col.label}
                    </div>
                    <Badge variant="secondary" className="text-[10px]">{items.length}</Badge>
                  </div>
                  <div className="space-y-2">
                    {items.map((r) => (
                      <div key={r.id} className="rounded-md bg-background border p-2 space-y-1">
                        <div className="flex items-center justify-between">
                          <p className="text-xs font-semibold capitalize">{r.category}</p>
                          <span className="text-[10px] text-muted-foreground">
                            {new Date(r.planned_for).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                          </span>
                        </div>
                        {r.archetype && <p className="text-[11px] text-muted-foreground">{r.archetype}</p>}
                        <div className="flex items-center justify-between pt-1">
                          <span className="text-[10px] text-muted-foreground">~₹{Number(r.expected_cost_inr).toFixed(1)}</span>
                          <div className="flex gap-1">
                            {cols
                              .filter((c) => c.key !== r.status)
                              .map((c) => (
                                <Button
                                  key={c.key}
                                  size="sm"
                                  variant="outline"
                                  className="h-6 px-1.5 text-[10px]"
                                  onClick={() => updateStatus.mutate({ id: r.id, status: c.key })}
                                >
                                  → {c.label}
                                </Button>
                              ))}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ThemePipeline;
