import { useEffect, useState } from 'react';
import { useStore } from '@/hooks/useStore';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Star, Check, X, Loader2, MessageSquare, Sparkles, Package } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

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
  { value: 'order_feedback', label: 'Order Feedback' },
];

interface OrderFeedbackRow {
  id: string;
  order_id: string;
  rating: number;
  comment: string | null;
  created_at: string;
}

const ReviewsModeration = () => {
  const { store } = useStore();
  const [tab, setTab] = useState('pending');
  const [rows, setRows] = useState<ReviewRow[]>([]);
  const [feedback, setFeedback] = useState<OrderFeedbackRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  // AI Review Generator states
  const [products, setProducts] = useState<{ id: string; title: string; images?: string[] | any }[]>([]);
  const [genOpen, setGenOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState('');
  const [reviewCount, setReviewCount] = useState('3');
  const [sentiment, setSentiment] = useState('positive');
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    if (!store?.id) return;
    const fetchProducts = async () => {
      const { data, error } = await supabase
        .from('products')
        .select('id, title, images')
        .eq('store_id', store.id)
        .order('title');
      if (!error && data) {
        setProducts(data);
        
        // Handle auto-open via query param
        const params = new URLSearchParams(window.location.search);
        const urlProductId = params.get('product_id');
        if (urlProductId && data.some(p => p.id === urlProductId)) {
          setSelectedProduct(urlProductId);
          setGenOpen(true);
        } else if (data.length > 0) {
          setSelectedProduct(data[0].id);
        }
      }
    };
    fetchProducts();
  }, [store?.id]);

  const handleGenerate = async () => {
    if (!store?.id || !selectedProduct) {
      toast.error('Please select a product first');
      return;
    }
    setGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-reviews', {
        body: {
          store_id: store.id,
          product_id: selectedProduct,
          count: parseInt(reviewCount),
          sentiment,
        },
      });
      if (error) throw new Error(error.message);
      if (data?.error) throw new Error(data.error);

      toast.success(`Successfully generated ${data.count || count} reviews!`);
      setGenOpen(false);
      load(); // Reload reviews list
    } catch (err: any) {
      toast.error(err.message || 'Failed to generate reviews');
    } finally {
      setGenerating(false);
    }
  };

  const load = async () => {
    if (!store?.id) return;
    setLoading(true);
    const sb = supabase as any;
    if (tab === 'order_feedback') {
      const { data, error } = await sb
        .from('order_feedback')
        .select('id, order_id, rating, comment, created_at')
        .eq('store_id', store.id)
        .order('created_at', { ascending: false });
      if (error) toast.error(error.message);
      setFeedback((data || []) as OrderFeedbackRow[]);
    } else {
      const { data, error } = await sb
        .from('reviews')
        .select('*')
        .eq('store_id', store.id)
        .eq('moderation_status', tab)
        .order('created_at', { ascending: false });
      if (error) toast.error(error.message);
      setRows(((data || []) as unknown as ReviewRow[]));
    }
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
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Review Moderation</h1>
          <p className="text-sm text-muted-foreground">Approve or reject customer reviews before they appear on your storefront.</p>
        </div>
        <Button
          onClick={() => setGenOpen(true)}
          className="w-full md:w-auto gap-2 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 font-semibold shadow-md shrink-0"
        >
          <Sparkles className="h-4 w-4" /> Generate AI Reviews
        </Button>
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
      ) : tab === 'order_feedback' ? (
        feedback.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed py-16 text-center">
            <MessageSquare className="h-7 w-7 text-muted-foreground mb-3" />
            <h3 className="text-lg font-semibold">No feedback yet</h3>
            <p className="text-sm text-muted-foreground mt-1">Dine-in customers can rate their meal after completing an order.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {feedback.map((f) => (
              <Card key={f.id}>
                <CardContent className="py-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex">
                      {[1, 2, 3, 4, 5].map((n) => (
                        <Star key={n} className={cn('h-4 w-4', n <= f.rating ? 'fill-yellow-400 text-yellow-400' : 'text-muted-foreground/30')} />
                      ))}
                    </div>
                    <span className="text-xs text-muted-foreground">{format(new Date(f.created_at), 'dd MMM yyyy, HH:mm')}</span>
                  </div>
                  {f.comment && <p className="text-sm text-muted-foreground">{f.comment}</p>}
                </CardContent>
              </Card>
            ))}
          </div>
        )
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
      {/* Generate AI Reviews Dialog */}
      <Dialog open={genOpen} onOpenChange={setGenOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-violet-600 animate-pulse" />
              Generate AI Product Reviews
            </DialogTitle>
            <DialogDescription>
              Create authentic, high-quality simulated customer reviews for your products to build immediate buyer trust.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-3">
            {/* Product selection */}
            <div className="space-y-2">
              <Label>Select Product</Label>
              {products.length === 0 ? (
                <p className="text-xs text-destructive">No products found in your store. Add a product first.</p>
              ) : (
                <div className="max-h-[180px] overflow-y-auto border border-border rounded-lg p-2.5 bg-slate-50/50 grid grid-cols-2 gap-2 pr-1">
                  {products.map((p) => {
                    const isSelected = selectedProduct === p.id;
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => setSelectedProduct(p.id)}
                        className={cn(
                          "flex items-center gap-2 p-2 text-left border rounded-lg transition-all hover:bg-slate-50 text-xs bg-white w-full relative outline-none",
                          isSelected
                            ? "border-violet-600 ring-2 ring-violet-100 bg-violet-50/10 font-semibold text-violet-900"
                            : "border-border text-slate-700"
                        )}
                      >
                        {p.images?.[0] ? (
                          <img
                            src={p.images[0]}
                            alt={p.title}
                            className="h-8 w-8 object-cover rounded shrink-0 border border-slate-100"
                          />
                        ) : (
                          <Package className="h-8 w-8 text-muted-foreground/30 rounded bg-slate-100 p-1.5 shrink-0" />
                        )}
                        <span className="line-clamp-2 leading-tight flex-1">{p.title}</span>
                        {isSelected && (
                          <span className="absolute -top-1 -right-1 h-3.5 w-3.5 rounded-full bg-violet-600 flex items-center justify-center text-[9px] text-white font-bold border border-white">
                            ✓
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Review count */}
            <div className="space-y-2">
              <Label htmlFor="count-select">Number of reviews</Label>
              <Select value={reviewCount} onValueChange={setReviewCount}>
                <SelectTrigger id="count-select" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="3">3 Reviews</SelectItem>
                  <SelectItem value="5">5 Reviews</SelectItem>
                  <SelectItem value="10">10 Reviews</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Sentiment */}
            <div className="space-y-2">
              <Label htmlFor="sentiment-select">Review Tone & Sentiment</Label>
              <Select value={sentiment} onValueChange={setSentiment}>
                <SelectTrigger id="sentiment-select" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="highly_positive">Highly Positive (5 Stars only)</SelectItem>
                  <SelectItem value="positive">Positive (4 - 5 Stars)</SelectItem>
                  <SelectItem value="mixed">Mixed Vibe (3 - 5 Stars)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setGenOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleGenerate}
              disabled={generating || products.length === 0}
              className="bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 font-semibold"
            >
              {generating ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Generating reviews...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4 mr-2" />
                  Generate Reviews
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ReviewsModeration;
