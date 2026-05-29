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
  Mic, MicOff, Volume2, VolumeX,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

// Sarvam supported languages + speakers
const LANGUAGES: Array<{ code: string; label: string }> = [
  { code: 'hi-IN', label: 'हिन्दी' },
  { code: 'en-IN', label: 'English' },
  { code: 'bn-IN', label: 'বাংলা' },
  { code: 'ta-IN', label: 'தமிழ்' },
  { code: 'te-IN', label: 'తెలుగు' },
  { code: 'mr-IN', label: 'मराठी' },
  { code: 'gu-IN', label: 'ગુજરાતી' },
  { code: 'kn-IN', label: 'ಕನ್ನಡ' },
  { code: 'ml-IN', label: 'മലയാളം' },
  { code: 'pa-IN', label: 'ਪੰਜਾਬੀ' },
  { code: 'od-IN', label: 'ଓଡ଼ିଆ' },
];
const VOICES = ['shubh', 'anushka', 'manisha', 'vidya', 'arya', 'abhilash', 'karun', 'hitesh'];
const LS_LANG = 'pica2_lang';
const LS_VOICE = 'pica2_voice';
const LS_TTS = 'pica2_tts_on';

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
        const synth = window.speechSynthesis;
        if (!synth) return;
        const u = new SpeechSynthesisUtterance('May I help you?');
        // Soft, plushie/cartoon-ish voice: gentle pace, higher pitch, low volume
        u.rate = 0.9;
        u.pitch = 1.7;
        u.volume = 0.35;
        // Prefer a soft female / child-like voice when the browser offers one
        const pickVoice = () => {
          const voices = synth.getVoices?.() || [];
          const preferred = voices.find(v =>
            /samantha|karen|tessa|google uk english female|microsoft zira|google हिन्दी|female|girl|child|kid|soft/i.test(`${v.name} ${v.voiceURI}`)
          ) || voices.find(v => /en[-_]/i.test(v.lang) && /female/i.test(v.name));
          if (preferred) u.voice = preferred;
        };
        if (synth.getVoices && synth.getVoices().length === 0) {
          synth.addEventListener('voiceschanged', pickVoice, { once: true });
        } else {
          pickVoice();
        }
        synth.cancel();
        synth.speak(u);
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

  const [language, setLanguage] = useState<string>(() => {
    if (typeof window === 'undefined') return 'hi-IN';
    return localStorage.getItem(LS_LANG) || 'hi-IN';
  });
  const [voice, setVoice] = useState<string>(() => {
    if (typeof window === 'undefined') return 'shubh';
    return localStorage.getItem(LS_VOICE) || 'shubh';
  });
  const [ttsOn, setTtsOn] = useState<boolean>(() => {
    if (typeof window === 'undefined') return true;
    return localStorage.getItem(LS_TTS) !== '0';
  });
  const [recording, setRecording] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const mediaRecRef = useRef<MediaRecorder | null>(null);
  const audioElRef = useRef<HTMLAudioElement | null>(null);
  const lastSpokenIdRef = useRef<string | null>(null);

  useEffect(() => { localStorage.setItem(LS_LANG, language); }, [language]);
  useEffect(() => { localStorage.setItem(LS_VOICE, voice); }, [voice]);
  useEffect(() => { localStorage.setItem(LS_TTS, ttsOn ? '1' : '0'); }, [ttsOn]);

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

  const speak = async (text: string) => {
    try {
      setSpeaking(true);
      const { data, error } = await supabase.functions.invoke('sarvam-tts', {
        body: { text: text.replace(/[*_`#>\[\]()]/g, '').slice(0, 1500), language, speaker: voice },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      const b64 = (data as any)?.audio_base64;
      if (!b64) throw new Error('No audio');
      const url = `data:audio/wav;base64,${b64}`;
      const audio = new Audio(url);
      audioElRef.current?.pause();
      audioElRef.current = audio;
      audio.onended = () => setSpeaking(false);
      audio.onerror = () => setSpeaking(false);
      await audio.play();
    } catch (e: any) {
      setSpeaking(false);
      console.warn('TTS failed', e?.message);
    }
  };

  const stopSpeaking = () => {
    try { audioElRef.current?.pause(); } catch {}
    setSpeaking(false);
  };

  const sendMut = useMutation({
    mutationFn: async (msg: string) => {
      const { data, error } = await supabase.functions.invoke('merchant-assistant', {
        body: { thread_id: activeId, message: msg, language },
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
      if (ttsOn) speak(data.reply);
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

  // Auto-speak newly loaded assistant message when switching threads
  useEffect(() => {
    if (!ttsOn || !messages?.length) return;
    const last = messages[messages.length - 1];
    if (last?.role === 'assistant' && last.id !== lastSpokenIdRef.current) {
      lastSpokenIdRef.current = last.id;
      // don't auto-speak historical loads — only when last is recent (<10s)
      if (Date.now() - new Date(last.created_at).getTime() < 10_000) {
        speak(last.content);
      }
    }
  }, [messages, ttsOn]);

  const startNew = () => {
    const next = new URLSearchParams(params);
    next.delete('at');
    setParams(next, { replace: true });
    setInput('');
    textareaRef.current?.focus();
  };

  const send = (override?: string) => {
    const msg = (override ?? input).trim();
    if (!msg || sendMut.isPending) return;
    setInput('');
    stopSpeaking();
    sendMut.mutate(msg);
  };

  const startRecording = async () => {
    try {
      stopSpeaking();
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mime = MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : '';
      const rec = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
      const chunks: Blob[] = [];
      rec.ondataavailable = (e) => { if (e.data.size) chunks.push(e.data); };
      rec.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunks, { type: rec.mimeType || 'audio/webm' });
        if (blob.size < 800) { setTranscribing(false); return; }
        setTranscribing(true);
        try {
          const buf = await blob.arrayBuffer();
          let binary = '';
          const bytes = new Uint8Array(buf);
          for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
          const b64 = btoa(binary);
          const { data, error } = await supabase.functions.invoke('sarvam-stt', {
            body: { audio_base64: b64, mime: rec.mimeType || 'audio/webm', language },
          });
          if (error) throw error;
          if ((data as any)?.error) throw new Error((data as any).error);
          const text = ((data as any)?.transcript || '').trim();
          if (text) send(text);
        } catch (e: any) {
          toast.error(e?.message || 'Could not transcribe audio');
        } finally {
          setTranscribing(false);
        }
      };
      mediaRecRef.current = rec;
      rec.start();
      setRecording(true);
    } catch (e: any) {
      toast.error('Microphone permission needed');
    }
  };

  const stopRecording = () => {
    try { mediaRecRef.current?.stop(); } catch {}
    setRecording(false);
  };

  const optimisticMessages: Array<{ role: string; content: string; pending?: boolean }> = [...messages];
  if (sendMut.isPending && sendMut.variables) {
    optimisticMessages.push({ role: 'user', content: sendMut.variables, pending: true });
  }

  const quickPromptsByLang: Record<string, string[]> = {
    'hi-IN': [
      'मेरी दुकान में अभी सबसे ज़रूरी क्या ठीक करना है?',
      'मुझे ऑर्डर क्यों नहीं मिल रहे?',
      'Razorpay कैसे चालू करूँ?',
      'पेंडिंग ऑर्डर शिप करने में मदद करो।',
    ],
    'en-IN': [
      'What is the most important thing to fix in my store right now?',
      'Why am I not getting any orders?',
      'How do I enable Razorpay?',
      'Help me ship my pending orders.',
    ],
  };
  const quickPrompts = quickPromptsByLang[language] || quickPromptsByLang['en-IN'];

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
        {/* Language / Voice toolbar */}
        <div className="border-b px-3 py-2 flex items-center gap-2 bg-muted/20 shrink-0 flex-wrap">
          <span className="text-[10px] uppercase tracking-wide text-muted-foreground">Language</span>
          <Select value={language} onValueChange={setLanguage}>
            <SelectTrigger className="h-7 w-[110px] text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              {LANGUAGES.map((l) => <SelectItem key={l.code} value={l.code} className="text-xs">{l.label}</SelectItem>)}
            </SelectContent>
          </Select>
          <span className="text-[10px] uppercase tracking-wide text-muted-foreground ml-1">Voice</span>
          <Select value={voice} onValueChange={setVoice}>
            <SelectTrigger className="h-7 w-[100px] text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              {VOICES.map((v) => <SelectItem key={v} value={v} className="text-xs capitalize">{v}</SelectItem>)}
            </SelectContent>
          </Select>
          <button
            onClick={() => { if (speaking) stopSpeaking(); setTtsOn(!ttsOn); }}
            className={cn(
              'ml-auto inline-flex items-center gap-1 text-xs px-2 py-1 rounded-md border',
              ttsOn ? 'bg-primary/10 text-primary border-primary/30' : 'text-muted-foreground',
            )}
            aria-label="Toggle voice output"
          >
            {ttsOn ? <Volume2 className="h-3.5 w-3.5" /> : <VolumeX className="h-3.5 w-3.5" />}
            {speaking ? 'Speaking…' : ttsOn ? 'Voice on' : 'Voice off'}
          </button>
        </div>

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
                    <button
                      onClick={() => speak(m.content)}
                      className="mt-1 inline-flex items-center gap-1 text-[10px] text-muted-foreground hover:text-primary"
                    >
                      <Volume2 className="h-3 w-3" /> Play
                    </button>
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
              placeholder={recording ? 'Listening…' : transcribing ? 'Transcribing…' : 'Ask anything · type or tap mic'}
              className="min-h-[44px] max-h-32 resize-none text-sm"
              rows={1}
              disabled={sendMut.isPending || recording || transcribing}
            />
            <Button
              type="button"
              onClick={recording ? stopRecording : startRecording}
              disabled={sendMut.isPending || transcribing}
              size="icon"
              variant={recording ? 'destructive' : 'outline'}
              className="shrink-0"
              aria-label={recording ? 'Stop recording' : 'Start voice input'}
            >
              {transcribing ? <Loader2 className="h-4 w-4 animate-spin" /> : recording ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
            </Button>
            <Button type="button" onClick={() => send()} disabled={!input.trim() || sendMut.isPending} size="icon" className="shrink-0">
              {sendMut.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </Button>
          </div>
          <p className="text-[10px] text-muted-foreground mt-1.5">Enter to send · Shift+Enter for newline · Mic for voice. AI may make mistakes.</p>
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
