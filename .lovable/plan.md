

# Phase 3: Product Management — Implementation Plan

## Acknowledged
- UPI/Online Banking toggles are UI-only config saved to `stores.settings` — real payment integration comes in Phase 9 (Razorpay).
- Custom domain (`antariksh.shop/slug`) is Phase 8 — deferred.

## What We Build Now

### 1. Product List Page (`/products`)
- Grid/list toggle view with product cards showing image, title, price, status badge
- Search bar (filters by title) and category dropdown filter
- Quick actions per product: toggle active/inactive, edit, delete
- Bulk select with bulk delete
- "Add Product" button leading to AI-first creation flow
- Empty state with CTA when no products exist

### 2. Add Product Page (`/products/new`)
- **AI-first flow**: upload image → calls existing `generate-product` edge function → auto-fills all fields
- Editable fields: title, description, short description, price, compare-at price, category, tags, SKU
- Multiple image upload (up to 6 images) to storage bucket
- **Category-aware variant matrix**:
  - Fashion → Size × Color
  - Food → Weight × Type  
  - Electronics → Storage × Color
  - Custom option for other categories
- Inventory count per variant with low-stock threshold
- SEO fields (title, description) — AI-generated, editable
- Save as draft or publish immediately

### 3. Edit Product Page (`/products/:id`)
- Same form as Add, pre-populated with existing data
- "Regenerate with AI" button to re-analyze

### 4. Dashboard Stats — Live Data
- Wire up the 4 stat cards on Dashboard to query real product count and order data from the database

## Routing Changes
Add to `App.tsx`:
- `/products` → ProductList page
- `/products/new` → ProductForm page  
- `/products/:id` → ProductForm page (edit mode)

All wrapped in `ProtectedRoute` + `DashboardLayout`.

## New Files
- `src/pages/ProductList.tsx` — grid/list view with search, filters, bulk actions
- `src/pages/ProductForm.tsx` — AI-first add/edit form with variants
- `src/components/products/ProductCard.tsx` — card for grid view
- `src/components/products/ProductRow.tsx` — row for list view
- `src/components/products/VariantMatrix.tsx` — category-aware variant builder
- `src/components/products/ImageUploader.tsx` — multi-image upload component
- `src/hooks/useProducts.ts` — React Query hooks for CRUD

## Modified Files
- `src/App.tsx` — add product routes
- `src/pages/Dashboard.tsx` — wire stats to real data queries

## No Database Changes Needed
The existing `products` table already has all required columns: title, description, price, compare_at_price, images (text[]), variants (jsonb), inventory_count, category, tags, sku, seo_title, seo_description, is_active, ai_generated_data.

