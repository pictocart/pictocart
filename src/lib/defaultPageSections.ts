/**
 * Default sections for all storefront pages.
 * Used when a theme doesn't define sections for a specific page,
 * or as the starting point for the customizer.
 */

export type PageSection = {
  type: string;
  props: Record<string, any>;
};

export type PageManifest = {
  sections: PageSection[];
};

/**
 * Default sections for the Home page.
 * This is the landing page with hero, trust strip, categories, products, etc.
 */
export const defaultHomeSections: PageSection[] = [
  { type: 'hero', props: { style: 'centered', title: 'Welcome to {{store_name}}', sub: 'Discover amazing products', cta: 'Shop Now' } },
  { type: 'usp_strip', props: { style: 'classic', title: 'Why Shop With Us', items: [
    { icon: 'Shield', title: 'Secure Checkout', sub: 'SSL Certified Payments' },
    { icon: 'Truck', title: 'Free Shipping', sub: 'On orders over $50' },
    { icon: 'RefreshCw', title: 'Easy Returns', sub: '30-day return policy' }
  ]}},
  { type: 'category_grid', props: { style: 'grid_4', title: 'Shop by Category' } },
  { type: 'product_grid', props: { style: 'grid_clean', title: 'Featured Products' } },
  { type: 'new_arrivals', props: { style: 'carousel_slider', title: 'New Arrivals' } },
  { type: 'promo_banner', props: { style: 'classic_split', title: 'Special Offer' } },
  { type: 'newsletter', props: { title: 'Join Our Newsletter', sub: 'Get 10% off your first order', cta: 'Subscribe' } },
  { type: 'testimonials', props: { title: 'What Our Customers Say' } },
];

/**
 * Default sections for the Shop page.
 * Product listing with optional category filtering.
 */
export const defaultShopSections: PageSection[] = [
  { type: 'page_title', props: { title: 'Shop All Products' } },
  { type: 'category_grid', props: { style: 'modern_tabs', title: 'Categories' } },
  { type: 'product_grid', props: { style: 'grid_clean', title: 'All Products' } },
];

/**
 * Default sections for the Product Detail page.
 * Handled by ProductDetailBlock in MasterThemeRenderer.
 */
export const defaultProductSections: PageSection[] = [
  { type: 'product_detail', props: {} },
  { type: 'related_products', props: { style: 'carousel_slider', title: 'You May Also Like' } },
];

/**
 * Default sections for the Cart page.
 */
export const defaultCartSections: PageSection[] = [
  { type: 'page_title', props: { title: 'Shopping Cart' } },
  { type: 'line_items', props: {} },
  { type: 'cart_summary', props: {} },
];

/**
 * Default sections for the Checkout page.
 */
export const defaultCheckoutSections: PageSection[] = [
  { type: 'page_title', props: { title: 'Checkout' } },
  { type: 'checkout_stepper', props: { steps: ['Information', 'Shipping', 'Payment', 'Review'] } },
  { type: 'line_items', props: { compact: true } },
  { type: 'cart_summary', props: {} },
];

/**
 * Default sections for the Collections page.
 */
export const defaultCollectionsSections: PageSection[] = [
  { type: 'page_title', props: { title: 'Collections' } },
  { type: 'collections_grid', props: { title: 'All Collections' } },
];

/**
 * Default sections for the Collection Detail page.
 */
export const defaultCollectionDetailSections: PageSection[] = [
  { type: 'page_title', props: { title: '{{collection_name}}' } },
  { type: 'collection_detail', props: {} },
  { type: 'product_grid', props: { style: 'grid_clean', title: 'Products' } },
];

/**
 * Default sections for the About page.
 */
export const defaultAboutSections: PageSection[] = [
  { type: 'page_title', props: { title: 'About Us' } },
  { type: 'story', props: { title: 'Our Story', body: 'We started with a simple idea...' } },
  { type: 'values', props: { items: ['Quality First', 'Customer Obsessed', 'Sustainable'] } },
  { type: 'provider_team', props: { title: 'Meet Our Team' } },
];

/**
 * Default sections for the Contact page.
 */
export const defaultContactSections: PageSection[] = [
  { type: 'page_title', props: { title: 'Contact Us' } },
  { type: 'map_and_contact', props: { title: 'Visit Our Store', address: '123 Main St', hours: 'Mon-Sun 9-9', phone: '+1 234 567 890' } },
  { type: 'contact_form', props: { title: 'Send Us a Message' } },
];

/**
 * Default sections for the Blog/Journal listing page.
 */
export const defaultBlogSections: PageSection[] = [
  { type: 'page_title', props: { title: 'Our Journal' } },
  { type: 'journal_list', props: {} },
];

/**
 * Default sections for the Blog Post detail page.
 */
export const defaultBlogPostSections: PageSection[] = [
  { type: 'journal_strip', props: {} },
  { type: 'newsletter', props: { title: 'Enjoyed this read?', sub: 'Subscribe for more', cta: 'Subscribe' } },
];

/**
 * Default sections for the Search page.
 */
export const defaultSearchSections: PageSection[] = [
  { type: 'page_title', props: { title: 'Search Results' } },
  { type: 'product_grid', props: { style: 'grid_clean', title: 'Products' } },
];

/**
 * Default sections for the Account Dashboard page.
 */
export const defaultAccountSections: PageSection[] = [
  { type: 'page_title', props: { title: 'My Account' } },
  { type: 'account_panel', props: {} },
];

/**
 * Default sections for the Order Detail page.
 */
