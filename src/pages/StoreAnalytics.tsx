import { useState } from 'react';
import { useStore } from '@/hooks/useStore';
import { useProducts } from '@/hooks/useProducts';
import { useBlogPosts } from '@/hooks/useBlogPosts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { Sparkles, Loader2, TrendingUp, AlertTriangle, CheckCircle2, BarChart3 } from 'lucide-react';
import { toast } from 'sonner';
import PremiumGate from '@/components/PremiumGate';
import ConversionFunnel from '@/components/dashboard/ConversionFunnel';

interface EngagementReport {
  score: number;
  strengths: string[];
  improvements: string[];
  product_tips: string[];
}

const StoreAnalytics = () => {
  const { store } = useStore();
  const { products } = useProducts();
  const { data: posts = [] } = useBlogPosts(store?.id);
  const [report, setReport] = useState<EngagementReport | null>(null);
  const [loading, setLoading] = useState(false);

  const generateReport = async () => {
    if (!store) return;
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('store-engagement', {
        body: {
          store_name: store.name,
          category: store.category,
          product_count: products.length,
          blog_count: posts.length,
          has_hero: !!(store.settings as any)?.homepage_sections?.some((s: any) => s.type === 'hero'),
          has_footer: !!(store.settings as any)?.footer?.custom_text,
          has_seo: !!(store.settings as any)?.seo?.meta_title,
          products_without_images: products.filter((p) => !p.images?.length).length,
          products_without_description: products.filter((p) => !p.description).length,
        },
      });
      if (error) throw error;
      setReport(data);
    } catch {
      toast.error('Failed to generate report');
    }
    setLoading(false);
  };

  return (
    <PremiumGate feature="analytics" fallbackMessage="Upgrade to Premium for AI-powered store analytics and engagement insights.">
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Store Analytics</h1>
          <p className="text-sm text-muted-foreground">AI-powered engagement insights for your store</p>
        </div>
        <Button onClick={generateReport} disabled={loading}>
          {loading ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Sparkles className="h-4 w-4 mr-1" />}
          {loading ? 'Analyzing...' : 'Generate Report'}
        </Button>
      </div>

      {/* Quick stats */}
      <div data-tour="analytics-overview" className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Products', value: products.length, icon: BarChart3 },
          { label: 'Blog Posts', value: posts.length, icon: TrendingUp },
          { label: 'Missing Images', value: products.filter((p) => !p.images?.length).length, icon: AlertTriangle },
          { label: 'Published', value: store?.is_published ? 'Yes' : 'No', icon: CheckCircle2 },
        ].map((stat) => (
          <Card key={stat.label}>
            <CardContent className="p-4 text-center">
              <stat.icon className="h-5 w-5 mx-auto mb-2 text-muted-foreground" />
              <p className="text-2xl font-bold">{stat.value}</p>
              <p className="text-xs text-muted-foreground">{stat.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {store && <ConversionFunnel storeId={store.id} days={30} />}

      {report && (
        <>
          {/* Score */}
          <Card>
            <CardContent className="p-6 text-center">
              <p className="text-sm text-muted-foreground mb-2">Engagement Score</p>
              <p className="text-5xl font-bold mb-3" style={{ color: report.score >= 70 ? '#16a34a' : report.score >= 40 ? '#f59e0b' : '#ef4444' }}>
                {report.score}
              </p>
              <Progress value={report.score} className="h-3 max-w-xs mx-auto" />
              <p className="text-xs text-muted-foreground mt-2">
                {report.score >= 70 ? 'Great! Your store is well-optimized' : report.score >= 40 ? 'Good start, but room for improvement' : 'Needs attention to improve engagement'}
              </p>
            </CardContent>
          </Card>

          {/* Strengths */}
          <Card>
            <CardHeader><CardTitle className="text-base flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-green-600" /> Strengths</CardTitle></CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {report.strengths.map((s, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm">
                    <Badge variant="outline" className="text-green-600 border-green-200 shrink-0 mt-0.5">✓</Badge>
                    {s}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          {/* Improvements */}
          <Card>
            <CardHeader><CardTitle className="text-base flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-amber-500" /> Improvements</CardTitle></CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {report.improvements.map((s, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm">
                    <Badge variant="outline" className="text-amber-600 border-amber-200 shrink-0 mt-0.5">!</Badge>
                    {s}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          {/* Product tips */}
          {report.product_tips?.length > 0 && (
            <Card>
              <CardHeader><CardTitle className="text-base">Product Recommendations</CardTitle></CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {report.product_tips.map((s, i) => (
                    <li key={i} className="text-sm text-muted-foreground">• {s}</li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}
        </>
      )}

      {!report && !loading && (
        <Card>
          <CardContent className="py-16 text-center">
            <Sparkles className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
            <h3 className="font-semibold mb-1">Get AI-Powered Insights</h3>
            <p className="text-sm text-muted-foreground mb-4">Click "Generate Report" to analyze your store and get personalized recommendations</p>
          </CardContent>
        </Card>
      )}
    </div>
    </PremiumGate>
  );
};

export default StoreAnalytics;
