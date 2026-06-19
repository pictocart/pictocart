import { lazy, Suspense } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Navigate, Route, Routes, useLocation } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import { StoreProvider } from "@/contexts/StoreContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import DashboardLayout from "@/components/DashboardLayout";
import DashboardShell from "@/components/DashboardShell";
import AdminShell from "@/components/AdminShell";
import LandingPage from "@/pages/LandingPage";
import Dashboard from "@/pages/Dashboard";
import ProductList from "@/pages/ProductList";
import OrderList from "@/pages/OrderList";
import OrderDetail from "@/pages/OrderDetail";
import Auth from "@/pages/Auth";
import Storefront from "@/pages/Storefront";
import StorefrontProduct from "@/pages/StorefrontProduct";
import StorefrontCart from "@/pages/StorefrontCart";
import StorefrontCheckout from "@/pages/StorefrontCheckout";
import AdminRoute from "@/components/AdminRoute";
import AdminLayout from "@/components/AdminLayout";
import CustomerRoute from "@/components/storefront/CustomerRoute";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import NotFound from "./pages/NotFound.tsx";
import { useStoreByHost, isPlatformHost } from "@/hooks/useStoreByHost";
import { TourProvider } from "@/tours/TourProvider";
import WhatsAppFloat from "@/components/WhatsAppFloat";

// Lazy-load heavy / less-frequent pages to shrink initial bundle.
const HowItWorks = lazy(() => import("@/pages/HowItWorks"));
const Investors = lazy(() => import("@/pages/Investors"));
const ProductForm = lazy(() => import("@/pages/ProductForm"));
const Customise = lazy(() => import("@/pages/CustomiserV2"));
const CustomiseLegacy = lazy(() => import("@/pages/Customise"));
const PromoTickerPage = lazy(() => import("@/pages/PromoTicker"));
const Sourcing = lazy(() => import("@/pages/Sourcing"));
const AdminThemeLivePreview = lazy(() => import("@/pages/admin/AdminThemeLivePreview"));
const PaymentSettings = lazy(() => import("@/pages/PaymentSettings"));
const CodSettings = lazy(() => import("@/pages/CodSettings"));
const ShippingSettings = lazy(() => import("@/pages/ShippingSettings"));
const FulfillmentSettings = lazy(() => import("@/pages/FulfillmentSettings"));
const QRCodes = lazy(() => import("@/pages/QRCodes"));
const QRRedirect = lazy(() => import("@/pages/QRRedirect"));
const Menu = lazy(() => import("@/pages/Menu"));
const Kitchen = lazy(() => import("@/pages/Kitchen"));
const StorefrontMenu = lazy(() => import("@/pages/storefront/StorefrontMenu"));
const OrderTracking = lazy(() => import("@/pages/storefront/OrderTracking"));
const DomainSettings = lazy(() => import("@/pages/DomainSettings"));
const CouponList = lazy(() => import("@/pages/CouponList"));
const SEOSettings = lazy(() => import("@/pages/SEOSettings"));
const Onboarding = lazy(() => import("@/pages/Onboarding"));
const ResetPassword = lazy(() => import("@/pages/ResetPassword"));
const SellerProfile = lazy(() => import("@/pages/SellerProfile"));
const BlogPosts = lazy(() => import("@/pages/BlogPosts"));
const BlogPostForm = lazy(() => import("@/pages/BlogPostForm"));
const Subscribers = lazy(() => import("@/pages/Subscribers"));
const Customers = lazy(() => import("@/pages/Customers"));
const StoreAnalytics = lazy(() => import("@/pages/StoreAnalytics"));
const Categories = lazy(() => import("@/pages/Categories"));
const Themes = lazy(() => import("@/pages/Themes"));
const ThemePreview = lazy(() => import("@/pages/ThemePreview"));
const EmailBrandingSettings = lazy(() => import("@/pages/EmailBrandingSettings"));
const PrivacyPolicy = lazy(() => import("@/pages/PrivacyPolicy"));
const Unsubscribe = lazy(() => import("@/pages/Unsubscribe"));
const TermsOfService = lazy(() => import("@/pages/TermsOfService"));
const RefundPolicy = lazy(() => import("@/pages/RefundPolicy"));
const Contact = lazy(() => import("@/pages/Contact"));
const Billing = lazy(() => import("@/pages/Billing"));
const SiteOffer = lazy(() => import("@/pages/SiteOffer"));
const AdminPlanOffer = lazy(() => import("@/pages/admin/AdminPlanOffer"));
const Wallet = lazy(() => import("@/pages/Wallet"));
const Returns = lazy(() => import("@/pages/Returns"));
const Policies = lazy(() => import("@/pages/Policies"));
const Testimonials = lazy(() => import("@/pages/Testimonials"));
const GoogleReviewsConnect = lazy(() => import("@/pages/GoogleReviewsConnect"));
const ReviewsModeration = lazy(() => import("@/pages/ReviewsModeration"));
const CustomerAuth = lazy(() => import("@/pages/storefront/CustomerAuth"));
const CustomerResetPassword = lazy(() => import("@/pages/storefront/CustomerResetPassword"));
const CustomerAccount = lazy(() => import("@/pages/storefront/CustomerAccount"));
const CustomerWishlist = lazy(() => import("@/pages/storefront/CustomerWishlist"));
const StorefrontBlog = lazy(() => import("@/pages/storefront/StorefrontBlog"));
const StorefrontBlogPost = lazy(() => import("@/pages/storefront/StorefrontBlogPost"));
const StorefrontPolicy = lazy(() => import("@/pages/storefront/StorefrontPolicy"));
// Admin (rare access — always lazy)
const AdminOverview = lazy(() => import("@/pages/admin/AdminOverview"));
const AdminStores = lazy(() => import("@/pages/admin/AdminStores"));
const AdminUsers = lazy(() => import("@/pages/admin/AdminUsers"));
const AdminThemes = lazy(() => import("@/pages/admin/AdminThemes"));
const AdminThemeMasterPreview = lazy(() => import("@/pages/admin/AdminThemeMasterPreview"));
const AdminRevenue = lazy(() => import("@/pages/admin/AdminRevenue"));
const AdminSettings = lazy(() => import("@/pages/admin/AdminSettings"));
const AdminProfile = lazy(() => import("@/pages/admin/AdminProfile"));