export const defaultOrderDetailSections: PageSection[] = [
  { type: 'page_title', props: { title: 'Order Details' } },
  { type: 'line_items', props: { order_view: true } },
  { type: 'cart_summary', props: { order_view: true } },
];

/**
 * Default sections for the Wishlist page.
 */
export const defaultWishlistSections: PageSection[] = [
  { type: 'page_title', props: { title: 'My Wishlist' } },
  { type: 'product_grid', props: { style: 'grid_clean', title: 'Saved Items' } },
];

/**
 * Default sections for the Returns page.
 */
export const defaultReturnsSections: PageSection[] = [
  { type: 'page_title', props: { title: 'Returns & Exchanges' } },
  { type: 'contact_form', props: { title: 'Start a Return' } },
];

/**
 * Default sections for the Policy pages (Privacy, Terms, Shipping, Refund).
 */
export const defaultPolicySections: PageSection[] = [
  { type: 'page_title', props: { title: '{{policy_name}}' } },
  { type: 'text_block', props: { title: 'Policy Content', body: 'Policy content goes here...' } },
];

/**
 * Default sections for the Menu page (restaurant/food).
 */
export const defaultMenuSections: PageSection[] = [
  { type: 'page_title', props: { title: 'Our Menu' } },
  { type: 'service_menu', props: { title: 'Categories' } },
  { type: 'service_packages', props: { title: 'Popular Combos' } },
];

/**
 * Default sections for the Booking page (services/appointments).
 */
export const defaultBookingSections: PageSection[] = [
  { type: 'page_title', props: { title: 'Book Appointment' } },
  { type: 'booking_widget', props: {} },
  { type: 'provider_team', props: { title: 'Our Specialists' } },
];

/**
 * All default page sections mapped by page key.
 * Page keys match the routes in Storefront.tsx and MasterThemeRenderer.
 */
export const DEFAULT_PAGE_SECTIONS: Record<string, PageSection[]> = {
  home: defaultHomeSections,
  shop: defaultShopSections,
  product: defaultProductSections,
  cart: defaultCartSections,
  checkout: defaultCheckoutSections,
  collections: defaultCollectionsSections,
  collection_detail: defaultCollectionDetailSections,
  about: defaultAboutSections,
  contact: defaultContactSections,
  blog: defaultBlogSections,
  blog_post: defaultBlogPostSections,
  search: defaultSearchSections,
  account: defaultAccountSections,
  order_detail: defaultOrderDetailSections,
  wishlist: defaultWishlistSections,
  returns: defaultReturnsSections,
  policy: defaultPolicySections,
  menu: defaultMenuSections,
  booking: defaultBookingSections,
};

/**
 * Page metadata for the customizer UI.
 */
export const PAGE_META: Record<string, { label: string; description: string; icon: string; defaultEnabled: boolean }> = {
  home: { label: 'Home', description: 'Main landing page', icon: 'Home', defaultEnabled: true },
  shop: { label: 'Shop', description: 'Product listing with filters', icon: 'Store', defaultEnabled: true },
  product: { label: 'Product Detail', description: 'Individual product page', icon: 'Package', defaultEnabled: true },
  cart: { label: 'Cart', description: 'Shopping cart page', icon: 'ShoppingCart', defaultEnabled: true },
  checkout: { label: 'Checkout', description: 'Order checkout flow', icon: 'CreditCard', defaultEnabled: true },
  collections: { label: 'Collections', description: 'All collections listing', icon: 'Grid', defaultEnabled: true },
  collection_detail: { label: 'Collection Detail', description: 'Single collection view', icon: 'Folder', defaultEnabled: true },
  about: { label: 'About Us', description: 'Company story & values', icon: 'Info', defaultEnabled: true },
  contact: { label: 'Contact', description: 'Contact form & info', icon: 'Mail', defaultEnabled: true },
  blog: { label: 'Blog', description: 'Blog post listing', icon: 'BookOpen', defaultEnabled: false },
  blog_post: { label: 'Blog Post', description: 'Individual blog article', icon: 'FileText', defaultEnabled: false },
  search: { label: 'Search', description: 'Search results page', icon: 'Search', defaultEnabled: true },
  account: { label: 'Account', description: 'Customer dashboard', icon: 'User', defaultEnabled: true },
  order_detail: { label: 'Order Detail', description: 'Order confirmation & tracking', icon: 'Receipt', defaultEnabled: true },
  wishlist: { label: 'Wishlist', description: 'Saved products', icon: 'Heart', defaultEnabled: true },
  returns: { label: 'Returns', description: 'Return request page', icon: 'RotateCcw', defaultEnabled: true },
  policy: { label: 'Policy Pages', description: 'Privacy, Terms, Shipping, Refund', icon: 'Shield', defaultEnabled: false },
  menu: { label: 'Menu', description: 'Restaurant menu (food stores)', icon: 'Utensils', defaultEnabled: false },
  booking: { label: 'Booking', description: 'Appointment booking (services)', icon: 'Calendar', defaultEnabled: false },
};

/**
 * Get default sections for a page, falling back to home if not found.
 */
export function getDefaultSections(page: string): PageSection[] {
  return DEFAULT_PAGE_SECTIONS[page] || DEFAULT_PAGE_SECTIONS.home;
}

/**
 * Check if a page is enabled by default.
 */
export function isPageEnabledByDefault(page: string): boolean {
  return PAGE_META[page]?.defaultEnabled ?? false;
}

/**
 * Get all available page keys.
 */
export function getAllPageKeys(): string[] {
  return Object.keys(DEFAULT_PAGE_SECTIONS);
}