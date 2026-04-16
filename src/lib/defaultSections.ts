/**
 * Generate default homepage sections for new stores so they're never blank.
 */
export function generateDefaultSections(storeName: string, category?: string) {
  const sections = [
    {
      id: crypto.randomUUID(),
      type: 'hero',
      title: `Welcome to ${storeName}`,
      subtitle: 'Discover our curated collection of amazing products',
      image: '',
      images: [],
      isSlider: false,
      layout: 'default',
      height: 'medium',
      topMargin: 0,
      animation: 'fade-up',
    },
    {
      id: crypto.randomUUID(),
      type: 'featured_products',
      title: 'Featured Products',
      subtitle: '',
      image: '',
      images: [],
      isSlider: false,
      layout: 'default',
      height: 'medium',
      topMargin: 0,
      animation: 'fade-up',
    },
    {
      id: crypto.randomUUID(),
      type: 'trust_badges',
      title: 'Why Shop With Us',
      subtitle: '',
      image: '',
      images: [],
      isSlider: false,
      layout: 'default',
      height: 'medium',
      topMargin: 0,
      animation: 'fade-up',
      trustBadges: getTrustBadges(category),
    },
    {
      id: crypto.randomUUID(),
      type: 'newsletter',
      title: 'Stay Updated',
      subtitle: 'Subscribe to get the latest offers and updates',
      image: '',
      images: [],
      isSlider: false,
      layout: 'default',
      height: 'medium',
      topMargin: 0,
      animation: 'fade-up',
    },
  ];

  return sections;
}

function getTrustBadges(category?: string) {
  const defaults = [
    { icon: '🚚', label: 'Free Shipping' },
    { icon: '🔒', label: 'Secure Payment' },
    { icon: '↩️', label: 'Easy Returns' },
    { icon: '💬', label: '24/7 Support' },
  ];

  if (category === 'food') {
    return [
      { icon: '🌿', label: 'Fresh & Natural' },
      { icon: '📦', label: 'Safe Packaging' },
      { icon: '🚚', label: 'Fast Delivery' },
      { icon: '💯', label: 'Quality Assured' },
    ];
  }

  if (category === 'fashion') {
    return [
      { icon: '👕', label: 'Premium Quality' },
      { icon: '🚚', label: 'Free Shipping' },
      { icon: '↩️', label: '7-Day Returns' },
      { icon: '💳', label: 'Secure Payment' },
    ];
  }

  return defaults;
}
