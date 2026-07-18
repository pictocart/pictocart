export const tokens = {
  themeId: 'couture' as const,
  colors: {
    primary: '#1A1A2E',
    accent: '#E94560',
    background: '#FAFAFA',
    surface: '#FFFFFF',
    text: '#1A1A2E',
    muted: '#6B7280',
    border: '#E5E7EB',
  },
  fonts: {
    heading: '"Syne", "Playfair Display", serif',
    body: '"DM Sans", "Inter", sans-serif',
    accent: '"Syne", sans-serif',
  },
  radius: { sm: '2px', md: '4px', lg: '8px' },
  shadow: '0 4px 20px rgba(0, 0, 0, 0.06)',
  motion: { ease: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)' },
} as const;
