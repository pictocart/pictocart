import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import DashboardLayout from "@/components/DashboardLayout";
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
import CustomerAuth from "@/pages/storefront/CustomerAuth";
import CustomerAccount from "@/pages/storefront/CustomerAccount";
import CustomerRoute from "@/components/storefront/CustomerRoute";
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
            <Route path="/auth" element={<Auth />} />
            <Route
              path="/onboarding"
              element={
                <ProtectedRoute>
                  <Onboarding />
                </ProtectedRoute>
              }
            />
            <Route
              path="/"
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
            {/* Admin Routes */}
            <Route path="/admin" element={<AdminRoute><AdminLayout><AdminOverview /></AdminLayout></AdminRoute>} />
            <Route path="/admin/stores" element={<AdminRoute><AdminLayout><AdminStores /></AdminLayout></AdminRoute>} />
            <Route path="/admin/users" element={<AdminRoute><AdminLayout><AdminUsers /></AdminLayout></AdminRoute>} />
            <Route path="/admin/themes" element={<AdminRoute><AdminLayout><AdminThemes /></AdminLayout></AdminRoute>} />
            <Route path="/admin/revenue" element={<AdminRoute><AdminLayout><AdminRevenue /></AdminLayout></AdminRoute>} />
            <Route path="/admin/settings" element={<AdminRoute><AdminLayout><AdminSettings /></AdminLayout></AdminRoute>} />
            {/* Public Storefront Routes */}
            <Route path="/store/:slug" element={<Storefront />} />
            <Route path="/store/:slug/product/:productId" element={<StorefrontProduct />} />
            <Route path="/store/:slug/cart" element={<StorefrontCart />} />
            <Route path="/store/:slug/checkout" element={<StorefrontCheckout />} />
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
