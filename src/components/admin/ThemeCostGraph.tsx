import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, ReferenceLine } from 'recharts';
import { TrendingDown, Sparkles } from 'lucide-react';

const ThemeCostGraph = () => {
  const { data, isLoading } = useQuery({
    queryKey: ['theme-generation-metrics'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('theme_generation_metrics')
        .select('*')
        .order('generated_at', { ascending: true });
      if (error) throw error;
      return data || [];
    },
  });

  const points = (data || []).map((row, i) => ({
    n: i + 1,
    cost: Number(row.cost_inr || 0),
    tokens: row.tokens_used || 0,
    reuse: Number(row.reuse_ratio || 0),
    label: new Date(row.generated_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }),
  }));

  const total = points.reduce((s, p) => s + p.cost, 0);
  const avg = points.length ? total / points.length : 0;
  const first = points[0]?.cost || 0;
  const last = points[points.length - 1]?.cost || 0;
  const drop = first > 0 ? Math.round(((first - last) / first) * 100) : 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <TrendingDown className="h-4 w-4 text-emerald-600" /> Token Cost Optimization
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          Each generated theme costs less than the last — proof of the reuse flywheel.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Stat label="Themes generated" value={String(points.length)} />
          <Stat label="Total AI spend" value={`₹${total.toFixed(2)}`} />
          <Stat label="Avg / theme" value={`₹${avg.toFixed(2)}`} />
          <Stat
            label="Cost reduction"
            value={`${drop}%`}
            accent={drop >= 0 ? 'text-emerald-600' : 'text-destructive'}
          />
        </div>
        {isLoading ? (
          <p className="text-sm text-muted-foreground py-12 text-center">Loading…</p>
        ) : points.length === 0 ? (
          <div className="text-center py-16 text-sm text-muted-foreground">
            <Sparkles className="h-10 w-10 mx-auto opacity-30 mb-2" />
            No themes shipped yet. Once the Master Bazaar agent delivers themes, the curve will appear here.
          </div>
        ) : (
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={points}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                <XAxis dataKey="n" tick={{ fontSize: 11 }} label={{ value: 'Theme #', position: 'insideBottom', offset: -5, fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} label={{ value: '₹ cost', angle: -90, position: 'insideLeft', fontSize: 11 }} />
                <Tooltip
                  formatter={(v: any, name: string) =>
                    name === 'cost' ? [`₹${Number(v).toFixed(2)}`, 'Cost'] : [v, name]
                  }
                />
                <ReferenceLine y={avg} stroke="#10b981" strokeDasharray="3 3" label={{ value: `avg ₹${avg.toFixed(1)}`, fontSize: 10, fill: '#10b981' }} />
                <Line type="monotone" dataKey="cost" stroke="#f97316" strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

const Stat = ({ label, value, accent }: { label: string; value: string; accent?: string }) => (
  <div className="rounded-lg bg-muted/50 p-3">
    <p className="text-[11px] text-muted-foreground uppercase tracking-wide">{label}</p>
    <p className={`text-lg font-bold ${accent || ''}`}>{value}</p>
  </div>
);

export default ThemeCostGraph;
