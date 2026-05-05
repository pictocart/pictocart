import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Activity, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

interface ErrorLog {
  id: string;
  message: string;
  path: string | null;
  url: string | null;
  user_agent: string | null;
  level: string;
  stack: string | null;
  created_at: string;
}

const AdminHealth = () => {
  const qc = useQueryClient();

  const { data: logs = [], isLoading } = useQuery({
    queryKey: ['client-error-logs'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('client_error_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);
      if (error) throw error;
      return data as ErrorLog[];
    },
    refetchInterval: 30_000,
  });

  const counts = logs.reduce((acc, l) => {
    const day = l.created_at.slice(0, 10);
    acc[day] = (acc[day] ?? 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const purge = useMutation({
    mutationFn: async () => {
      const cutoff = new Date(Date.now() - 30 * 86_400_000).toISOString();
      const { error } = await supabase.from('client_error_logs').delete().lt('created_at', cutoff);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['client-error-logs'] });
      toast.success('Old logs purged');
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Activity className="h-6 w-6" /> Platform Health
          </h1>
          <p className="text-sm text-muted-foreground">Last 100 frontend errors captured from merchant dashboards and storefronts.</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => purge.mutate()} className="gap-2">
          <Trash2 className="h-4 w-4" /> Purge &gt; 30d
        </Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="p-4">
          <div className="text-xs text-muted-foreground">Errors (100 most recent)</div>
          <div className="text-2xl font-bold mt-1">{logs.length}</div>
        </Card>
        <Card className="p-4">
          <div className="text-xs text-muted-foreground">Today</div>
          <div className="text-2xl font-bold mt-1">{counts[new Date().toISOString().slice(0, 10)] ?? 0}</div>
        </Card>
        <Card className="p-4">
          <div className="text-xs text-muted-foreground">Unique paths</div>
          <div className="text-2xl font-bold mt-1">{new Set(logs.map((l) => l.path)).size}</div>
        </Card>
        <Card className="p-4">
          <div className="text-xs text-muted-foreground">Unique messages</div>
          <div className="text-2xl font-bold mt-1">{new Set(logs.map((l) => l.message)).size}</div>
        </Card>
      </div>

      <Card className="overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/40">
            <tr className="text-left">
              <th className="px-4 py-2">When</th>
              <th className="px-4 py-2">Level</th>
              <th className="px-4 py-2">Path</th>
              <th className="px-4 py-2">Message</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && <tr><td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">Loading…</td></tr>}
            {!isLoading && logs.length === 0 && (
              <tr><td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">All clear — no errors in the last batch. 🎉</td></tr>
            )}
            {logs.map((l) => (
              <tr key={l.id} className="border-t align-top hover:bg-muted/30">
                <td className="px-4 py-2 text-xs text-muted-foreground whitespace-nowrap">
                  {new Date(l.created_at).toLocaleString()}
                </td>
                <td className="px-4 py-2">
                  <Badge variant={l.level === 'error' ? 'destructive' : 'secondary'}>{l.level}</Badge>
                </td>
                <td className="px-4 py-2 text-xs font-mono">{l.path ?? '—'}</td>
                <td className="px-4 py-2">
                  <div className="font-medium break-all">{l.message}</div>
                  {l.stack && (
                    <details className="mt-1">
                      <summary className="text-xs text-muted-foreground cursor-pointer">Stack</summary>
                      <pre className="mt-1 text-[10px] bg-muted p-2 rounded overflow-x-auto max-h-40">{l.stack}</pre>
                    </details>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
};

export default AdminHealth;
