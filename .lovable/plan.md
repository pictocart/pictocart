## Accounts Module — Industry-Standard Bookkeeping for Small Sellers

A self-contained "mini Tally / Vyapar" inside Pictocart. Built around six pillars that mirror what Indian small retailers, cafés and D2C sellers actually track. Everything is auto-wired to existing orders, inventory and Razorpay so the merchant never has to enter the same number twice.

### Sidebar (under Accounts)

```text
Accounts
├── Overview           (dashboard: today's cash-in, cash-out, low stock, dues)
├── Sales              (read-only summary of Orders → revenue, COGS, GST)
├── Purchases          (supplier bills / stock-in receipts)
├── Expenses           (rent, salary, utilities, marketing, misc.)
├── Suppliers          (vendor master + outstanding payable)
├── Customer Khata     (credit given to walk-in & online customers)
├── Inventory Ledger   (stock movement log + low-stock alerts)
├── Invoices           (existing — unchanged)
└── Reports
       ├── Profit & Loss
       ├── Cash Book
       └── GST Summary (GSTR-1 style)
```

### 1. Overview page (`/accounts`)

Single dashboard that pulls everything together:

- **KPIs**: Today's revenue, Today's expenses, Net today, Cash in hand, Bank balance, Receivables (Khata), Payables (suppliers)
- **Cash-flow chart** (last 30 days, money in vs money out)
- **Low-stock alert strip** — products at/below reorder level with a "Reorder" button that opens a pre-filled Purchase entry
- **Outstanding dues**: top 5 customers owing money + top 5 suppliers we owe
- **Quick-add buttons**: + Expense, + Purchase, + Khata entry

### 2. Purchases (`/accounts/purchases`)

Record stock bought from a supplier. On save, optionally bumps `products.inventory_count` so inventory stays accurate.

Fields: supplier (dropdown from Suppliers), bill number, bill date, line items `[{ product, qty, rate, gst% }]`, subtotal/GST/total, payment status (paid/partial/unpaid), payment mode (cash/UPI/card/bank/credit). "Mark as paid later" creates a payable.

### 3. Expenses (`/accounts/expenses`)

Quick mobile-first capture for café/shop spends.

- Categories (seeded, editable): Rent, Salary & Wages, Electricity, Gas/Fuel, Internet/Phone, Marketing, Packaging, Repairs, Transport, Bank charges, Other
- Fields: date, category, amount, mode (cash/UPI/card/bank), notes, attach bill photo (upload to existing `store-assets` bucket)
- Recurring toggle (monthly rent, salaries) — auto-creates next month's draft

### 4. Suppliers (`/accounts/suppliers`)

Master list: name, contact, GSTIN, opening balance. Tapping a supplier shows their statement (purchases, payments, running balance).

### 5. Customer Khata / Credit (`/accounts/khata`)

The "udhaar register" every Indian shop has on paper.

- Customers from existing `customers` table + ability to add walk-in entries
- Two-column ledger per customer: amount given (sale on credit) and amount received (settlement)
- One-tap "Send reminder" via WhatsApp link (`wa.me/...?text=...`) and email
- Online orders with `payment_status='pending' AND total>0` flow in automatically

### 6. Inventory Ledger (`/accounts/inventory`)

- Per-product stock movement: opening, purchases (+), sales (−), adjustments (±), closing
- **Reorder level** per product (new column) + "Low stock" badge
- Daily 09:00 IST cron checks all products; sends one in app notification to the seller if any product is at/below reorder level (uses existing `send-transactional-email` function)
- Manual "Stock adjust" entry for damages/spoilage with reason

### 7. Reports

- **Profit & Loss** — date range picker, computed live:
  - Revenue (paid orders) − COGS (sum of `products.cost_price × qty` from order items) − Expenses = Net Profit
  - Export CSV / Print
- **Cash Book** — every money-in (paid orders + Khata receipts) and money-out (expenses + supplier payments), running balance per payment mode (Cash / UPI / Bank)
- **GST Summary** — outward supplies (sales), inward supplies (purchases), tax payable, in a GSTR-1-style table; export CSV

### Wiring with what already exists

