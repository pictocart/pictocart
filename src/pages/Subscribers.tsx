import { useState } from 'react';
import { useStore } from '@/hooks/useStore';
import { useNewsletterSubscribers } from '@/hooks/useNewsletterSubscribers';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, Mail, Send, Sparkles } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import PremiumGate from '@/components/PremiumGate';

const Subscribers = () => {
  const { store } = useStore();
  const { data: subscribers = [], isLoading } = useNewsletterSubscribers(store?.id);

  // Compose state
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);
  const [aiTopic, setAiTopic] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);

  const generateSubjects = async () => {
    if (!aiTopic.trim() && !body.trim()) {
      toast.error('Add a topic or some body content first');
      return;
    }
    setAiLoading(true);
    try {
      // Reuse the generic generate-blog endpoint to get subject ideas
      const { data, error } = await supabase.functions.invoke('generate-blog', {
        body: {
          topic: `Generate 5 short, catchy email subject lines (max 55 chars each) for an email about: ${aiTopic || body.slice(0, 200)}. Return them as JSON: { "body": "1) ...\\n2) ...\\n3) ...\\n4) ...\\n5) ...", "seo_title": "first subject", "seo_description": "...", "tags": [], "image_prompt": "" }`,
          store_name: store?.name,
          category: store?.category,
        },
      });
      if (error) throw error;
      const text: string = data?.body || data?.seo_title || '';
      const ideas = text
        .split('\n')
        .map((l) => l.replace(/^\s*\d+[\.\)]\s*/, '').replace(/^[-*]\s*/, '').trim())
        .filter((l) => l.length > 5 && l.length < 100)
        .slice(0, 5);
      if (ideas.length === 0 && data?.seo_title) ideas.push(data.seo_title);
      setSuggestions(ideas);
      if (ideas.length === 0) toast.error('Could not generate subjects');
    } catch (e: any) {
      toast.error(e.message || 'AI generation failed');
    } finally {
      setAiLoading(false);
    }
  };

  const sendBroadcast = async () => {
    if (!subject.trim() || !body.trim()) {
      toast.error('Subject and body are required');
      return;
    }
    if (subscribers.length === 0) {
      toast.error('No subscribers to send to');
      return;
    }
    if (!confirm(`Send to ${subscribers.length} subscribers?`)) return;
    setSending(true);
    try {
      const html = `<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;max-width:600px;margin:0 auto;padding:32px 24px;color:#1a1a1a;">
        <h2 style="margin:0 0 16px;font-size:22px;">${subject}</h2>
        <div style="font-size:15px;line-height:1.6;white-space:pre-wrap;">${body.replace(/</g, '&lt;')}</div>
        <p style="margin-top:32px;color:#888;font-size:12px;text-align:center;">— ${store?.name}</p>
      </div>`;
      const { data, error } = await supabase.functions.invoke('send-newsletter', {
        body: { mode: 'broadcast', store_id: store!.id, subject, html },
      });
      if (error) throw error;
      toast.success(`Sent ${data?.sent ?? 0} of ${data?.total ?? subscribers.length} emails`);
      setSubject('');
      setBody('');
      setSuggestions([]);
    } catch (e: any) {
      toast.error(e.message || 'Failed to send');
    } finally {
      setSending(false);
    }
  };

  return (
    <PremiumGate feature="blog" fallbackMessage="Upgrade to Premium to send newsletter campaigns to your subscribers.">
    <div className="space-y-6 pb-20 md:pb-0">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Newsletter</h1>
        <p className="text-sm text-muted-foreground">{subscribers.length} subscriber{subscribers.length === 1 ? '' : 's'}</p>
      </div>

      <Tabs defaultValue="compose">
        <TabsList>
          <TabsTrigger value="compose">Compose</TabsTrigger>
          <TabsTrigger value="subscribers">Subscribers</TabsTrigger>
        </TabsList>

        <TabsContent value="compose" className="space-y-4 pt-4">
          <Card>
            <CardContent className="pt-6 space-y-4">
              <div className="space-y-1.5">
                <Label className="text-xs">AI Subject Helper</Label>
                <div className="flex gap-2">
                  <Input
                    placeholder="What is this email about? (e.g. Diwali sale 30% off)"
                    value={aiTopic}
                    onChange={(e) => setAiTopic(e.target.value)}
                  />
                  <Button type="button" variant="outline" size="sm" onClick={generateSubjects} disabled={aiLoading}>
                    {aiLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Sparkles className="h-4 w-4 mr-1" /> Suggest</>}
                  </Button>
                </div>
                {suggestions.length > 0 && (
                  <div className="flex flex-wrap gap-2 pt-2">
                    {suggestions.map((s, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => setSubject(s)}
                        className="text-xs px-2 py-1 rounded-full border bg-muted hover:bg-accent"
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">Subject *</Label>
                <Input
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="A catchy subject line"
                  maxLength={120}
                />
                <p className="text-[11px] text-muted-foreground">{subject.length}/120</p>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">Message *</Label>
                <Textarea
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  placeholder="Write your message here. Plain text — line breaks are preserved."
                  rows={10}
                />
              </div>

              <div className="flex justify-end">
                <Button onClick={sendBroadcast} disabled={sending || subscribers.length === 0}>
                  {sending ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Sending…</> : <><Send className="h-4 w-4 mr-2" /> Send to {subscribers.length}</>}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="subscribers" className="pt-4">
          {isLoading ? (
            <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin" /></div>
          ) : subscribers.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Mail className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
                <h3 className="font-semibold mb-1">No subscribers yet</h3>
                <p className="text-sm text-muted-foreground">Add a Newsletter section to your homepage to start collecting emails</p>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="p-0">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-3 font-medium">Email</th>
                      <th className="text-left p-3 font-medium">Subscribed</th>
                    </tr>
                  </thead>
                  <tbody>
                    {subscribers.map((sub) => (
                      <tr key={sub.id} className="border-b last:border-0">
                        <td className="p-3">{sub.email}</td>
                        <td className="p-3 text-muted-foreground">{new Date(sub.subscribed_at).toLocaleDateString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
    </PremiumGate>
  );
};

export default Subscribers;
