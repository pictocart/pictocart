import { tokens } from '../tokens';

export const CoutureNewsletter = () => {
  return (
    <section
      className="border-t"
      style={{ borderColor: tokens.colors.border, background: tokens.colors.primary }}
    >
      <div className="mx-auto max-w-2xl px-6 py-20 text-center">
        <p
          className="mb-2 text-xs tracking-[0.3em] uppercase"
          style={{ color: tokens.colors.accent, fontFamily: tokens.fonts.accent }}
        >
          Stay in the Loop
        </p>
        <h2
          className="mb-4 text-3xl text-white md:text-4xl"
          style={{ fontFamily: tokens.fonts.heading }}
        >
          Join the Inner Circle
        </h2>
        <p className="mb-8 text-sm" style={{ color: '#9CA3AF' }}>
          Be the first to know about new drops, exclusive edits, and member-only pricing.
        </p>
        <form
          className="mx-auto flex max-w-md gap-3"
          onSubmit={(e) => e.preventDefault()}
        >
          <input
            type="email"
            placeholder="Enter your email"
            className="flex-1 border bg-white/10 px-4 py-3 text-sm text-white placeholder:text-gray-400 focus:outline-none"
            style={{ borderRadius: tokens.radius.sm, borderColor: 'rgba(255,255,255,0.2)' }}
          />
          <button
            type="submit"
            className="px-6 py-3 text-sm font-medium uppercase tracking-widest transition hover:opacity-90"
            style={{
              background: tokens.colors.accent,
              color: '#fff',
              borderRadius: tokens.radius.sm,
            }}
          >
            Subscribe
          </button>
        </form>
      </div>
    </section>
  );
};
