export interface ThemeTemplate {
  id: string;
  name: string;
  description: string;
  category: 'minimal' | 'bold' | 'elegant' | 'playful';
  isPremium: boolean;
  price: number; // in INR, 0 for free
  colors: {
    primary: string;
    secondary: string;
    accent: string;
    background: string;
    text: string;
    card: string;
  };
  fonts: {
    heading: string;
    body: string;
  };
  layout: 'grid' | 'list' | 'masonry' | 'hero';
  borderRadius: number;
  preview: {
    heroStyle: 'full-width' | 'split' | 'centered' | 'minimal';
    productCardStyle: 'simple' | 'overlay' | 'bordered' | 'floating';
    navStyle: 'top' | 'side' | 'hamburger';
  };
}

export const THEME_TEMPLATES: ThemeTemplate[] = [
  {
    id: 'minimal-light',
    name: 'Minimal Light',
    description: 'Clean, white space-focused design. Perfect for lifestyle and fashion brands.',
    category: 'minimal',
    isPremium: false,
    price: 0,
    colors: {
      primary: '#F97316',
      secondary: '#F3F4F6',
      accent: '#FED7AA',
      background: '#FFFFFF',
      text: '#111827',
      card: '#FFFFFF',
    },
    fonts: { heading: 'Inter', body: 'Inter' },
    layout: 'grid',
    borderRadius: 8,
    preview: { heroStyle: 'centered', productCardStyle: 'simple', navStyle: 'top' },
  },
  {
    id: 'dark-luxe',
    name: 'Dark Luxe',
    description: 'Sophisticated dark theme with gold accents. Ideal for premium products.',
    category: 'elegant',
    isPremium: true,
    price: 500,
    colors: {
      primary: '#D4A853',
      secondary: '#1F2937',
      accent: '#92702A',
      background: '#0F172A',
      text: '#F8FAFC',
      card: '#1E293B',
    },
    fonts: { heading: 'Playfair Display', body: 'Inter' },
    layout: 'grid',
    borderRadius: 4,
    preview: { heroStyle: 'full-width', productCardStyle: 'overlay', navStyle: 'top' },
  },
  {
    id: 'fresh-green',
    name: 'Fresh & Organic',
    description: 'Natural, earthy tones. Great for food, health, and organic product stores.',
    category: 'playful',
    isPremium: false,
    price: 0,
    colors: {
      primary: '#16A34A',
      secondary: '#F0FDF4',
      accent: '#BBF7D0',
      background: '#FFFFFF',
      text: '#14532D',
      card: '#FFFFFF',
    },
    fonts: { heading: 'Inter', body: 'Inter' },
    layout: 'grid',
    borderRadius: 12,
    preview: { heroStyle: 'split', productCardStyle: 'bordered', navStyle: 'top' },
  },
  {
    id: 'neon-pop',
    name: 'Neon Pop',
    description: 'Bold, vibrant, eye-catching. Built for streetwear, gadgets, and Gen-Z brands.',
    category: 'bold',
    isPremium: true,
    price: 500,
    colors: {
      primary: '#E11D48',
      secondary: '#18181B',
      accent: '#F43F5E',
      background: '#09090B',
      text: '#FAFAFA',
      card: '#18181B',
    },
    fonts: { heading: 'Space Grotesk', body: 'Inter' },
    layout: 'masonry',
    borderRadius: 16,
    preview: { heroStyle: 'full-width', productCardStyle: 'floating', navStyle: 'hamburger' },
  },
  {
    id: 'pastel-dream',
    name: 'Pastel Dream',
    description: 'Soft, calming pastels. Perfect for beauty, skincare, and handmade products.',
    category: 'playful',
    isPremium: true,
    price: 500,
    colors: {
      primary: '#A855F7',
      secondary: '#FAF5FF',
      accent: '#DDD6FE',
      background: '#FFFBFE',
      text: '#3B0764',
      card: '#FFFFFF',
    },
    fonts: { heading: 'Playfair Display', body: 'Inter' },
    layout: 'grid',
    borderRadius: 20,
    preview: { heroStyle: 'centered', productCardStyle: 'bordered', navStyle: 'top' },
  },
  {
    id: 'classic-serif',
    name: 'Classic Serif',
    description: 'Timeless, editorial look. Great for artisan, book, and craft stores.',
    category: 'elegant',
    isPremium: true,
    price: 500,
    colors: {
      primary: '#B45309',
      secondary: '#FFFBEB',
      accent: '#FDE68A',
      background: '#FEFCE8',
      text: '#451A03',
      card: '#FFFFFF',
    },
    fonts: { heading: 'Playfair Display', body: 'Inter' },
    layout: 'list',
    borderRadius: 2,
    preview: { heroStyle: 'split', productCardStyle: 'simple', navStyle: 'top' },
  },
];

export const FONT_OPTIONS = [
  'Inter',
  'Playfair Display',
  'Space Grotesk',
  'DM Sans',
  'Poppins',
  'Lora',
  'Roboto',
  'Montserrat',
];
