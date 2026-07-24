import { useEffect, useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { MessageCircle, X, Send, Loader2, Sparkles } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Link } from 'react-router-dom';

interface Props {
  storeSlug: string;
  storeName: string;
  colors: { primary: string; background: string; card: string; text: string; secondary: string };
  fonts: { heading: string; body: string };
  borderRadius: number;
}

type Msg = { role: 'user' | 'assistant'; content: string };

const StorefrontAssistant = ({ storeSlug, storeName, colors, fonts, borderRadius }: Props) => {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, loading]);

  const send = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || loading) return;
    const next: Msg[] = [...messages, { role: 'user', content: trimmed }];
    setMessages(next);
    setInput('');
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('storefront-assistant', {
        body: { store_slug: storeSlug, messages: next.slice(-12) },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setMessages([...next, { role: 'assistant', content: data.reply }]);
    } catch (e: any) {
      setMessages([...next, { role: 'assistant', content: `Sorry — ${e.message || 'something went wrong. Please try again.'}` }]);
    } finally {
      setLoading(false);
    }
  };

  const suggestions = ['What are your bestsellers?', 'Show me items under ₹2000', 'What is your return policy?'];

  return (
    <>
      {/* Launcher */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          aria-label="Chat with shopping assistant"
          className="fixed z-40 bottom-20 md:bottom-6 right-20 md:right-24 flex items-center gap-2 px-4 py-3 shadow-lg hover:scale-105 transition-transform"
          style={{ backgroundColor: colors.primary, color: colors.background, borderRadius: 999 }}
        >
          <MessageCircle className="h-5 w-5" />
          <span className="hidden md:inline text-sm font-medium" style={{ fontFamily: fonts.body }}>Ask AI</span>
        </button>
      )}

      {/* Panel */}
      {open && (
        <div
          className="fixed z-50 flex flex-col shadow-2xl bottom-0 right-0 md:bottom-6 md:right-6 w-full md:w-[380px] h-[85vh] md:h-[600px] max-h-screen"
          style={{
            backgroundColor: colors.card,
            color: colors.text,
            borderRadius: window.innerWidth >= 768 ? borderRadius * 2 : 0,
            border: `1px solid ${colors.secondary}40`,
            fontFamily: fonts.body,
          }}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b" style={{ borderColor: `${colors.secondary}40` }}>
            <div>
              <div className="text-[10px] tracking-[0.2em] uppercase" style={{ color: colors.primary }}>{storeName}</div>
              <div className="text-lg font-semibold flex items-center gap-1.5" style={{ fontFamily: fonts.heading }}>
                <Sparkles className="h-4 w-4" style={{ color: colors.primary }} />
                Your Digital Stylist
              </div>
            </div>
            <button onClick={() => setOpen(false)} aria-label="Close chat" className="p-1 hover:opacity-60">
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Messages */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3">
            {messages.length === 0 && (
              <div className="space-y-3">
                <p className="text-sm opacity-70">Hi! I can help you find products, check prices, and answer questions about {storeName}.</p>
                <div className="flex flex-col gap-2">
                  {suggestions.map((s) => (
                    <button
                      key={s}
                      onClick={() => send(s)}
                      className="text-left text-sm px-3 py-2 hover:opacity-80 transition-opacity"
                      style={{ border: `1px solid ${colors.secondary}80`, borderRadius: borderRadius, color: colors.text }}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div
                  className="max-w-[85%] px-3 py-2 text-sm leading-relaxed"
                  style={{
                    backgroundColor: m.role === 'user' ? colors.primary : `${colors.secondary}30`,
                    color: m.role === 'user' ? colors.background : colors.text,
                    borderRadius: borderRadius,
                  }}
                >
                  {m.role === 'assistant' ? (
                    <div className="prose-sm max-w-none [&_p]:my-1 [&_ul]:my-1 [&_ul]:ml-4 [&_ul]:list-disc [&_a]:underline">
                      <ReactMarkdown
                        remarkPlugins={[remarkGfm]}
                        components={{
                          a: ({ href, children }) =>
                            href?.startsWith('/') ? (
                              <Link to={href} onClick={() => setOpen(false)} style={{ color: colors.primary }}>{children}</Link>
                            ) : (
                              <a href={href} target="_blank" rel="noreferrer" style={{ color: colors.primary }}>{children}</a>
                            ),
                        }}
                      >
                        {m.content}
                      </ReactMarkdown>
                    </div>
                  ) : (
                    m.content
                  )}
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex justify-start">
                <div className="px-3 py-2 text-sm" style={{ backgroundColor: `${colors.secondary}30`, borderRadius }}>
                  <Loader2 className="h-4 w-4 animate-spin" />
                </div>
              </div>
            )}
          </div>

          {/* Input */}
          <form
            onSubmit={(e) => { e.preventDefault(); send(input); }}
            className="p-3 border-t flex items-center gap-2"
            style={{ borderColor: `${colors.secondary}40` }}
          >
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask anything..."
              className="flex-1 px-3 py-2 text-sm outline-none bg-transparent"
              style={{ border: `1px solid ${colors.secondary}80`, borderRadius, color: colors.text }}
              disabled={loading}
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              aria-label="Send"
              className="p-2 disabled:opacity-50"
              style={{ backgroundColor: colors.primary, color: colors.background, borderRadius }}
            >
              <Send className="h-4 w-4" />
            </button>
          </form>
        </div>
      )}
    </>
  );
};

export default StorefrontAssistant;
