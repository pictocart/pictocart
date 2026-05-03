import { tokens } from './tokens';

interface HeroContent {
  kicker?: string;
  headline?: string;
  subhead?: string;
  cta_label?: string;
  cta_href?: string;
  image_url?: string;
}

export const BazaarHero = ({ content }: { content?: HeroContent }) => {
  const c = content ?? {};
  return (
    <section
      className="relative overflow-hidden"
      style={{ background: tokens.colors.background, color: tokens.colors.text }}
    >
      <div className="mx-auto grid max-w-6xl grid-cols-1 gap-8 px-6 py-16 md:grid-cols-5 md:py-24">
        <div className="md:col-span-3 md:order-1 order-2">
          {c.kicker && (
            <p
              className="mb-3 text-sm tracking-[0.25em] uppercase"
              style={{ fontFamily: tokens.fonts.accent, color: tokens.colors.primary }}
            >
              {c.kicker}
            </p>
          )}
          <h1
            className="text-4xl md:text-6xl leading-[1.05]"
            style={{ fontFamily: tokens.fonts.heading }}
          >
            {c.headline ?? 'Stories woven by hand.'}
          </h1>
          {c.subhead && (
            <p className="mt-5 max-w-md text-base md:text-lg" style={{ color: tokens.colors.muted }}>
              {c.subhead}
            </p>
          )}
          {c.cta_label && (
            <a
              href={c.cta_href ?? '#shop'}
              className="mt-8 inline-flex items-center px-6 py-3 text-sm tracking-wider uppercase transition"
              style={{
                background: tokens.colors.primary,
                color: '#fff',
                borderRadius: tokens.radius.sm,
              }}
            >
              {c.cta_label}
            </a>
          )}
        </div>
        <div className="md:col-span-2 md:order-2 order-1">
          {c.image_url && (
            <img
              src={c.image_url}
              alt=""
              className="w-full h-[280px] md:h-[460px] object-cover"
              style={{ borderRadius: tokens.radius.md, boxShadow: tokens.shadow }}
              loading="eager"
            />
          )}
        </div>
      </div>
    </section>
  );
};
