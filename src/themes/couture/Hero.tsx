import { tokens } from './tokens';

interface HeroContent {
  kicker?: string;
  headline?: string;
  subhead?: string;
  cta_label?: string;
  cta_href?: string;
  image_url?: string;
}

export const CoutureHero = ({ content }: { content?: HeroContent }) => {
  const c = content ?? {};
  const bgImage = c.image_url || '';
  return (
    <section
      className="relative flex min-h-[90vh] items-center justify-center overflow-hidden"
      style={{ background: tokens.colors.primary, color: '#fff' }}
    >
      {bgImage && (
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url(${bgImage})`, opacity: 0.4 }}
        />
      )}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/60" />
      <div className="relative z-10 mx-auto max-w-3xl px-6 text-center">
        {c.kicker && (
          <p
            className="mb-4 text-xs tracking-[0.3em] uppercase"
            style={{ color: tokens.colors.accent, fontFamily: tokens.fonts.accent }}
          >
            {c.kicker}
          </p>
        )}
        <h1
          className="text-5xl font-bold leading-[1.05] md:text-7xl"
          style={{ fontFamily: tokens.fonts.heading }}
        >
          {c.headline ?? 'Define Your Style'}
        </h1>
        {c.subhead && (
          <p className="mx-auto mt-6 max-w-lg text-base md:text-lg" style={{ opacity: 0.8 }}>
            {c.subhead}
          </p>
        )}
        {c.cta_label && (
          <a
            href={c.cta_href ?? '#shop'}
            className="mt-10 inline-flex items-center gap-2 px-10 py-4 text-sm font-medium uppercase tracking-widest transition hover:opacity-90"
            style={{
              background: tokens.colors.accent,
              color: '#fff',
              borderRadius: tokens.radius.sm,
            }}
          >
            {c.cta_label}
          </a>
        )}
      </div>
    </section>
  );
};
