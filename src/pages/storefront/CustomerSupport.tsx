import { useEffect, useState } from 'react';
import { Navigate, Link, useParams, useSearchParams } from 'react-router-dom';
import { useStorefront } from '@/hooks/useStorefront';
import StorefrontLayout, { resolveTheme } from '@/components/storefront/StorefrontLayout';
import { getStoreThemeTokens } from '@/lib/storefrontManifest';
import { useCustomerAuth } from '@/hooks/useCustomerAuth';
import { useCustomerTickets, useCreateTicket, useTicket, useSendTicketMessage } from '@/hooks/useSupportTickets';
import { Loader2, Plus, MessageCircle, Send, ChevronLeft, Mail, Phone, HelpCircle } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { format } from 'date-fns';

const statusColor: Record<string, string> = {
  open: '#0ea5e9', pending: '#f59e0b', resolved: '#16a34a', closed: '#78716c',
};

const CustomerSupport = () => {
  const { slug } = useParams<{ slug: string }>();
  if (slug) {
    return <Navigate to={`/store/${slug}/contact`} replace />;
  }
  const [params] = useSearchParams();
  const orderPre = params.get('order');
  const activeTicketId = params.get('ticket');
  const { store, loading } = useStorefront(slug || '');
  const { user } = useCustomerAuth(slug || '');
  const { data: tickets, isLoading: ticketsLoading } = useCustomerTickets(user?.id, store?.id);

  const createTicket = useCreateTicket();
  const [open, setOpen] = useState(!!orderPre);
  const [subject, setSubject] = useState('');
  const [category, setCategory] = useState('order');
  const [body, setBody] = useState('');

  useEffect(() => {
    if (orderPre && !subject) setSubject(`Regarding order`);
  }, [orderPre, subject]);

  if (loading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;
  if (!store || !user) return null;
  const theme = resolveTheme(getStoreThemeTokens(store));
  const { colors, fonts, borderRadius } = theme;
  const br = `${borderRadius}px`, brHalf = `${borderRadius / 2}px`;

  if (activeTicketId) return <TicketDetail slug={slug!} store={store} theme={theme} ticketId={activeTicketId} userId={user.id} />;

  const submit = async () => {
    if (!subject || !body) return;
    await createTicket.mutateAsync({
      store_id: store.id, customer_user_id: user.id,
      subject, category, body, order_id: orderPre || null,
    });
    setOpen(false); setSubject(''); setBody('');
  };

  const contact = (store as any).contact || {};

  return (
    <StorefrontLayout store={store}>
      <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
        <Link to={`/store/${slug}/account`} className="text-xs font-semibold opacity-60 hover:opacity-100 inline-flex items-center gap-1.5 transition-opacity">
          <ChevronLeft className="h-4 w-4" /> Back to Account
        </Link>

        {/* Premium glowing header card */}
        <div className="relative overflow-hidden p-6 md:p-8 shadow-sm border border-slate-100 bg-card" style={{ borderRadius: br }}>
          <div className="absolute inset-0 opacity-10 pointer-events-none" style={{ backgroundImage: `radial-gradient(${colors.primary} 1px, transparent 1px)`, backgroundSize: "16px 16px" }} />
          <div className="absolute -right-8 -bottom-8 w-24 h-24 rounded-full filter blur-xl opacity-20" style={{ background: colors.primary }} />
          <div className="relative flex items-center justify-between gap-4">
            <div className="space-y-1">
              <h1 className="text-2xl font-bold tracking-tight" style={{ fontFamily: fonts.heading, color: colors.text }}>Help & Support</h1>
              <p className="text-sm text-muted-foreground">We're here to help. Raise a ticket or browse the contact options below.</p>
            </div>
            <div className="hidden sm:flex w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center border border-primary/20">
              <MessageCircle className="h-6 w-6" style={{ color: colors.primary }} />
            </div>
          </div>
        </div>

        {/* Quick contacts */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {contact.email && (
            <a href={`mailto:${contact.email}`} className="p-4 border bg-card flex items-center gap-3.5 hover:shadow-md hover:-translate-y-0.5 transition duration-300" style={{ borderColor: colors.secondary, borderRadius: br }}>
              <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border bg-muted/40" style={{ borderColor: colors.secondary }}>
                <Mail className="h-4.5 w-4.5" style={{ color: colors.primary }} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Email Us</p>
                <p className="text-xs font-semibold truncate mt-0.5" style={{ color: colors.text }}>{contact.email}</p>
              </div>
            </a>
          )}
          {contact.phone && (
            <a href={`tel:${contact.phone}`} className="p-4 border bg-card flex items-center gap-3.5 hover:shadow-md hover:-translate-y-0.5 transition duration-300" style={{ borderColor: colors.secondary, borderRadius: br }}>
              <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border bg-muted/40" style={{ borderColor: colors.secondary }}>
                <Phone className="h-4.5 w-4.5" style={{ color: colors.primary }} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Call Support</p>
                <p className="text-xs font-semibold mt-0.5" style={{ color: colors.text }}>{contact.phone}</p>
              </div>
            </a>
          )}
          <Link to={`/store/${slug}/faq`} className="p-4 border bg-card flex items-center gap-3.5 hover:shadow-md hover:-translate-y-0.5 transition duration-300" style={{ borderColor: colors.secondary, borderRadius: br }}>
            <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border bg-muted/40" style={{ borderColor: colors.secondary }}>
              <HelpCircle className="h-4.5 w-4.5" style={{ color: colors.primary }} />
            </div>
            <div>
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">FAQ Guides</p>
              <p className="text-xs font-semibold mt-0.5" style={{ color: colors.text }}>Browse answers</p>
            </div>
          </Link>
        </div>

        {/* Tickets container */}
        <div className="space-y-4 pt-2">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold" style={{ fontFamily: fonts.heading, color: colors.text }}>Your Support Tickets</h2>
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <button className="text-xs font-bold px-4 py-2.5 flex items-center gap-1.5 transition hover:opacity-90 shadow-sm" style={{ backgroundColor: colors.primary, color: '#fff', borderRadius: brHalf }}>
                  <Plus className="h-4 w-4" /> New Ticket
                </button>
              </DialogTrigger>
              <DialogContent className="max-w-md bg-background border rounded-lg shadow-lg">
                <DialogHeader>
                  <DialogTitle>Create Support Ticket</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 mt-2">
                  <div className="space-y-1">
                    <label className="text-[10px] uppercase font-bold text-muted-foreground">Subject</label>
                    <Input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="E.g. Damaged product received" className="bg-background" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] uppercase font-bold text-muted-foreground">Category</label>
                    <select value={category} onChange={(e) => setCategory(e.target.value)} className="w-full rounded-md border px-3 py-2 text-sm bg-background">
                      <option value="order">Order issue</option>
                      <option value="return">Return / Refund</option>
                      <option value="exchange">Exchange</option>
                      <option value="payment">Payment</option>
                      <option value="general">General</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] uppercase font-bold text-muted-foreground">Detailed Message</label>
                    <Textarea rows={5} value={body} onChange={(e) => setBody(e.target.value)} placeholder="Please describe your issue in detail so we can help you faster..." className="bg-background" />
                  </div>
                  <div className="flex justify-end gap-2 pt-2">
                    <Button variant="outline" className="bg-background" onClick={() => setOpen(false)}>Cancel</Button>
                    <Button onClick={submit} disabled={createTicket.isPending || !subject || !body} style={{ backgroundColor: colors.primary }}>
                      {createTicket.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />} Submit Ticket
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {ticketsLoading ? (
            <div className="text-center py-10"><Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground opacity-50" /></div>
          ) : !tickets?.length ? (
            <div className="text-center py-14 border rounded-2xl bg-muted/10 border-dashed" style={{ borderColor: colors.secondary }}>
              <MessageCircle className="h-10 w-10 mx-auto mb-3 text-muted-foreground opacity-30 animate-pulse" />
              <p className="text-sm font-semibold text-muted-foreground">No tickets raised yet</p>
              <p className="text-xs text-muted-foreground/60 mt-1">If you face any issues, click "New Ticket" to raise support requests.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {tickets.map((t) => (
                <Link key={t.id} to={`/store/${slug}/account/support?ticket=${t.id}`} className="block p-4 border bg-card hover:border-primary/40 hover:shadow-sm transition-all duration-200" style={{ borderColor: colors.secondary, borderRadius: br }}>
                  <div className="flex items-center justify-between gap-4">
                    <div className="min-w-0 flex-1 space-y-1.5">
                      <p className="text-sm font-semibold truncate" style={{ color: colors.text }}>{t.subject}</p>
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
                        <span className="capitalize bg-muted px-2 py-0.5 rounded font-medium">{t.category}</span>
                        <span>·</span>
                        <span>Updated {format(new Date(t.last_message_at), 'dd MMM, hh:mm a')}</span>
                      </div>
                    </div>
                    <span className="text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wide shrink-0" style={{ backgroundColor: (statusColor[t.status] || '#888') + '15', color: statusColor[t.status] || '#888', border: `1px solid ${(statusColor[t.status] || '#888')}30` }}>
                      {t.status}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </StorefrontLayout>
  );
};

const TicketDetail = ({ slug, store, theme, ticketId, userId }: any) => {
  const { data, isLoading } = useTicket(ticketId);
  const send = useSendTicketMessage();
  const [msg, setMsg] = useState('');
  const { colors, fonts, borderRadius } = theme;
  const br = `${borderRadius}px`;

  const submit = async () => {
    if (!msg.trim()) return;
    await send.mutateAsync({ ticket_id: ticketId, sender_user_id: userId, body: msg.trim() });
    setMsg('');
  };

  if (isLoading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;
  if (!data?.ticket) return null;
  const { ticket, messages } = data;

  return (
    <StorefrontLayout store={store}>
      <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
        <Link to={`/store/${slug}/account/support`} className="text-xs font-semibold opacity-60 hover:opacity-100 inline-flex items-center gap-1.5 transition-opacity">
          <ChevronLeft className="h-4 w-4" /> Back to Support
        </Link>

        {/* Ticket description card */}
        <div className="p-5 border bg-card relative overflow-hidden shadow-sm" style={{ borderRadius: br, borderColor: colors.secondary }}>
          <div className="absolute right-4 top-4 text-[10px] font-mono opacity-50 uppercase">Ticket #{ticket.id.slice(0, 8).toUpperCase()}</div>
          <h1 className="text-lg md:text-xl font-bold mt-1 pr-24" style={{ fontFamily: fonts.heading, color: colors.text }}>{ticket.subject}</h1>
          <div className="flex flex-wrap items-center gap-3 mt-3 text-xs">
            <span className="capitalize font-bold bg-muted px-2 py-0.5 rounded text-muted-foreground">{ticket.category}</span>
            <span className="px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wide" style={{ backgroundColor: (statusColor[ticket.status] || '#888') + '15', color: statusColor[ticket.status] || '#888', border: `1px solid ${(statusColor[ticket.status] || '#888')}30` }}>{ticket.status}</span>
          </div>
        </div>

        {/* Message history bubbles */}
        <div className="space-y-4 min-h-[30vh]">
          {messages.map((m: any) => {
            const mine = m.sender_type === 'customer';
            return (
              <div key={m.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[80%] p-4 shadow-sm border`} style={{
                  backgroundColor: mine ? colors.primary + '09' : colors.card,
                  borderColor: mine ? colors.primary + '20' : colors.secondary,
                  borderRadius: br,
                }}>
                  <p className="text-sm whitespace-pre-wrap leading-relaxed" style={{ color: colors.text }}>{m.body}</p>
                  <div className="flex items-center justify-between gap-6 mt-2 pt-2 border-t border-slate-50/50 text-[10px] text-muted-foreground opacity-75">
                    <span className="font-bold uppercase tracking-wide">{mine ? 'You' : 'Support Assistant'}</span>
                    <span>{format(new Date(m.created_at), 'dd MMM, hh:mm a')}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Message compose bar */}
        <div className="sticky bottom-4 flex gap-3 p-3 border bg-card shadow-lg items-end" style={{ borderColor: colors.secondary, borderRadius: br }}>
          <Textarea 
            value={msg} 
            onChange={(e) => setMsg(e.target.value)} 
            placeholder="Type your message or reply here..." 
            rows={2} 
            className="resize-none text-sm bg-background border-none focus-visible:ring-0 px-2 py-1 flex-1" 
          />
          <Button 
            onClick={submit} 
            disabled={send.isPending || !msg.trim()} 
            className="h-10 px-4 shrink-0 transition hover:opacity-90 shadow-sm"
            style={{ backgroundColor: colors.primary }}
          >
            {send.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4.5 w-4.5 mr-1" />} Send
          </Button>
        </div>
      </div>
    </StorefrontLayout>
  );
};

export default CustomerSupport;
