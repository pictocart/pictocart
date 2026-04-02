import { useParams, Link } from 'react-router-dom';
import { useStorefront } from '@/hooks/useStorefront';
import { useBlogPost } from '@/hooks/useBlogPosts';
import StorefrontLayout, { resolveTheme } from '@/components/storefront/StorefrontLayout';
import SEOHead from '@/components/storefront/SEOHead';
import ShareButton from '@/components/storefront/ShareButton';
import { Loader2, ArrowLeft } from 'lucide-react';

const StorefrontBlogPost = () => {
  const { slug, postSlug } = useParams<{ slug: string; postSlug: string }>();
  const { store, products, loading } = useStorefront(slug || '');
  const { data: post, isLoading: postLoading } = useBlogPost(store?.id, postSlug);

  if (loading || postLoading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  if (!store) return <div className="min-h-screen flex items-center justify-center"><p>Store not found</p></div>;
  if (!post) return <div className="min-h-screen flex items-center justify-center"><p>Post not found</p></div>;

  const theme = resolveTheme(store.theme);
  const { colors, fonts, borderRadius } = theme;

  return (
    <StorefrontLayout store={store} products={products}>
      <SEOHead
        title={post.seo_title || post.title}
        description={post.seo_description || post.body?.substring(0, 155)}
        ogImage={post.cover_image || undefined}
        url={`${window.location.origin}/store/${slug}/blog/${postSlug}`}
      />
      <article className="max-w-3xl mx-auto px-4 py-8">
        <div className="flex items-center gap-3 mb-6">
          <Link to={`/store/${slug}/blog`}><ArrowLeft className="h-5 w-5" style={{ color: colors.text }} /></Link>
          <span className="text-xs opacity-50">Back to Blog</span>
        </div>

        {post.cover_image && (
          <img src={post.cover_image} alt={post.title} className="w-full aspect-video object-cover mb-6" style={{ borderRadius: `${borderRadius}px` }} />
        )}

        <h1 className="text-3xl font-bold mb-3" style={{ fontFamily: fonts.heading }}>{post.title}</h1>
        <div className="flex items-center gap-3 mb-8">
          <span className="text-sm opacity-50">{new Date(post.created_at).toLocaleDateString()}</span>
          <ShareButton title={post.title} url={`${window.location.origin}/store/${slug}/blog/${postSlug}`} colors={colors} borderRadius={borderRadius} />
        </div>

        <div className="prose prose-sm max-w-none" style={{ color: colors.text, fontFamily: fonts.body }}>
          {post.body.split('\n').map((para, i) => para.trim() ? <p key={i}>{para}</p> : <br key={i} />)}
        </div>
      </article>
    </StorefrontLayout>
  );
};

export default StorefrontBlogPost;
