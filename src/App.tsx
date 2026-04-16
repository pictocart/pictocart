import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import DashboardLayout from "@/components/DashboardLayout";
import LandingPage from "@/pages/LandingPage";
import Dashboard from "@/pages/Dashboard";
import ProductList from "@/pages/ProductList";
import ProductForm from "@/pages/ProductForm";
import OrderList from "@/pages/OrderList";
import OrderDetail from "@/pages/OrderDetail";
import StoreDesign from "@/pages/StoreDesign";
import PaymentSettings from "@/pages/PaymentSettings";
import ShippingSettings from "@/pages/ShippingSettings";
import DomainSettings from "@/pages/DomainSettings";
import CouponList from "@/pages/CouponList";
import SEOSettings from "@/pages/SEOSettings";
import Onboarding from "@/pages/Onboarding";
import Auth from "@/pages/Auth";
import ResetPassword from "@/pages/ResetPassword";
import Storefront from "@/pages/Storefront";
import StorefrontProduct from "@/pages/StorefrontProduct";
import StorefrontCart from "@/pages/StorefrontCart";
import StorefrontCheckout from "@/pages/StorefrontCheckout";
import AdminRoute from "@/components/AdminRoute";
import AdminLayout from "@/components/AdminLayout";
import AdminOverview from "@/pages/admin/AdminOverview";
import AdminStores from "@/pages/admin/AdminStores";
import AdminUsers from "@/pages/admin/AdminUsers";
import AdminThemes from "@/pages/admin/AdminThemes";
import AdminRevenue from "@/pages/admin/AdminRevenue";
import AdminSettings from "@/pages/admin/AdminSettings";
import AdminProfile from "@/pages/admin/AdminProfile";
import SellerProfile from "@/pages/SellerProfile";
import CustomerAuth from "@/pages/storefront/CustomerAuth";
import CustomerAccount from "@/pages/storefront/CustomerAccount";
import CustomerRoute from "@/components/storefront/CustomerRoute";
import BlogPosts from "@/pages/BlogPosts";
import BlogPostForm from "@/pages/BlogPostForm";
import Subscribers from "@/pages/Subscribers";
import StoreAnalytics from "@/pages/StoreAnalytics";
import Categories from "@/pages/Categories";
import StorefrontBlog from "@/pages/storefront/StorefrontBlog";
import StorefrontBlogPost from "@/pages/storefront/StorefrontBlogPost";
import ThemePreview from "@/pages/ThemePreview";
import PrivacyPolicy from "@/pages/PrivacyPolicy";
import TermsOfService from "@/pages/TermsOfService";
import RefundPolicy from "@/pages/RefundPolicy";
import NotFound from "./pages/NotFound.tsx";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<LandingPage />} />
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
              path="/store-design"
              element={
                <ProtectedRoute>
                  <DashboardLayout>
                    <StoreDesign />
                  </DashboardLayout>
                </ProtectedRoute>
              }
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
            <Route path="/analytics" element={<ProtectedRoute><DashboardLayout><StoreAnalytics /></DashboardLayout></ProtectedRoute>} />
            <Route path="/profile" element={<ProtectedRoute><DashboardLayout><SellerProfile /></DashboardLayout></ProtectedRoute>} />
            {/* Admin Routes */}
            <Route path="/admin" element={<AdminRoute><AdminLayout><AdminOverview /></AdminLayout></AdminRoute>} />
            <Route path="/admin/stores" element={<AdminRoute><AdminLayout><AdminStores /></AdminLayout></AdminRoute>} />
            <Route path="/admin/users" element={<AdminRoute><AdminLayout><AdminUsers /></AdminLayout></AdminRoute>} />
            <Route path="/admin/themes" element={<AdminRoute><AdminLayout><AdminThemes /></AdminLayout></AdminRoute>} />
            <Route path="/admin/revenue" element={<AdminRoute><AdminLayout><AdminRevenue /></AdminLayout></AdminRoute>} />
            <Route path="/admin/settings" element={<AdminRoute><AdminLayout><AdminSettings /></AdminLayout></AdminRoute>} />
            <Route path="/admin/profile" element={<AdminRoute><AdminLayout><AdminProfile /></AdminLayout></AdminRoute>} />
            {/* Platform Legal Pages */}
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
            <Route path="/store/:slug/account" element={<CustomerRoute><CustomerAccount /></CustomerRoute>} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
