/**
 * Generates clothing hero + product SVG images for all 4 themes.
 * Uploads to Supabase storage bucket: theme-previews
 * Paths:
 *   layout-themes/hero/{themeId}.svg        — full-width hero banner
 *   layout-themes/products/{themeId}-{n}.svg — product card images (4 per theme)
 */
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const SUPABASE_URL = 'https://wuqznkpaldtvpfpdtllp.supabase.co';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind1cXpua3BhbGR0dnBmcGR0bGxwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NDIwMzYzMywiZXhwIjoyMDk5Nzc5NjMzfQ.IlrtNrVbIEbcQCQxv1ZRFEb6Y3DNlykAR1-EjaxEaP0';
const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

const THEMES = {
  'noir-atelier': { bg: '#0d0d0d', surface: '#181818', accent: '#c9a96e', text: '#f5f0eb', muted: '#777', border: '#2a2a2a' },
  'ivory-luxe':   { bg: '#faf8f4', surface: '#f0ece4', accent: '#8b6914', text: '#1a1612', muted: '#8a7f72', border: '#e0d8cc' },
  'neon-drip':    { bg: '#0f0f1a', surface: '#1a1a2e', accent: '#ff3d6b', text: '#f8fafc', muted: '#94a3b8', border: '#1e1e35' },
  'blush-street': { bg: '#fff5f8', surface: '#ffeef4', accent: '#e91e8c', text: '#1a0a12', muted: '#9b6e80', border: '#fad4e4' },
};

const PRODUCTS = [
  { name: 'Silk Midi Dress',    price: '2,499', badge: 'NEW',  stars: 5 },
  { name: 'Linen Blazer Set',   price: '3,899', badge: 'SALE', stars: 4 },
  { name: 'Wide Leg Trousers',  price: '1,799', badge: '',     stars: 5 },
  { name: 'Knit Cardigan',      price: '2,199', badge: 'HOT',  stars: 4 },
];