const AdminSecurity = lazy(() => import("@/pages/admin/AdminSecurity"));
const AdminProvisioning = lazy(() => import("@/pages/admin/AdminProvisioning"));
const AdminPlans = lazy(() => import("@/pages/admin/AdminPlans"));
const AdminLaunchChecklist = lazy(() => import("@/pages/admin/AdminLaunchChecklist"));
const AdminCreditsEconomy = lazy(() => import("@/pages/admin/AdminCreditsEconomy"));

const AdminHealth = lazy(() => import("@/pages/admin/AdminHealth"));
const AdminDisputes = lazy(() => import("@/pages/admin/AdminDisputes"));
const AdminCommissions = lazy(() => import("@/pages/admin/AdminCommissions"));
const AdminPartners = lazy(() => import("@/pages/admin/AdminPartners"));
const PartnersSignup = lazy(() => import("@/pages/PartnersSignup"));
const PartnersDashboard = lazy(() => import("@/pages/PartnersDashboard"));
const PartnerAccept = lazy(() => import("@/pages/partner/PartnerAccept"));
const PartnerDashboard = lazy(() => import("@/pages/partner/PartnerDashboard"));
const NewClientStore = lazy(() => import("@/pages/partner/NewClientStore"));
const PartnerHierarchy = lazy(() => import("@/pages/partner/PartnerHierarchy"));
const PartnerPayouts = lazy(() => import("@/pages/partner/PartnerPayouts"));
const AdminPartnerPayouts = lazy(() => import("@/pages/admin/AdminPartnerPayouts"));
const AdminPartnerAnalytics = lazy(() => import("@/pages/admin/AdminPartnerAnalytics"));
const StoreInviteAccept = lazy(() => import("@/pages/storefront/StoreInviteAccept"));
const Help = lazy(() => import("@/pages/Help"));
const Invoices = lazy(() => import("@/pages/Invoices"));
const InvoicePrint = lazy(() => import("@/pages/InvoicePrint"));
const AccountsOverview = lazy(() => import("@/pages/accounts/AccountsOverview"));
const AccountsPurchases = lazy(() => import("@/pages/accounts/Purchases"));
const AccountsExpenses = lazy(() => import("@/pages/accounts/Expenses"));
const AccountsSuppliers = lazy(() => import("@/pages/accounts/Suppliers"));
const AccountsKhata = lazy(() => import("@/pages/accounts/Khata"));
const AccountsInventory = lazy(() => import("@/pages/accounts/InventoryLedger"));
const AccountsPnl = lazy(() => import("@/pages/accounts/ProfitLossReport"));
const AccountsCashBook = lazy(() => import("@/pages/accounts/CashBook"));
const AccountsGst = lazy(() => import("@/pages/accounts/GstSummary"));
const Providers = lazy(() => import("@/pages/Providers"));
const Services = lazy(() => import("@/pages/Services"));
const Appointments = lazy(() => import("@/pages/Appointments"));
const FamilyPlans = lazy(() => import("@/pages/FamilyPlans"));
const ProviderPayouts = lazy(() => import("@/pages/ProviderPayouts"));
const StorefrontBooking = lazy(() => import("@/pages/storefront/StorefrontBooking"));
const StorefrontCustomPage = lazy(() => import("@/pages/StorefrontCustomPage"));
const FeatureDetail = lazy(() => import("@/pages/features/FeatureDetail"));
const ThemeMarketplacePublic = lazy(() => import("@/pages/marketplace/ThemeMarketplace"));
const ThemeMarketplaceDetail = lazy(() => import("@/pages/marketplace/ThemeDetail"));



