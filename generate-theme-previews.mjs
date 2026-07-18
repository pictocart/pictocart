/**
 * Generates 4 clothing-store theme preview SVGs and uploads them to
 * Supabase Storage bucket: theme-previews
 * Keys: layout-themes/noir-atelier.svg  etc.
 */
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://wuqznkpaldtvpfpdtllp.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind1cXpua3BhbGR0dnBmcGR0bGxwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQyMDM2MzMsImV4cCI6MjA5OTc3OTYzM30.lxhNQMmXDF7_BNSyCLtg8uhgMqnUNvwU_8FRy-7lxkE';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const themes = [
  {
    id: 'noir-atelier',
    bg: '#0d0d0d',
    surface: '#1a1a1a',
    accent: '#c9a96e',
    textPrimary: '#f5f0eb',
    textMuted: '#888888',
    border: '#2a2a2a',
    name: 'Noir Atelier',
    tagline: 'Luxury Editorial',
  },
  {
    id: 'ivory-luxe',
    bg: '#faf8f4',
    surface: '#f0ece4',
    accent: '#8b6914',
    textPrimary: '#1a1612',
    textMuted: '#8a7f72',
    border: '#e8e0d4',
    name: 'Ivory Luxe',
    tagline: 'Warm & Refined',
  },
  {
    id: 'neon-drip',
    bg: '#0f0f1a',
    surface: '#1a1a2e',
    accent: '#ff3d6b',
    textPrimary: '#f8fafc',
    textMuted: '#94a3b8',
    border: '#1e1e35',
    name: 'Neon Drip',
    tagline: 'Street Energy',
  },
  {
    id: 'blush-street',
    bg: '#fff5f8',
    surface: '#ffeef4',
    accent: '#e91e8c',
    textPrimary: '#1a0a12',
    textMuted: '#9b6e80',
    border: '#fad4e4',
    name: 'Blush Street',
    tagline: 'Bold Feminine',
  },
];

