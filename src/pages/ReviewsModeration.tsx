import { useEffect, useState } from 'react';
import { useStore } from '@/hooks/useStore';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Star, Check, X, Loader2, MessageSquare } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface ReviewRow {
  id: string;
  product_id: string;
  rating: number;
  title: string | null;
  body: string | null;
  is_verified_purchase: boolean | null;
  created_at: string;
  moderation_status: string;
  user_id: string;
}

const TABS = [
  { value: 'pending', label: 'Pending' },
  { value: 'approved', label: 'Approved' },
  { value: 'rejected', label: 'Rejected' },
];

const ReviewsModeration = () => {
  const { store } = useStore();
  const [tab, setTab] = useState('pending');
  const [rows, setRows] = useState<ReviewRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = async () => {
    if (!store?.id) return;
    setLoading(true);
    const sb = supabase as any;
    const { data, error } = await sb
      .from('reviews')
      .select('*')
      .eq('store_id', store.id)
      .eq('moderation_status', tab)
      .order('created_at', { ascending: false });
    if (error) toast.error(error.message);
    setRows(((data || []) as unknown as ReviewRow[]));
    setLoading(false);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [store?.id, tab]);

  const moderate = async (id: string, status: 'approved' | 'rejected') => {
    setBusyId(id);
    const { error } = await supabase
      .from('reviews' as any)
      .update({ moderation_status: status, moderated_at: new Date().toISOString() } as any)
      .eq('id', id);
    setBusyId(null);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(`Review ${status}`);
    setRows((prev) => prev.filter((r) => r.id !== id));
  };

  return (
    <div className="space-y-4 pb-20 md:pb-0">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Review Moderation</h1>
        <p className="text-sm text-muted-foreground">Approve or reject customer reviews before they appear on your storefront.</p>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          {TABS.map((t) => (
            <TabsTrigger key={t.value} value={t.value}>{t.label}</TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : rows.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed py-16 text-center">
          <MessageSquare className="h-7 w-7 text-muted-foreground mb-3" />
          <h3 className="text-lg font-semibold">Nothing here</h3>
          <p className="text-sm text-muted-foreground mt-1">No {tab} reviews.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {rows.map((r) => (
            <Card key={r.id}>
              <CardContent className="py-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="flex">
                      {[1, 2, 3, 4, 5].map((n) => (
                        <Star
                          key={n}
                          className={cn(
                            'h-4 w-4',
                            n <= r.rating ? 'fill-yellow-400 text-yellow-400' : 'text-muted-foreground/30'
                          )}
                        />
                      ))}
                    </div>
                    {r.is_verified_purchase && (
                      <span className="text-xs rounded-full bg-green-100 text-green-800 px-2 py-0.5">
                        Verified
                      </span>
                    )}
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {format(new Date(r.created_at), 'dd MMM yyyy')}
                  </span>
                </div>
                {r.title && <p className="font-medium">{r.title}</p>}
                {r.body && <p className="text-sm text-muted-foreground">{r.body}</p>}
                {tab !== 'approved' && tab !== 'rejected' && (
                  <div className="flex justify-end gap-2 pt-1">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => moderate(r.id, 'rejected')}
                      disabled={busyId === r.id}
                    >
                      <X className="h-4 w-4 mr-1" /> Reject
                    </Button>
                    <Button size="sm" onClick={() => moderate(r.id, 'approved')} disabled={busyId === r.id}>
                      {busyId === r.id ? (
                        <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                      ) : (
                        <Check className="h-4 w-4 mr-1" />
                      )}
                      Approve
                    </Button>
                  </div>
                )}
                {(tab === 'approved' || tab === 'rejected') && (
                  <div className="flex justify-end pt-1">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => moderate(r.id, tab === 'approved' ? 'rejected' : 'approved')}
                      disabled={busyId === r.id}
                    >
                      Move to {tab === 'approved' ? 'Rejected' : 'Approved'}
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default ReviewsModeration;
