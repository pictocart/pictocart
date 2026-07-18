const fs = require('fs');

const themes = [
  { id: 'noir-atelier', bg: '#0d0d0d', surface: '#1a1a1a', accent: '#c9a96e', textPrimary: '#f5f0eb', textMuted: '#999', border: '#2a2a2a', name: 'Noir Atelier' },
  { id: 'ivory-luxe',   bg: '#faf8f4', surface: '#f0ece4', accent: '#8b6914', textPrimary: '#1a1612', textMuted: '#8a7f72', border: '#e8e0d4', name: 'Ivory Luxe' },
  { id: 'neon-drip',    bg: '#0f0f1a', surface: '#1a1a2e', accent: '#ff3d6b', textPrimary: '#f8fafc', textMuted: '#94a3b8', border: '#1e1e35', name: 'Neon Drip' },
  { id: 'blush-street', bg: '#fff5f8', surface: '#ffeef4', accent: '#e91e8c', textPrimary: '#1a0a12', textMuted: '#9b6e80', border: '#fad4e4', name: 'Blush Street' },
];

const CARDS = [
  { x: 40,  label: 'Silk Midi Dress',   price: '2,499' },
  { x: 220, label: 'Linen Blazer',      price: '3,899' },
  { x: 400, label: 'Wide Leg Trousers', price: '1,799' },
  { x: 580, label: 'Knit Cardigan',     price: '2,199' },
];

