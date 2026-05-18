import { useEffect, useRef, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link, useLocation, useSearchParams } from 'react-router-dom';
import { PicaMascot } from './PicaMascot';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  HelpCircle, MessageCircle, Search, Sparkles, Plus, Trash2, Send, Loader2, BookOpen,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface HelpArticle { id: string; slug: string; title: string; body_md: string; category: string }
interface ChatThread { id: string; title: string; last_message_at: string }
interface ChatMessage { id: string; role: 'user' | 'assistant' | 'system'; content: string; created_at: string }

const WHATSAPP = 'https://wa.me/919810189606?text=Hi%20PicToCart%20support';

const DISMISS_KEY = 'pica2_dismissed_session';

export const HelpLauncher = () => {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState('chat');
  const [bubble, setBubble] = useState(false);
  const { user } = useAuth();
  const location = useLocation();

  // Auto popup after 1 min on a single page, unless dismissed this session
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (sessionStorage.getItem(DISMISS_KEY) === '1') return;
    if (open) return;
    const t = window.setTimeout(() => {
      if (sessionStorage.getItem(DISMISS_KEY) === '1') return;
      setBubble(true);
      try {
        const u = new SpeechSynthesisUtterance('May I help you!');
        u.rate = 1.05; u.pitch = 1.3; u.volume = 0.9;
        window.speechSynthesis?.cancel();
        window.speechSynthesis?.speak(u);
      } catch {}
    }, 60_000);
    return () => window.clearTimeout(t);
  }, [location.pathname, open]);

  const dismissBubble = () => {
    setBubble(false);
    try { sessionStorage.setItem(DISMISS_KEY, '1'); } catch {}
    try { window.speechSynthesis?.cancel(); } catch {}
  };

  const handleOpenChange = (v: boolean) => {
    setOpen(v);
    if (v) setBubble(false);
    else {
      try { sessionStorage.setItem(DISMISS_KEY, '1'); } catch {}
    }
  };

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <div className="fixed bottom-5 right-5 z-40 flex flex-col items-end gap-2">
        {bubble && (
          <div className="relative animate-fade-in bg-background border shadow-lg rounded-2xl rounded-br-sm px-3 py-2 max-w-[220px] text-sm">
            <button
              onClick={dismissBubble}
              aria-label="Dismiss"
              className="absolute -top-2 -right-2 h-5 w-5 rounded-full bg-muted text-muted-foreground hover:bg-foreground hover:text-background text-xs leading-none flex items-center justify-center"
            >
              ×
            </button>
            <p className="font-medium leading-snug">May I help you? ✨</p>
            <button
              onClick={() => { setBubble(false); setOpen(true); }}
              className="text-xs text-primary underline mt-0.5"
            >
              Open Pica 2
            </button>
          </div>
        )}
        <SheetTrigger asChild>
          <button
            aria-label="Pica 2 — help assistant"
            className="h-14 w-14 rounded-full bg-gradient-to-br from-yellow-200 to-yellow-400 shadow-lg hover:scale-105 transition-transform flex items-center justify-center ring-2 ring-yellow-500/30"
          >
            <PicaMascot size={42} />
          </button>
        </SheetTrigger>
      </div>
      <SheetContent side="right" className="w-full sm:max-w-2xl p-0 flex flex-col">
        <Tabs value={tab} onValueChange={setTab} className="flex flex-col h-full">
          <div className="border-b px-4 pt-4 pb-2 shrink-0">
            <h2 className="font-semibold text-base flex items-center gap-2">
              <PicaMascot size={22} /> Pica 2
            </h2>
            <p className="text-xs text-muted-foreground">Your store buddy — diagnoses issues and walks you through fixes.</p>
            <TabsList className="mt-3 grid grid-cols-3 w-full">
              <TabsTrigger value="chat" className="gap-1.5"><MessageCircle className="h-3.5 w-3.5" /> Chat</TabsTrigger>
              <TabsTrigger value="help" className="gap-1.5"><BookOpen className="h-3.5 w-3.5" /> Articles</TabsTrigger>
              <TabsTrigger value="contact" className="gap-1.5"><HelpCircle className="h-3.5 w-3.5" /> Contact</TabsTrigger>
            </TabsList>
          </div>
          <TabsContent value="chat" className="flex-1 min-h-0 m-0">
            {user ? <ChatPane /> : <SignInGate />}
          </TabsContent>
          <TabsContent value="help" className="flex-1 min-h-0 m-0 overflow-hidden">
            <HelpArticlesPane onPicked={() => setOpen(false)} />
          </TabsContent>
          <TabsContent value="contact" className="flex-1 m-0 p-4 space-y-3">
            <a href={WHATSAPP} target="_blank" rel="noreferrer">
              <Button variant="default" className="w-full gap-2">
                <MessageCircle className="h-4 w-4" /> WhatsApp +91 98101 89606
              </Button>
            </a>
            <a href="mailto:support@pictocart.in">
              <Button variant="outline" className="w-full">support@pictocart.in</Button>
            </a>
            <p className="text-xs text-muted-foreground pt-2">Mon–Sat, 10am–7pm IST. Pro plan: priority within 2 working hours.</p>
          </TabsContent>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
};

