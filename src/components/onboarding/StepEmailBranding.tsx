import { useState, useEffect } from 'react';
import { Mail, CheckCircle2, Sparkles, Loader2, FileText, Truck, Package, UserPlus, Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import type { OnboardingData } from '@/pages/Onboarding';

interface Props {
  data: OnboardingData;
  setData: React.Dispatch<React.SetStateAction<OnboardingData>>;
  storeId: string | undefined;
}

const TEMPLATE_TYPES = [
  { key: 'order_confirmed', label: 'Order Confirmed', icon: CheckCircle2, desc: 'Sent when a customer places an order' },
  { key: 'order_shipped', label: 'Order Shipped', icon: Truck, desc: 'Sent when you ship an order' },
  { key: 'order_delivered', label: 'Order Delivered', icon: Package, desc: 'Sent when the order is delivered' },
  { key: 'new_order_seller', label: 'New Order Alert', icon: Bell, desc: 'You receive this for every new order' },
  { key: 'welcome_customer', label: 'Welcome Email', icon: UserPlus, desc: 'Sent to first-time buyers' },
];

const StepEmailBranding = ({ data, setData, storeId }: Props) => {
  const [generating, setGenerating] = useState(false);
  const [generated, setGenerated] = useState(false);
  const [templates, setTemplates] = useState<Record<string, any> | null>(null);
  const [previewKey, setPreviewKey] = useState<string | null>(null);

  // Check if templates already exist
  useEffect(() => {
    if (!storeId) return;
    const check = async () => {
      const { data: existing } = await supabase
        .from('store_email_templates')
        .select('templates, generated_at')
        .eq('store_id', storeId)
        .maybeSingle();
      if (existing?.templates) {
        setTemplates(existing.templates as any);
        setGenerated(true);
        setData(d => ({ ...d, emailTemplatesGenerated: true }));
      }
    };
    check();
  }, [storeId]);

  const handleGenerate = async () => {
    if (!storeId) {
      toast.error('Please complete previous steps first');
      return;
    }
    setGenerating(true);
    try {
      const { data: result, error } = await supabase.functions.invoke('generate-email-templates', {
        body: { store_id: storeId },
      });
      if (error) throw error;
      if (result?.templates) {
        setTemplates(result.templates);
        setGenerated(true);
        setData(d => ({ ...d, emailTemplatesGenerated: true }));
        toast.success('Email templates generated! 🎨');
      } else {
        throw new Error(result?.error || 'Generation failed');
      }
    } catch (e: any) {
      console.error('Template generation failed:', e);
      toast.error(e.message || 'Failed to generate templates');
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="text-center space-y-2">
        <div className="mx-auto h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center">
          <Mail className="h-7 w-7 text-primary" />
        </div>
        <h2 className="text-xl font-bold">Brand Your Emails</h2>
        <p className="text-sm text-muted-foreground max-w-md mx-auto">
          Your customers will receive emails that look like they come directly from <strong>{data.storeName || 'your store'}</strong> — with your logo, colors, and brand identity. No third-party branding, ever.
        </p>
      </div>

      {/* Template type cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {TEMPLATE_TYPES.map((t) => {
          const Icon = t.icon;
          const isReady = generated && templates?.[t.key];
          return (
            <Card
              key={t.key}
              className={cn(
                'cursor-pointer transition-all border',
                previewKey === t.key ? 'ring-2 ring-primary border-primary' : '',
                isReady ? 'border-green-200 bg-green-50/50 dark:border-green-900 dark:bg-green-950/20' : ''
              )}
              onClick={() => isReady && setPreviewKey(previewKey === t.key ? null : t.key)}
            >
              <CardContent className="p-3 flex items-start gap-3">
                <div className={cn(
                  'h-9 w-9 rounded-lg flex items-center justify-center shrink-0',
                  isReady ? 'bg-green-100 dark:bg-green-900' : 'bg-muted'
                )}>
                  {isReady ? <CheckCircle2 className="h-4 w-4 text-green-600" /> : <Icon className="h-4 w-4 text-muted-foreground" />}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium">{t.label}</p>
                  <p className="text-xs text-muted-foreground">{t.desc}</p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Preview iframe */}
      {previewKey && templates?.[previewKey]?.html && (
        <Card className="overflow-hidden">
          <div className="bg-muted/50 border-b px-3 py-1.5 flex items-center gap-2">
            <FileText className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-xs font-medium">
              Preview: {TEMPLATE_TYPES.find(t => t.key === previewKey)?.label}
            </span>
            <span className="ml-auto text-[10px] text-muted-foreground">
              Subject: {templates[previewKey].subject}
            </span>
          </div>
          <iframe
            srcDoc={templates[previewKey].html}
            title="Email Preview"
            className="w-full h-[300px] border-0 bg-white"
            sandbox="allow-same-origin"
          />
        </Card>
      )}

      {/* Generate button */}
      {!generated ? (
        <Button
          onClick={handleGenerate}
          disabled={generating || !storeId}
          className="w-full h-12 text-base gap-2"
          size="lg"
        >
          {generating ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin" />
              Generating your branded templates...
            </>
          ) : (
            <>
              <Sparkles className="h-5 w-5" />
              Generate My Email Templates
            </>
          )}
        </Button>
      ) : (
        <div className="text-center space-y-2">
          <div className="flex items-center justify-center gap-2 text-green-600">
            <CheckCircle2 className="h-5 w-5" />
            <span className="font-medium">All 5 templates ready!</span>
          </div>
          <p className="text-xs text-muted-foreground">
            Tap any template above to preview it. You can regenerate anytime from your dashboard.
          </p>
          <Button variant="outline" size="sm" onClick={handleGenerate} disabled={generating} className="gap-1">
            {generating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
            Regenerate
          </Button>
        </div>
      )}
    </div>
  );
};

export default StepEmailBranding;
