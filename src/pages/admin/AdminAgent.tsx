import { useEffect, useRef, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Bot, Send, Sparkles, AtSign, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import ReactMarkdown from 'react-markdown';

interface AgentMsg {
  id: string;
  author: 'admin' | 'agent' | 'system';
  message: string;
  scoped_theme_id: string | null;
  intent: string | null;
  cost_inr: number | null;
  created_at: string;
}

const AdminAgent = () => {
  const qc = useQueryClient();
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const { data: themes = [] } = useQuery({
    queryKey: ['agent-theme-list'],
    queryFn: async () => {
      const { data } = await supabase.from('theme_master_projects').select('id,name,theme_id');
      return data || [];
    },
  });

  const { data: messages = [] } = useQuery({
    queryKey: ['agent-messages'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('agent_admin_messages')
        .select('*')
        .order('created_at', { ascending: true })
        .limit(200);
      if (error) throw error;
      return (data || []) as AgentMsg[];
    },
  });

  // Realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel('agent-messages')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'agent_admin_messages' }, () => {
        qc.invalidateQueries({ queryKey: ['agent-messages'] });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [qc]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages.length]);

  // Parse @theme-name mentions
  const detectScope = (text: string): string | null => {
    const m = text.match(/@([\w-]+)/);
    if (!m) return null;
    const name = m[1].toLowerCase();
    const hit = themes.find(
      (t: any) => t.name.toLowerCase().replace(/\s+/g, '-') === name || t.theme_id?.toLowerCase() === name,
    );
    return hit?.id || null;
  };

  const send = async () => {
    const text = input.trim();
    if (!text) return;
    setSending(true);
    try {
      const scoped_theme_id = detectScope(text);
      const { error } = await supabase.functions.invoke('agent-command-relay', {
        body: { message: text, scoped_theme_id },
      });
      if (error) throw error;
      setInput('');
    } catch (e: any) {
      toast.error(e.message || 'Failed to send');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <Bot className="h-6 w-6 text-primary" /> Theme Agent
        </h1>
        <p className="text-sm text-muted-foreground">
          Chat with the Master Bazaar agent. Use <code className="bg-muted px-1 rounded">@theme-name</code> to scope a change to one theme.
        </p>
      </div>

      <Card className="flex flex-col h-[calc(100vh-220px)]">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" /> Conversation
            </span>
            <Badge variant="outline" className="font-mono text-[10px]">
              {themes.length} themes mentionable
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="flex-1 flex flex-col gap-3 overflow-hidden">
          <ScrollArea className="flex-1 pr-3" ref={scrollRef as any}>
            <div className="space-y-3">
              {messages.length === 0 && (
                <div className="text-center py-12 text-sm text-muted-foreground">
                  <Bot className="h-10 w-10 mx-auto opacity-30 mb-2" />
                  Start by typing a request — e.g. <em>"Add WhatsApp Business chat to all fashion themes"</em>
                </div>
              )}
              {messages.map((m) => {
                const scopedTheme = themes.find((t: any) => t.id === m.scoped_theme_id);
                return (
                  <div
                    key={m.id}
                    className={`rounded-xl px-3 py-2 max-w-[85%] ${
                      m.author === 'admin'
                        ? 'ml-auto bg-primary text-primary-foreground'
                        : m.author === 'system'
                        ? 'mx-auto bg-muted/50 text-muted-foreground text-center text-xs'
                        : 'bg-muted'
                    }`}
                  >
                    {scopedTheme && (
                      <Badge variant="secondary" className="text-[10px] mb-1 gap-0.5">
                        <AtSign className="h-2.5 w-2.5" /> {scopedTheme.name}
                      </Badge>
                    )}
                    <div className="prose prose-sm max-w-none dark:prose-invert text-inherit">
                      <ReactMarkdown>{m.message}</ReactMarkdown>
                    </div>
                    <div className="flex items-center gap-2 mt-1 opacity-60 text-[10px]">
                      <span>{new Date(m.created_at).toLocaleTimeString()}</span>
                      {m.cost_inr ? <span>· ₹{Number(m.cost_inr).toFixed(2)}</span> : null}
                    </div>
                  </div>
                );
              })}
            </div>
          </ScrollArea>
          <div className="flex gap-2 pt-3 border-t">
            <Textarea
              placeholder="Type a request… use @theme-name to target a specific theme."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) send();
              }}
              className="min-h-[60px] resize-none"
            />
            <Button onClick={send} disabled={sending || !input.trim()} size="lg" className="self-end">
              {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </Button>
          </div>
          <p className="text-[10px] text-muted-foreground text-center">
            ⌘/Ctrl + Enter to send • Replies stream in from the Master Bazaar agent
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminAgent;