// ------------------- Chat -------------------

const SignInGate = () => (
  <div className="p-6 text-center space-y-2">
    <p className="text-sm text-muted-foreground">Sign in to chat with the merchant assistant — it reads your store status to give personalized fixes.</p>
    <Link to="/auth"><Button>Sign in</Button></Link>
  </div>
);

const ChatPane = () => {
  const qc = useQueryClient();
  const [params, setParams] = useSearchParams();
  const activeId = params.get('at');
  const [input, setInput] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const { data: threads = [] } = useQuery({
    queryKey: ['mct-threads'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('merchant_chat_threads')
        .select('id, title, last_message_at')
        .order('last_message_at', { ascending: false })
        .limit(50);
      if (error) throw error;
      return data as ChatThread[];
    },
  });

  const { data: messages = [], isLoading: msgsLoading } = useQuery({
    queryKey: ['mct-messages', activeId],
    enabled: !!activeId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('merchant_chat_messages')
        .select('id, role, content, created_at')
        .eq('thread_id', activeId!)
        .order('created_at', { ascending: true });
      if (error) throw error;
      return data as ChatMessage[];
    },
  });

  const sendMut = useMutation({
    mutationFn: async (msg: string) => {
      const { data, error } = await supabase.functions.invoke('merchant-assistant', {
        body: { thread_id: activeId, message: msg },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      return data as { thread_id: string; reply: string };
    },
    onSuccess: (data) => {
      if (!activeId || activeId !== data.thread_id) {
        const next = new URLSearchParams(params);
        next.set('at', data.thread_id);
        setParams(next, { replace: true });
      }
      qc.invalidateQueries({ queryKey: ['mct-threads'] });
      qc.invalidateQueries({ queryKey: ['mct-messages', data.thread_id] });
    },
    onError: (err: any) => toast.error(err?.message || 'Assistant failed'),
  });

  const deleteThread = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('merchant_chat_threads').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: (_, id) => {
      qc.invalidateQueries({ queryKey: ['mct-threads'] });
      if (activeId === id) {
        const next = new URLSearchParams(params);
        next.delete('at');
        setParams(next, { replace: true });
      }
    },
  });

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, sendMut.isPending]);

  useEffect(() => { textareaRef.current?.focus(); }, [activeId]);

  const startNew = () => {
    const next = new URLSearchParams(params);
    next.delete('at');
    setParams(next, { replace: true });
    setInput('');
    textareaRef.current?.focus();
  };

  const send = () => {
    const msg = input.trim();
    if (!msg || sendMut.isPending) return;
    setInput('');
    sendMut.mutate(msg);
  };

  const optimisticMessages: Array<{ role: string; content: string; pending?: boolean }> = [...messages];
  if (sendMut.isPending && sendMut.variables) {
    optimisticMessages.push({ role: 'user', content: sendMut.variables, pending: true });
  }

  const quickPrompts = [
    'What is the most important thing to fix in my store right now?',
    'Why am I not getting any orders?',
    'How do I enable Razorpay?',
    'Help me ship my pending orders.',
  ];

  return (
    <div className="flex h-full min-h-0">
      {/* Thread list */}
      <aside className="w-44 border-r bg-muted/30 hidden sm:flex flex-col shrink-0">
        <div className="p-2 border-b">
          <Button size="sm" variant="outline" className="w-full gap-1" onClick={startNew}>
            <Plus className="h-3.5 w-3.5" /> New chat
          </Button>
        </div>
        <ScrollArea className="flex-1">
          <div className="p-1 space-y-0.5">
            {threads.map((t) => (
              <div key={t.id} className={cn(
                'group flex items-center gap-1 rounded-md text-xs',
                activeId === t.id ? 'bg-background shadow-sm' : 'hover:bg-background/60',
              )}>
                <button
                  onClick={() => {
                    const next = new URLSearchParams(params);
                    next.set('at', t.id);
                    setParams(next, { replace: true });
                  }}
                  className="flex-1 text-left px-2 py-1.5 truncate"
                >
                  {t.title || 'Untitled'}
                </button>
                <button
                  onClick={() => { if (confirm('Delete this conversation?')) deleteThread.mutate(t.id); }}
                  className="opacity-0 group-hover:opacity-100 transition-opacity p-1 text-muted-foreground hover:text-destructive"
                  aria-label="Delete"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </div>
            ))}
            {threads.length === 0 && <p className="text-[10px] text-muted-foreground px-2 py-2">No chats yet.</p>}
          </div>
        </ScrollArea>
      </aside>

      {/* Conversation */}
      <div className="flex-1 min-w-0 flex flex-col">
        <ScrollArea className="flex-1" ref={scrollRef as any}>
          <div className="p-4 space-y-4">
            {!activeId && optimisticMessages.length === 0 && (
              <div className="text-center py-8 space-y-3">
                <Sparkles className="h-8 w-8 mx-auto text-primary" />
                <p className="text-sm font-medium">Hi! I review your store and guide you step-by-step.</p>
                <p className="text-xs text-muted-foreground">Try one of these:</p>
                <div className="flex flex-wrap justify-center gap-2 pt-1">
                  {quickPrompts.map((q) => (
                    <button
                      key={q}
                      onClick={() => { setInput(q); textareaRef.current?.focus(); }}
                      className="text-xs px-3 py-1.5 rounded-full border bg-background hover:bg-muted"
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {msgsLoading && activeId && (
              <div className="flex justify-center py-4"><Loader2 className="h-4 w-4 animate-spin text-muted-foreground" /></div>
            )}

            {optimisticMessages.map((m, i) => (
              <div key={i} className={cn('flex', m.role === 'user' ? 'justify-end' : 'justify-start')}>
                {m.role === 'user' ? (
                  <div className="max-w-[85%] rounded-2xl bg-primary text-primary-foreground px-3.5 py-2 text-sm whitespace-pre-wrap">
                    {m.content}
                  </div>
                ) : (
                  <div className="max-w-[90%] text-sm prose prose-sm dark:prose-invert prose-p:my-1 prose-ul:my-1 prose-ol:my-1 prose-a:text-primary">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{m.content}</ReactMarkdown>
                  </div>
                )}
              </div>
            ))}

            {sendMut.isPending && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Loader2 className="h-3.5 w-3.5 animate-spin" /> Reviewing your store…
              </div>
            )}
          </div>
        </ScrollArea>

        <div className="border-t p-3 bg-background">
          <div className="flex gap-2 items-end">
            <Textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  send();
                }
              }}
              placeholder="Ask anything about your store…"
              className="min-h-[44px] max-h-32 resize-none text-sm"
              rows={1}
              disabled={sendMut.isPending}
            />
            <Button onClick={send} disabled={!input.trim() || sendMut.isPending} size="icon" className="shrink-0">
              {sendMut.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </Button>
          </div>
          <p className="text-[10px] text-muted-foreground mt-1.5">Enter to send · Shift+Enter for newline. AI may make mistakes.</p>
        </div>
      </div>
    </div>
  );
};

// ------------------- Help articles -------------------

const HelpArticlesPane = ({ onPicked }: { onPicked: () => void }) => {
  const [q, setQ] = useState('');
  const { data: articles = [] } = useQuery({
    queryKey: ['help-articles-mini'],
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const { data } = await supabase
        .from('help_articles')
        .select('id, slug, title, body_md, category')
        .eq('is_published', true).order('sort').limit(40);
      return (data ?? []) as HelpArticle[];
    },
  });
  const filtered = q ? articles.filter((a) => a.title.toLowerCase().includes(q.toLowerCase())) : articles;
  return (
    <div className="p-4 space-y-3 h-full flex flex-col">
      <div className="relative shrink-0">
        <Search className="h-4 w-4 absolute left-3 top-3 text-muted-foreground" />
        <Input className="pl-9" placeholder="Search articles…" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>
      <ScrollArea className="flex-1 -mx-4">
        <div className="px-4 space-y-1">
          {filtered.map((a) => (
            <Link key={a.id} to={`/help/${a.slug}`} onClick={onPicked}
              className="block px-3 py-2 rounded-md hover:bg-muted text-sm">
              <div className="font-medium">{a.title}</div>
              <div className="text-xs text-muted-foreground capitalize">{a.category}</div>
            </Link>
          ))}
          {filtered.length === 0 && <p className="text-sm text-muted-foreground px-3 py-2">No articles found.</p>}
        </div>
      </ScrollArea>
      <Link to="/help" onClick={onPicked} className="shrink-0">
        <Button variant="ghost" className="w-full">Browse full help center</Button>
      </Link>
    </div>
  );
};