const queryClient = new QueryClient();

// When the visitor lands on a merchant's custom domain (Cloudflare for SaaS),
// rewrite incoming paths like `/`, `/product/x`, `/cart` to the canonical
// platform paths `/store/:slug/...` so all existing storefront pages keep
// working unchanged. We use `replace` so the browser history stays clean.
const CustomDomainRedirect = ({ slug }: { slug: string }) => {
  const { pathname, search, hash } = useLocation();
  // Strip any leading slash; map "/" to ""
  const sub = pathname === "/" ? "" : pathname.replace(/^\//, "");
  const accountPath = sub === "auth" ? "account/auth" : sub === "wishlist" ? "account/wishlist" : sub;
  // On custom domains, /auth must be the merchant storefront customer auth,
  // not the platform seller signup page.
  const target = `/store/${slug}${accountPath ? `/${accountPath}` : ""}${search}${hash}`;
  return <Navigate to={target} replace />;
};

const AppRoutes = () => {
  const location = useLocation();
  const { data: hostStore, isLoading } = useStoreByHost();
  const onPlatform = typeof window !== "undefined" && isPlatformHost(window.location.hostname);

  if (!onPlatform && isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-sm text-muted-foreground">
        Loading store…
      </div>
    );
  }

  if (!onPlatform && hostStore && !location.pathname.startsWith(`/store/${hostStore.slug}`)) {
    return <CustomDomainRedirect slug={hostStore.slug} />;
  }

  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center text-sm text-muted-foreground">Loading…</div>}>
    <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/q/:slug" element={<QRRedirect />} />
            <Route path="/investors" element={<Investors />} />
            <Route path="/how-it-works" element={<HowItWorks />} />
            <Route path="/features/:slug" element={<FeatureDetail />} />
            <Route path="/marketplace" element={<ThemeMarketplacePublic />} />
            <Route path="/marketplace/:slug" element={<ThemeMarketplaceDetail />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route
              path="/onboarding"
              element={
                <ProtectedRoute>
                  <Onboarding />
                </ProtectedRoute>
              }
            />
            {/* Seller dashboard routes — share a single layout so the sidebar
                stays mounted and Suspense only swaps the page content. */}
            <Route element={<DashboardShell />}>
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/products" element={<ProductList />} />
              <Route path="/products/new" element={<ProductForm />} />
              <Route path="/products/:id" element={<ProductForm />} />
              <Route path="/orders" element={<OrderList />} />
              <Route path="/orders/:id" element={<OrderDetail />} />
              <Route path="/invoices" element={<Invoices />} />
              <Route path="/accounts" element={<AccountsOverview />} />
              <Route path="/accounts/purchases" element={<AccountsPurchases />} />
              <Route path="/accounts/expenses" element={<AccountsExpenses />} />
              <Route path="/accounts/suppliers" element={<AccountsSuppliers />} />
              <Route path="/accounts/khata" element={<AccountsKhata />} />
              <Route path="/accounts/inventory" element={<AccountsInventory />} />
              <Route path="/accounts/reports/pnl" element={<AccountsPnl />} />
              <Route path="/accounts/reports/cashbook" element={<AccountsCashBook />} />
              <Route path="/accounts/reports/gst" element={<AccountsGst />} />
              <Route path="/returns" element={<Returns />} />
              <Route path="/reviews" element={<ReviewsModeration />} />
              <Route path="/customise" element={<Customise />} />
              <Route path="/customise/legacy" element={<CustomiseLegacy />} />
              <Route path="/promo-ticker" element={<PromoTickerPage />} />
              <Route path="/sourcing" element={<Sourcing />} />
              <Route path="/settings/payments" element={<PaymentSettings />} />
              <Route path="/settings/cod" element={<CodSettings />} />
              <Route path="/settings/shipping" element={<ShippingSettings />} />
              <Route path="/settings/fulfillment" element={<FulfillmentSettings />} />
              <Route path="/settings/qr" element={<QRCodes />} />
              <Route path="/settings/domain" element={<DomainSettings />} />
              <Route path="/settings/seo" element={<SEOSettings />} />
              <Route path="/settings/email" element={<EmailBrandingSettings />} />
              <Route path="/coupons" element={<CouponList />} />
              <Route path="/categories" element={<Categories />} />
              <Route path="/blog-posts" element={<BlogPosts />} />
              <Route path="/blog-posts/new" element={<BlogPostForm />} />
              <Route path="/blog-posts/:id" element={<BlogPostForm />} />
              <Route path="/subscribers" element={<Subscribers />} />
              <Route path="/customers" element={<Customers />} />
              <Route path="/analytics" element={<StoreAnalytics />} />
              <Route path="/themes" element={<Themes />} />
              <Route path="/billing" element={<Billing />} />
              <Route path="/site-offer" element={<SiteOffer />} />
              <Route path="/wallet" element={<Wallet />} />
              <Route path="/profile" element={<SellerProfile />} />
              <Route path="/policies" element={<Policies />} />
              <Route path="/testimonials" element={<Testimonials />} />
              <Route path="/google-reviews" element={<GoogleReviewsConnect />} />
              <Route path="/menu" element={<Menu />} />
              <Route path="/kitchen" element={<Kitchen />} />
              <Route path="/providers" element={<Providers />} />
              <Route path="/services" element={<Services />} />
              <Route path="/appointments" element={<Appointments />} />
              <Route path="/family-plans" element={<FamilyPlans />} />
              <Route path="/providers/payouts" element={<ProviderPayouts />} />
            </Route>

            <Route path="/store-design" element={<Navigate to="/customise" replace />} />
            <Route path="/invoices/:id/print" element={<ProtectedRoute><InvoicePrint /></ProtectedRoute>} />

            {/* Admin routes — same pattern, persistent AdminLayout */}
            <Route element={<AdminShell />}>
              <Route path="/admin" element={<AdminOverview />} />
              <Route path="/admin/stores" element={<AdminStores />} />
              <Route path="/admin/users" element={<AdminUsers />} />
              <Route path="/admin/themes" element={<AdminThemes />} />
              <Route path="/admin/revenue" element={<AdminRevenue />} />
              <Route path="/admin/settings" element={<AdminSettings />} />
              <Route path="/admin/profile" element={<AdminProfile />} />
              <Route path="/admin/security" element={<AdminSecurity />} />
              <Route path="/admin/provisioning" element={<AdminProvisioning />} />
              <Route path="/admin/plans" element={<AdminPlans />} />
              <Route path="/admin/plan-offer" element={<AdminPlanOffer />} />
              <Route path="/admin/launch" element={<AdminLaunchChecklist />} />
              <Route path="/admin/credits-economy" element={<AdminCreditsEconomy />} />
              <Route path="/admin/health" element={<AdminHealth />} />
              <Route path="/admin/disputes" element={<AdminDisputes />} />
              <Route path="/admin/commissions" element={<AdminCommissions />} />
              <Route path="/admin/partners" element={<AdminPartners />} />
              <Route path="/admin/partner-payouts" element={<AdminPartnerPayouts />} />
              <Route path="/admin/partner-analytics" element={<AdminPartnerAnalytics />} />
            </Route>
            <Route path="/admin/themes/preview/:themeId" element={<AdminRoute><AdminThemeMasterPreview /></AdminRoute>} />
            <Route path="/admin/themes/preview-live/:themeId" element={<AdminThemeLivePreview />} />
            {/* Public alias — same renderer, no admin-looking URL for marketplace visitors */}
            <Route path="/themes/preview/:themeId" element={<AdminThemeLivePreview />} />

            {/* Partner program (license-based, admin-invited) */}
            <Route path="/partners" element={<PartnersSignup />} />
            <Route path="/partners/signup" element={<PartnersSignup />} />
            <Route path="/partners/dashboard" element={<PartnersDashboard />} />
            <Route path="/partner/accept" element={<PartnerAccept />} />
            <Route path="/partner" element={<PartnerDashboard />} />
            <Route path="/partner/stores/new" element={<NewClientStore />} />
            <Route path="/partner/hierarchy" element={<PartnerHierarchy />} />
            <Route path="/partner/payouts" element={<PartnerPayouts />} />
            <Route path="/store-invite/accept" element={<StoreInviteAccept />} />
            {/* Help Center */}
            <Route path="/help" element={<Help />} />
            <Route path="/help/:slug" element={<Help />} />
            {/* Platform Legal Pages */}
            <Route path="/unsubscribe" element={<Unsubscribe />} />
            <Route path="/privacy-policy" element={<PrivacyPolicy />} />
            <Route path="/terms" element={<TermsOfService />} />
            <Route path="/refund-policy" element={<RefundPolicy />} />
            <Route path="/contact" element={<Contact />} />
            <Route path="/contact-us" element={<Contact />} />
            {/* Public Storefront Routes */}
            <Route path="/store/preview-theme" element={<ThemePreview />} />
            <Route path="/store/:slug" element={<Storefront />} />
            <Route path="/store/:slug/shop" element={<Storefront page="shop" />} />
            <Route path="/store/:slug/collections" element={<Storefront page="collections" />} />
            <Route path="/store/:slug/collections/:categoryId" element={<Storefront page="collection_detail" />} />
            <Route path="/store/:slug/about" element={<Storefront page="about" />} />
            <Route path="/store/:slug/contact" element={<Storefront page="contact" />} />
            <Route path="/store/:slug/product/:productId" element={<StorefrontProduct />} />
            <Route path="/store/:slug/cart" element={<StorefrontCart />} />
            <Route path="/store/:slug/checkout" element={<StorefrontCheckout />} />
            <Route path="/store/:slug/menu" element={<StorefrontMenu />} />
            <Route path="/store/:slug/menu/t/:tableToken" element={<StorefrontMenu forceMode="dine_in" />} />
            <Route path="/store/:slug/menu/takeaway" element={<StorefrontMenu forceMode="takeaway" />} />
            <Route path="/store/:slug/menu/delivery" element={<StorefrontMenu forceMode="delivery" />} />
            <Route path="/store/:slug/book" element={<StorefrontBooking />} />
            <Route path="/track/:code" element={<OrderTracking />} />
            <Route path="/menu" element={<ProtectedRoute><DashboardLayout><Menu /></DashboardLayout></ProtectedRoute>} />
            <Route path="/kitchen" element={<ProtectedRoute><DashboardLayout><Kitchen /></DashboardLayout></ProtectedRoute>} />
            <Route path="/store/:slug/blog" element={<StorefrontBlog />} />
            <Route path="/store/:slug/blog/:postSlug" element={<StorefrontBlogPost />} />
            <Route path="/store/:slug/account/auth" element={<CustomerAuth />} />
            <Route path="/store/:slug/reset-password" element={<CustomerResetPassword />} />
            <Route path="/store/:slug/account" element={<CustomerRoute><CustomerAccount /></CustomerRoute>} />
            <Route path="/store/:slug/account/wishlist" element={<CustomerRoute><CustomerWishlist /></CustomerRoute>} />
            <Route path="/store/:slug/p/:pageSlug" element={<StorefrontCustomPage />} />
            <Route path="/store/:slug/:policyType" element={<StorefrontPolicy />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
    </Suspense>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <StoreProvider>
            <TourProvider>
              <ErrorBoundary>
                <AppRoutes />
                <WhatsAppFloat />
              </ErrorBoundary>
            </TourProvider>
          </StoreProvider>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
