import { useState } from 'react';
import { useStore } from '@/hooks/useStore';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Loader2, Mail, Phone, Search, Inbox, MailOpen, X, Clock, Reply } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

type ContactMessage = {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
  subject: string;
  message: string;
  status: 'unread' | 'read' | 'replied';
  created_at: string;
};

const STATUS_LABELS: Record<string, string> = {
  unread: 'Unread',
  read: 'Read',
  replied: 'Replied',
};

const STATUS_COLORS: Record<string, string> = {
  unread: 'bg-blue-100 text-blue-700',
  read: 'bg-gray-100 text-gray-600',
  replied: 'bg-green-100 text-green-700',
};

export default function ContactMessages() {
  const { store } = useStore();
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<ContactMessage | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>('all');

  const { data: messages = [], isLoading } = useQuery({
    queryKey: ['contact-messages', store?.id],
    enabled: !!store?.id,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('contact_messages')
        .select('*')
        .eq('store_id', store!.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []) as ContactMessage[];
    },
  });

  const markStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await (supabase as any)
        .from('contact_messages')
        .update({ status })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['contact-messages', store?.id] }),
    onError: () => toast.error('Could not update status'),
  });

  const openMessage = (msg: ContactMessage) => {
    setSelected(msg);
    if (msg.status === 'unread') {
      markStatus.mutate({ id: msg.id, status: 'read' });
    }
  };

  const filtered = messages.filter((m) => {
    const matchStatus = filterStatus === 'all' || m.status === filterStatus;
    const q = search.toLowerCase();
    const matchSearch = !q || m.name.toLowerCase().includes(q) || m.email.toLowerCase().includes(q) || m.subject.toLowerCase().includes(q);
    return matchStatus && matchSearch;
  });

  const unreadCount = messages.filter((m) => m.status === 'unread').length;

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-primary/10">
            <Inbox className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-bold">Customer Messages</h1>
            <p className="text-sm text-muted-foreground">
              Messages from your shop's Contact page
              {unreadCount > 0 && (
                <span className="ml-2 inline-flex items-center justify-center px-2 py-0.5 text-xs font-bold rounded-full bg-blue-600 text-white">
                  {unreadCount} new
                </span>
              )}
            </p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative max-w-xs w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search name, email, subject…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex gap-2">
          {['all', 'unread', 'read', 'replied'].map((s) => (
            <button
              key={s}
              onClick={() => setFilterStatus(s)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-full border transition-colors ${
                filterStatus === s
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'bg-background border-border text-muted-foreground hover:text-foreground'
              }`}
            >
              {s === 'all' ? 'All' : STATUS_LABELS[s]}
              {s === 'unread' && unreadCount > 0 && (
                <span className="ml-1.5 bg-blue-600 text-white rounded-full px-1.5 py-px text-[10px] font-bold">
                  {unreadCount}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-7 w-7 animate-spin text-muted-foreground" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground space-y-2">
          <MailOpen className="h-12 w-12 mx-auto opacity-20" />
          <p className="font-medium">No messages yet</p>
          <p className="text-sm opacity-70">
            {filterStatus !== 'all' ? 'Try switching the filter.' : 'Messages from your Contact page will appear here.'}
          </p>
        </div>
      ) : (
        <div className="grid md:grid-cols-5 gap-4 items-start">
          {/* Message list */}
          <div className="md:col-span-2 space-y-2">
            {filtered.map((msg) => (
              <button
                key={msg.id}
                onClick={() => openMessage(msg)}
                className={`w-full text-left p-4 rounded-xl border transition-all ${
                  selected?.id === msg.id
                    ? 'border-primary bg-primary/5'
                    : 'border-border bg-card hover:border-primary/40 hover:bg-muted/40'
                } ${msg.status === 'unread' ? 'font-semibold' : ''}`}
              >
                <div className="flex items-start justify-between gap-2 mb-1">
                  <span className="text-sm truncate">{msg.name}</span>
                  <span className={`shrink-0 px-2 py-0.5 text-[10px] font-bold rounded-full ${STATUS_COLORS[msg.status]}`}>
                    {STATUS_LABELS[msg.status]}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground truncate mb-1">{msg.subject || '(No subject)'}</p>
                <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                  <Clock className="h-3 w-3" />
                  {format(new Date(msg.created_at), 'dd MMM yyyy, hh:mm a')}
                </div>
                {msg.phone && (
                  <p className="text-[10px] text-muted-foreground mt-0.5 flex items-center gap-1">
                    <Phone className="h-2.5 w-2.5" /> {msg.phone}
                  </p>
                )}
              </button>
            ))}
          </div>

          {/* Detail pane */}
          <div className="md:col-span-3">
            {selected ? (
              <div className="border rounded-xl bg-card p-5 space-y-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="font-bold text-base">{selected.subject || '(No subject)'}</h2>
                    <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
                      <Mail className="h-3.5 w-3.5" />
                      <span className="font-medium text-foreground">{selected.name}</span>
                      <span>·</span>
                      <a href={`mailto:${selected.email}`} className="hover:underline text-primary">
                        {selected.email}
                      </a>
                    </div>
                    {selected.phone && (
                      <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
                        <Phone className="h-3.5 w-3.5" />
                        <a href={`tel:${selected.phone}`} className="hover:underline text-primary">
                          {selected.phone}
                        </a>
                      </div>
                    )}
                    <div className="flex items-center gap-1 text-[10px] text-muted-foreground mt-1">
                      <Clock className="h-3 w-3" />
                      {format(new Date(selected.created_at), 'dd MMM yyyy, hh:mm a')}
                    </div>
                  </div>
                  <button onClick={() => setSelected(null)} className="p-1 opacity-50 hover:opacity-100">
                    <X className="h-4 w-4" />
                  </button>
                </div>

                <hr className="border-border" />

                <p className="text-sm leading-relaxed whitespace-pre-wrap">{selected.message}</p>

                <hr className="border-border" />

                {/* Actions */}
                <div className="flex items-center gap-3 flex-wrap">
                  <a
                    href={`mailto:${selected.email}?subject=Re: ${encodeURIComponent(selected.subject || '')}`}
                    target="_blank"
                    rel="noreferrer"
                    onClick={() => markStatus.mutate({ id: selected.id, status: 'replied' })}
                    className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg bg-primary text-primary-foreground hover:opacity-90 transition"
                  >
                    <Reply className="h-4 w-4" />
                    Reply via Email
                  </a>
                  {selected.status !== 'replied' && (
                    <button
                      onClick={() => {
                        markStatus.mutate({ id: selected.id, status: 'replied' });
                        setSelected({ ...selected, status: 'replied' });
                        toast.success('Marked as replied');
                      }}
                      className="px-3 py-2 text-xs font-semibold rounded-lg border border-border hover:bg-muted transition"
                    >
                      Mark as Replied
                    </button>
                  )}
                  {selected.status !== 'unread' && (
                    <button
                      onClick={() => {
                        markStatus.mutate({ id: selected.id, status: 'unread' });
                        setSelected({ ...selected, status: 'unread' });
                      }}
                      className="px-3 py-2 text-xs font-semibold rounded-lg border border-border hover:bg-muted transition text-muted-foreground"
                    >
                      Mark as Unread
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <div className="border rounded-xl bg-card p-10 text-center text-muted-foreground space-y-2">
                <MailOpen className="h-10 w-10 mx-auto opacity-20" />
                <p className="text-sm">Select a message to read it</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
