import { useParams, Link } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useStorefront } from '@/hooks/useStorefront';
import { useBlogPost } from '@/hooks/useBlogPosts';
import StorefrontLayout, { resolveTheme } from '@/components/storefront/StorefrontLayout';
import { getStoreThemeTokens } from '@/lib/storefrontManifest';
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

  const theme = resolveTheme(getStoreThemeTokens(store));
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

        <div
          className="max-w-none leading-[1.85] text-[1.0625rem]"
          style={{ color: colors.text, fontFamily: fonts.body }}
        >
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={{
              h1: ({ children }) => (
                <h1
                  className="mt-10 mb-5 text-3xl md:text-4xl font-semibold leading-tight tracking-tight"
                  style={{ fontFamily: fonts.heading, color: colors.text }}
                >
                  {children}
                </h1>
              ),
              h2: ({ children }) => (
                <h2
                  className="mt-12 mb-4 text-2xl md:text-3xl font-semibold leading-snug tracking-tight"
                  style={{ fontFamily: fonts.heading, color: colors.text }}
                >
                  {children}
                </h2>
              ),
              h3: ({ children }) => (
                <h3
                  className="mt-8 mb-3 text-xl md:text-2xl font-semibold"
                  style={{ fontFamily: fonts.heading, color: colors.text }}
                >
                  {children}
                </h3>
              ),
              p: ({ children }) => <p className="my-5">{children}</p>,
              ul: ({ children }) => <ul className="my-5 ml-6 list-disc space-y-2">{children}</ul>,
              ol: ({ children }) => <ol className="my-5 ml-6 list-decimal space-y-2">{children}</ol>,
              li: ({ children }) => <li className="leading-[1.8]">{children}</li>,
              strong: ({ children }) => (
                <strong className="font-semibold" style={{ color: colors.text }}>{children}</strong>
              ),
              em: ({ children }) => <em className="italic opacity-90">{children}</em>,
              blockquote: ({ children }) => (
                <blockquote
                  className="my-6 border-l-2 pl-5 italic opacity-80"
                  style={{ borderColor: colors.primary, fontFamily: fonts.heading }}
                >
                  {children}
                </blockquote>
              ),
              a: ({ children, href }) => (
                <a href={href} className="underline underline-offset-4 hover:opacity-70" style={{ color: colors.primary }}>
                  {children}
                </a>
              ),
              hr: () => <hr className="my-10 opacity-20" />,
              img: ({ src, alt }) => (
                <img src={src} alt={alt || ''} className="w-full my-8" style={{ borderRadius: `${borderRadius}px` }} />
              ),
              code: ({ children }) => (
                <code className="px-1.5 py-0.5 rounded text-sm" style={{ background: `${colors.primary}15` }}>
                  {children}
                </code>
              ),
            }}
          >
            {post.body}
          </ReactMarkdown>
        </div>
      </article>
    </StorefrontLayout>
  );
};

export default StorefrontBlogPost;
