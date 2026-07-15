import { useEffect, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { useStorefront } from '@/hooks/useStorefront';
import StorefrontLayout, { resolveTheme } from '@/components/storefront/StorefrontLayout';
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
  const theme = resolveTheme(store.theme);
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
      <div className="max-w-3xl mx-auto px-4 py-6 md:py-8 space-y-4">
        <Link to={`/store/${slug}/account`} className="text-xs opacity-60 hover:opacity-100 inline-flex items-center gap-1">
          <ChevronLeft className="h-3.5 w-3.5" /> Back
        </Link>

        <div className="p-5 md:p-6" style={{ background: `linear-gradient(135deg, ${colors.primary}14, ${colors.primary}04)`, borderRadius: br, border: `1px solid ${colors.secondary}` }}>
          <h1 className="text-xl md:text-2xl font-bold" style={{ fontFamily: fonts.heading }}>Help & Support</h1>
          <p className="text-sm opacity-70 mt-1">We're here to help. Raise a ticket or use the contact options below.</p>
        </div>

        {/* Quick contacts */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {contact.email && (
            <a href={`mailto:${contact.email}`} className="p-4 border flex items-center gap-3 hover:shadow-sm" style={{ borderColor: colors.secondary, borderRadius: br }}>
              <Mail className="h-5 w-5" style={{ color: colors.primary }} />
              <div className="min-w-0"><p className="text-xs opacity-60">Email</p><p className="text-sm font-medium truncate">{contact.email}</p></div>
            </a>
          )}
          {contact.phone && (
            <a href={`tel:${contact.phone}`} className="p-4 border flex items-center gap-3 hover:shadow-sm" style={{ borderColor: colors.secondary, borderRadius: br }}>
              <Phone className="h-5 w-5" style={{ color: colors.primary }} />
              <div><p className="text-xs opacity-60">Call</p><p className="text-sm font-medium">{contact.phone}</p></div>
            </a>
          )}
          <Link to={`/store/${slug}/faq`} className="p-4 border flex items-center gap-3 hover:shadow-sm" style={{ borderColor: colors.secondary, borderRadius: br }}>
            <HelpCircle className="h-5 w-5" style={{ color: colors.primary }} />
            <div><p className="text-xs opacity-60">FAQ</p><p className="text-sm font-medium">Browse answers</p></div>
          </Link>
        </div>

        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold" style={{ fontFamily: fonts.heading }}>Your tickets</h2>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <button className="text-xs font-semibold px-3 py-2 flex items-center gap-1.5" style={{ backgroundColor: colors.primary, color: '#fff', borderRadius: brHalf }}>
                <Plus className="h-3.5 w-3.5" /> New ticket
              </button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Create Support Ticket</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <div>
                  <label className="text-xs font-medium opacity-70">Subject</label>
                  <Input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Brief summary" />
                </div>
                <div>
                  <label className="text-xs font-medium opacity-70">Category</label>
                  <select value={category} onChange={(e) => setCategory(e.target.value)} className="w-full rounded-md border px-3 py-2 text-sm bg-background">
                    <option value="order">Order issue</option>
                    <option value="return">Return / Refund</option>
                    <option value="exchange">Exchange</option>
                    <option value="payment">Payment</option>
                    <option value="general">General</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium opacity-70">Message</label>
                  <Textarea rows={5} value={body} onChange={(e) => setBody(e.target.value)} placeholder="Describe your issue in detail…" />
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                  <Button onClick={submit} disabled={createTicket.isPending || !subject || !body}>
                    {createTicket.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />} Submit
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {ticketsLoading ? (
          <div className="text-center py-8"><Loader2 className="h-5 w-5 animate-spin mx-auto opacity-50" /></div>
        ) : !tickets?.length ? (
          <div className="text-center py-14 border" style={{ borderColor: colors.secondary, borderRadius: br }}>
            <MessageCircle className="h-10 w-10 mx-auto mb-2 opacity-20" />
            <p className="text-sm opacity-60">No tickets yet</p>
          </div>
        ) : (
          <div className="space-y-2">
            {tickets.map((t) => (
              <Link key={t.id} to={`/store/${slug}/account/support?ticket=${t.id}`} className="block p-4 border hover:shadow-sm" style={{ borderColor: colors.secondary, borderRadius: br }}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold truncate">{t.subject}</p>
                    <p className="text-xs opacity-60 mt-0.5 capitalize">{t.category} · Last update {format(new Date(t.last_message_at), 'dd MMM')}</p>
                  </div>
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full uppercase" style={{ backgroundColor: (statusColor[t.status] || '#888') + '20', color: statusColor[t.status] || '#888' }}>
                    {t.status}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </StorefrontLayout>
  );
};

const TicketDetail = ({ slug, store, theme, ticketId, userId }: any) => {
  const { data, isLoading } = useTicket(ticketId);
  const send = useSendTicketMessage();
  const [msg, setMsg] = useState('');
  const { colors, fonts, borderRadius } = theme;
  const br = `${borderRadius}px`, brHalf = `${borderRadius / 2}px`;

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
      <div className="max-w-3xl mx-auto px-4 py-6 md:py-8 space-y-4">
        <Link to={`/store/${slug}/account/support`} className="text-xs opacity-60 hover:opacity-100 inline-flex items-center gap-1">
          <ChevronLeft className="h-3.5 w-3.5" /> Back to tickets
        </Link>

        <div className="p-5" style={{ background: `linear-gradient(135deg, ${colors.primary}14, ${colors.primary}04)`, borderRadius: br, border: `1px solid ${colors.secondary}` }}>
          <p className="text-xs opacity-50 uppercase">Ticket #{ticket.id.slice(0, 8).toUpperCase()}</p>
          <h1 className="text-lg md:text-xl font-bold mt-1" style={{ fontFamily: fonts.heading }}>{ticket.subject}</h1>
          <div className="flex items-center gap-3 mt-2 text-xs">
            <span className="capitalize opacity-70">{ticket.category}</span>
            <span className="px-2 py-0.5 rounded-full font-semibold uppercase" style={{ backgroundColor: (statusColor[ticket.status] || '#888') + '20', color: statusColor[ticket.status] || '#888' }}>{ticket.status}</span>
          </div>
        </div>

        <div className="space-y-3">
          {messages.map((m: any) => {
            const mine = m.sender_type === 'customer';
            return (
              <div key={m.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[80%] p-3 rounded-lg text-sm`} style={{
                  backgroundColor: mine ? colors.primary + '18' : colors.secondary + '80',
                  borderRadius: brHalf,
                }}>
                  <p className="whitespace-pre-wrap">{m.body}</p>
                  <p className="text-[10px] opacity-50 mt-1.5 capitalize">{m.sender_type} · {format(new Date(m.created_at), 'dd MMM, hh:mm a')}</p>
                </div>
              </div>
            );
          })}
        </div>

        <div className="sticky bottom-4 flex gap-2 p-3 border bg-background" style={{ borderColor: colors.secondary, borderRadius: br }}>
          <Textarea value={msg} onChange={(e) => setMsg(e.target.value)} placeholder="Type your reply…" rows={2} className="resize-none" />
          <Button onClick={submit} disabled={send.isPending || !msg.trim()} style={{ backgroundColor: colors.primary }}>
            {send.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </Button>
        </div>
      </div>
    </StorefrontLayout>
  );
};

export default CustomerSupport;
