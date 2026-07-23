import { useState } from 'react';
import { useProductReviews, useSubmitReview, getAverageRating } from '@/hooks/useReviews';
import { useCustomerAuth } from '@/hooks/useCustomerAuth';
import { Star, ThumbsUp, CheckCircle2, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { Link } from 'react-router-dom';

interface Props {
  productId: string;
  storeId: string;
  storeSlug: string;
  colors: any;
  fonts: any;
  borderRadius: number;
  allowMockFallback?: boolean;
}

const StarRating = ({ rating, size = 16, color }: { rating: number; size?: number; color: string }) => (
  <div className="flex gap-0.5">
    {[1, 2, 3, 4, 5].map((star) => (
      <Star
        key={star}
        className="transition-colors"
        style={{
          width: size,
          height: size,
          fill: star <= rating ? color : 'transparent',
          color: star <= rating ? color : color + '40',
        }}
      />
    ))}
  </div>
);

const InteractiveStars = ({ rating, onChange, color }: { rating: number; onChange: (r: number) => void; color: string }) => (
  <div className="flex gap-1">
    {[1, 2, 3, 4, 5].map((star) => (
      <button key={star} type="button" onClick={() => onChange(star)} className="transition-transform hover:scale-110">
        <Star
          className="h-7 w-7 transition-colors"
          style={{
            fill: star <= rating ? color : 'transparent',
            color: star <= rating ? color : color + '40',
          }}
        />
      </button>
    ))}
  </div>
);

const ReviewSection = ({ productId, storeId, storeSlug, colors, fonts, borderRadius, allowMockFallback = false }: Props) => {
  const { data: dbReviews = [], isLoading } = useProductReviews(productId);
  const { user } = useCustomerAuth(storeSlug);
  const submitReview = useSubmitReview();
  const [showForm, setShowForm] = useState(false);
  const [rating, setRating] = useState(0);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [showLoginPrompt, setShowLoginPrompt] = useState(false);

  const mockReviews = [
    {
      id: 'rev-1',
      rating: 5,
      customer_name: 'Anjali Sharma',
      title: 'Amazing sound!',
      body: 'Absolutely amazing headphones! The noise cancellation is top-notch and the sound stage is extremely balanced. Highly recommended for daily office commutes.',
      created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()
    },
    {
      id: 'rev-2',
      rating: 4,
      customer_name: 'Vikram Malhotra',
      title: 'Very comfortable',
      body: 'Great build quality and very comfortable to wear for long hours. Bass is deep but clean. Charging speed is super fast.',
      created_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString()
    },
    {
      id: 'rev-3',
      rating: 5,
      customer_name: 'Suresh Raina',
      title: 'Best buy of the year',
      body: 'Super fast delivery and premium packaging. Value for money product. The battery lasts forever!',
      created_at: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString()
    }
  ];

  const reviews = (dbReviews.length > 0 ? dbReviews : (allowMockFallback ? mockReviews : [])) as any[];

  const { average, count } = getAverageRating(reviews);
  const userHasReviewed = reviews.some((r: any) => r.user_id === user?.id);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (rating === 0) { toast.error('Please select a rating'); return; }
    if (!user) {
      setShowLoginPrompt(true);
      return;
    }

    try {
      await submitReview.mutateAsync({
        store_id: storeId,
        product_id: productId,
        user_id: user.id,
        rating,
        title: title || undefined,
        body: body || undefined,
      });
      toast.success('Review submitted!');
      setShowForm(false);
      setRating(0);
      setTitle('');
      setBody('');
    } catch (err: any) {
      if (err.message?.includes('duplicate')) {
        toast.error('You already reviewed this product');
      } else {
        toast.error('Failed to submit review');
      }
    }
  };

  const ratingDistribution = [5, 4, 3, 2, 1].map((star) => ({
    star,
    count: reviews.filter((r) => r.rating === star).length,
    pct: reviews.length ? (reviews.filter((r) => r.rating === star).length / reviews.length) * 100 : 0,
  }));

  return (
    <div className="space-y-6 pt-6 border-t" style={{ borderColor: colors.secondary }}>
      <h3 className="text-lg font-bold" style={{ fontFamily: fonts.heading }}>
        Ratings & Reviews
      </h3>

      {isLoading ? (
        <div className="py-8 text-center"><Loader2 className="h-5 w-5 animate-spin mx-auto" /></div>
      ) : (
        <>
          {/* Summary */}
          {count > 0 && (
            <div className="flex gap-8 items-start">
              <div className="text-center">
                <div className="text-4xl font-bold" style={{ color: colors.primary }}>{average}</div>
                <StarRating rating={Math.round(average)} color={colors.primary} />
                <p className="text-xs opacity-50 mt-1">{count} review{count !== 1 ? 's' : ''}</p>
              </div>
              <div className="flex-1 space-y-1.5">
                {ratingDistribution.map((d) => (
                  <div key={d.star} className="flex items-center gap-2 text-xs">
                    <span className="w-3">{d.star}</span>
                    <Star className="h-3 w-3" style={{ fill: colors.primary, color: colors.primary }} />
                    <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ backgroundColor: colors.secondary }}>
                      <div
                        className="h-full rounded-full transition-all"
                        style={{ width: `${d.pct}%`, backgroundColor: colors.primary }}
                      />
                    </div>
                    <span className="w-6 text-right opacity-50">{d.count}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Write review button */}
          {!userHasReviewed && !showForm && (
            <button
              onClick={() => setShowForm(true)}
              className="px-4 py-2 text-sm font-semibold"
              style={{
                backgroundColor: colors.primary,
                color: '#fff',
                borderRadius: `${borderRadius / 2}px`,
              }}
            >
              Write a Review
            </button>
          )}

          {/* Review Form */}
          {showForm && (
            <form onSubmit={handleSubmit} className="p-4 border space-y-4" style={{ borderColor: colors.secondary, borderRadius: `${borderRadius}px` }}>
              <div>
                <p className="text-sm font-medium mb-2">Your Rating</p>
                <InteractiveStars rating={rating} onChange={setRating} color={colors.primary} />
              </div>
              <input
                placeholder="Review title (optional)"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-3 py-2 text-sm border"
                style={{ borderColor: colors.secondary, borderRadius: `${borderRadius / 2}px`, backgroundColor: colors.card }}
              />
              <textarea
                placeholder="Share your experience..."
                value={body}
                onChange={(e) => setBody(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 text-sm border resize-none"
                style={{ borderColor: colors.secondary, borderRadius: `${borderRadius / 2}px`, backgroundColor: colors.card }}
              />
              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={submitReview.isPending}
                  className="px-4 py-2 text-sm font-semibold flex items-center gap-2"
                  style={{ backgroundColor: colors.primary, color: '#fff', borderRadius: `${borderRadius / 2}px` }}
                >
                  {submitReview.isPending && <Loader2 className="h-3 w-3 animate-spin" />}
                  Submit
                </button>
                <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 text-sm opacity-60">Cancel</button>
              </div>
            </form>
          )}

          {/* Reviews list */}
          <div className="space-y-4">
            {reviews.map((review) => (
              <div key={review.id} className="p-4 border" style={{ borderColor: colors.secondary, borderRadius: `${borderRadius}px` }}>
                <div className="flex items-center justify-between mb-2">
                  <StarRating rating={review.rating} size={14} color={colors.primary} />
                  <span className="text-[10px] opacity-40">{format(new Date(review.created_at), 'dd MMM yyyy')}</span>
                </div>
                {review.title && <h4 className="text-sm font-semibold mb-1">{review.title}</h4>}
                {review.body && <p className="text-sm opacity-70">{review.body}</p>}
                {review.is_verified_purchase && (
                  <div className="flex items-center gap-1 mt-2 text-[10px] font-medium" style={{ color: '#16a34a' }}>
                    <CheckCircle2 className="h-3 w-3" /> Verified Purchase
                  </div>
                )}
              </div>
            ))}
          </div>

          {count === 0 && !showForm && (
            <p className="text-sm opacity-40 text-center py-4">No reviews yet. Be the first to review!</p>
          )}
        </>
      )}

      {/* Login Prompt Modal */}
      {showLoginPrompt && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white text-black max-w-sm w-full p-6 shadow-2xl border flex flex-col" style={{ borderRadius: `${borderRadius}px`, borderColor: colors.secondary }}>
            <h3 className="text-lg font-bold mb-2" style={{ fontFamily: fonts.heading }}>Sign In Required</h3>
            <p className="text-sm opacity-80 leading-relaxed mb-6">
              You need to sign in to submit a review. Please sign in or create an account to share your feedback.
            </p>
            <div className="flex gap-2">
              <Link 
                to={`/store/${storeSlug}/account/auth?redirect=product`}
                className="flex-1 py-2 text-white font-semibold text-sm text-center transition hover:opacity-90 flex items-center justify-center"
                style={{ backgroundColor: colors.primary, borderRadius: `${borderRadius / 2}px` }}
              >
                Sign In
              </Link>
              <button 
                type="button"
                onClick={() => setShowLoginPrompt(false)}
                className="flex-1 py-2 border text-sm font-semibold transition hover:bg-black/5"
                style={{ borderColor: colors.secondary, borderRadius: `${borderRadius / 2}px` }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ReviewSection;
export { StarRating, getAverageRating };