function makeSVG(t) {
  const W = 800, H = 500;
  // product cards row
  const cards = [
    { x: 40,  label: 'Silk Midi Dress',    price: '₹2,499', stars: 5 },
    { x: 220, label: 'Linen Blazer',       price: '₹3,899', stars: 4 },
    { x: 400, label: 'Wide Leg Trousers',  price: '₹1,799', stars: 5 },
    { x: 580, label: 'Knit Cardigan',      price: '₹2,199', stars: 4 },
  ];
  const cardW = 160, cardH = 210;

  const starRow = (filled, x, y, color) => {
    const stars = [];
    for (let i = 0; i < 5; i++) {
      stars.push(
        `<text x="${x + i * 14}" y="${y}" fill="${i < filled ? '#f59e0b' : '#444'}" font-size="12">★</text>`
      );
    }
    return stars.join('');
  };

  const productCards = cards.map((c) => `
    <g>
      <rect x="${c.x}" y="240" width="${cardW}" height="${cardH}" rx="12"
            fill="${t.surface}" stroke="${t.border}" stroke-width="1"/>
      <!-- image area with gradient -->
      <rect x="${c.x}" y="240" width="${cardW}" height="120" rx="12"
            fill="url(#imgGrad_${t.id})"/>
      <!-- clothing silhouette -->
      <rect x="${c.x + 55}" y="258" width="50" height="70" rx="8"
            fill="${t.accent}" opacity="0.35"/>
      <rect x="${c.x + 63}" y="252" width="34" height="20" rx="4"
            fill="${t.accent}" opacity="0.5"/>
      <!-- name -->
      <text x="${c.x + 12}" y="${240 + 138}" fill="${t.textPrimary}"
            font-family="Georgia,serif" font-size="11" font-weight="600">${c.label}</text>
      <!-- price -->
      <text x="${c.x + 12}" y="${240 + 156}" fill="${t.accent}"
            font-family="Georgia,serif" font-size="12" font-weight="700">${c.price}</text>
      <!-- stars -->
      ${starRow(c.stars, c.x + 10, 240 + 174, t.accent)}
      <!-- add to cart btn -->
      <rect x="${c.x + 10}" y="${240 + 182}" width="${cardW - 20}" height="20" rx="6"
            fill="${t.accent}"/>
      <text x="${c.x + cardW / 2}" y="${240 + 196}" fill="#ffffff"
            font-family="sans-serif" font-size="9" font-weight="700"
            text-anchor="middle">Add to Cart</text>
    </g>
  `).join('');

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs>
    <linearGradient id="imgGrad_${t.id}" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="${t.accent}" stop-opacity="0.25"/>
      <stop offset="100%" stop-color="${t.surface}"/>
    </linearGradient>
    <linearGradient id="heroBg_${t.id}" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${t.accent}" stop-opacity="0.18"/>
      <stop offset="100%" stop-color="${t.bg}"/>
    </linearGradient>
  </defs>

  <!-- Background -->
  <rect width="${W}" height="${H}" fill="${t.bg}"/>

  <!-- Browser chrome bar -->
  <rect width="${W}" height="32" fill="${t.surface}"/>
  <circle cx="16" cy="16" r="5" fill="#ff5f57" opacity="0.8"/>
  <circle cx="30" cy="16" r="5" fill="#ffbd2e" opacity="0.8"/>
  <circle cx="44" cy="16" r="5" fill="#28c840" opacity="0.8"/>
  <rect x="68" y="8" width="200" height="16" rx="8" fill="${t.border}"/>
  <text x="100" y="20" fill="${t.textMuted}" font-family="sans-serif" font-size="9">
    yourbrand.com
  </text>

  <!-- Navbar -->
  <rect y="32" width="${W}" height="44" fill="${t.surface}" stroke="${t.border}" stroke-width="1"/>
  <text x="24" y="60" fill="${t.accent}" font-family="Georgia,serif"
        font-size="16" font-weight="900" letter-spacing="3">BRAND</text>
  <text x="240" y="60" fill="${t.textMuted}" font-family="sans-serif" font-size="11">New Arrivals</text>
  <text x="340" y="60" fill="${t.textMuted}" font-family="sans-serif" font-size="11">Women</text>
  <text x="410" y="60" fill="${t.textMuted}" font-family="sans-serif" font-size="11">Men</text>
  <text x="470" y="60" fill="${t.textMuted}" font-family="sans-serif" font-size="11">Sale</text>
  <!-- Cart icon area -->
  <text x="730" y="62" fill="${t.textPrimary}" font-family="sans-serif" font-size="18">🛒</text>
  <circle cx="756" cy="46" r="8" fill="${t.accent}"/>
  <text x="756" y="50" fill="#fff" font-family="sans-serif" font-size="9"
        text-anchor="middle" font-weight="700">2</text>
  <text x="760" y="62" fill="${t.textMuted}" font-family="sans-serif" font-size="18">♡</text>

  <!-- Hero banner -->
  <rect y="76" width="${W}" height="152" fill="url(#heroBg_${t.id})"/>
  <text x="40" y="116" fill="${t.accent}" font-family="sans-serif"
        font-size="10" font-weight="700" letter-spacing="4">NEW COLLECTION</text>
  <text x="40" y="148" fill="${t.textPrimary}" font-family="Georgia,serif"
        font-size="36" font-weight="900">Summer Edit</text>
  <text x="40" y="188" fill="${t.textPrimary}" font-family="Georgia,serif"
        font-size="36" font-weight="900">2025</text>
  <!-- Hero CTA button -->
  <rect x="40" y="198" width="110" height="26" rx="6" fill="${t.accent}"/>
  <text x="95" y="216" fill="#ffffff" font-family="sans-serif"
        font-size="11" font-weight="700" text-anchor="middle">Shop Now →</text>
  <!-- Hero decorative shape -->
  <circle cx="650" cy="152" r="90" fill="${t.accent}" opacity="0.08"/>
  <circle cx="700" cy="120" r="55" fill="${t.accent}" opacity="0.10"/>
  <!-- Clothing hanger decoration -->
  <rect x="590" y="90" width="60" height="100" rx="10" fill="${t.accent}" opacity="0.18"/>
  <rect x="610" y="80" width="20" height="24" rx="4" fill="${t.accent}" opacity="0.25"/>

  <!-- Section label -->
  <text x="40" y="232" fill="${t.textMuted}" font-family="sans-serif"
        font-size="10" font-weight="700" letter-spacing="3">TRENDING NOW</text>

  <!-- Product cards -->
  ${productCards}

  <!-- Trust bar at bottom -->
  <rect y="464" width="${W}" height="36" fill="${t.surface}" stroke="${t.border}" stroke-width="1"/>
  <text x="60"  y="487" fill="${t.accent}" font-family="sans-serif" font-size="11" text-anchor="middle">🚚</text>
  <text x="110" y="487" fill="${t.textMuted}" font-family="sans-serif" font-size="10">Free Delivery</text>
  <text x="280" y="487" fill="${t.accent}" font-family="sans-serif" font-size="11" text-anchor="middle">↩</text>
  <text x="340" y="487" fill="${t.textMuted}" font-family="sans-serif" font-size="10">Easy Returns</text>
  <text x="490" y="487" fill="${t.accent}" font-family="sans-serif" font-size="11" text-anchor="middle">🔒</text>
  <text x="545" y="487" fill="${t.textMuted}" font-family="sans-serif" font-size="10">Secure Pay</text>
  <text x="680" y="487" fill="${t.accent}" font-family="sans-serif" font-size="11" text-anchor="middle">★</text>
  <text x="730" y="487" fill="${t.textMuted}" font-family="sans-serif" font-size="10">4.8 Rating</text>

  <!-- Theme name watermark -->
  <text x="${W - 16}" y="${H - 10}" fill="${t.textMuted}" font-family="sans-serif"
        font-size="9" text-anchor="end" opacity="0.5">${t.name} · ${t.tagline}</text>
</svg>`;
}

async function ensureBucket() {
  const { data: buckets } = await supabase.storage.listBuckets();
  const exists = buckets?.some(b => b.name === 'theme-previews');
  if (!exists) {
    const { error } = await supabase.storage.createBucket('theme-previews', { public: true });
    if (error) console.warn('Bucket creation:', error.message);
    else console.log('✓ Created bucket theme-previews');
  } else {
    console.log('✓ Bucket theme-previews already exists');
  }
}

async function upload(theme) {
  const svg = makeSVG(theme);
  const buffer = Buffer.from(svg, 'utf-8');
  const path = `layout-themes/${theme.id}.svg`;

  const { error } = await supabase.storage
    .from('theme-previews')
    .upload(path, buffer, {
      contentType: 'image/svg+xml',
      upsert: true,
    });

  if (error) {
    console.error(`✗ ${theme.id}:`, error.message);
    return null;
  }

  const { data } = supabase.storage.from('theme-previews').getPublicUrl(path);
  console.log(`✓ ${theme.id}:`, data.publicUrl);
  return data.publicUrl;
}

await ensureBucket();
const urls = {};
for (const t of themes) {
  const url = await upload(t);
  if (url) urls[t.id] = url;
}

console.log('\n\nFinal URLs (paste into AdminSubLayout.tsx):\n');
console.log(JSON.stringify(urls, null, 2));
