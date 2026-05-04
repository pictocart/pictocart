import { useParams, Link } from 'react-router-dom';
import { useStorefront } from '@/hooks/useStorefront';
import { usePublishedBlogPosts } from '@/hooks/useBlogPosts';
import StorefrontLayout, { resolveTheme } from '@/components/storefront/StorefrontLayout';
import SEOHead from '@/components/storefront/SEOHead';
import { Loader2, ArrowLeft } from 'lucide-react';

const StorefrontBlog = () => {
  const { slug } = useParams<{ slug: string }>();
  const { store, products, loading } = useStorefront(slug || '');
  const { data: posts = [] } = usePublishedBlogPosts(store?.id);

  if (loading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  if (!store) return <div className="min-h-screen flex items-center justify-center"><p>Store not found</p></div>;

  const theme = resolveTheme(store.theme);
  const { colors, fonts, borderRadius } = theme;

  return (
    <StorefrontLayout store={store} products={products}>
      <SEOHead title={`Blog — ${store.name}`} description={`Latest articles from ${store.name}`} url={`${window.location.origin}/store/${slug}/blog`} />
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="flex items-center gap-3 mb-8">
          <Link to={`/store/${slug}`}><ArrowLeft className="h-5 w-5" style={{ color: colors.text }} /></Link>
          <h1 className="text-2xl font-bold" style={{ fontFamily: fonts.heading }}>Blog</h1>
        </div>

        {posts.length === 0 ? (
          <div className="text-center py-16 opacity-50">No blog posts yet.</div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2">
            {posts.map((post) => (
              <Link
                key={post.id}
                to={`/store/${slug}/blog/${post.slug}`}
                className="group block overflow-hidden transition-shadow hover:shadow-lg"
                style={{ backgroundColor: colors.card, borderRadius: `${borderRadius}px`, border: `1px solid ${colors.secondary}` }}
              >
                {(post.thumbnail_image || post.cover_image) && (
                  <div className="aspect-video overflow-hidden">
                    <img src={post.thumbnail_image || post.cover_image} alt={post.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" loading="lazy" />
                  </div>
                )}
                <div className="p-4">
                  <h2 className="font-semibold text-lg mb-1" style={{ fontFamily: fonts.heading }}>{post.title}</h2>
                  <p className="text-xs opacity-50">{new Date(post.created_at).toLocaleDateString()}</p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </StorefrontLayout>
  );
};

export default StorefrontBlog;