// ── Hero SVG (1200×600) ───────────────────────────────────────────────
function makeHero(themeId, t) {
  const isDark = t.text === '#f5f0eb' || t.text === '#f8fafc';
  // decorative clothing shapes
  const shapes = `
    <!-- hanging garment silhouettes -->
    <rect x="720" y="60" width="90" height="130" rx="18" fill="${t.accent}" fill-opacity="0.22"/>
    <rect x="744" y="44" width="42" height="30" rx="8" fill="${t.accent}" fill-opacity="0.30"/>
    <line x1="765" y1="44" x2="765" y2="30" stroke="${t.accent}" stroke-width="2" stroke-opacity="0.5"/>
    <circle cx="765" cy="26" r="6" fill="none" stroke="${t.accent}" stroke-width="2" stroke-opacity="0.5"/>

    <rect x="850" y="80" width="70" height="110" rx="14" fill="${t.accent}" fill-opacity="0.14"/>
    <rect x="869" y="66" width="32" height="24" rx="6" fill="${t.accent}" fill-opacity="0.20"/>
    <line x1="885" y1="66" x2="885" y2="52" stroke="${t.accent}" stroke-width="2" stroke-opacity="0.35"/>
    <circle cx="885" cy="48" r="5" fill="none" stroke="${t.accent}" stroke-width="2" stroke-opacity="0.35"/>

    <rect x="970" y="50" width="110" height="155" rx="20" fill="${t.accent}" fill-opacity="0.10"/>
    <rect x="1000" y="34" width="50" height="28" rx="8" fill="${t.accent}" fill-opacity="0.16"/>
    <line x1="1025" y1="34" x2="1025" y2="18" stroke="${t.accent}" stroke-width="2" stroke-opacity="0.3"/>
    <circle cx="1025" cy="14" r="7" fill="none" stroke="${t.accent}" stroke-width="2" stroke-opacity="0.3"/>

    <!-- decorative circles -->
    <circle cx="900" cy="300" r="180" fill="${t.accent}" fill-opacity="0.05"/>
    <circle cx="1100" cy="500" r="120" fill="${t.accent}" fill-opacity="0.07"/>
  `;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="600" viewBox="0 0 1200 600">
  <defs>
    <linearGradient id="heroBg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${t.bg}"/>
      <stop offset="100%" stop-color="${isDark ? '#000' : t.surface}"/>
    </linearGradient>
    <linearGradient id="accentLine" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="${t.accent}"/>
      <stop offset="100%" stop-color="${t.accent}" stop-opacity="0"/>
    </linearGradient>
  </defs>

  <!-- Background -->
  <rect width="1200" height="600" fill="url(#heroBg)"/>
  ${shapes}

  <!-- Left content -->
  <text x="72" y="120" fill="${t.accent}" font-family="Georgia,serif"
        font-size="11" font-weight="700" letter-spacing="6">SUMMER COLLECTION 2025</text>

  <!-- Headline -->
  <text x="68" y="210" fill="${t.text}" font-family="Georgia,serif"
        font-size="72" font-weight="900" font-style="italic">Effortless</text>
  <text x="68" y="290" fill="${t.text}" font-family="Georgia,serif"
        font-size="72" font-weight="900">Elegance.</text>

  <!-- Subtitle -->
  <text x="70" y="340" fill="${t.muted}" font-family="sans-serif"
        font-size="16">Curated fashion for the modern woman —</text>
  <text x="70" y="362" fill="${t.muted}" font-family="sans-serif"
        font-size="16">crafted with intention, worn with confidence.</text>

  <!-- Divider line -->
  <rect x="70" y="388" width="120" height="2" fill="url(#accentLine)"/>

  <!-- CTA Buttons -->
  <rect x="70" y="408" width="170" height="48" rx="8" fill="${t.accent}"/>
  <text x="155" y="438" fill="#ffffff" font-family="sans-serif"
        font-size="14" font-weight="700" text-anchor="middle">Shop Collection →</text>

  <rect x="258" y="408" width="148" height="48" rx="8" fill="none"
        stroke="${t.accent}" stroke-width="2"/>
  <text x="332" y="438" fill="${t.accent}" font-family="sans-serif"
        font-size="14" font-weight="600" text-anchor="middle">View Lookbook</text>

  <!-- Trust strip -->
  <text x="70" y="506" fill="${t.muted}" font-family="sans-serif" font-size="12">
    ✓ Free delivery above ₹999
  </text>
  <text x="70" y="526" fill="${t.muted}" font-family="sans-serif" font-size="12">
    ✓ 15-day hassle-free returns  ·  ✓ 4.9★ rated by 12,000+ customers
  </text>

  <!-- Price tag decoration -->
  <rect x="70" y="548" width="280" height="28" rx="6" fill="${t.accent}" fill-opacity="0.08" stroke="${t.accent}" stroke-opacity="0.2" stroke-width="1"/>
  <text x="82" y="567" fill="${t.accent}" font-family="sans-serif" font-size="11" font-weight="600">
    🏷  New arrivals starting ₹699
  </text>
</svg>`;
}

// ── Product card SVG (400×520) ────────────────────────────────────────
function makeProduct(themeId, t, product, idx) {
  const isDark = t.text === '#f5f0eb' || t.text === '#f8fafc';
  const badgeColor = product.badge === 'SALE' ? '#ef4444' : product.badge === 'NEW' ? '#16a34a' : product.badge === 'HOT' ? '#f97316' : t.accent;

  // Different garment silhouette per slot
  const garments = [
    // Dress
    `<rect x="140" y="50" width="120" height="180" rx="20" fill="${t.accent}" fill-opacity="0.30"/>
     <rect x="160" y="30" width="80" height="40" rx="12" fill="${t.accent}" fill-opacity="0.40"/>
     <rect x="175" y="18" width="50" height="26" rx="8" fill="${t.accent}" fill-opacity="0.25"/>
     <ellipse cx="200" cy="140" rx="30" ry="45" fill="${t.accent}" fill-opacity="0.12"/>`,
    // Blazer
    `<rect x="120" y="40" width="160" height="190" rx="16" fill="${t.accent}" fill-opacity="0.25"/>
     <rect x="145" y="40" width="40" height="100" rx="8" fill="${t.accent}" fill-opacity="0.18"/>
     <rect x="215" y="40" width="40" height="100" rx="8" fill="${t.accent}" fill-opacity="0.18"/>
     <line x1="200" y1="55" x2="200" y2="220" stroke="${t.accent}" stroke-width="2" stroke-opacity="0.3"/>`,
    // Trousers
    `<rect x="150" y="30" width="100" height="60" rx="10" fill="${t.accent}" fill-opacity="0.28"/>
     <rect x="150" y="88" width="46" height="150" rx="12" fill="${t.accent}" fill-opacity="0.25"/>
     <rect x="204" y="88" width="46" height="150" rx="12" fill="${t.accent}" fill-opacity="0.25"/>`,
    // Cardigan
    `<rect x="115" y="35" width="170" height="195" rx="20" fill="${t.accent}" fill-opacity="0.22"/>
     <rect x="155" y="35" width="90" height="20" rx="6" fill="${t.accent}" fill-opacity="0.30"/>
     <path d="M 200 55 Q 160 100 150 200" stroke="${t.accent}" stroke-width="3" fill="none" stroke-opacity="0.25"/>
     <path d="M 200 55 Q 240 100 250 200" stroke="${t.accent}" stroke-width="3" fill="none" stroke-opacity="0.25"/>`,
  ];

  const stars = Array.from({ length: 5 }, (_, i) =>
    `<text x="${80 + i * 22}" y="394" fill="${i < product.stars ? '#f59e0b' : (isDark ? '#333' : '#ddd')}" font-family="sans-serif" font-size="18">★</text>`
  ).join('');

  return `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="520" viewBox="0 0 400 520">
  <defs>
    <linearGradient id="cardBg_${themeId}_${idx}" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="${t.surface}"/>
      <stop offset="100%" stop-color="${t.bg}"/>
    </linearGradient>
    <linearGradient id="imgBg_${themeId}_${idx}" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="${t.accent}" stop-opacity="0.15"/>
      <stop offset="100%" stop-color="${t.accent}" stop-opacity="0.04"/>
    </linearGradient>
  </defs>

  <!-- Card background -->
  <rect width="400" height="520" rx="20" fill="url(#cardBg_${themeId}_${idx})" stroke="${t.border}" stroke-width="1.5"/>

  <!-- Image area -->
  <rect x="0" y="0" width="400" height="280" rx="20" fill="url(#imgBg_${themeId}_${idx})"/>
  <rect x="0" y="260" width="400" height="20" fill="url(#cardBg_${themeId}_${idx})"/>

  <!-- Garment illustration -->
  ${garments[idx]}

  <!-- Badge -->
  ${product.badge ? `
  <rect x="20" y="20" width="${product.badge.length * 10 + 20}" height="26" rx="6" fill="${badgeColor}"/>
  <text x="${20 + (product.badge.length * 10 + 20) / 2}" y="38" fill="#ffffff"
        font-family="sans-serif" font-size="11" font-weight="800" text-anchor="middle">${product.badge}</text>
  ` : ''}

  <!-- Wishlist icon -->
  <circle cx="368" cy="32" r="18" fill="${t.surface}" stroke="${t.border}" stroke-width="1"/>
  <text x="368" y="39" fill="${t.muted}" font-family="sans-serif" font-size="16" text-anchor="middle">♡</text>

  <!-- Product name -->
  <text x="24" y="320" fill="${t.text}" font-family="Georgia,serif"
        font-size="19" font-weight="700">${product.name}</text>

  <!-- Price -->
  <text x="24" y="352" fill="${t.accent}" font-family="sans-serif"
        font-size="22" font-weight="800">₹${product.price}</text>
  <text x="${24 + product.price.length * 13 + 36}" y="350" fill="${t.muted}" font-family="sans-serif"
        font-size="15" text-decoration="line-through">₹${(parseInt(product.price.replace(',','')) * 1.25).toLocaleString('en-IN').split('.')[0]}</text>

  <!-- Stars -->
  ${stars}
  <text x="${80 + 5 * 22 + 6}" y="394" fill="${t.muted}" font-family="sans-serif" font-size="13">(${128 + idx * 43})</text>

  <!-- Size swatches label -->
  <text x="24" y="428" fill="${t.muted}" font-family="sans-serif" font-size="12" font-weight="600" letter-spacing="2">SIZE</text>
  ${['XS','S','M','L','XL'].map((s, i) => `
    <rect x="${24 + i * 50}" y="436" width="40" height="28" rx="6"
          fill="${i === 1 ? t.accent : 'none'}" stroke="${i === 1 ? t.accent : t.border}" stroke-width="1.5"/>
    <text x="${44 + i * 50}" y="455" fill="${i === 1 ? '#fff' : t.muted}" font-family="sans-serif"
          font-size="11" font-weight="${i === 1 ? '700' : '500'}" text-anchor="middle">${s}</text>
  `).join('')}

  <!-- Add to cart button -->
  <rect x="24" y="476" width="352" height="28" rx="8" fill="${t.accent}"/>
  <text x="200" y="495" fill="#ffffff" font-family="sans-serif"
        font-size="13" font-weight="700" text-anchor="middle">Add to Cart  +</text>
</svg>`;
}

// ── Upload helper ─────────────────────────────────────────────────────
async function upload(storagePath, content) {
  const buf = Buffer.from(content, 'utf-8');
  const { error } = await supabase.storage
    .from('theme-previews')
    .upload(storagePath, buf, { contentType: 'image/svg+xml', upsert: true });
  if (error) { console.error('✗', storagePath, error.message); return null; }
  const { data } = supabase.storage.from('theme-previews').getPublicUrl(storagePath);
  console.log('✓', storagePath);
  return data.publicUrl;
}

// ── Main ──────────────────────────────────────────────────────────────
async function main() {
  const urls = {};
  for (const [id, t] of Object.entries(THEMES)) {
    urls[id] = { hero: '', products: [] };

    // Hero
    const heroSvg = makeHero(id, t);
    const heroUrl = await upload(`layout-themes/hero/${id}.svg`, heroSvg);
    if (heroUrl) urls[id].hero = heroUrl;

    // Products
    for (let i = 0; i < PRODUCTS.length; i++) {
      const svg = makeProduct(id, t, PRODUCTS[i], i);
      const prodUrl = await upload(`layout-themes/products/${id}-${i + 1}.svg`, svg);
      if (prodUrl) urls[id].products.push(prodUrl);
    }
  }
  console.log('\n\n── GENERATED URLS ──');
  console.log(JSON.stringify(urls, null, 2));
}

main().catch(console.error);
