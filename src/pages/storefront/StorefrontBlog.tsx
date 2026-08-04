import { useParams, Link } from 'react-router-dom';
import { useStorefront } from '@/hooks/useStorefront';
import { usePublishedBlogPosts } from '@/hooks/useBlogPosts';
import StorefrontLayout, { resolveTheme } from '@/components/storefront/StorefrontLayout';
import { getStoreThemeTokens, getStorefrontConfig } from '@/lib/storefrontManifest';
import SEOHead from '@/components/storefront/SEOHead';
import { Loader2, ArrowLeft } from 'lucide-react';

const StorefrontBlog = () => {
  const { slug } = useParams<{ slug: string }>();
  const { store, products, loading } = useStorefront(slug || '');
  const { data: posts = [] } = usePublishedBlogPosts(store?.id);

  if (loading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  if (!store) return <div className="min-h-screen flex items-center justify-center"><p>Store not found</p></div>;

  const theme = resolveTheme(getStoreThemeTokens(store), store);
  const { colors, fonts, borderRadius } = theme;

  const storefrontConfig = getStorefrontConfig(store);
  const overrides = storefrontConfig?.theme_overrides || {};
  const journalSections = overrides.pages?.journal?.sectionsList || [];
  const journalListSection = journalSections.find((s: any) => s.type === 'journal_list');
  const journalProps = journalListSection?.props || {};

  const style = journalProps.style || 'grid';
  const limit = journalProps.limit || 6;
  const displayedPosts = posts.slice(0, limit);

  return (
    <StorefrontLayout store={store} products={products}>
      <SEOHead title={`Blog — ${store.name}`} description={`Latest articles from ${store.name}`} url={`${window.location.origin}/store/${slug}/blog`} />
      <div className="max-w-5xl mx-auto px-4 py-8">
        <div className="flex items-center gap-3 mb-8">
          <Link to={`/store/${slug}`}><ArrowLeft className="h-5 w-5" style={{ color: colors.text }} /></Link>
          <h1 className="text-2xl font-bold" style={{ fontFamily: fonts.heading }}>Blog</h1>
        </div>

        {posts.length === 0 ? (
          <div className="text-center py-16 opacity-50">No blog posts yet.</div>
        ) : style === 'list' ? (
          <div className="space-y-6">
            {displayedPosts.map((post) => (
              <Link
                key={post.id}
                to={`/store/${slug}/blog/${post.slug}`}
                className="group flex flex-col sm:flex-row gap-6 p-5 transition-shadow hover:shadow-lg border"
                style={{ backgroundColor: colors.card, borderRadius: `${borderRadius}px`, borderColor: colors.secondary }}
              >
                {(post.thumbnail_image || post.cover_image) && (
                  <div className="w-full sm:w-64 aspect-[16/10] overflow-hidden shrink-0 rounded-md">
                    <img src={post.thumbnail_image || post.cover_image} alt={post.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" loading="lazy" />
                  </div>
                )}
                <div className="flex-1 flex flex-col justify-between py-1">
                  <div className="space-y-2">
                    <p className="text-xs opacity-50">{new Date(post.created_at).toLocaleDateString()}</p>
                    <h2 className="font-bold text-xl mb-1 group-hover:text-primary transition-colors" style={{ fontFamily: fonts.heading }}>{post.title}</h2>
                    {post.seo_description && <p className="text-sm opacity-70 line-clamp-3">{post.seo_description}</p>}
                  </div>
                  <div className="text-xs font-semibold mt-4" style={{ color: colors.accent }}>Read Article →</div>
                </div>
              </Link>
            ))}
          </div>
        ) : style === 'minimal' ? (
          <div className="divide-y border-t border-b" style={{ borderColor: colors.secondary }}>
            {displayedPosts.map((post) => (
              <Link
                key={post.id}
                to={`/store/${slug}/blog/${post.slug}`}
                className="group block py-5 hover:bg-muted/10 transition-colors"
              >
                <div className="flex items-center gap-2 text-xs opacity-50 mb-1">
                  <span>{new Date(post.created_at).toLocaleDateString()}</span>
                  <span>•</span>
                  <span>Article</span>
                </div>
                <h2 className="font-bold text-lg group-hover:text-primary transition-colors" style={{ fontFamily: fonts.heading }}>{post.title}</h2>
                {post.seo_description && <p className="text-xs opacity-60 mt-1 line-clamp-1">{post.seo_description}</p>}
              </Link>
            ))}
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {displayedPosts.map((post) => (
              <Link
                key={post.id}
                to={`/store/${slug}/blog/${post.slug}`}
                className="group block overflow-hidden transition-shadow hover:shadow-lg border"
                style={{ backgroundColor: colors.card, borderRadius: `${borderRadius}px`, borderColor: colors.secondary }}
              >
                {(post.thumbnail_image || post.cover_image) && (
                  <div className="aspect-video overflow-hidden bg-muted/10">
                    <img src={post.thumbnail_image || post.cover_image} alt={post.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" loading="lazy" />
                  </div>
                )}
                <div className="p-5 flex-1 flex flex-col justify-between">
                  <div className="space-y-2">
                    <p className="text-xs opacity-50">{new Date(post.created_at).toLocaleDateString()}</p>
                    <h2 className="font-semibold text-base mb-1 group-hover:text-primary transition-colors" style={{ fontFamily: fonts.heading }}>{post.title}</h2>
                    {post.seo_description && <p className="text-xs opacity-65 line-clamp-2 leading-relaxed">{post.seo_description}</p>}
                  </div>
                  <div className="text-xs font-semibold mt-4" style={{ color: colors.accent }}>Read Article →</div>
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