- **Sales revenue & COGS** read from `orders` (paid only) — already filtered correctly in the dashboard fix shipped earlier today
- **Invoices** stays the same; we just link to it from the Sales tab
- **Wallet** (AI credits) stays separate — it isn't business cash
- **Razorpay payments** become a "Bank — Razorpay" row in the Cash Book automatically

### Permissions

Everything is store-scoped. RLS: only the store owner (and `admin` role) can read/write. Bill-photo uploads use a new `accounts/<store_id>/<file>` prefix in the existing `store-assets` bucket.

---

## Technical Plan

### New tables (one migration)

- `suppliers` — `id, store_id, name, phone, email, gstin, address jsonb, opening_balance, created_at, updated_at`
- `purchase_bills` — `id, store_id, supplier_id, bill_number, bill_date, items jsonb, subtotal, tax, total, payment_status, payment_mode, paid_amount, notes, attachment_url`
- `expenses` — `id, store_id, category, amount, expense_date, payment_mode, notes, attachment_url, is_recurring bool, recurrence text, parent_expense_id`
- `expense_categories` — `id, store_id, name, is_default` (seeded list above)
- `khata_entries` — `id, store_id, customer_id (nullable), customer_name, customer_phone, entry_type ('credit'|'payment'), amount, entry_date, order_id (nullable), notes` — `customer_id` nullable to support walk-ins
- `inventory_movements` — `id, store_id, product_id, movement_type ('opening'|'purchase'|'sale'|'adjustment'|'return'), qty (signed), reference_table, reference_id, notes, created_at`
- `accounts_settings` — `id, store_id, opening_cash, opening_bank, low_stock_email_enabled bool, gst_enabled bool` (one row per store)

Schema additions on existing tables:

- `products.cost_price numeric(10,2)` — needed for COGS / P&L
- `products.reorder_level integer DEFAULT 0` — drives low-stock alerts
- `customers.balance numeric(10,2) DEFAULT 0` — denormalised Khata balance, kept fresh by trigger on `khata_entries`

All new tables get standard RLS: "store owner manages own rows" + "admin manages all".

### Triggers / functions

- `recompute_customer_balance()` — trigger on `khata_entries` insert/update/delete, recomputes the `customers.balance` total
- `inventory_on_purchase()` — trigger on `purchase_bills` insert, writes one `inventory_movements` row per line and bumps `products.inventory_count`
- `inventory_on_order()` — extend the existing `deduct_inventory_on_order` trigger to also log a `sale` movement row
- `pnl_report(_store_id uuid, _from date, _to date)` — security-definer function returning revenue / COGS / expenses / net for the date range (keeps the heavy aggregate on the DB)

### Edge function

- `accounts-low-stock-check` (scheduled daily 09:00 IST via cron) — scans all stores where `low_stock_email_enabled = true`, finds products at/below `reorder_level`, calls existing `notification on the desktop.` 

### Frontend

New routes (lazy-loaded in `App.tsx`):

```text
/accounts                   AccountsOverview.tsx
/accounts/purchases         Purchases.tsx          + PurchaseForm.tsx
/accounts/expenses          Expenses.tsx           + ExpenseForm.tsx (sheet)
/accounts/suppliers         Suppliers.tsx          + SupplierForm.tsx
/accounts/khata             Khata.tsx              + KhataCustomerDetail.tsx
/accounts/inventory         InventoryLedger.tsx
/accounts/reports/pnl       ProfitLossReport.tsx
/accounts/reports/cashbook  CashBook.tsx
/accounts/reports/gst       GstSummary.tsx
```

Sidebar update in `DashboardLayout.tsx`: expand the existing **Accounts** group with the entries above (keep Invoices where it is).

Shared hooks: `useSuppliers`, `usePurchases`, `useExpenses`, `useKhata`, `useInventoryLedger`, `usePnl`, `useCashBook` — all React Query, store-scoped.

Reusable UI: `MoneyInput`, `PaymentModePicker` (Cash / UPI / Card / Bank), `DateRangePicker`, `ExportCsvButton`, all built on existing shadcn primitives + `--primary` (#F97316) tokens to match the rest of the dashboard.

### Rollout

Single migration → seed default expense categories per store → ship UI behind the existing `/accounts` route. No breaking changes to Orders, Invoices or the storefront. Mobile layouts use the same sticky-bottom-nav pattern already in use across the dashboard.