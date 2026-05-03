// Theme tokens for the Bazaar theme — handcraft / Indian artisan aesthetic.
export const tokens = {
  themeId: 'bazaar' as const,
  colors: {
    primary: '#9A2A2A',     // kumkum red
    accent: '#C9A227',      // brass gold
    background: '#FBF6EE',  // handmade paper
    surface: '#FFFFFF',
    text: '#2A1A0F',
    muted: '#6B5A4A',
    border: '#E7DBC6',
  },
  fonts: {
    heading: '"Cormorant Garamond", "Tiro Devanagari Hindi", serif',
    body: 'Inter, system-ui, sans-serif',
    accent: '"Tiro Devanagari Hindi", serif',
  },
  radius: { sm: '4px', md: '6px', lg: '12px' },
  shadow: '0 8px 24px -16px rgba(80, 40, 10, 0.25)',
  motion: { ease: 'cubic-bezier(0.22, 1, 0.36, 1)' },
} as const;

export type BazaarTokens = typeof tokens;