function makeSVG(t) {
  const cardsXML = CARDS.map(c => [
    `<rect x="${c.x}" y="245" width="155" height="205" rx="12" fill="${t.surface}" stroke="${t.border}" stroke-width="1"/>`,
    `<rect x="${c.x}" y="245" width="155" height="115" rx="12" fill="${t.accent}" fill-opacity="0.18"/>`,
    `<rect x="${c.x+52}" y="262" width="50" height="70" rx="8" fill="${t.accent}" fill-opacity="0.4"/>`,
    `<rect x="${c.x+60}" y="255" width="34" height="20" rx="4" fill="${t.accent}" fill-opacity="0.55"/>`,
    `<text x="${c.x+12}" y="378" fill="${t.textPrimary}" font-family="Georgia,serif" font-size="11" font-weight="600">${c.label}</text>`,
    `<text x="${c.x+12}" y="396" fill="${t.accent}" font-family="sans-serif" font-size="12" font-weight="700">&#8377;${c.price}</text>`,
    `<text x="${c.x+12}" y="412" fill="#f59e0b" font-family="sans-serif" font-size="11">&#9733;&#9733;&#9733;&#9733;&#9734;</text>`,
    `<rect x="${c.x+10}" y="420" width="135" height="22" rx="6" fill="${t.accent}"/>`,
    `<text x="${c.x+77}" y="435" fill="#ffffff" font-family="sans-serif" font-size="10" font-weight="700" text-anchor="middle">Add to Cart</text>`,
  ].join('\n')).join('\n');

  return `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="500" viewBox="0 0 800 500">
<rect width="800" height="500" fill="${t.bg}"/>

<!-- Browser chrome -->
<rect width="800" height="32" fill="${t.surface}"/>
<circle cx="16" cy="16" r="5" fill="#ff5f57"/>
<circle cx="30" cy="16" r="5" fill="#ffbd2e"/>
<circle cx="44" cy="16" r="5" fill="#28c840"/>
<rect x="68" y="8" width="180" height="16" rx="8" fill="${t.border}"/>
<text x="165" y="21" fill="${t.textMuted}" font-family="sans-serif" font-size="9" text-anchor="middle">yourbrand.com</text>

<!-- Navbar -->
<rect y="32" width="800" height="44" fill="${t.surface}" stroke="${t.border}" stroke-width="1"/>
<text x="24" y="61" fill="${t.accent}" font-family="Georgia,serif" font-size="17" font-weight="900" letter-spacing="3">BRAND</text>
<text x="230" y="61" fill="${t.textMuted}" font-family="sans-serif" font-size="11">New Arrivals</text>
<text x="330" y="61" fill="${t.textMuted}" font-family="sans-serif" font-size="11">Women</text>
<text x="392" y="61" fill="${t.textMuted}" font-family="sans-serif" font-size="11">Men</text>
<text x="448" y="61" fill="${t.textMuted}" font-family="sans-serif" font-size="11">Sale</text>
<circle cx="730" cy="54" r="12" fill="${t.accent}" fill-opacity="0.15"/>
<text x="724" y="59" fill="${t.accent}" font-family="sans-serif" font-size="13">&#9825;</text>
<circle cx="756" cy="54" r="12" fill="${t.accent}" fill-opacity="0.15"/>
<text x="749" y="59" fill="${t.textPrimary}" font-family="sans-serif" font-size="13">&#127874;</text>
<circle cx="768" cy="46" r="8" fill="${t.accent}"/>
<text x="768" y="50" fill="#fff" font-family="sans-serif" font-size="8" text-anchor="middle" font-weight="700">2</text>

<!-- Hero -->
<rect y="76" width="800" height="160" fill="${t.accent}" fill-opacity="0.07"/>
<circle cx="660" cy="155" r="100" fill="${t.accent}" fill-opacity="0.07"/>
<circle cx="720" cy="110" r="60" fill="${t.accent}" fill-opacity="0.09"/>
<rect x="590" y="86" width="68" height="110" rx="14" fill="${t.accent}" fill-opacity="0.22"/>
<rect x="609" y="76" width="30" height="26" rx="6" fill="${t.accent}" fill-opacity="0.30"/>
<text x="40" y="116" fill="${t.accent}" font-family="sans-serif" font-size="10" font-weight="700" letter-spacing="4">NEW COLLECTION</text>
<text x="40" y="154" fill="${t.textPrimary}" font-family="Georgia,serif" font-size="36" font-weight="900">Summer Edit</text>
<text x="40" y="196" fill="${t.textPrimary}" font-family="Georgia,serif" font-size="36" font-weight="900">2025</text>
<rect x="40" y="204" width="118" height="26" rx="7" fill="${t.accent}"/>
<text x="99" y="221" fill="#ffffff" font-family="sans-serif" font-size="11" font-weight="700" text-anchor="middle">Shop Now &#8594;</text>

<!-- Section label -->
<text x="40" y="238" fill="${t.textMuted}" font-family="sans-serif" font-size="9" font-weight="700" letter-spacing="4">TRENDING NOW</text>

<!-- Product cards -->
${cardsXML}

<!-- Trust bar -->
<rect y="464" width="800" height="36" fill="${t.surface}" stroke="${t.border}" stroke-width="1"/>
<text x="100" y="487" fill="${t.textMuted}" font-family="sans-serif" font-size="10" text-anchor="middle">&#128666;  Free Delivery</text>
<text x="290" y="487" fill="${t.textMuted}" font-family="sans-serif" font-size="10" text-anchor="middle">&#8617;  Easy Returns</text>
<text x="480" y="487" fill="${t.textMuted}" font-family="sans-serif" font-size="10" text-anchor="middle">&#128274;  Secure Pay</text>
<text x="670" y="487" fill="${t.textMuted}" font-family="sans-serif" font-size="10" text-anchor="middle">&#9733; 4.8 Rating</text>

<!-- Name watermark -->
<text x="796" y="494" fill="${t.textMuted}" font-family="sans-serif" font-size="8" text-anchor="end" opacity="0.5">${t.name}</text>
</svg>`;
}

themes.forEach(t => {
  const svg = makeSVG(t);
  const dest = `public/theme-previews/${t.id}.svg`;
  fs.writeFileSync(dest, svg, 'utf-8');
  console.log('Written:', dest);
});
console.log('Done.');
