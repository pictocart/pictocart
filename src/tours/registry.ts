import type { TourDefinition } from './types';

const t = (
  key: string,
  label: string,
  match: (p: string) => boolean,
  steps: TourDefinition['steps']
): TourDefinition => ({ key, label, match, steps });

export const TOURS: TourDefinition[] = [
  t('dashboard', 'Dashboard overview', (p) => p === '/dashboard', [
    { element: '[data-tour="hero-greeting"]', title: 'Your daily snapshot', description: "We greet you and show today's revenue and orders right here." },
    { element: '[data-tour="hero-add-product"]', title: 'Add a product in 30s', description: 'Tap here, upload a photo, and our AI writes the title, price and description for you.' },
    { element: '[data-tour="dash-view-store"]', title: 'Share your live store', description: 'Copy this URL or open your storefront — send it to customers on WhatsApp.', side: 'bottom' },
    { element: '[data-tour="smart-actions"]', title: 'Smart next steps', description: 'These cards adapt to what your store needs right now.' },
    { element: '[data-tour="wallet-card"]', title: 'AI credits wallet', description: 'AI actions (writing descriptions, theme generation) cost credits. Recharge anytime.' },
    { element: '[data-tour="kpi-grid"]', title: 'Key metrics', description: 'Track revenue, orders, AOV and pending shipments at a glance.' },
    { element: '[data-tour="sidebar-products"]', title: 'Manage products', description: 'Jump to the products list to add, edit or restock anytime.', side: 'right' },
    { element: '[data-tour="sidebar-orders"]', title: 'Manage orders', description: 'New orders appear here. Pack and ship from one place.', side: 'right' },
  ]),

  t('products-list', 'Products page', (p) => p === '/products', [
    { element: '[data-tour="products-new"]', title: 'Add a product', description: 'Click here — snap a photo and the AI fills everything: title, description, price, category.', side: 'bottom' },
    { element: '[data-tour="products-search"]', title: 'Search & filter', description: 'Find any product by name, SKU or category.' },
  ]),

  t('product-form', 'Add / edit product', (p) => p.startsWith('/products/') && p !== '/products', [
    { element: '[data-tour="product-image"]', title: 'Upload product image', description: 'Drop up to 6 photos. The first becomes the cover image on your storefront.' },
    { element: '[data-tour="product-ai-fill"]', title: 'Let AI fill the details', description: 'Once an image is uploaded, AI writes the title, description, price, SEO and more.' },
    { element: '[data-tour="product-inventory"]', title: 'Set your stock', description: 'Enter how many units you have. This auto-decrements with every sale.' },
    { element: '[data-tour="product-variants"]', title: 'Add variants (optional)', description: 'Selling sizes, colours or weights? Add them here so customers can pick.' },
    { element: '[data-tour="product-shipping"]', title: 'Shipping details', description: 'Set weight and dimensions — Shiprocket needs these to quote couriers accurately.' },
    { element: '[data-tour="product-seo"]', title: 'SEO for Google', description: 'AI suggests a meta title and description so this product can be found on search.' },
    { element: '[data-tour="product-save"]', title: 'Publish it', description: "Save and it's live on your storefront instantly.", side: 'top' },
  ]),

  t('orders', 'Orders page', (p) => p === '/orders', [
    { element: '[data-tour="orders-filters"]', title: 'Filter orders', description: 'Switch between pending, paid, shipped, returned — all in one click.' },
    { element: '[data-tour="orders-row"]', title: 'Open an order', description: 'Click a row to view items, customer details and ship the package.' },
  ]),

  t('order-detail', 'Order details', (p) => /^\/orders\/[^/]+$/.test(p), [
    { element: '[data-tour="order-summary"]', title: 'Order summary', description: 'See items, totals, customer info and payment status here.' },
    { element: '[data-tour="order-ship"]', title: 'Ship the order', description: 'Generate a Shiprocket label and tracking with one click.', side: 'top' },
    { element: '[data-tour="order-invoice"]', title: 'Download invoice', description: 'A GST-ready PDF invoice is created automatically.' },
  ]),

  t('customise', 'Customise your store', (p) => p === '/customise', [
    { element: '[data-tour="customise-logo"]', title: 'Upload your logo', description: 'A square logo (1:1) shows best in the header.' },
    { element: '[data-tour="customise-theme"]', title: 'Pick a theme', description: 'Free and premium themes — each one is a complete look for your store.' },
    { element: '[data-tour="customise-publish"]', title: 'Publish changes', description: 'Click to push your customisations live.', side: 'top' },
  ]),

  t('themes', 'Theme marketplace', (p) => p === '/themes', [
    { element: '[data-tour="themes-grid"]', title: 'Browse themes', description: 'Tap any theme to preview it on your store before buying.' },
  ]),

  t('shipping', 'Shipping setup', (p) => p === '/settings/shipping', [
    { element: '[data-tour="ship-toggle"]', title: 'Enable shipping', description: 'Turn this on to start sending orders via Shiprocket.' },
    { element: '[data-tour="ship-credentials"]', title: 'Shiprocket credentials', description: 'Enter your Shiprocket API-User email and password. Free to create.' },
    { element: '[data-tour="ship-pickup"]', title: 'Pickup address', description: 'Where Shiprocket couriers come to collect parcels.' },
  ]),

  t('payments', 'Payment setup', (p) => p === '/settings/payments', [
    { element: '[data-tour="pay-razorpay-key"]', title: 'Razorpay keys', description: 'Paste your Razorpay Key ID & Secret to accept online payments. Customers see Razorpay checkout.' },
    { element: '[data-tour="pay-test-mode"]', title: 'Test before going live', description: 'Use test keys to place a sample order before switching to live keys.' },
  ]),

  t('cod', 'Cash on Delivery rules', (p) => p === '/settings/cod', [
    { element: '[data-tour="cod-toggle"]', title: 'Enable COD', description: 'Switch on to accept Cash on Delivery orders.' },
    { element: '[data-tour="cod-limits"]', title: 'Order limits', description: 'Set min and max order amounts to limit RTO risk.' },
  ]),

  t('domain', 'Custom domain', (p) => p === '/settings/domain', [
    { element: '[data-tour="domain-input"]', title: 'Your domain', description: 'Enter the domain you own (e.g. mystore.com).' },
    { element: '[data-tour="domain-dns"]', title: 'Add these DNS records', description: 'Add the A and TXT records to your domain provider — usually 5 mins.' },
  ]),

  t('seo', 'SEO settings', (p) => p === '/settings/seo', [
    { element: '[data-tour="seo-title"]', title: 'SEO title', description: 'Shown in Google results — keep under 60 characters with your store name.' },
    { element: '[data-tour="seo-desc"]', title: 'Meta description', description: 'A short summary (under 160 chars) that appears under the title on Google.' },
  ]),

  t('email-branding', 'Email branding', (p) => p === '/settings/email', [
    { element: '[data-tour="email-from"]', title: 'From name & email', description: 'Customers receive order updates from this address.' },
  ]),

  t('coupons', 'Coupons', (p) => p === '/coupons', [
    { element: '[data-tour="coupons-new"]', title: 'Create a coupon', description: 'Reward customers with discounts. Set min order, expiry and usage limits.' },
  ]),

  t('categories', 'Categories', (p) => p === '/categories', [
    { element: '[data-tour="cats-new"]', title: 'Add a category', description: 'Organise products into custom categories shoppers can browse.' },
  ]),

  t('blog', 'Blog posts', (p) => p === '/blog-posts', [
    { element: '[data-tour="blog-new"]', title: 'Write a post', description: 'AI helps you write SEO-friendly blog posts that drive traffic to your store.' },
  ]),

  t('analytics', 'Store analytics', (p) => p === '/analytics', [
    { element: '[data-tour="analytics-overview"]', title: 'Traffic & sales', description: 'See visitors, conversion rate and top-selling products.' },
  ]),

  t('sourcing', 'Wholesale sourcing', (p) => p === '/sourcing', [
    { element: '[data-tour="sourcing-search"]', title: 'Find suppliers', description: 'Type a product and we surface wholesalers you can import in one click.' },
  ]),

  t('wallet', 'AI credit wallet', (p) => p === '/wallet', [
    { element: '[data-tour="wallet-balance"]', title: 'Your balance', description: 'AI actions use credits. Recharge anytime — no subscription required.' },
    { element: '[data-tour="wallet-recharge"]', title: 'Recharge', description: 'Top-up via UPI / card. Credits never expire.' },
  ]),

  t('accounts', 'Books & accounts', (p) => p === '/accounts', [
    { element: '[data-tour="accounts-cards"]', title: 'Your books', description: 'Track expenses, purchases, supplier dues (khata) and GST — all in one place.' },
  ]),

  t('customers', 'Customers', (p) => p === '/customers', [
    { element: '[data-tour="customers-table"]', title: 'Your buyers', description: 'Every customer with their order count and lifetime value.' },
  ]),
];

export const findTourForPath = (pathname: string) =>
  TOURS.find((tour) => tour.match(pathname));
