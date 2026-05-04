import { tokens } from '../tokens';

export interface BlogStripPost {
  id: string;
  title: string;
  slug: string;
  cover_image: string | null;
  thumbnail_image?: string | null;
  seo_description: string | null;
  created_at: string;
}

interface Props {
  posts: BlogStripPost[];
  storeSlug: string;
  /** Honors custom-domain rewrite: when on custom domain, links go to /blog/:slug instead of /store/:slug/blog/:slug */
  basePath?: string;
}

/**
 * Bazaar Journal strip — displays up to 3 most recent published blog posts
 * with handcrafted serif typography. Posts appear here automatically the
 * moment a merchant toggles `is_published` in the dashboard.
 */
export const BazaarBlogStrip = ({ posts, storeSlug, basePath }: Props) => {
  if (!posts?.length) return null;
  const root = basePath ?? `/store/${storeSlug}`;

  return (
    <section
      id="blog"
      className="border-t"
      style={{ borderColor: tokens.colors.border, background: tokens.colors.surface }}
    >
      <div className="mx-auto max-w-6xl px-6 py-16">
        <div className="mb-8 flex items-end justify-between">
          <div>
            <p
              className="mb-2 text-xs tracking-[0.25em] uppercase"
              style={{ fontFamily: tokens.fonts.accent, color: tokens.colors.primary }}
            >
              Journal
            </p>
            <h2 className="text-3xl md:text-4xl" style={{ fontFamily: tokens.fonts.heading }}>
              Stories from the loom
            </h2>
          </div>
          <a
            href={`${root}/blog`}
            className="hidden md:inline text-sm underline-offset-4 hover:underline"
            style={{ color: tokens.colors.primary }}
          >
            View all →
          </a>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {posts.slice(0, 3).map((post) => (
            <a
              key={post.id}
              href={`${root}/blog/${post.slug}`}
              className="group block overflow-hidden transition-shadow hover:shadow-lg"
              style={{
                background: tokens.colors.background,
                borderRadius: tokens.radius.md,
                border: `1px solid ${tokens.colors.border}`,
              }}
            >
              {(post.thumbnail_image || post.cover_image) ? (
                <div className="aspect-[4/3] overflow-hidden">
                  <img
                    src={post.thumbnail_image || post.cover_image || ''}
                    alt={post.title}
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                    loading="lazy"
                  />
                </div>
              ) : (
                <div
                  className="aspect-[4/3]"
                  style={{ background: `linear-gradient(135deg, ${tokens.colors.background}, ${tokens.colors.border})` }}
                />
              )}
              <div className="p-5">
                <p
                  className="mb-2 text-[11px] tracking-[0.2em] uppercase"
                  style={{ color: tokens.colors.muted, fontFamily: tokens.fonts.accent }}
                >
                  {new Date(post.created_at).toLocaleDateString('en-IN', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                  })}
                </p>
                <h3
                  className="text-xl leading-snug mb-2"
                  style={{ fontFamily: tokens.fonts.heading, color: tokens.colors.text }}
                >
                  {post.title}
                </h3>
                {post.seo_description && (
                  <p className="text-sm line-clamp-2" style={{ color: tokens.colors.muted }}>
                    {post.seo_description}
                  </p>
                )}
              </div>
            </a>
          ))}
        </div>

        <div className="mt-6 md:hidden text-center">
          <a href={`${root}/blog`} className="text-sm underline" style={{ color: tokens.colors.primary }}>
            View all stories →
          </a>
        </div>
      </div>
    </section>
  );
};
