/**
 * Seeds Layout 1 themes into theme_master_projects table.
 * Run once: node seed-layout-themes.cjs
 */
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://wuqznkpaldtvpfpdtllp.supabase.co';
const SERVICE_KEY  = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind1cXpua3BhbGR0dnBmcGR0bGxwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NDIwMzYzMywiZXhwIjoyMDk5Nzc5NjMzfQ.IlrtNrVbIEbcQCQxv1ZRFEb6Y3DNlykAR1-EjaxEaP0';
const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

const IMG = 'https://wuqznkpaldtvpfpdtllp.supabase.co/storage/v1/object/public/theme-previews/layout-themes';

const THEMES = [
  {
    theme_id:      'layout1-noir-atelier',
    name:          'Noir Atelier',
    description:   'Luxury dark editorial — deep blacks, champagne gold accents, centered serif navbar, left sidebar filters, 4-column uniform grid. Layout 1.1 skeleton.',
    category:      'fashion',
    preview_image: `${IMG}/hero/noir-atelier.svg`,
    is_default:    false,
    is_active:     true,
    is_premium:    false,
    price:         0,
    manifest:      {
      layout_id:        'layout-1-1',
      sub_layout:       'classic-boutique',
      theme_id:         'layout1-noir-atelier',
      name:             'Noir Atelier',
      dna: {
        vibe:           'luxury dark editorial',
        style_keywords: ['minimal', 'luxury', 'editorial', 'serif', 'gold'],
      },
      colors: {
        primary:    '#c9a96e',
        secondary:  '#1a1a1a',
        accent:     '#c9a96e',
        background: '#0d0d0d',
        text:       '#f5f0eb',
        card:       '#1a1a1a',
      },
      fonts: { heading: 'Playfair Display', body: 'Inter' },
      border_radius: 3,
      skeleton: {
        navbar:   'logo-left-links-center-icons-right',
        sidebar:  'left',
        grid:     '4-col-uniform',
        hero:     'full-width-overlay',
        footer:   'multi-column',
      },
    },
  },
  {
    theme_id:      'layout1-ivory-luxe',
    name:          'Ivory Luxe',
    description:   'Warm ivory & burnished gold — refined, airy boutique feel. Same Classic Boutique skeleton as Noir Atelier but in cream and gold tones. Layout 1.1.',
    category:      'fashion',
    preview_image: `${IMG}/hero/ivory-luxe.svg`,
    is_default:    false,
    is_active:     true,
    is_premium:    false,
    price:         0,
    manifest:      {
      layout_id:        'layout-1-1',
      sub_layout:       'classic-boutique',
      theme_id:         'layout1-ivory-luxe',
      name:             'Ivory Luxe',
      dna: {
        vibe:           'warm ivory luxury boutique',
        style_keywords: ['ivory', 'warm', 'airy', 'gold', 'refined'],
      },
      colors: {
        primary:    '#8b6914',
        secondary:  '#f0ece4',
        accent:     '#8b6914',
        background: '#faf8f4',
        text:       '#1a1612',
        card:       '#f0ece4',
      },
      fonts: { heading: 'Playfair Display', body: 'Inter' },
      border_radius: 3,
      skeleton: {
        navbar:   'logo-left-links-center-icons-right',
        sidebar:  'left',
        grid:     '4-col-uniform',
        hero:     'full-width-overlay',
        footer:   'multi-column',
      },
    },
  },
  {
    theme_id:      'layout1-neon-drip',
    name:          'Neon Drip',
    description:   'Electric red-pink on midnight navy — pure streetwear energy. Hamburger nav with visible search bar, 50/50 hero, Pinterest masonry grid, sticky cart bar. Layout 1.2.',
    category:      'fashion',
    preview_image: `${IMG}/hero/neon-drip.svg`,
    is_default:    false,
    is_active:     true,
    is_premium:    false,
    price:         0,
    manifest:      {
      layout_id:        'layout-1-2',
      sub_layout:       'street-style-hub',
      theme_id:         'layout1-neon-drip',
      name:             'Neon Drip',
      dna: {
        vibe:           'neon streetwear energy',
        style_keywords: ['neon', 'dark', 'bold', 'street', 'masonry'],
      },
      colors: {
        primary:    '#ff3d6b',
        secondary:  '#1a1a2e',
        accent:     '#ff3d6b',
        background: '#0f0f1a',
        text:       '#f8fafc',
        card:       '#1a1a2e',
      },
      fonts: { heading: 'Space Grotesk', body: 'Inter' },
      border_radius: 12,
      skeleton: {
        navbar:   'hamburger-left-search-center-brand-right-cart-pill',
        sidebar:  'none',
        grid:     '2-col-masonry',
        hero:     'split-50-50',
        footer:   'single-row',
      },
    },
  },
  {
    theme_id:      'layout1-blush-street',
    name:          'Blush Street',
    description:   'Rose tones & hot pink — street attitude meets feminine edge. Same Street Style Hub skeleton as Neon Drip but in blush and magenta palette. Layout 1.2.',
    category:      'fashion',
    preview_image: `${IMG}/hero/blush-street.svg`,
    is_default:    false,
    is_active:     true,
    is_premium:    false,
    price:         0,
    manifest:      {
      layout_id:        'layout-1-2',
      sub_layout:       'street-style-hub',
      theme_id:         'layout1-blush-street',
      name:             'Blush Street',
      dna: {
        vibe:           'blush feminine streetwear',
        style_keywords: ['blush', 'pink', 'feminine', 'street', 'bold'],
      },
      colors: {
        primary:    '#e91e8c',
        secondary:  '#ffeef4',
        accent:     '#e91e8c',
        background: '#fff5f8',
        text:       '#1a0a12',
        card:       '#ffeef4',
      },
      fonts: { heading: 'Space Grotesk', body: 'Inter' },
      border_radius: 12,
      skeleton: {
        navbar:   'hamburger-left-search-center-brand-right-cart-pill',
        sidebar:  'none',
        grid:     '2-col-masonry',
        hero:     'split-50-50',
        footer:   'single-row',
      },
    },
  },
];

async function seed() {
  for (const t of THEMES) {
    // Check if already exists
    const { data: existing } = await supabase
      .from('theme_master_projects')
      .select('id')
      .eq('theme_id', t.theme_id)
      .maybeSingle();

    if (existing) {
      // Update
      const { error } = await supabase
        .from('theme_master_projects')
        .update({
          name: t.name,
          description: t.description,
          category: t.category,
          preview_image: t.preview_image,
          is_active: t.is_active,
          is_premium: t.is_premium,
          price: t.price,
        })
        .eq('theme_id', t.theme_id);
      if (error) console.error('Update error', t.theme_id, error.message);
      else console.log('Updated:', t.theme_id);
    } else {
      // Insert
      const { error } = await supabase
        .from('theme_master_projects')
        .insert({
          theme_id:      t.theme_id,
          name:          t.name,
          description:   t.description,
          category:      t.category,
          preview_image: t.preview_image,
          is_default:    t.is_default,
          is_active:     t.is_active,
          is_premium:    t.is_premium,
          price:         t.price,
        });
      if (error) console.error('Insert error', t.theme_id, error.message);
      else console.log('Inserted:', t.theme_id);
    }
  }
  console.log('\nDone. These themes will now appear in onboarding.');
}

seed().catch(console.error);
