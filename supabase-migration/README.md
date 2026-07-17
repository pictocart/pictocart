# Supabase Migration Guide

## File Map (CSV → Table)

### Config Files
| File | Table |
|------|-------|
| config1.1.csv | plan_configs |
| config1.2.csv | ai_action_costs |
| config1.3.csv | credit_milestones |
| config1.4.csv | admin_settings |
| config1.5.csv | platform_credit_settings |
| config1.6.csv | platform_plan_offers |
| config1.7.csv | theme_settings |
| config1.8.csv | provisioning_budget |

### Batch 2 — Theme Master Data
| File | Table |
|------|-------|
| batch2.1.csv | theme_master_projects |
| batch2.2.csv | theme_master_versions |
| batch2.3.csv | theme_master_metrics |
| batch2.4.csv | theme_category_briefs |
| batch2.5.csv | theme_layout_archetypes |
| batch2.6.csv | theme_section_blueprints |
| batch2.7.csv | theme_image_pool |
| batch2.8.csv | help_articles |

### Batch 3 — User/Store Core
| File | Table |
|------|-------|
| batch3.1.csv | profiles |
| batch3.2.csv | user_roles |
| batch3.3.csv | stores |
| batch3.4.csv | subscriptions |
| batch3.5.csv | ai_credit_wallets |
| batch3.6.csv | ai_credit_packs |

### Batch 4 — Store Content
| File | Table |
|------|-------|
| batch4.1.csv | products |
| batch4.2.csv | categories |
| batch4.3.csv | customers |
| batch4.4.csv | orders |
| batch4.5.csv | order_status_history |
| batch4.6.csv | order_commissions |
| batch4.7.csv | order_feedback |
| batch4.8.csv | inventory_movements |
| batch4.9.csv | khata_entries |
| batch4.10.csv | purchase_bills |
| batch4.11.csv | suppliers |
| batch4.12.csv | expense_categories |
| batch4.13.csv | expenses |
| batch4.14.csv | returns |

### Batch 5 — AI / Chat
| File | Table |
|------|-------|
| batch5.1.csv | ai_credit_transactions |
| batch5.2.csv | ai_response_cache |
| batch5.3.csv | merchant_chat_threads |
| batch5.4.csv | merchant_chat_messages |
| batch5.5.csv | merchant_sourcing_saved |
| batch5.6.csv | merchant_supplier_unlocks |

### Batch 6 — Partners
| File | Table |
|------|-------|
| batch6.1.csv | partners |
| batch6.2.csv | partner_invites |
| batch6.3.csv | partner_license_batches |
| batch6.4.csv | partner_licenses |

### Batch 7 — Misc
| File | Table |
|------|-------|
| batch7.1.csv | sourcing_suppliers |
| batch7.2.csv | sourcing_products |
| batch7.3.csv | store_fulfillment_settings |
| batch7.4.csv | store_qr_codes |
| batch7.5.csv | store_email_templates |
| batch7.6.csv | store_custom_pages |
| batch7.7.csv | store_secrets |
| batch7.8.csv | store_site_offers |
| batch7.9.csv | store_google_reviews_connections |
| batch7.10.csv | commission_invoices |
| batch7.11.csv | coupons |
| batch712.csv | blog_posts |
| batch7.13.csv | invoice_counters |
| batch7.14.csv | email_send_log |
| batch7.15.csv | email_send_state |
| batch7.16.csv | email_unsubscribe_tokens |
| batch7.17.csv | suppressed_emails |
| batch7.18.csv | tour_progress |
| batch7.19.csv | fssai_history |
| batch7.20.csv | account_deletion_requests |
| batch7.21.csv | research_jobs |

---

## Import Order (New Supabase Project)

### Step 1 — SQL Files (run in this order)
```
00_enums.sql        → Custom types (ENUMs)
01_schema.sql       → All tables
02_functions.sql    → Functions & triggers
                      ⚠️ Replace YOUR_NEW_PROJECT_REF in email functions
03_rls_policies.sql → Row Level Security
```

