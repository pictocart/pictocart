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

// Lazy-load heavy / less-frequent pages to shrink initial bundle.
const HowItWorks = lazy(() => import("@/pages/HowItWorks"));
const ProductForm = lazy(() => import("@/pages/ProductForm"));
const Customise = lazy(() => import("@/pages/Customise"));
const PaymentSettings = lazy(() => import("@/pages/PaymentSettings"));
const CodSettings = lazy(() => import("@/pages/CodSettings"));
const ShippingSettings = lazy(() => import("@/pages/ShippingSettings"));
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
const Billing = lazy(() => import("@/pages/Billing"));
const Wallet = lazy(() => import("@/pages/Wallet"));
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
const AdminPartners = lazy(() => import("@/pages/admin/AdminPartners"));
const PartnersSignup = lazy(() => import("@/pages/PartnersSignup"));
const PartnersDashboard = lazy(() => import("@/pages/PartnersDashboard"));
const Help = lazy(() => import("@/pages/Help"));


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
  const { data: hostStore, isLoading } = useStoreByHost();
  const onPlatform = typeof window !== "undefined" && isPlatformHost(window.location.hostname);

  if (!onPlatform && isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-sm text-muted-foreground">
        Loading store…
      </div>
    );
  }

  if (!onPlatform && hostStore) {
    return <CustomDomainRedirect slug={hostStore.slug} />;
  }

  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center text-sm text-muted-foreground">Loading…</div>}>
    <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/how-it-works" element={<HowItWorks />} />
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
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <DashboardLayout>
                    <Dashboard />
                  </DashboardLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/products"
              element={
                <ProtectedRoute>
                  <DashboardLayout>
                    <ProductList />
                  </DashboardLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/products/new"
              element={
                <ProtectedRoute>
                  <DashboardLayout>
                    <ProductForm />
                  </DashboardLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/products/:id"
              element={
                <ProtectedRoute>
                  <DashboardLayout>
                    <ProductForm />
                  </DashboardLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/orders"
              element={
                <ProtectedRoute>
                  <DashboardLayout>
                    <OrderList />
                  </DashboardLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/orders/:id"
              element={
                <ProtectedRoute>
                  <DashboardLayout>
                    <OrderDetail />
                  </DashboardLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/customise"
              element={
                <ProtectedRoute>
                  <DashboardLayout>
                    <Customise />
                  </DashboardLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/store-design"
              element={<Navigate to="/customise" replace />}
            />
            <Route
              path="/settings/payments"
              element={
                <ProtectedRoute>
                  <DashboardLayout>
                    <PaymentSettings />
                  </DashboardLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/settings/cod"
              element={
                <ProtectedRoute>
                  <DashboardLayout>
                    <CodSettings />
                  </DashboardLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/settings/shipping"
              element={
                <ProtectedRoute>
                  <DashboardLayout>
                    <ShippingSettings />
                  </DashboardLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/settings/domain"
              element={
                <ProtectedRoute>
                  <DashboardLayout>
                    <DomainSettings />
                  </DashboardLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/coupons"
              element={
                <ProtectedRoute>
                  <DashboardLayout>
                    <CouponList />
                  </DashboardLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/settings/seo"
              element={
                <ProtectedRoute>
                  <DashboardLayout>
                    <SEOSettings />
                  </DashboardLayout>
                </ProtectedRoute>
              }
            />
            {/* Blog, Subscribers, Analytics */}
            <Route path="/categories" element={<ProtectedRoute><DashboardLayout><Categories /></DashboardLayout></ProtectedRoute>} />
            <Route path="/blog-posts" element={<ProtectedRoute><DashboardLayout><BlogPosts /></DashboardLayout></ProtectedRoute>} />
            <Route path="/blog-posts/new" element={<ProtectedRoute><DashboardLayout><BlogPostForm /></DashboardLayout></ProtectedRoute>} />
            <Route path="/blog-posts/:id" element={<ProtectedRoute><DashboardLayout><BlogPostForm /></DashboardLayout></ProtectedRoute>} />
            <Route path="/subscribers" element={<ProtectedRoute><DashboardLayout><Subscribers /></DashboardLayout></ProtectedRoute>} />
            <Route path="/customers" element={<ProtectedRoute><DashboardLayout><Customers /></DashboardLayout></ProtectedRoute>} />
            <Route path="/analytics" element={<ProtectedRoute><DashboardLayout><StoreAnalytics /></DashboardLayout></ProtectedRoute>} />
            <Route path="/themes" element={<ProtectedRoute><DashboardLayout><Themes /></DashboardLayout></ProtectedRoute>} />
            <Route path="/settings/email" element={<ProtectedRoute><DashboardLayout><EmailBrandingSettings /></DashboardLayout></ProtectedRoute>} />
            <Route path="/billing" element={<ProtectedRoute><DashboardLayout><Billing /></DashboardLayout></ProtectedRoute>} />
            <Route path="/wallet" element={<ProtectedRoute><DashboardLayout><Wallet /></DashboardLayout></ProtectedRoute>} />
            <Route path="/admin/credits-economy" element={<AdminRoute><AdminLayout><AdminCreditsEconomy /></AdminLayout></AdminRoute>} />
            <Route path="/profile" element={<ProtectedRoute><DashboardLayout><SellerProfile /></DashboardLayout></ProtectedRoute>} />
            {/* Admin Routes */}
            <Route path="/admin" element={<AdminRoute><AdminLayout><AdminOverview /></AdminLayout></AdminRoute>} />
            <Route path="/admin/stores" element={<AdminRoute><AdminLayout><AdminStores /></AdminLayout></AdminRoute>} />
            <Route path="/admin/users" element={<AdminRoute><AdminLayout><AdminUsers /></AdminLayout></AdminRoute>} />
            <Route path="/admin/themes" element={<AdminRoute><AdminLayout><AdminThemes /></AdminLayout></AdminRoute>} />
            <Route path="/admin/themes/preview/:themeId" element={<AdminRoute><AdminThemeMasterPreview /></AdminRoute>} />
            
            <Route path="/admin/revenue" element={<AdminRoute><AdminLayout><AdminRevenue /></AdminLayout></AdminRoute>} />
            <Route path="/admin/settings" element={<AdminRoute><AdminLayout><AdminSettings /></AdminLayout></AdminRoute>} />
            <Route path="/admin/profile" element={<AdminRoute><AdminLayout><AdminProfile /></AdminLayout></AdminRoute>} />
            
            <Route path="/admin/security" element={<AdminRoute><AdminLayout><AdminSecurity /></AdminLayout></AdminRoute>} />
            <Route path="/admin/provisioning" element={<AdminRoute><AdminLayout><AdminProvisioning /></AdminLayout></AdminRoute>} />
            <Route path="/admin/plans" element={<AdminRoute><AdminLayout><AdminPlans /></AdminLayout></AdminRoute>} />
            <Route path="/admin/launch" element={<AdminRoute><AdminLayout><AdminLaunchChecklist /></AdminLayout></AdminRoute>} />
            <Route path="/admin/health" element={<AdminRoute><AdminLayout><AdminHealth /></AdminLayout></AdminRoute>} />
            <Route path="/admin/disputes" element={<AdminRoute><AdminLayout><AdminDisputes /></AdminLayout></AdminRoute>} />
            <Route path="/admin/partners" element={<AdminRoute><AdminLayout><AdminPartners /></AdminLayout></AdminRoute>} />
            {/* Partner program (public signup + partner-only dashboard) */}
            <Route path="/partners" element={<PartnersSignup />} />
            <Route path="/partners/signup" element={<PartnersSignup />} />
            <Route path="/partners/dashboard" element={<PartnersDashboard />} />
            {/* Help Center */}
            <Route path="/help" element={<Help />} />
            <Route path="/help/:slug" element={<Help />} />
            {/* Platform Legal Pages */}
            <Route path="/unsubscribe" element={<Unsubscribe />} />
            <Route path="/privacy-policy" element={<PrivacyPolicy />} />
            <Route path="/terms" element={<TermsOfService />} />
            <Route path="/refund-policy" element={<RefundPolicy />} />
            {/* Public Storefront Routes */}
            <Route path="/store/preview-theme" element={<ThemePreview />} />
            <Route path="/store/:slug" element={<Storefront />} />
            <Route path="/store/:slug/product/:productId" element={<StorefrontProduct />} />
            <Route path="/store/:slug/cart" element={<StorefrontCart />} />
            <Route path="/store/:slug/checkout" element={<StorefrontCheckout />} />
            <Route path="/store/:slug/blog" element={<StorefrontBlog />} />
            <Route path="/store/:slug/blog/:postSlug" element={<StorefrontBlogPost />} />
            <Route path="/store/:slug/account/auth" element={<CustomerAuth />} />
            <Route path="/store/:slug/reset-password" element={<CustomerResetPassword />} />
            <Route path="/store/:slug/account" element={<CustomerRoute><CustomerAccount /></CustomerRoute>} />
            <Route path="/store/:slug/account/wishlist" element={<CustomerRoute><CustomerWishlist /></CustomerRoute>} />
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
            <ErrorBoundary>
              <AppRoutes />
            </ErrorBoundary>
          </StoreProvider>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
