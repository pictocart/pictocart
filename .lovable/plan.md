# Fix: Sidebar disappears + "Loading…" flashes on every page change

## Root cause

In `src/App.tsx`, all authenticated routes are declared as:

```text
<Suspense fallback={<div>Loading…</div>}>
  <Routes>
    <Route path="/accounts/inventory"
      element={
        <ProtectedRoute>
          <DashboardLayout>
            <AccountsInventory />   {/* lazy */}
          </DashboardLayout>
        </ProtectedRoute>
      } />
    ...
  </Routes>
</Suspense>
```

When the user navigates to a route whose lazy chunk has not been downloaded yet (e.g. first visit to `/accounts/inventory`), React suspends the **entire** element tree under that Suspense boundary — including `DashboardLayout`. The fallback (`Loading…` text, full screen, no sidebar) replaces everything until the chunk arrives. This happens on every fresh navigation to a not-yet-loaded page and is what the screenshot shows.

`ProtectedRoute`'s own spinner is fine; the problem is purely the Suspense boundary placement.

## Fix

Refactor the seller dashboard routes to use a **layout route** with `<Outlet/>`, and move `<Suspense>` inside the layout so it only wraps the page content area, not the chrome.

### 1. New file `src/components/DashboardShell.tsx`

A tiny wrapper used by the layout route:

```text
ProtectedRoute
  └─ DashboardLayout
       └─ Suspense fallback={<PageSkeleton />}
            └─ Outlet
```

`PageSkeleton` is a small placeholder (a few shimmer blocks inside the content area) so the sidebar/header stay visible and only the main panel shows a skeleton.

### 2. Refactor `src/App.tsx` route table

Replace the ~30 repetitive seller routes with a single nested block:

```text
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
  <Route path="/wallet" element={<Wallet />} />
  <Route path="/profile" element={<SellerProfile />} />
  <Route path="/policies" element={<Policies />} />
  <Route path="/testimonials" element={<Testimonials />} />
  <Route path="/google-reviews" element={<GoogleReviewsConnect />} />
  <Route path="/help" element={<Help />} />
  <Route path="/menu" element={<Menu />} />
  <Route path="/kitchen" element={<Kitchen />} />
</Route>
```

Do the same for `/admin/*` with an `AdminShell` (`AdminRoute` + `AdminLayout` + Suspense + Outlet) so admin pages also stop flashing.

Keep public/storefront routes and the top-level Suspense as-is — they don't have a persistent chrome to preserve.

### 3. Behaviour after fix

- Sidebar + header stay mounted across every seller navigation.
- Lazy chunks now suspend only the content area; user sees a brief skeleton inside the page panel, never a blank screen.
- Route table shrinks from ~600 lines to ~70 and becomes the single source of truth.

## Files touched

- New: `src/components/DashboardShell.tsx`, `src/components/AdminShell.tsx`, `src/components/ui/PageSkeleton.tsx`
- Edit: `src/App.tsx` (refactor seller + admin routes to nested layout routes)

## Out of scope

- No changes to `DashboardLayout`, `AdminLayout`, `ProtectedRoute`, or any page component.
- No changes to the custom-domain redirect, auth, or storefront routes.
- No backend / data changes.

## Verification

1. Hard reload `/dashboard`, then click Accounts → Inventory Ledger → Suppliers → Khata. Sidebar must remain visible; only the content panel may briefly show a skeleton on first visit to a chunk.
2. Direct deep-link to `/accounts/inventory` in a fresh tab should render sidebar immediately and skeleton-then-content in the panel.
3. Browser back/forward across dashboard pages must never blank the sidebar.