### Step 2 — Triggers (run after functions)
Naye project mein yeh triggers banana padega manually:
```sql
-- Auth trigger (users table pe)
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Store subscription trigger
CREATE TRIGGER on_store_created
  AFTER INSERT ON public.stores
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_store_subscription();

-- Order commission trigger
CREATE TRIGGER on_order_commission
  AFTER INSERT OR UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.accrue_order_commission();

-- Order status history trigger
CREATE TRIGGER on_order_status_change
  AFTER INSERT OR UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.log_order_status_change();

-- Inventory deduct trigger
CREATE TRIGGER on_order_placed
  AFTER INSERT ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.deduct_inventory_on_order();

-- Inventory on purchase trigger
CREATE TRIGGER on_purchase_bill_created
  AFTER INSERT ON public.purchase_bills
  FOR EACH ROW EXECUTE FUNCTION public.inventory_on_purchase();

-- Appointment commission trigger
CREATE TRIGGER on_appointment_completed
  AFTER INSERT OR UPDATE ON public.appointments
  FOR EACH ROW EXECUTE FUNCTION public.accrue_appointment_commission();

-- License batch trigger
CREATE TRIGGER on_license_batch_created
  AFTER INSERT ON public.partner_license_batches
  FOR EACH ROW EXECUTE FUNCTION public.generate_licenses_for_batch();

-- Khata balance recompute trigger
CREATE TRIGGER on_khata_entry_change
  AFTER INSERT OR UPDATE OR DELETE ON public.khata_entries
  FOR EACH ROW EXECUTE FUNCTION public.recompute_customer_balance();

-- Support ticket last message trigger
CREATE TRIGGER on_ticket_message
  AFTER INSERT ON public.support_ticket_messages
  FOR EACH ROW EXECUTE FUNCTION public.bump_ticket_last_message();

-- Custom page slug guard trigger
CREATE TRIGGER guard_custom_page_slug
  BEFORE INSERT OR UPDATE ON public.store_custom_pages
  FOR EACH ROW EXECUTE FUNCTION public.guard_custom_page_slug();

-- QR dine-in trigger
CREATE TRIGGER on_qr_created
  AFTER INSERT ON public.store_qr_codes
  FOR EACH ROW EXECUTE FUNCTION public.ensure_dine_in_enabled_for_qr();

-- Review rating validation trigger
CREATE TRIGGER validate_review_rating
  BEFORE INSERT OR UPDATE ON public.reviews
  FOR EACH ROW EXECUTE FUNCTION public.validate_review_rating();

-- Partner parent cycle guard trigger
CREATE TRIGGER guard_partner_parent_cycle
  BEFORE INSERT OR UPDATE ON public.partners
  FOR EACH ROW EXECUTE FUNCTION public.guard_partner_parent_cycle();

-- updated_at triggers (add to all relevant tables)
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.stores
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.products
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
```

### Step 3 — Data Import (CSV via Table Editor)

**Important:** Auth users (profiles/user_roles) naye project mein re-register karenge.
Config aur theme data seedha import ho sakta hai.

Import order:
```
1.  config1.1  → plan_configs
2.  config1.2  → ai_action_costs
3.  config1.3  → credit_milestones
4.  config1.4  → admin_settings
5.  config1.5  → platform_credit_settings
6.  config1.6  → platform_plan_offers
7.  config1.7  → theme_settings
8.  config1.8  → provisioning_budget
9.  batch2.1   → theme_master_projects
10. batch2.2   → theme_master_versions
11. batch2.3   → theme_master_metrics
12. batch2.4   → theme_category_briefs
13. batch2.5   → theme_layout_archetypes
14. batch2.6   → theme_section_blueprints
15. batch2.7   → theme_image_pool
16. batch2.8   → help_articles
--- User data (after users re-register) ---
17. batch3.1   → profiles
18. batch3.2   → user_roles
19. batch3.3   → stores
20. batch3.4   → subscriptions
21. batch3.5   → ai_credit_wallets
22. batch3.6   → ai_credit_packs
23. batch4.x   → products, categories, customers...
24. batch5.x   → ai_credit_transactions, chat...
25. batch6.x   → partners, licenses...
26. batch7.x   → sourcing, store settings...
```

### Step 4 — Frontend Update
```env
VITE_SUPABASE_URL=https://YOUR_NEW_PROJECT_REF.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your_new_anon_key
```

### Step 5 — Storage Buckets
Naye project mein manually recreate karo:
- `store-assets` bucket
- Files manually download/re-upload karo ya CDN links update karo

---

## Important Notes
- `analytics_events`, `ai_call_log`, `client_error_logs` — logs hain, skip karo
- `store_secrets` mein Razorpay keys hain — manually set karo naye project mein
- `email_queue_dispatch` / `email_queue_wake` functions mein URL update karo
- Auth users (auth.users) migrate nahi hote — users ko re-register karna hoga
