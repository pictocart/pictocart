export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      account_deletion_requests: {
        Row: {
          email: string | null
          id: string
          notes: string | null
          processed_at: string | null
          processed_by: string | null
          reason: string | null
          requested_at: string
          scheduled_for: string
          status: string
          user_id: string
        }
        Insert: {
          email?: string | null
          id?: string
          notes?: string | null
          processed_at?: string | null
          processed_by?: string | null
          reason?: string | null
          requested_at?: string
          scheduled_for?: string
          status?: string
          user_id: string
        }
        Update: {
          email?: string | null
          id?: string
          notes?: string | null
          processed_at?: string | null
          processed_by?: string | null
          reason?: string | null
          requested_at?: string
          scheduled_for?: string
          status?: string
          user_id?: string
        }
        Relationships: []
      }
      accounts_settings: {
        Row: {
          gst_enabled: boolean
          low_stock_notify_enabled: boolean
          opening_bank: number
          opening_cash: number
          store_id: string
          updated_at: string
        }
        Insert: {
          gst_enabled?: boolean
          low_stock_notify_enabled?: boolean
          opening_bank?: number
          opening_cash?: number
          store_id: string
          updated_at?: string
        }
        Update: {
          gst_enabled?: boolean
          low_stock_notify_enabled?: boolean
          opening_bank?: number
          opening_cash?: number
          store_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "accounts_settings_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: true
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      admin_settings: {
        Row: {
          alert_email: string | null
          auto_heal_enabled: boolean
          downtime_threshold_minutes: number
          id: number
          notify_customers: boolean
          notify_merchants: boolean
          session_timeout_minutes: number
          updated_at: string
        }
        Insert: {
          alert_email?: string | null
          auto_heal_enabled?: boolean
          downtime_threshold_minutes?: number
          id?: number
          notify_customers?: boolean
          notify_merchants?: boolean
          session_timeout_minutes?: number
          updated_at?: string
        }
        Update: {
          alert_email?: string | null
          auto_heal_enabled?: boolean
          downtime_threshold_minutes?: number
          id?: number
          notify_customers?: boolean
          notify_merchants?: boolean
          session_timeout_minutes?: number
          updated_at?: string
        }
        Relationships: []
      }
      ai_action_costs: {
        Row: {
          action_key: string
          cache_hit_credits: number
          credits: number
          is_active: boolean
          label: string
          manual_cost_inr: number
          manual_minutes: number
          model: string
          updated_at: string
        }
        Insert: {
          action_key: string
          cache_hit_credits?: number
          credits: number
          is_active?: boolean
          label: string
          manual_cost_inr?: number
          manual_minutes?: number
          model?: string
          updated_at?: string
        }
        Update: {
          action_key?: string
          cache_hit_credits?: number
          credits?: number
          is_active?: boolean
          label?: string
          manual_cost_inr?: number
          manual_minutes?: number
          model?: string
          updated_at?: string
        }
        Relationships: []
      }
      ai_call_log: {
        Row: {
          completion_tokens: number | null
          cost_inr: number
          created_at: string
          function_name: string
          id: string
          metadata: Json | null
          model: string
          prompt_tokens: number | null
          reuse_hit: boolean
        }
        Insert: {
          completion_tokens?: number | null
          cost_inr?: number
          created_at?: string
          function_name: string
          id?: string
          metadata?: Json | null
          model: string
          prompt_tokens?: number | null
          reuse_hit?: boolean
        }
        Update: {
          completion_tokens?: number | null
          cost_inr?: number
          created_at?: string
          function_name?: string
          id?: string
          metadata?: Json | null
          model?: string
          prompt_tokens?: number | null
          reuse_hit?: boolean
        }
        Relationships: []
      }
      ai_credit_packs: {
        Row: {
          badge: string | null
          bonus_pct: number
          created_at: string
          credits: number
          id: string
          is_active: boolean
          is_popular: boolean
          name: string
          price_inr: number
          sort_order: number
          updated_at: string
          valid_from: string | null
          valid_until: string | null
        }
        Insert: {
          badge?: string | null
          bonus_pct?: number
          created_at?: string
          credits: number
          id?: string
          is_active?: boolean
          is_popular?: boolean
          name: string
          price_inr: number
          sort_order?: number
          updated_at?: string
          valid_from?: string | null
          valid_until?: string | null
        }
        Update: {
          badge?: string | null
          bonus_pct?: number
          created_at?: string
          credits?: number
          id?: string
          is_active?: boolean
          is_popular?: boolean
          name?: string
          price_inr?: number
          sort_order?: number
          updated_at?: string
          valid_from?: string | null
          valid_until?: string | null
        }
        Relationships: []
      }
      ai_credit_transactions: {
        Row: {
          action_key: string | null
          cache_hit: boolean
          created_at: string
          credits: number
          granted_by_admin: string | null
          id: string
          inr_value: number
          manual_cost_inr: number
          manual_minutes: number
          metadata: Json
          promo_code: string | null
          razorpay_order_id: string | null
          razorpay_payment_id: string | null
          reason: string | null
          store_id: string
          type: Database["public"]["Enums"]["credit_txn_type"]
        }
        Insert: {
          action_key?: string | null
          cache_hit?: boolean
          created_at?: string
          credits: number
          granted_by_admin?: string | null
          id?: string
          inr_value?: number
          manual_cost_inr?: number
          manual_minutes?: number
          metadata?: Json
          promo_code?: string | null
          razorpay_order_id?: string | null
          razorpay_payment_id?: string | null
          reason?: string | null
          store_id: string
          type: Database["public"]["Enums"]["credit_txn_type"]
        }
        Update: {
          action_key?: string | null
          cache_hit?: boolean
          created_at?: string
          credits?: number
          granted_by_admin?: string | null
          id?: string
          inr_value?: number
          manual_cost_inr?: number
          manual_minutes?: number
          metadata?: Json
          promo_code?: string | null
          razorpay_order_id?: string | null
          razorpay_payment_id?: string | null
          reason?: string | null
          store_id?: string
          type?: Database["public"]["Enums"]["credit_txn_type"]
        }
        Relationships: []
      }
      ai_credit_wallets: {
        Row: {
          auto_recharge_enabled: boolean
          auto_recharge_pack_id: string | null
          balance: number
          created_at: string
          lifetime_purchased: number
          lifetime_saved_inr: number
          lifetime_saved_minutes: number
          lifetime_used: number
          low_balance_notified_at: string | null
          loyalty_tier: string
          store_id: string
          updated_at: string
          welcome_grant_given: boolean
          zero_balance_notified_at: string | null
        }
        Insert: {
          auto_recharge_enabled?: boolean
          auto_recharge_pack_id?: string | null
          balance?: number
          created_at?: string
          lifetime_purchased?: number
          lifetime_saved_inr?: number
          lifetime_saved_minutes?: number
          lifetime_used?: number
          low_balance_notified_at?: string | null
          loyalty_tier?: string
          store_id: string
          updated_at?: string
          welcome_grant_given?: boolean
          zero_balance_notified_at?: string | null
        }
        Update: {
          auto_recharge_enabled?: boolean
          auto_recharge_pack_id?: string | null
          balance?: number
          created_at?: string
          lifetime_purchased?: number
          lifetime_saved_inr?: number
          lifetime_saved_minutes?: number
          lifetime_used?: number
          low_balance_notified_at?: string | null
          loyalty_tier?: string
          store_id?: string
          updated_at?: string
          welcome_grant_given?: boolean
          zero_balance_notified_at?: string | null
        }
        Relationships: []
      }
      ai_response_cache: {
        Row: {
          action_key: string
          created_at: string
          expires_at: string | null
          hits: number
          key: string
          response: Json
        }
        Insert: {
          action_key: string
          created_at?: string
          expires_at?: string | null
          hits?: number
          key: string
          response: Json
        }
        Update: {
          action_key?: string
          created_at?: string
          expires_at?: string | null
          hits?: number
          key?: string
          response?: Json
        }
        Relationships: []
      }
      analytics_events: {
        Row: {
          created_at: string
          event_type: string
          id: string
          metadata: Json
          order_id: string | null
          path: string | null
          product_id: string | null
          referrer: string | null
          session_id: string | null
          store_id: string
          user_id: string | null
          value: number | null
        }
        Insert: {
          created_at?: string
          event_type: string
          id?: string
          metadata?: Json
          order_id?: string | null
          path?: string | null
          product_id?: string | null
          referrer?: string | null
          session_id?: string | null
          store_id: string
          user_id?: string | null
          value?: number | null
        }
        Update: {
          created_at?: string
          event_type?: string
          id?: string
          metadata?: Json
          order_id?: string | null
          path?: string | null
          product_id?: string | null
          referrer?: string | null
          session_id?: string | null
          store_id?: string
          user_id?: string | null
          value?: number | null
        }
        Relationships: []
      }
      appointments: {
        Row: {
          address: Json | null
          after_photos: string[] | null
          appointment_number: string | null
          before_photos: string[] | null
          created_at: string
          customer_email: string | null
          customer_id: string | null
          customer_name: string | null
          customer_phone: string | null
          customer_user_id: string | null
          en_route_at: string | null
          family_group_id: string | null
          gst: number | null
          id: string
          mode: Database["public"]["Enums"]["appointment_mode"]
          notes_customer: string | null
          notes_internal: string | null
          order_id: string | null
          package_balance_id: string | null
          payment_mode: string | null
          payment_status: string | null
          price: number | null
          provider_id: string | null
          reminder_sent_at: string | null
          service_id: string | null
          service_name_snapshot: string | null
          slot_end: string
          slot_start: string
          special_request: string | null
          status: Database["public"]["Enums"]["appointment_status"]
          store_id: string
          total: number | null
          travel_fee: number | null
          updated_at: string
        }
        Insert: {
          address?: Json | null
          after_photos?: string[] | null
          appointment_number?: string | null
          before_photos?: string[] | null
          created_at?: string
          customer_email?: string | null
          customer_id?: string | null
          customer_name?: string | null
          customer_phone?: string | null
          customer_user_id?: string | null
          en_route_at?: string | null
          family_group_id?: string | null
          gst?: number | null
          id?: string
          mode?: Database["public"]["Enums"]["appointment_mode"]
          notes_customer?: string | null
          notes_internal?: string | null
          order_id?: string | null
          package_balance_id?: string | null
          payment_mode?: string | null
          payment_status?: string | null
          price?: number | null
          provider_id?: string | null
          reminder_sent_at?: string | null
          service_id?: string | null
          service_name_snapshot?: string | null
          slot_end: string
          slot_start: string
          special_request?: string | null
          status?: Database["public"]["Enums"]["appointment_status"]
          store_id: string
          total?: number | null
          travel_fee?: number | null
          updated_at?: string
        }
        Update: {
          address?: Json | null
          after_photos?: string[] | null
          appointment_number?: string | null
          before_photos?: string[] | null
          created_at?: string
          customer_email?: string | null
          customer_id?: string | null
          customer_name?: string | null
          customer_phone?: string | null
          customer_user_id?: string | null
          en_route_at?: string | null
          family_group_id?: string | null
          gst?: number | null
          id?: string
          mode?: Database["public"]["Enums"]["appointment_mode"]
          notes_customer?: string | null
          notes_internal?: string | null
          order_id?: string | null
          package_balance_id?: string | null
          payment_mode?: string | null
          payment_status?: string | null
          price?: number | null
          provider_id?: string | null
          reminder_sent_at?: string | null
          service_id?: string | null
          service_name_snapshot?: string | null
          slot_end?: string
          slot_start?: string
          special_request?: string | null
          status?: Database["public"]["Enums"]["appointment_status"]
          store_id?: string
          total?: number | null
          travel_fee?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "appointments_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "service_providers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      blog_posts: {
        Row: {
          body: string | null
          cover_image: string | null
          created_at: string | null
          id: string
          is_published: boolean | null
          seo_description: string | null
          seo_title: string | null
          slug: string
          store_id: string
          thumbnail_image: string | null
          title: string
          updated_at: string | null
        }
        Insert: {
          body?: string | null
          cover_image?: string | null
          created_at?: string | null
          id?: string
          is_published?: boolean | null
          seo_description?: string | null
          seo_title?: string | null
          slug: string
          store_id: string
          thumbnail_image?: string | null
          title: string
          updated_at?: string | null
        }
        Update: {
          body?: string | null
          cover_image?: string | null
          created_at?: string | null
          id?: string
          is_published?: boolean | null
          seo_description?: string | null
          seo_title?: string | null
          slug?: string
          store_id?: string
          thumbnail_image?: string | null
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "blog_posts_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      categories: {
        Row: {
          created_at: string
          description: string | null
          id: string
          image_url: string | null
          name: string
          parent_id: string | null
          sort_order: number
          store_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          name: string
          parent_id?: string | null
          sort_order?: number
          store_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          name?: string
          parent_id?: string | null
          sort_order?: number
          store_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "categories_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "categories_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      client_error_logs: {
        Row: {
          created_at: string
          id: string
          level: string
          message: string
          metadata: Json
          path: string | null
          stack: string | null
          store_id: string | null
          url: string | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          level?: string
          message: string
          metadata?: Json
          path?: string | null
          stack?: string | null
          store_id?: string | null
          url?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          level?: string
          message?: string
          metadata?: Json
          path?: string | null
          stack?: string | null
          store_id?: string | null
          url?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      cod_rules: {
        Row: {
          blocked_phones: string[]
          created_at: string
          enabled: boolean
          max_order_value: number
          min_order_value: number
          min_prior_orders: number
          notes: string | null
          pincode_allowlist: string[]
          pincode_blocklist: string[]
          require_phone_verification: boolean
          store_id: string
          updated_at: string
        }
        Insert: {
          blocked_phones?: string[]
          created_at?: string
          enabled?: boolean
          max_order_value?: number
          min_order_value?: number
          min_prior_orders?: number
          notes?: string | null
          pincode_allowlist?: string[]
          pincode_blocklist?: string[]
          require_phone_verification?: boolean
          store_id: string
          updated_at?: string
        }
        Update: {
          blocked_phones?: string[]
          created_at?: string
          enabled?: boolean
          max_order_value?: number
          min_order_value?: number
          min_prior_orders?: number
          notes?: string | null
          pincode_allowlist?: string[]
          pincode_blocklist?: string[]
          require_phone_verification?: boolean
          store_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      commission_invoices: {
        Row: {
          created_at: string
          due_date: string
          id: string
          invoice_number: string | null
          paid_at: string | null
          paid_via: string | null
          pdf_url: string | null
          period_end: string
          period_start: string
          razorpay_order_id: string | null
          razorpay_payment_id: string | null
          status: Database["public"]["Enums"]["commission_invoice_status"]
          store_id: string
          total_commission: number
          total_gmv: number
          updated_at: string
          waive_reason: string | null
        }
        Insert: {
          created_at?: string
          due_date: string
          id?: string
          invoice_number?: string | null
          paid_at?: string | null
          paid_via?: string | null
          pdf_url?: string | null
          period_end: string
          period_start: string
          razorpay_order_id?: string | null
          razorpay_payment_id?: string | null
          status?: Database["public"]["Enums"]["commission_invoice_status"]
          store_id: string
          total_commission?: number
          total_gmv?: number
          updated_at?: string
          waive_reason?: string | null
        }
        Update: {
          created_at?: string
          due_date?: string
          id?: string
          invoice_number?: string | null
          paid_at?: string | null
          paid_via?: string | null
          pdf_url?: string | null
          period_end?: string
          period_start?: string
          razorpay_order_id?: string | null
          razorpay_payment_id?: string | null
          status?: Database["public"]["Enums"]["commission_invoice_status"]
          store_id?: string
          total_commission?: number
          total_gmv?: number
          updated_at?: string
          waive_reason?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "commission_invoices_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      coupons: {
        Row: {
          allowed_modes: Database["public"]["Enums"]["fulfillment_mode"][]
          auto_apply: boolean
          bogo_buy_qty: number | null
          bogo_get_discount_pct: number | null
          bogo_get_qty: number | null
          code: string
          created_at: string
          description: string | null
          expires_at: string | null
          id: string
          is_active: boolean
          max_uses: number | null
          min_order_amount: number | null
          starts_at: string | null
          store_id: string
          tiers: Json | null
          type: Database["public"]["Enums"]["coupon_type"]
          updated_at: string
          used_count: number
          value: number
        }
        Insert: {
          allowed_modes?: Database["public"]["Enums"]["fulfillment_mode"][]
          auto_apply?: boolean
          bogo_buy_qty?: number | null
          bogo_get_discount_pct?: number | null
          bogo_get_qty?: number | null
          code: string
          created_at?: string
          description?: string | null
          expires_at?: string | null
          id?: string
          is_active?: boolean
          max_uses?: number | null
          min_order_amount?: number | null
          starts_at?: string | null
          store_id: string
          tiers?: Json | null
          type?: Database["public"]["Enums"]["coupon_type"]
          updated_at?: string
          used_count?: number
          value?: number
        }
        Update: {
          allowed_modes?: Database["public"]["Enums"]["fulfillment_mode"][]
          auto_apply?: boolean
          bogo_buy_qty?: number | null
          bogo_get_discount_pct?: number | null
          bogo_get_qty?: number | null
          code?: string
          created_at?: string
          description?: string | null
          expires_at?: string | null
          id?: string
          is_active?: boolean
          max_uses?: number | null
          min_order_amount?: number | null
          starts_at?: string | null
          store_id?: string
          tiers?: Json | null
          type?: Database["public"]["Enums"]["coupon_type"]
          updated_at?: string
          used_count?: number
          value?: number
        }
        Relationships: [
          {
            foreignKeyName: "coupons_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      credit_milestone_grants: {
        Row: {
          granted_at: string
          id: string
          milestone_key: string
          store_id: string
        }
        Insert: {
          granted_at?: string
          id?: string
          milestone_key: string
          store_id: string
        }
        Update: {
          granted_at?: string
          id?: string
          milestone_key?: string
          store_id?: string
        }
        Relationships: []
      }
      credit_milestones: {
        Row: {
          credits: number
          is_active: boolean
          key: string
          label: string
          updated_at: string
        }
        Insert: {
          credits: number
          is_active?: boolean
          key: string
          label: string
          updated_at?: string
        }
        Update: {
          credits?: number
          is_active?: boolean
          key?: string
          label?: string
          updated_at?: string
        }
        Relationships: []
      }
      credit_promo_redemptions: {
        Row: {
          id: string
          promo_id: string
          redeemed_at: string
          store_id: string
          transaction_id: string | null
        }
        Insert: {
          id?: string
          promo_id: string
          redeemed_at?: string
          store_id: string
          transaction_id?: string | null
        }
        Update: {
          id?: string
          promo_id?: string
          redeemed_at?: string
          store_id?: string
          transaction_id?: string | null
        }
        Relationships: []
      }
      credit_promos: {
        Row: {
          bonus_flat_credits: number
          bonus_pct: number
          code: string | null
          created_at: string
          description: string | null
          eligible_pack_ids: string[]
          id: string
          is_active: boolean
          max_uses: number | null
          metadata: Json
          min_recharge_inr: number
          type: Database["public"]["Enums"]["credit_promo_type"]
          updated_at: string
          used_count: number
          valid_from: string | null
          valid_until: string | null
        }
        Insert: {
          bonus_flat_credits?: number
          bonus_pct?: number
          code?: string | null
          created_at?: string
          description?: string | null
          eligible_pack_ids?: string[]
          id?: string
          is_active?: boolean
          max_uses?: number | null
          metadata?: Json
          min_recharge_inr?: number
          type: Database["public"]["Enums"]["credit_promo_type"]
          updated_at?: string
          used_count?: number
          valid_from?: string | null
          valid_until?: string | null
        }
        Update: {
          bonus_flat_credits?: number
          bonus_pct?: number
          code?: string | null
          created_at?: string
          description?: string | null
          eligible_pack_ids?: string[]
          id?: string
          is_active?: boolean
          max_uses?: number | null
          metadata?: Json
          min_recharge_inr?: number
          type?: Database["public"]["Enums"]["credit_promo_type"]
          updated_at?: string
          used_count?: number
          valid_from?: string | null
          valid_until?: string | null
        }
        Relationships: []
      }
      customer_package_balances: {
        Row: {
          created_at: string
          customer_id: string | null
          customer_phone: string | null
          customer_user_id: string | null
          expires_at: string | null
          id: string
          package_id: string
          store_id: string
          updated_at: string
          visits_left: number
        }
        Insert: {
          created_at?: string
          customer_id?: string | null
          customer_phone?: string | null
          customer_user_id?: string | null
          expires_at?: string | null
          id?: string
          package_id: string
          store_id: string
          updated_at?: string
          visits_left?: number
        }
        Update: {
          created_at?: string
          customer_id?: string | null
          customer_phone?: string | null
          customer_user_id?: string | null
          expires_at?: string | null
          id?: string
          package_id?: string
          store_id?: string
          updated_at?: string
          visits_left?: number
        }
        Relationships: [
          {
            foreignKeyName: "customer_package_balances_package_id_fkey"
            columns: ["package_id"]
            isOneToOne: false
            referencedRelation: "service_packages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_package_balances_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      customers: {
        Row: {
          balance: number
          created_at: string | null
          email: string | null
          id: string
          name: string | null
          phone: string | null
          saved_addresses: Json | null
          store_id: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          balance?: number
          created_at?: string | null
          email?: string | null
          id?: string
          name?: string | null
          phone?: string | null
          saved_addresses?: Json | null
          store_id: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          balance?: number
          created_at?: string | null
          email?: string | null
          id?: string
          name?: string | null
          phone?: string | null
          saved_addresses?: Json | null
          store_id?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "customers_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      disputes: {
        Row: {
          amount_inr: number
          created_at: string
          id: string
          order_id: string | null
          phase: string | null
          raw: Json | null
          razorpay_dispute_id: string | null
          razorpay_payment_id: string | null
          reason_code: string | null
          reason_description: string | null
          respond_by: string | null
          status: string
          store_id: string | null
          updated_at: string
        }
        Insert: {
          amount_inr?: number
          created_at?: string
          id?: string
          order_id?: string | null
          phase?: string | null
          raw?: Json | null
          razorpay_dispute_id?: string | null
          razorpay_payment_id?: string | null
          reason_code?: string | null
          reason_description?: string | null
          respond_by?: string | null
          status?: string
          store_id?: string | null
          updated_at?: string
        }
        Update: {
          amount_inr?: number
          created_at?: string
          id?: string
          order_id?: string | null
          phase?: string | null
          raw?: Json | null
          razorpay_dispute_id?: string | null
          razorpay_payment_id?: string | null
          reason_code?: string | null
          reason_description?: string | null
          respond_by?: string | null
          status?: string
          store_id?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      domain_connect_sessions: {
        Row: {
          callback_token: string
          completed_at: string | null
          created_at: string
          domain: string
          id: string
          metadata: Json | null
          registrar: string | null
          status: string
          store_id: string
        }
        Insert: {
          callback_token?: string
          completed_at?: string | null
          created_at?: string
          domain: string
          id?: string
          metadata?: Json | null
          registrar?: string | null
          status?: string
          store_id: string
        }
        Update: {
          callback_token?: string
          completed_at?: string | null
          created_at?: string
          domain?: string
          id?: string
          metadata?: Json | null
          registrar?: string | null
          status?: string
          store_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "domain_connect_sessions_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      dropship_orders: {
        Row: {
          courier: string | null
          created_at: string
          delivered_at: string | null
          forwarded_at: string | null
          id: string
          margin: number
          metadata: Json
          notes: string | null
          order_id: string | null
          product_id: string | null
          quantity: number
          retail_price: number
          shipping_address: Json
          status: string
          store_id: string
          supplier_id: string
          supplier_invoice_url: string | null
          tracking_number: string | null
          updated_at: string
          user_id: string
          wholesale_cost: number
        }
        Insert: {
          courier?: string | null
          created_at?: string
          delivered_at?: string | null
          forwarded_at?: string | null
          id?: string
          margin?: number
          metadata?: Json
          notes?: string | null
          order_id?: string | null
          product_id?: string | null
          quantity?: number
          retail_price?: number
          shipping_address: Json
          status?: string
          store_id: string
          supplier_id: string
          supplier_invoice_url?: string | null
          tracking_number?: string | null
          updated_at?: string
          user_id: string
          wholesale_cost?: number
        }
        Update: {
          courier?: string | null
          created_at?: string
          delivered_at?: string | null
          forwarded_at?: string | null
          id?: string
          margin?: number
          metadata?: Json
          notes?: string | null
          order_id?: string | null
          product_id?: string | null
          quantity?: number
          retail_price?: number
          shipping_address?: Json
          status?: string
          store_id?: string
          supplier_id?: string
          supplier_invoice_url?: string | null
          tracking_number?: string | null
          updated_at?: string
          user_id?: string
          wholesale_cost?: number
        }
        Relationships: [
          {
            foreignKeyName: "dropship_orders_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dropship_orders_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "sourcing_products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dropship_orders_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dropship_orders_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "sourcing_suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      email_send_log: {
        Row: {
          created_at: string
          error_message: string | null
          id: string
          message_id: string | null
          metadata: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Update: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email?: string
          status?: string
          template_name?: string
        }
        Relationships: []
      }
      email_send_state: {
        Row: {
          auth_email_ttl_minutes: number
          batch_size: number
          id: number
          retry_after_until: string | null
          send_delay_ms: number
          transactional_email_ttl_minutes: number
          updated_at: string
        }
        Insert: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Update: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Relationships: []
      }
      email_unsubscribe_tokens: {
        Row: {
          created_at: string
          email: string
          id: string
          token: string
          used_at: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          token: string
          used_at?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          token?: string
          used_at?: string | null
        }
        Relationships: []
      }
      expense_categories: {
        Row: {
          created_at: string
          id: string
          is_default: boolean
          name: string
          store_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_default?: boolean
          name: string
          store_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_default?: boolean
          name?: string
          store_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "expense_categories_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      expenses: {
        Row: {
          amount: number
          attachment_url: string | null
          category: string
          created_at: string
          expense_date: string
          id: string
          is_recurring: boolean
          notes: string | null
          parent_expense_id: string | null
          payment_mode: Database["public"]["Enums"]["payment_mode_t"]
          recurrence: string | null
          store_id: string
          updated_at: string
        }
        Insert: {
          amount: number
          attachment_url?: string | null
          category: string
          created_at?: string
          expense_date?: string
          id?: string
          is_recurring?: boolean
          notes?: string | null
          parent_expense_id?: string | null
          payment_mode?: Database["public"]["Enums"]["payment_mode_t"]
          recurrence?: string | null
          store_id: string
          updated_at?: string
        }
        Update: {
          amount?: number
          attachment_url?: string | null
          category?: string
          created_at?: string
          expense_date?: string
          id?: string
          is_recurring?: boolean
          notes?: string | null
          parent_expense_id?: string | null
          payment_mode?: Database["public"]["Enums"]["payment_mode_t"]
          recurrence?: string | null
          store_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "expenses_parent_expense_id_fkey"
            columns: ["parent_expense_id"]
            isOneToOne: false
            referencedRelation: "expenses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expenses_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      family_groups: {
        Row: {
          created_at: string
          family_name: string
          free_visits_used: number | null
          head_customer_id: string | null
          head_user_id: string | null
          id: string
          notes: string | null
          plan_id: string | null
          status: Database["public"]["Enums"]["family_plan_status"]
          store_id: string
          updated_at: string
          valid_from: string | null
          valid_until: string | null
        }
        Insert: {
          created_at?: string
          family_name: string
          free_visits_used?: number | null
          head_customer_id?: string | null
          head_user_id?: string | null
          id?: string
          notes?: string | null
          plan_id?: string | null
          status?: Database["public"]["Enums"]["family_plan_status"]
          store_id: string
          updated_at?: string
          valid_from?: string | null
          valid_until?: string | null
        }
        Update: {
          created_at?: string
          family_name?: string
          free_visits_used?: number | null
          head_customer_id?: string | null
          head_user_id?: string | null
          id?: string
          notes?: string | null
          plan_id?: string | null
          status?: Database["public"]["Enums"]["family_plan_status"]
          store_id?: string
          updated_at?: string
          valid_from?: string | null
          valid_until?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "family_groups_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "family_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "family_groups_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      family_members: {
        Row: {
          created_at: string
          customer_id: string | null
          dob: string | null
          gender: string | null
          group_id: string
          id: string
          name: string
          notes: string | null
          phone: string | null
          relation: string | null
        }
        Insert: {
          created_at?: string
          customer_id?: string | null
          dob?: string | null
          gender?: string | null
          group_id: string
          id?: string
          name: string
          notes?: string | null
          phone?: string | null
          relation?: string | null
        }
        Update: {
          created_at?: string
          customer_id?: string | null
          dob?: string | null
          gender?: string | null
          group_id?: string
          id?: string
          name?: string
          notes?: string | null
          phone?: string | null
          relation?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "family_members_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "family_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      family_plans: {
        Row: {
          created_at: string
          description: string | null
          discount_pct: number | null
          free_visits_per_year: number | null
          home_visit_included: boolean | null
          id: string
          included_service_ids: string[] | null
          is_active: boolean | null
          max_families: number | null
          max_members_per_family: number | null
          monthly_fee: number | null
          name: string
          provider_id: string | null
          store_id: string
          updated_at: string
          yearly_fee: number | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          discount_pct?: number | null
          free_visits_per_year?: number | null
          home_visit_included?: boolean | null
          id?: string
          included_service_ids?: string[] | null
          is_active?: boolean | null
          max_families?: number | null
          max_members_per_family?: number | null
          monthly_fee?: number | null
          name: string
          provider_id?: string | null
          store_id: string
          updated_at?: string
          yearly_fee?: number | null
        }
        Update: {
          created_at?: string
          description?: string | null
          discount_pct?: number | null
          free_visits_per_year?: number | null
          home_visit_included?: boolean | null
          id?: string
          included_service_ids?: string[] | null
          is_active?: boolean | null
          max_families?: number | null
          max_members_per_family?: number | null
          monthly_fee?: number | null
          name?: string
          provider_id?: string | null
          store_id?: string
          updated_at?: string
          yearly_fee?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "family_plans_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "service_providers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "family_plans_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      help_articles: {
        Row: {
          body_md: string
          category: string
          created_at: string
          id: string
          is_published: boolean
          slug: string
          sort: number
          title: string
          updated_at: string
        }
        Insert: {
          body_md?: string
          category?: string
          created_at?: string
          id?: string
          is_published?: boolean
          slug: string
          sort?: number
          title: string
          updated_at?: string
        }
        Update: {
          body_md?: string
          category?: string
          created_at?: string
          id?: string
          is_published?: boolean
          slug?: string
          sort?: number
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      inventory_movements: {
        Row: {
          created_at: string
          id: string
          movement_type: Database["public"]["Enums"]["inv_movement_type"]
          notes: string | null
          product_id: string
          qty: number
          reference_id: string | null
          reference_table: string | null
          store_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          movement_type: Database["public"]["Enums"]["inv_movement_type"]
          notes?: string | null
          product_id: string
          qty: number
          reference_id?: string | null
          reference_table?: string | null
          store_id: string
        }
        Update: {
          created_at?: string
          id?: string
          movement_type?: Database["public"]["Enums"]["inv_movement_type"]
          notes?: string | null
          product_id?: string
          qty?: number
          reference_id?: string | null
          reference_table?: string | null
          store_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "inventory_movements_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_movements_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      invoice_counters: {
        Row: {
          fiscal_year: string
          last_number: number
          prefix: string
          store_id: string
          updated_at: string
        }
        Insert: {
          fiscal_year: string
          last_number?: number
          prefix?: string
          store_id: string
          updated_at?: string
        }
        Update: {
          fiscal_year?: string
          last_number?: number
          prefix?: string
          store_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      khata_entries: {
        Row: {
          amount: number
          created_at: string
          customer_id: string | null
          customer_name: string | null
          customer_phone: string | null
          entry_date: string
          entry_type: Database["public"]["Enums"]["khata_entry_type"]
          id: string
          notes: string | null
          order_id: string | null
          payment_mode: Database["public"]["Enums"]["payment_mode_t"] | null
          store_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          customer_id?: string | null
          customer_name?: string | null
          customer_phone?: string | null
          entry_date?: string
          entry_type: Database["public"]["Enums"]["khata_entry_type"]
          id?: string
          notes?: string | null
          order_id?: string | null
          payment_mode?: Database["public"]["Enums"]["payment_mode_t"] | null
          store_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          customer_id?: string | null
          customer_name?: string | null
          customer_phone?: string | null
          entry_date?: string
          entry_type?: Database["public"]["Enums"]["khata_entry_type"]
          id?: string
          notes?: string | null
          order_id?: string | null
          payment_mode?: Database["public"]["Enums"]["payment_mode_t"] | null
          store_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "khata_entries_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "khata_entries_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "khata_entries_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      low_balance_alerts: {
        Row: {
          balance_at_alert: number
          id: string
          sent_at: string
          store_id: string
          threshold_type: string
        }
        Insert: {
          balance_at_alert: number
          id?: string
          sent_at?: string
          store_id: string
          threshold_type: string
        }
        Update: {
          balance_at_alert?: number
          id?: string
          sent_at?: string
          store_id?: string
          threshold_type?: string
        }
        Relationships: []
      }
      master_theme_deliveries: {
        Row: {
          category: string | null
          delivered_at: string
          generation_cost_inr: number | null
          id: string
          layout_slug: string | null
          master_id: string | null
          name: string
          payload: Json
          preview_image: string | null
          reuse_ratio: number | null
          reused_components: number | null
          reused_images: number | null
          source_research: Json | null
          status: string
          theme_pack_id: string | null
          tokens_used: number | null
        }
        Insert: {
          category?: string | null
          delivered_at?: string
          generation_cost_inr?: number | null
          id?: string
          layout_slug?: string | null
          master_id?: string | null
          name: string
          payload: Json
          preview_image?: string | null
          reuse_ratio?: number | null
          reused_components?: number | null
          reused_images?: number | null
          source_research?: Json | null
          status?: string
          theme_pack_id?: string | null
          tokens_used?: number | null
        }
        Update: {
          category?: string | null
          delivered_at?: string
          generation_cost_inr?: number | null
          id?: string
          layout_slug?: string | null
          master_id?: string | null
          name?: string
          payload?: Json
          preview_image?: string | null
          reuse_ratio?: number | null
          reused_components?: number | null
          reused_images?: number | null
          source_research?: Json | null
          status?: string
          theme_pack_id?: string | null
          tokens_used?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "master_theme_deliveries_master_id_fkey"
            columns: ["master_id"]
            isOneToOne: false
            referencedRelation: "theme_master_projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "master_theme_deliveries_theme_pack_id_fkey"
            columns: ["theme_pack_id"]
            isOneToOne: false
            referencedRelation: "theme_packs"
            referencedColumns: ["id"]
          },
        ]
      }
      merchant_chat_messages: {
        Row: {
          content: string
          created_at: string
          id: string
          role: string
          thread_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          role: string
          thread_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          role?: string
          thread_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "merchant_chat_messages_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "merchant_chat_threads"
            referencedColumns: ["id"]
          },
        ]
      }
      merchant_chat_threads: {
        Row: {
          created_at: string
          id: string
          last_message_at: string
          store_id: string | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          last_message_at?: string
          store_id?: string | null
          title?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          last_message_at?: string
          store_id?: string | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "merchant_chat_threads_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      merchant_sourcing_saved: {
        Row: {
          created_at: string
          id: string
          notes: string | null
          product_id: string
          store_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          notes?: string | null
          product_id: string
          store_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          notes?: string | null
          product_id?: string
          store_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "merchant_sourcing_saved_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "sourcing_products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "merchant_sourcing_saved_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      merchant_supplier_unlocks: {
        Row: {
          created_at: string
          credits_charged: number
          id: string
          product_id: string | null
          store_id: string
          supplier_id: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          credits_charged?: number
          id?: string
          product_id?: string | null
          store_id: string
          supplier_id?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          credits_charged?: number
          id?: string
          product_id?: string | null
          store_id?: string
          supplier_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "merchant_supplier_unlocks_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "sourcing_products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "merchant_supplier_unlocks_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "merchant_supplier_unlocks_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "sourcing_suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      newsletter_subscribers: {
        Row: {
          email: string
          id: string
          store_id: string
          subscribed_at: string | null
        }
        Insert: {
          email: string
          id?: string
          store_id: string
          subscribed_at?: string | null
        }
        Update: {
          email?: string
          id?: string
          store_id?: string
          subscribed_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "newsletter_subscribers_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      order_commissions: {
        Row: {
          commission_amount: number
          commission_rate: number
          created_at: string
          gmv_amount: number
          id: string
          invoice_id: string | null
          order_id: string
          plan: string
          status: Database["public"]["Enums"]["commission_status"]
          store_id: string
          updated_at: string
        }
        Insert: {
          commission_amount: number
          commission_rate: number
          created_at?: string
          gmv_amount: number
          id?: string
          invoice_id?: string | null
          order_id: string
          plan: string
          status?: Database["public"]["Enums"]["commission_status"]
          store_id: string
          updated_at?: string
        }
        Update: {
          commission_amount?: number
          commission_rate?: number
          created_at?: string
          gmv_amount?: number
          id?: string
          invoice_id?: string | null
          order_id?: string
          plan?: string
          status?: Database["public"]["Enums"]["commission_status"]
          store_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "order_commissions_invoice_fk"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "commission_invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_commissions_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: true
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_commissions_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      order_feedback: {
        Row: {
          comment: string | null
          created_at: string
          id: string
          order_id: string
          rating: number
          store_id: string
        }
        Insert: {
          comment?: string | null
          created_at?: string
          id?: string
          order_id: string
          rating: number
          store_id: string
        }
        Update: {
          comment?: string | null
          created_at?: string
          id?: string
          order_id?: string
          rating?: number
          store_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "order_feedback_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: true
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_feedback_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          amount_refunded: number
          courier_provider: string | null
          courier_response: Json | null
          created_at: string
          customer_address: Json | null
          customer_email: string | null
          customer_name: string | null
          customer_phone: string | null
          customer_user_id: string | null
          fulfillment_mode: Database["public"]["Enums"]["fulfillment_mode"]
          guest_tracking_code: string | null
          id: string
          invoice_number: string | null
          items: Json
          notes: string | null
          order_number: string
          payment_method: string | null
          payment_status: Database["public"]["Enums"]["payment_status"] | null
          prep_status: Database["public"]["Enums"]["prep_status"] | null
          razorpay_order_id: string | null
          razorpay_payment_id: string | null
          shipping: number | null
          status: Database["public"]["Enums"]["order_status"] | null
          store_id: string
          subtotal: number | null
          table_label: string | null
          tax: number | null
          total: number | null
          tracking_number: string | null
          updated_at: string
        }
        Insert: {
          amount_refunded?: number
          courier_provider?: string | null
          courier_response?: Json | null
          created_at?: string
          customer_address?: Json | null
          customer_email?: string | null
          customer_name?: string | null
          customer_phone?: string | null
          customer_user_id?: string | null
          fulfillment_mode?: Database["public"]["Enums"]["fulfillment_mode"]
          guest_tracking_code?: string | null
          id?: string
          invoice_number?: string | null
          items?: Json
          notes?: string | null
          order_number: string
          payment_method?: string | null
          payment_status?: Database["public"]["Enums"]["payment_status"] | null
          prep_status?: Database["public"]["Enums"]["prep_status"] | null
          razorpay_order_id?: string | null
          razorpay_payment_id?: string | null
          shipping?: number | null
          status?: Database["public"]["Enums"]["order_status"] | null
          store_id: string
          subtotal?: number | null
          table_label?: string | null
          tax?: number | null
          total?: number | null
          tracking_number?: string | null
          updated_at?: string
        }
        Update: {
          amount_refunded?: number
          courier_provider?: string | null
          courier_response?: Json | null
          created_at?: string
          customer_address?: Json | null
          customer_email?: string | null
          customer_name?: string | null
          customer_phone?: string | null
          customer_user_id?: string | null
          fulfillment_mode?: Database["public"]["Enums"]["fulfillment_mode"]
          guest_tracking_code?: string | null
          id?: string
          invoice_number?: string | null
          items?: Json
          notes?: string | null
          order_number?: string
          payment_method?: string | null
          payment_status?: Database["public"]["Enums"]["payment_status"] | null
          prep_status?: Database["public"]["Enums"]["prep_status"] | null
          razorpay_order_id?: string | null
          razorpay_payment_id?: string | null
          shipping?: number | null
          status?: Database["public"]["Enums"]["order_status"] | null
          store_id?: string
          subtotal?: number | null
          table_label?: string | null
          tax?: number | null
          total?: number | null
          tracking_number?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "orders_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      partner_commissions: {
        Row: {
          base_amount: number
          commission_amount: number
          created_at: string
          id: string
          partner_id: string
          payout_id: string | null
          period_month: string
          referral_id: string | null
          status: string
        }
        Insert: {
          base_amount?: number
          commission_amount?: number
          created_at?: string
          id?: string
          partner_id: string
          payout_id?: string | null
          period_month: string
          referral_id?: string | null
          status?: string
        }
        Update: {
          base_amount?: number
          commission_amount?: number
          created_at?: string
          id?: string
          partner_id?: string
          payout_id?: string | null
          period_month?: string
          referral_id?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "partner_commissions_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "partners"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partner_commissions_referral_id_fkey"
            columns: ["referral_id"]
            isOneToOne: false
            referencedRelation: "partner_referrals"
            referencedColumns: ["id"]
          },
        ]
      }
      partner_payouts: {
        Row: {
          amount: number
          created_at: string
          id: string
          method: string | null
          notes: string | null
          paid_at: string | null
          partner_id: string
          period: string | null
          status: string
          utr: string | null
        }
        Insert: {
          amount: number
          created_at?: string
          id?: string
          method?: string | null
          notes?: string | null
          paid_at?: string | null
          partner_id: string
          period?: string | null
          status?: string
          utr?: string | null
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          method?: string | null
          notes?: string | null
          paid_at?: string | null
          partner_id?: string
          period?: string | null
          status?: string
          utr?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "partner_payouts_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "partners"
            referencedColumns: ["id"]
          },
        ]
      }
      partner_referrals: {
        Row: {
          created_at: string
          first_paid_at: string | null
          id: string
          partner_id: string
          referred_user_id: string | null
          signed_up_at: string
          status: string
          store_id: string | null
        }
        Insert: {
          created_at?: string
          first_paid_at?: string | null
          id?: string
          partner_id: string
          referred_user_id?: string | null
          signed_up_at?: string
          status?: string
          store_id?: string | null
        }
        Update: {
          created_at?: string
          first_paid_at?: string | null
          id?: string
          partner_id?: string
          referred_user_id?: string | null
          signed_up_at?: string
          status?: string
          store_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "partner_referrals_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "partners"
            referencedColumns: ["id"]
          },
        ]
      }
      partners: {
        Row: {
          commission_months: number
          commission_pct: number
          created_at: string
          email: string
          id: string
          kyc_status: string
          name: string
          notes: string | null
          pan: string | null
          payout_email: string | null
          phone: string | null
          referral_code: string
          type: string
          updated_at: string
          upi_id: string | null
          user_id: string
        }
        Insert: {
          commission_months?: number
          commission_pct?: number
          created_at?: string
          email: string
          id?: string
          kyc_status?: string
          name: string
          notes?: string | null
          pan?: string | null
          payout_email?: string | null
          phone?: string | null
          referral_code: string
          type?: string
          updated_at?: string
          upi_id?: string | null
          user_id: string
        }
        Update: {
          commission_months?: number
          commission_pct?: number
          created_at?: string
          email?: string
          id?: string
          kyc_status?: string
          name?: string
          notes?: string | null
          pan?: string | null
          payout_email?: string | null
          phone?: string | null
          referral_code?: string
          type?: string
          updated_at?: string
          upi_id?: string | null
          user_id?: string
        }
        Relationships: []
      }
      payment_events: {
        Row: {
          created_at: string
          event_id: string
          event_type: string
          id: string
          order_id: string | null
          payload: Json
          processed_at: string
          provider: string
          razorpay_order_id: string | null
          razorpay_payment_id: string | null
          store_id: string | null
        }
        Insert: {
          created_at?: string
          event_id: string
          event_type: string
          id?: string
          order_id?: string | null
          payload?: Json
          processed_at?: string
          provider?: string
          razorpay_order_id?: string | null
          razorpay_payment_id?: string | null
          store_id?: string | null
        }
        Update: {
          created_at?: string
          event_id?: string
          event_type?: string
          id?: string
          order_id?: string | null
          payload?: Json
          processed_at?: string
          provider?: string
          razorpay_order_id?: string | null
          razorpay_payment_id?: string | null
          store_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payment_events_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_events_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      plan_configs: {
        Row: {
          analytics: boolean
          blog: boolean
          commission_percent: number
          coupons: boolean
          created_at: string
          custom_domain: boolean
          display_name: string
          early_access: boolean
          email_branding: boolean
          gst_percent: number
          id: string
          is_active: boolean
          multi_domain: boolean
          plan: Database["public"]["Enums"]["subscription_plan"]
          premium_themes: boolean
          price_inr: number
          product_limit: number
          razorpay_payments: boolean
          razorpay_plan_id: string | null
          seo: boolean
          shipping: boolean
          signup_bonus_credits: number
          sort_order: number
          theme_limit: number
          trial_days: number
          updated_at: string
        }
        Insert: {
          analytics?: boolean
          blog?: boolean
          commission_percent?: number
          coupons?: boolean
          created_at?: string
          custom_domain?: boolean
          display_name: string
          early_access?: boolean
          email_branding?: boolean
          gst_percent?: number
          id?: string
          is_active?: boolean
          multi_domain?: boolean
          plan: Database["public"]["Enums"]["subscription_plan"]
          premium_themes?: boolean
          price_inr?: number
          product_limit?: number
          razorpay_payments?: boolean
          razorpay_plan_id?: string | null
          seo?: boolean
          shipping?: boolean
          signup_bonus_credits?: number
          sort_order?: number
          theme_limit?: number
          trial_days?: number
          updated_at?: string
        }
        Update: {
          analytics?: boolean
          blog?: boolean
          commission_percent?: number
          coupons?: boolean
          created_at?: string
          custom_domain?: boolean
          display_name?: string
          early_access?: boolean
          email_branding?: boolean
          gst_percent?: number
          id?: string
          is_active?: boolean
          multi_domain?: boolean
          plan?: Database["public"]["Enums"]["subscription_plan"]
          premium_themes?: boolean
          price_inr?: number
          product_limit?: number
          razorpay_payments?: boolean
          razorpay_plan_id?: string | null
          seo?: boolean
          shipping?: boolean
          signup_bonus_credits?: number
          sort_order?: number
          theme_limit?: number
          trial_days?: number
          updated_at?: string
        }
        Relationships: []
      }
      platform_credit_settings: {
        Row: {
          base_cost_per_credit_inr: number
          critical_balance_threshold: number
          custom_max_inr: number
          custom_min_inr: number
          custom_recharge_rate: number
          freelancer_inr_per_hour: number
          id: number
          low_balance_threshold: number
          margin_multiplier: number
          updated_at: string
          updated_by: string | null
          welcome_grant_credits: number
        }
        Insert: {
          base_cost_per_credit_inr?: number
          critical_balance_threshold?: number
          custom_max_inr?: number
          custom_min_inr?: number
          custom_recharge_rate?: number
          freelancer_inr_per_hour?: number
          id?: number
          low_balance_threshold?: number
          margin_multiplier?: number
          updated_at?: string
          updated_by?: string | null
          welcome_grant_credits?: number
        }
        Update: {
          base_cost_per_credit_inr?: number
          critical_balance_threshold?: number
          custom_max_inr?: number
          custom_min_inr?: number
          custom_recharge_rate?: number
          freelancer_inr_per_hour?: number
          id?: number
          low_balance_threshold?: number
          margin_multiplier?: number
          updated_at?: string
          updated_by?: string | null
          welcome_grant_credits?: number
        }
        Relationships: []
      }
      platform_invoices: {
        Row: {
          amount_inr: number
          created_at: string
          customer_address: Json | null
          customer_email: string | null
          customer_gstin: string | null
          customer_name: string | null
          description: string
          emailed_at: string | null
          gst_amount_inr: number
          gst_rate: number
          id: string
          invoice_number: string
          pdf_url: string | null
          razorpay_payment_id: string | null
          store_id: string | null
          total_inr: number
          type: string
          user_id: string
        }
        Insert: {
          amount_inr?: number
          created_at?: string
          customer_address?: Json | null
          customer_email?: string | null
          customer_gstin?: string | null
          customer_name?: string | null
          description: string
          emailed_at?: string | null
          gst_amount_inr?: number
          gst_rate?: number
          id?: string
          invoice_number: string
          pdf_url?: string | null
          razorpay_payment_id?: string | null
          store_id?: string | null
          total_inr?: number
          type: string
          user_id: string
        }
        Update: {
          amount_inr?: number
          created_at?: string
          customer_address?: Json | null
          customer_email?: string | null
          customer_gstin?: string | null
          customer_name?: string | null
          description?: string
          emailed_at?: string | null
          gst_amount_inr?: number
          gst_rate?: number
          id?: string
          invoice_number?: string
          pdf_url?: string | null
          razorpay_payment_id?: string | null
          store_id?: string | null
          total_inr?: number
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      products: {
        Row: {
          ai_generated_data: Json | null
          category: string | null
          compare_at_price: number | null
          cost_price: number | null
          created_at: string
          description: string | null
          id: string
          images: string[] | null
          inventory_count: number | null
          is_active: boolean | null
          menu_meta: Json
          price: number
          reorder_level: number | null
          seo_description: string | null
          seo_title: string | null
          short_description: string | null
          sku: string | null
          store_id: string
          tags: string[] | null
          tax_rate: number
          title: string
          updated_at: string
          variants: Json | null
        }
        Insert: {
          ai_generated_data?: Json | null
          category?: string | null
          compare_at_price?: number | null
          cost_price?: number | null
          created_at?: string
          description?: string | null
          id?: string
          images?: string[] | null
          inventory_count?: number | null
          is_active?: boolean | null
          menu_meta?: Json
          price?: number
          reorder_level?: number | null
          seo_description?: string | null
          seo_title?: string | null
          short_description?: string | null
          sku?: string | null
          store_id: string
          tags?: string[] | null
          tax_rate?: number
          title: string
          updated_at?: string
          variants?: Json | null
        }
        Update: {
          ai_generated_data?: Json | null
          category?: string | null
          compare_at_price?: number | null
          cost_price?: number | null
          created_at?: string
          description?: string | null
          id?: string
          images?: string[] | null
          inventory_count?: number | null
          is_active?: boolean | null
          menu_meta?: Json
          price?: number
          reorder_level?: number | null
          seo_description?: string | null
          seo_title?: string | null
          short_description?: string | null
          sku?: string | null
          store_id?: string
          tags?: string[] | null
          tax_rate?: number
          title?: string
          updated_at?: string
          variants?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "products_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          full_name: string | null
          id: string
          phone: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          phone?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          phone?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      provider_commissions: {
        Row: {
          amount: number
          appointment_id: string | null
          base_amount: number
          commission_pct: number
          created_at: string
          id: string
          paid_at: string | null
          payout_status: string
          provider_id: string
          store_id: string
        }
        Insert: {
          amount?: number
          appointment_id?: string | null
          base_amount?: number
          commission_pct?: number
          created_at?: string
          id?: string
          paid_at?: string | null
          payout_status?: string
          provider_id: string
          store_id: string
        }
        Update: {
          amount?: number
          appointment_id?: string | null
          base_amount?: number
          commission_pct?: number
          created_at?: string
          id?: string
          paid_at?: string | null
          payout_status?: string
          provider_id?: string
          store_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "provider_commissions_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "provider_commissions_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "service_providers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "provider_commissions_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      provider_schedules: {
        Row: {
          created_at: string
          end_time: string | null
          id: string
          is_off: boolean | null
          notes: string | null
          override_date: string | null
          provider_id: string
          slot_buffer_min: number | null
          start_time: string | null
          store_id: string
          updated_at: string
          weekday: number | null
        }
        Insert: {
          created_at?: string
          end_time?: string | null
          id?: string
          is_off?: boolean | null
          notes?: string | null
          override_date?: string | null
          provider_id: string
          slot_buffer_min?: number | null
          start_time?: string | null
          store_id: string
          updated_at?: string
          weekday?: number | null
        }
        Update: {
          created_at?: string
          end_time?: string | null
          id?: string
          is_off?: boolean | null
          notes?: string | null
          override_date?: string | null
          provider_id?: string
          slot_buffer_min?: number | null
          start_time?: string | null
          store_id?: string
          updated_at?: string
          weekday?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "provider_schedules_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "service_providers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "provider_schedules_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      provision_job_logs: {
        Row: {
          created_at: string
          id: string
          message: string | null
          metadata: Json
          request_id: string
          status: string
          step: string
        }
        Insert: {
          created_at?: string
          id?: string
          message?: string | null
          metadata?: Json
          request_id: string
          status?: string
          step: string
        }
        Update: {
          created_at?: string
          id?: string
          message?: string | null
          metadata?: Json
          request_id?: string
          status?: string
          step?: string
        }
        Relationships: [
          {
            foreignKeyName: "provision_job_logs_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "provision_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      provision_requests: {
        Row: {
          attempts: number
          client_patch_payload: Json
          completed_at: string | null
          error: string | null
          id: string
          last_attempt_at: string | null
          new_project_subdomain: string | null
          new_project_url: string | null
          next_run_at: string
          notes: string | null
          queued_at: string
          rendered_patch_prompt: string | null
          requested_domain: string | null
          started_at: string | null
          status: string
          store_id: string
          theme_master_id: string | null
          updated_at: string
        }
        Insert: {
          attempts?: number
          client_patch_payload?: Json
          completed_at?: string | null
          error?: string | null
          id?: string
          last_attempt_at?: string | null
          new_project_subdomain?: string | null
          new_project_url?: string | null
          next_run_at?: string
          notes?: string | null
          queued_at?: string
          rendered_patch_prompt?: string | null
          requested_domain?: string | null
          started_at?: string | null
          status?: string
          store_id: string
          theme_master_id?: string | null
          updated_at?: string
        }
        Update: {
          attempts?: number
          client_patch_payload?: Json
          completed_at?: string | null
          error?: string | null
          id?: string
          last_attempt_at?: string | null
          new_project_subdomain?: string | null
          new_project_url?: string | null
          next_run_at?: string
          notes?: string | null
          queued_at?: string
          rendered_patch_prompt?: string | null
          requested_domain?: string | null
          started_at?: string | null
          status?: string
          store_id?: string
          theme_master_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "provision_requests_theme_master_id_fkey"
            columns: ["theme_master_id"]
            isOneToOne: false
            referencedRelation: "theme_master_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      provisioning_budget: {
        Row: {
          current_day_spent_inr: number
          current_hour_spent_inr: number
          daily_inr_cap: number
          day_window_started_at: string
          hour_window_started_at: string
          hourly_inr_cap: number
          id: number
          is_enabled: boolean
          paused_until: string | null
          per_job_inr_estimate: number
          updated_at: string
        }
        Insert: {
          current_day_spent_inr?: number
          current_hour_spent_inr?: number
          daily_inr_cap?: number
          day_window_started_at?: string
          hour_window_started_at?: string
          hourly_inr_cap?: number
          id?: number
          is_enabled?: boolean
          paused_until?: string | null
          per_job_inr_estimate?: number
          updated_at?: string
        }
        Update: {
          current_day_spent_inr?: number
          current_hour_spent_inr?: number
          daily_inr_cap?: number
          day_window_started_at?: string
          hour_window_started_at?: string
          hourly_inr_cap?: number
          id?: number
          is_enabled?: boolean
          paused_until?: string | null
          per_job_inr_estimate?: number
          updated_at?: string
        }
        Relationships: []
      }
      purchase_bills: {
        Row: {
          attachment_url: string | null
          bill_date: string
          bill_number: string | null
          created_at: string
          id: string
          items: Json
          notes: string | null
          paid_amount: number
          payment_mode: Database["public"]["Enums"]["payment_mode_t"] | null
          payment_status: Database["public"]["Enums"]["bill_payment_status"]
          store_id: string
          subtotal: number
          supplier_id: string | null
          tax: number
          total: number
          updated_at: string
        }
        Insert: {
          attachment_url?: string | null
          bill_date?: string
          bill_number?: string | null
          created_at?: string
          id?: string
          items?: Json
          notes?: string | null
          paid_amount?: number
          payment_mode?: Database["public"]["Enums"]["payment_mode_t"] | null
          payment_status?: Database["public"]["Enums"]["bill_payment_status"]
          store_id: string
          subtotal?: number
          supplier_id?: string | null
          tax?: number
          total?: number
          updated_at?: string
        }
        Update: {
          attachment_url?: string | null
          bill_date?: string
          bill_number?: string | null
          created_at?: string
          id?: string
          items?: Json
          notes?: string | null
          paid_amount?: number
          payment_mode?: Database["public"]["Enums"]["payment_mode_t"] | null
          payment_status?: Database["public"]["Enums"]["bill_payment_status"]
          store_id?: string
          subtotal?: number
          supplier_id?: string | null
          tax?: number
          total?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "purchase_bills_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_bills_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      refunds: {
        Row: {
          amount: number
          created_at: string
          error_message: string | null
          id: string
          initiated_by: string | null
          notes: Json | null
          order_id: string
          razorpay_payment_id: string
          razorpay_refund_id: string | null
          reason: string | null
          speed: string
          status: string
          store_id: string
          updated_at: string
        }
        Insert: {
          amount: number
          created_at?: string
          error_message?: string | null
          id?: string
          initiated_by?: string | null
          notes?: Json | null
          order_id: string
          razorpay_payment_id: string
          razorpay_refund_id?: string | null
          reason?: string | null
          speed?: string
          status?: string
          store_id: string
          updated_at?: string
        }
        Update: {
          amount?: number
          created_at?: string
          error_message?: string | null
          id?: string
          initiated_by?: string | null
          notes?: Json | null
          order_id?: string
          razorpay_payment_id?: string
          razorpay_refund_id?: string | null
          reason?: string | null
          speed?: string
          status?: string
          store_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "refunds_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "refunds_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      research_jobs: {
        Row: {
          completed: number
          error: string | null
          finished_at: string | null
          found_urls: Json
          id: string
          query: string | null
          results: Json
          started_at: string
          status: string
          total: number
        }
        Insert: {
          completed?: number
          error?: string | null
          finished_at?: string | null
          found_urls?: Json
          id?: string
          query?: string | null
          results?: Json
          started_at?: string
          status?: string
          total?: number
        }
        Update: {
          completed?: number
          error?: string | null
          finished_at?: string | null
          found_urls?: Json
          id?: string
          query?: string | null
          results?: Json
          started_at?: string
          status?: string
          total?: number
        }
        Relationships: []
      }
      returns: {
        Row: {
          created_at: string
          customer_notes: string | null
          customer_user_id: string | null
          id: string
          items: Json
          order_id: string
          reason: string
          refund_amount: number
          refund_id: string | null
          seller_notes: string | null
          status: string
          store_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          customer_notes?: string | null
          customer_user_id?: string | null
          id?: string
          items?: Json
          order_id: string
          reason: string
          refund_amount?: number
          refund_id?: string | null
          seller_notes?: string | null
          status?: string
          store_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          customer_notes?: string | null
          customer_user_id?: string | null
          id?: string
          items?: Json
          order_id?: string
          reason?: string
          refund_amount?: number
          refund_id?: string | null
          seller_notes?: string | null
          status?: string
          store_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      reviews: {
        Row: {
          appointment_id: string | null
          body: string | null
          created_at: string | null
          id: string
          images: string[] | null
          is_verified_purchase: boolean | null
          moderated_at: string | null
          moderated_by: string | null
          moderation_notes: string | null
          moderation_status: string
          product_id: string
          provider_id: string | null
          rating: number
          store_id: string
          title: string | null
          user_id: string
        }
        Insert: {
          appointment_id?: string | null
          body?: string | null
          created_at?: string | null
          id?: string
          images?: string[] | null
          is_verified_purchase?: boolean | null
          moderated_at?: string | null
          moderated_by?: string | null
          moderation_notes?: string | null
          moderation_status?: string
          product_id: string
          provider_id?: string | null
          rating: number
          store_id: string
          title?: string | null
          user_id: string
        }
        Update: {
          appointment_id?: string | null
          body?: string | null
          created_at?: string | null
          id?: string
          images?: string[] | null
          is_verified_purchase?: boolean | null
          moderated_at?: string | null
          moderated_by?: string | null
          moderation_notes?: string | null
          moderation_status?: string
          product_id?: string
          provider_id?: string | null
          rating?: number
          store_id?: string
          title?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reviews_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      seller_push_tokens: {
        Row: {
          app_version: string | null
          created_at: string
          device_id: string | null
          id: string
          last_seen_at: string
          platform: string
          store_id: string | null
          token: string
          updated_at: string
          user_id: string
        }
        Insert: {
          app_version?: string | null
          created_at?: string
          device_id?: string | null
          id?: string
          last_seen_at?: string
          platform: string
          store_id?: string | null
          token: string
          updated_at?: string
          user_id: string
        }
        Update: {
          app_version?: string | null
          created_at?: string
          device_id?: string | null
          id?: string
          last_seen_at?: string
          platform?: string
          store_id?: string | null
          token?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "seller_push_tokens_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      service_packages: {
        Row: {
          created_at: string
          description: string | null
          id: string
          included_service_ids: string[] | null
          is_active: boolean | null
          name: string
          price: number
          store_id: string
          total_visits: number
          updated_at: string
          validity_days: number | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          included_service_ids?: string[] | null
          is_active?: boolean | null
          name: string
          price?: number
          store_id: string
          total_visits?: number
          updated_at?: string
          validity_days?: number | null
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          included_service_ids?: string[] | null
          is_active?: boolean | null
          name?: string
          price?: number
          store_id?: string
          total_visits?: number
          updated_at?: string
          validity_days?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "service_packages_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      service_providers: {
        Row: {
          accepts_home_visit: boolean | null
          accepts_teleconsult: boolean | null
          bio: string | null
          commission_pct: number | null
          created_at: string
          experience_years: number | null
          gender: string | null
          home_base_lat: number | null
          home_base_lng: number | null
          home_visit_pincodes: string[] | null
          home_visit_radius_km: number | null
          id: string
          is_active: boolean | null
          languages: string[] | null
          max_families_cap: number | null
          name: string
          photo_url: string | null
          rating_avg: number | null
          rating_count: number | null
          registration_number: string | null
          role_label: string | null
          sort_order: number | null
          specialization: string[] | null
          store_id: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          accepts_home_visit?: boolean | null
          accepts_teleconsult?: boolean | null
          bio?: string | null
          commission_pct?: number | null
          created_at?: string
          experience_years?: number | null
          gender?: string | null
          home_base_lat?: number | null
          home_base_lng?: number | null
          home_visit_pincodes?: string[] | null
          home_visit_radius_km?: number | null
          id?: string
          is_active?: boolean | null
          languages?: string[] | null
          max_families_cap?: number | null
          name: string
          photo_url?: string | null
          rating_avg?: number | null
          rating_count?: number | null
          registration_number?: string | null
          role_label?: string | null
          sort_order?: number | null
          specialization?: string[] | null
          store_id: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          accepts_home_visit?: boolean | null
          accepts_teleconsult?: boolean | null
          bio?: string | null
          commission_pct?: number | null
          created_at?: string
          experience_years?: number | null
          gender?: string | null
          home_base_lat?: number | null
          home_base_lng?: number | null
          home_visit_pincodes?: string[] | null
          home_visit_radius_km?: number | null
          id?: string
          is_active?: boolean | null
          languages?: string[] | null
          max_families_cap?: number | null
          name?: string
          photo_url?: string | null
          rating_avg?: number | null
          rating_count?: number | null
          registration_number?: string | null
          role_label?: string | null
          sort_order?: number | null
          specialization?: string[] | null
          store_id?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "service_providers_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      services: {
        Row: {
          allowed_provider_ids: string[] | null
          category: string | null
          created_at: string
          deposit_pct: number | null
          description: string | null
          duration_min: number
          gst_pct: number | null
          home_visit_addon: number | null
          home_visit_enabled: boolean | null
          id: string
          image_url: string | null
          is_active: boolean | null
          max_parallel: number | null
          name: string
          price: number
          requires_room: boolean | null
          sort_order: number | null
          store_id: string
          teleconsult_enabled: boolean | null
          updated_at: string
        }
        Insert: {
          allowed_provider_ids?: string[] | null
          category?: string | null
          created_at?: string
          deposit_pct?: number | null
          description?: string | null
          duration_min?: number
          gst_pct?: number | null
          home_visit_addon?: number | null
          home_visit_enabled?: boolean | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          max_parallel?: number | null
          name: string
          price?: number
          requires_room?: boolean | null
          sort_order?: number | null
          store_id: string
          teleconsult_enabled?: boolean | null
          updated_at?: string
        }
        Update: {
          allowed_provider_ids?: string[] | null
          category?: string | null
          created_at?: string
          deposit_pct?: number | null
          description?: string | null
          duration_min?: number
          gst_pct?: number | null
          home_visit_addon?: number | null
          home_visit_enabled?: boolean | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          max_parallel?: number | null
          name?: string
          price?: number
          requires_room?: boolean | null
          sort_order?: number | null
          store_id?: string
          teleconsult_enabled?: boolean | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "services_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      sourcing_inquiries: {
        Row: {
          created_at: string
          id: string
          kind: string
          message: string | null
          product_id: string | null
          quantity: number | null
          replied_at: string | null
          reply: string | null
          status: string
          store_id: string
          supplier_id: string
          target_price: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          kind?: string
          message?: string | null
          product_id?: string | null
          quantity?: number | null
          replied_at?: string | null
          reply?: string | null
          status?: string
          store_id: string
          supplier_id: string
          target_price?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          kind?: string
          message?: string | null
          product_id?: string | null
          quantity?: number | null
          replied_at?: string | null
          reply?: string | null
          status?: string
          store_id?: string
          supplier_id?: string
          target_price?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sourcing_inquiries_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "sourcing_products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sourcing_inquiries_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sourcing_inquiries_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "sourcing_suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      sourcing_products: {
        Row: {
          ai_insight: string | null
          ai_score: number
          category: string | null
          created_at: string
          currency: string
          dedupe_hash: string | null
          description: string | null
          estimated_margin_pct: number | null
          external_id: string | null
          hero_image: string | null
          id: string
          images: string[]
          is_active: boolean
          lead_time_days: number | null
          moq: number | null
          price_max: number | null
          price_min: number | null
          rating: number | null
          raw_json: Json | null
          reviews_count: number | null
          ships_pan_india: boolean
          source: string
          source_url: string | null
          subcategory: string | null
          suggested_retail_price: number | null
          supplier_city_cached: string | null
          supplier_email_full: string | null
          supplier_id: string | null
          supplier_name_cached: string | null
          supplier_phone_full: string | null
          supplier_phone_masked: string | null
          tags: string[]
          title: string
          updated_at: string
        }
        Insert: {
          ai_insight?: string | null
          ai_score?: number
          category?: string | null
          created_at?: string
          currency?: string
          dedupe_hash?: string | null
          description?: string | null
          estimated_margin_pct?: number | null
          external_id?: string | null
          hero_image?: string | null
          id?: string
          images?: string[]
          is_active?: boolean
          lead_time_days?: number | null
          moq?: number | null
          price_max?: number | null
          price_min?: number | null
          rating?: number | null
          raw_json?: Json | null
          reviews_count?: number | null
          ships_pan_india?: boolean
          source: string
          source_url?: string | null
          subcategory?: string | null
          suggested_retail_price?: number | null
          supplier_city_cached?: string | null
          supplier_email_full?: string | null
          supplier_id?: string | null
          supplier_name_cached?: string | null
          supplier_phone_full?: string | null
          supplier_phone_masked?: string | null
          tags?: string[]
          title: string
          updated_at?: string
        }
        Update: {
          ai_insight?: string | null
          ai_score?: number
          category?: string | null
          created_at?: string
          currency?: string
          dedupe_hash?: string | null
          description?: string | null
          estimated_margin_pct?: number | null
          external_id?: string | null
          hero_image?: string | null
          id?: string
          images?: string[]
          is_active?: boolean
          lead_time_days?: number | null
          moq?: number | null
          price_max?: number | null
          price_min?: number | null
          rating?: number | null
          raw_json?: Json | null
          reviews_count?: number | null
          ships_pan_india?: boolean
          source?: string
          source_url?: string | null
          subcategory?: string | null
          suggested_retail_price?: number | null
          supplier_city_cached?: string | null
          supplier_email_full?: string | null
          supplier_id?: string | null
          supplier_name_cached?: string | null
          supplier_phone_full?: string | null
          supplier_phone_masked?: string | null
          tags?: string[]
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sourcing_products_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "sourcing_suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      sourcing_supplier_payouts: {
        Row: {
          amount: number
          created_at: string
          currency: string
          id: string
          metadata: Json
          notes: string | null
          period_end: string | null
          period_start: string | null
          reference: string | null
          status: string
          supplier_id: string
          updated_at: string
        }
        Insert: {
          amount: number
          created_at?: string
          currency?: string
          id?: string
          metadata?: Json
          notes?: string | null
          period_end?: string | null
          period_start?: string | null
          reference?: string | null
          status?: string
          supplier_id: string
          updated_at?: string
        }
        Update: {
          amount?: number
          created_at?: string
          currency?: string
          id?: string
          metadata?: Json
          notes?: string | null
          period_end?: string | null
          period_start?: string | null
          reference?: string | null
          status?: string
          supplier_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sourcing_supplier_payouts_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "sourcing_suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      sourcing_supplier_reviews: {
        Row: {
          comment: string | null
          created_at: string
          id: string
          rating: number
          store_id: string
          supplier_id: string
          user_id: string
        }
        Insert: {
          comment?: string | null
          created_at?: string
          id?: string
          rating: number
          store_id: string
          supplier_id: string
          user_id: string
        }
        Update: {
          comment?: string | null
          created_at?: string
          id?: string
          rating?: number
          store_id?: string
          supplier_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sourcing_supplier_reviews_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sourcing_supplier_reviews_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "sourcing_suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      sourcing_suppliers: {
        Row: {
          address: string | null
          bank_account_name: string | null
          bank_account_number: string | null
          bank_ifsc: string | null
          banner_url: string | null
          categories: string[]
          city: string | null
          commission_pct: number
          company_name: string
          contact_name: string | null
          country: string
          created_at: string
          default_lead_time_days: number | null
          description: string | null
          email: string | null
          gst_verified: boolean
          gstin: string | null
          id: string
          logo_url: string | null
          metadata: Json
          min_order_value: number | null
          phone: string | null
          pincode: string | null
          rating: number
          reviews_count: number
          ships_pan_india: boolean
          source: string
          source_url: string | null
          state: string | null
          status: string
          updated_at: string
          user_id: string | null
          website: string | null
          whatsapp: string | null
        }
        Insert: {
          address?: string | null
          bank_account_name?: string | null
          bank_account_number?: string | null
          bank_ifsc?: string | null
          banner_url?: string | null
          categories?: string[]
          city?: string | null
          commission_pct?: number
          company_name: string
          contact_name?: string | null
          country?: string
          created_at?: string
          default_lead_time_days?: number | null
          description?: string | null
          email?: string | null
          gst_verified?: boolean
          gstin?: string | null
          id?: string
          logo_url?: string | null
          metadata?: Json
          min_order_value?: number | null
          phone?: string | null
          pincode?: string | null
          rating?: number
          reviews_count?: number
          ships_pan_india?: boolean
          source?: string
          source_url?: string | null
          state?: string | null
          status?: string
          updated_at?: string
          user_id?: string | null
          website?: string | null
          whatsapp?: string | null
        }
        Update: {
          address?: string | null
          bank_account_name?: string | null
          bank_account_number?: string | null
          bank_ifsc?: string | null
          banner_url?: string | null
          categories?: string[]
          city?: string | null
          commission_pct?: number
          company_name?: string
          contact_name?: string | null
          country?: string
          created_at?: string
          default_lead_time_days?: number | null
          description?: string | null
          email?: string | null
          gst_verified?: boolean
          gstin?: string | null
          id?: string
          logo_url?: string | null
          metadata?: Json
          min_order_value?: number | null
          phone?: string | null
          pincode?: string | null
          rating?: number
          reviews_count?: number
          ships_pan_india?: boolean
          source?: string
          source_url?: string | null
          state?: string | null
          status?: string
          updated_at?: string
          user_id?: string | null
          website?: string | null
          whatsapp?: string | null
        }
        Relationships: []
      }
      sourcing_viral_products: {
        Row: {
          category: string | null
          created_at: string
          growth_pct: number | null
          id: string
          product_id: string | null
          rank: number
          reason: string | null
          trend_score: number
          week_of: string
        }
        Insert: {
          category?: string | null
          created_at?: string
          growth_pct?: number | null
          id?: string
          product_id?: string | null
          rank: number
          reason?: string | null
          trend_score?: number
          week_of?: string
        }
        Update: {
          category?: string | null
          created_at?: string
          growth_pct?: number | null
          id?: string
          product_id?: string | null
          rank?: number
          reason?: string | null
          trend_score?: number
          week_of?: string
        }
        Relationships: [
          {
            foreignKeyName: "sourcing_viral_products_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "sourcing_products"
            referencedColumns: ["id"]
          },
        ]
      }
      store_content: {
        Row: {
          content: Json
          created_at: string
          id: string
          section_key: string
          store_id: string
          updated_at: string
        }
        Insert: {
          content?: Json
          created_at?: string
          id?: string
          section_key: string
          store_id: string
          updated_at?: string
        }
        Update: {
          content?: Json
          created_at?: string
          id?: string
          section_key?: string
          store_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      store_email_domains: {
        Row: {
          created_at: string
          dns_records: Json | null
          domain: string
          id: string
          resend_domain_id: string | null
          sender_prefix: string
          status: string
          store_id: string
          updated_at: string
          verified_at: string | null
        }
        Insert: {
          created_at?: string
          dns_records?: Json | null
          domain: string
          id?: string
          resend_domain_id?: string | null
          sender_prefix?: string
          status?: string
          store_id: string
          updated_at?: string
          verified_at?: string | null
        }
        Update: {
          created_at?: string
          dns_records?: Json | null
          domain?: string
          id?: string
          resend_domain_id?: string | null
          sender_prefix?: string
          status?: string
          store_id?: string
          updated_at?: string
          verified_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "store_email_domains_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: true
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      store_email_templates: {
        Row: {
          created_at: string
          generated_at: string | null
          id: string
          store_id: string
          templates: Json
          updated_at: string
        }
        Insert: {
          created_at?: string
          generated_at?: string | null
          id?: string
          store_id: string
          templates?: Json
          updated_at?: string
        }
        Update: {
          created_at?: string
          generated_at?: string | null
          id?: string
          store_id?: string
          templates?: Json
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "store_email_templates_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: true
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      store_fulfillment_settings: {
        Row: {
          auto_accept: boolean
          created_at: string
          delivery_enabled: boolean
          delivery_fee_flat: number
          delivery_min_order: number
          delivery_radius_km: number
          dine_in_enabled: boolean
          dine_in_payment_modes: string[]
          dine_in_requires_table: boolean
          kitchen_prep_minutes: number
          store_id: string
          tables: Json
          takeaway_enabled: boolean
          takeaway_min_phone_only: boolean
          takeaway_payment_modes: string[]
          updated_at: string
        }
        Insert: {
          auto_accept?: boolean
          created_at?: string
          delivery_enabled?: boolean
          delivery_fee_flat?: number
          delivery_min_order?: number
          delivery_radius_km?: number
          dine_in_enabled?: boolean
          dine_in_payment_modes?: string[]
          dine_in_requires_table?: boolean
          kitchen_prep_minutes?: number
          store_id: string
          tables?: Json
          takeaway_enabled?: boolean
          takeaway_min_phone_only?: boolean
          takeaway_payment_modes?: string[]
          updated_at?: string
        }
        Update: {
          auto_accept?: boolean
          created_at?: string
          delivery_enabled?: boolean
          delivery_fee_flat?: number
          delivery_min_order?: number
          delivery_radius_km?: number
          dine_in_enabled?: boolean
          dine_in_payment_modes?: string[]
          dine_in_requires_table?: boolean
          kitchen_prep_minutes?: number
          store_id?: string
          tables?: Json
          takeaway_enabled?: boolean
          takeaway_min_phone_only?: boolean
          takeaway_payment_modes?: string[]
          updated_at?: string
        }
        Relationships: []
      }
      store_google_reviews_cache: {
        Row: {
          author_name: string | null
          author_photo_url: string | null
          connection_id: string
          created_at: string
          google_review_id: string | null
          id: string
          language: string | null
          rating: number | null
          relative_time: string | null
          store_id: string
          text: string | null
          time_unix: number | null
        }
        Insert: {
          author_name?: string | null
          author_photo_url?: string | null
          connection_id: string
          created_at?: string
          google_review_id?: string | null
          id?: string
          language?: string | null
          rating?: number | null
          relative_time?: string | null
          store_id: string
          text?: string | null
          time_unix?: number | null
        }
        Update: {
          author_name?: string | null
          author_photo_url?: string | null
          connection_id?: string
          created_at?: string
          google_review_id?: string | null
          id?: string
          language?: string | null
          rating?: number | null
          relative_time?: string | null
          store_id?: string
          text?: string | null
          time_unix?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "store_google_reviews_cache_connection_id_fkey"
            columns: ["connection_id"]
            isOneToOne: false
            referencedRelation: "store_google_reviews_connections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "store_google_reviews_cache_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      store_google_reviews_connections: {
        Row: {
          amount_inr: number
          average_rating: number | null
          business_address: string | null
          business_name: string | null
          business_url: string | null
          created_at: string
          id: string
          is_active: boolean
          is_paid: boolean
          last_synced_at: string | null
          paid_at: string | null
          payment_id: string | null
          place_id: string
          store_id: string
          sync_error: string | null
          total_reviews: number | null
          updated_at: string
        }
        Insert: {
          amount_inr?: number
          average_rating?: number | null
          business_address?: string | null
          business_name?: string | null
          business_url?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          is_paid?: boolean
          last_synced_at?: string | null
          paid_at?: string | null
          payment_id?: string | null
          place_id: string
          store_id: string
          sync_error?: string | null
          total_reviews?: number | null
          updated_at?: string
        }
        Update: {
          amount_inr?: number
          average_rating?: number | null
          business_address?: string | null
          business_name?: string | null
          business_url?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          is_paid?: boolean
          last_synced_at?: string | null
          paid_at?: string | null
          payment_id?: string | null
          place_id?: string
          store_id?: string
          sync_error?: string | null
          total_reviews?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "store_google_reviews_connections_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: true
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      store_qr_codes: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          kind: string
          last_scanned_at: string | null
          scans_count: number
          slug: string
          store_id: string
          table_label: string | null
          target_path: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          kind: string
          last_scanned_at?: string | null
          scans_count?: number
          slug: string
          store_id: string
          table_label?: string | null
          target_path: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          kind?: string
          last_scanned_at?: string | null
          scans_count?: number
          slug?: string
          store_id?: string
          table_label?: string | null
          target_path?: string
        }
        Relationships: []
      }
      store_secrets: {
        Row: {
          created_at: string
          delhivery_api_token: string | null
          delhivery_test_mode: boolean | null
          preferred_courier: string | null
          razorpay_key_id: string | null
          razorpay_key_secret: string | null
          razorpay_test_mode: boolean | null
          shiprocket_email: string | null
          shiprocket_password: string | null
          shiprocket_token: string | null
          shiprocket_token_expires_at: string | null
          store_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          delhivery_api_token?: string | null
          delhivery_test_mode?: boolean | null
          preferred_courier?: string | null
          razorpay_key_id?: string | null
          razorpay_key_secret?: string | null
          razorpay_test_mode?: boolean | null
          shiprocket_email?: string | null
          shiprocket_password?: string | null
          shiprocket_token?: string | null
          shiprocket_token_expires_at?: string | null
          store_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          delhivery_api_token?: string | null
          delhivery_test_mode?: boolean | null
          preferred_courier?: string | null
          razorpay_key_id?: string | null
          razorpay_key_secret?: string | null
          razorpay_test_mode?: boolean | null
          shiprocket_email?: string | null
          shiprocket_password?: string | null
          shiprocket_token?: string | null
          shiprocket_token_expires_at?: string | null
          store_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "store_secrets_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: true
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      store_testimonials: {
        Row: {
          content: string
          created_at: string
          customer_name: string
          customer_role: string | null
          display_order: number
          id: string
          is_featured: boolean
          photo_url: string | null
          rating: number
          store_id: string
          updated_at: string
        }
        Insert: {
          content: string
          created_at?: string
          customer_name: string
          customer_role?: string | null
          display_order?: number
          id?: string
          is_featured?: boolean
          photo_url?: string | null
          rating?: number
          store_id: string
          updated_at?: string
        }
        Update: {
          content?: string
          created_at?: string
          customer_name?: string
          customer_role?: string | null
          display_order?: number
          id?: string
          is_featured?: boolean
          photo_url?: string | null
          rating?: number
          store_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "store_testimonials_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      stores: {
        Row: {
          banner_url: string | null
          category: string | null
          created_at: string
          custom_domain: string | null
          description: string | null
          downtime_notified_at: string | null
          id: string
          installed_theme_version: string | null
          is_published: boolean | null
          layout_slug: string | null
          logo_url: string | null
          name: string
          onboarding_step: number | null
          referred_by_code: string | null
          settings: Json | null
          slug: string
          theme: Json | null
          theme_update_dismissed_version: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          banner_url?: string | null
          category?: string | null
          created_at?: string
          custom_domain?: string | null
          description?: string | null
          downtime_notified_at?: string | null
          id?: string
          installed_theme_version?: string | null
          is_published?: boolean | null
          layout_slug?: string | null
          logo_url?: string | null
          name: string
          onboarding_step?: number | null
          referred_by_code?: string | null
          settings?: Json | null
          slug: string
          theme?: Json | null
          theme_update_dismissed_version?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          banner_url?: string | null
          category?: string | null
          created_at?: string
          custom_domain?: string | null
          description?: string | null
          downtime_notified_at?: string | null
          id?: string
          installed_theme_version?: string | null
          is_published?: boolean | null
          layout_slug?: string | null
          logo_url?: string | null
          name?: string
          onboarding_step?: number | null
          referred_by_code?: string | null
          settings?: Json | null
          slug?: string
          theme?: Json | null
          theme_update_dismissed_version?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      subscription_events: {
        Row: {
          amount: number | null
          created_at: string
          event_type: string
          id: string
          metadata: Json | null
          razorpay_event_id: string | null
          subscription_id: string
        }
        Insert: {
          amount?: number | null
          created_at?: string
          event_type: string
          id?: string
          metadata?: Json | null
          razorpay_event_id?: string | null
          subscription_id: string
        }
        Update: {
          amount?: number | null
          created_at?: string
          event_type?: string
          id?: string
          metadata?: Json | null
          razorpay_event_id?: string | null
          subscription_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscription_events_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "subscriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      subscriptions: {
        Row: {
          blocked_notified_at: string | null
          cancelled_at: string | null
          created_at: string
          current_period_end: string | null
          current_period_start: string | null
          expiry_notified_at: string | null
          grace_period_end: string | null
          grace_warning_notified_at: string | null
          id: string
          is_blocked: boolean
          pending_plan: Database["public"]["Enums"]["subscription_plan"] | null
          pending_plan_effective_at: string | null
          plan: Database["public"]["Enums"]["subscription_plan"]
          razorpay_plan_id: string | null
          razorpay_subscription_id: string | null
          status: Database["public"]["Enums"]["subscription_status"]
          store_id: string
          updated_at: string
        }
        Insert: {
          blocked_notified_at?: string | null
          cancelled_at?: string | null
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          expiry_notified_at?: string | null
          grace_period_end?: string | null
          grace_warning_notified_at?: string | null
          id?: string
          is_blocked?: boolean
          pending_plan?: Database["public"]["Enums"]["subscription_plan"] | null
          pending_plan_effective_at?: string | null
          plan?: Database["public"]["Enums"]["subscription_plan"]
          razorpay_plan_id?: string | null
          razorpay_subscription_id?: string | null
          status?: Database["public"]["Enums"]["subscription_status"]
          store_id: string
          updated_at?: string
        }
        Update: {
          blocked_notified_at?: string | null
          cancelled_at?: string | null
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          expiry_notified_at?: string | null
          grace_period_end?: string | null
          grace_warning_notified_at?: string | null
          id?: string
          is_blocked?: boolean
          pending_plan?: Database["public"]["Enums"]["subscription_plan"] | null
          pending_plan_effective_at?: string | null
          plan?: Database["public"]["Enums"]["subscription_plan"]
          razorpay_plan_id?: string | null
          razorpay_subscription_id?: string | null
          status?: Database["public"]["Enums"]["subscription_status"]
          store_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: true
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      suppliers: {
        Row: {
          address: Json | null
          created_at: string
          email: string | null
          gstin: string | null
          id: string
          name: string
          notes: string | null
          opening_balance: number
          phone: string | null
          store_id: string
          updated_at: string
        }
        Insert: {
          address?: Json | null
          created_at?: string
          email?: string | null
          gstin?: string | null
          id?: string
          name: string
          notes?: string | null
          opening_balance?: number
          phone?: string | null
          store_id: string
          updated_at?: string
        }
        Update: {
          address?: Json | null
          created_at?: string
          email?: string | null
          gstin?: string | null
          id?: string
          name?: string
          notes?: string | null
          opening_balance?: number
          phone?: string | null
          store_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "suppliers_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      suppressed_emails: {
        Row: {
          created_at: string
          email: string
          id: string
          metadata: Json | null
          reason: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          metadata?: Json | null
          reason: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          metadata?: Json | null
          reason?: string
        }
        Relationships: []
      }
      theme_category_briefs: {
        Row: {
          created_at: string
          display_name: string
          hero_archetypes: string | null
          id: string
          image_style: string | null
          is_active: boolean
          palette_hints: string | null
          prompt_addendum: string
          section_priority: string[]
          sort_order: number
          subcategory: string
          updated_at: string
          vertical: string
          vocabulary: string | null
        }
        Insert: {
          created_at?: string
          display_name: string
          hero_archetypes?: string | null
          id?: string
          image_style?: string | null
          is_active?: boolean
          palette_hints?: string | null
          prompt_addendum?: string
          section_priority?: string[]
          sort_order?: number
          subcategory: string
          updated_at?: string
          vertical: string
          vocabulary?: string | null
        }
        Update: {
          created_at?: string
          display_name?: string
          hero_archetypes?: string | null
          id?: string
          image_style?: string | null
          is_active?: boolean
          palette_hints?: string | null
          prompt_addendum?: string
          section_priority?: string[]
          sort_order?: number
          subcategory?: string
          updated_at?: string
          vertical?: string
          vocabulary?: string | null
        }
        Relationships: []
      }
      theme_generation_metrics: {
        Row: {
          category: string | null
          cost_inr: number | null
          delivery_id: string | null
          generated_at: string
          id: string
          reuse_ratio: number | null
          theme_pack_id: string | null
          tokens_used: number | null
        }
        Insert: {
          category?: string | null
          cost_inr?: number | null
          delivery_id?: string | null
          generated_at?: string
          id?: string
          reuse_ratio?: number | null
          theme_pack_id?: string | null
          tokens_used?: number | null
        }
        Update: {
          category?: string | null
          cost_inr?: number | null
          delivery_id?: string | null
          generated_at?: string
          id?: string
          reuse_ratio?: number | null
          theme_pack_id?: string | null
          tokens_used?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "theme_generation_metrics_delivery_id_fkey"
            columns: ["delivery_id"]
            isOneToOne: false
            referencedRelation: "master_theme_deliveries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "theme_generation_metrics_theme_pack_id_fkey"
            columns: ["theme_pack_id"]
            isOneToOne: false
            referencedRelation: "theme_packs"
            referencedColumns: ["id"]
          },
        ]
      }
      theme_image_pool: {
        Row: {
          category: string
          created_at: string
          id: string
          image_url: string
          section_type: string
        }
        Insert: {
          category: string
          created_at?: string
          id?: string
          image_url: string
          section_type: string
        }
        Update: {
          category?: string
          created_at?: string
          id?: string
          image_url?: string
          section_type?: string
        }
        Relationships: []
      }
      theme_layout_archetypes: {
        Row: {
          allowed_extra_sections: string[]
          best_for: string[]
          category_style: string
          created_at: string
          density: string
          description: string
          editor_schema: Json
          forbidden_sections: string[]
          header_style: string
          hero_style: string
          id: string
          image_ratios: Json
          is_active: boolean
          motion_language: string
          name: string
          preview_image: string | null
          product_style: string
          prompt_instructions: string
          radius_hint: string
          section_order: string[]
          slug: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          allowed_extra_sections?: string[]
          best_for?: string[]
          category_style: string
          created_at?: string
          density?: string
          description: string
          editor_schema?: Json
          forbidden_sections?: string[]
          header_style: string
          hero_style: string
          id?: string
          image_ratios?: Json
          is_active?: boolean
          motion_language?: string
          name: string
          preview_image?: string | null
          product_style: string
          prompt_instructions: string
          radius_hint?: string
          section_order?: string[]
          slug: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          allowed_extra_sections?: string[]
          best_for?: string[]
          category_style?: string
          created_at?: string
          density?: string
          description?: string
          editor_schema?: Json
          forbidden_sections?: string[]
          header_style?: string
          hero_style?: string
          id?: string
          image_ratios?: Json
          is_active?: boolean
          motion_language?: string
          name?: string
          preview_image?: string | null
          product_style?: string
          prompt_instructions?: string
          radius_hint?: string
          section_order?: string[]
          slug?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      theme_master_metrics: {
        Row: {
          image_count: number
          pictocart_response: Json | null
          reuse_hits: number
          shipped_to_pictocart: boolean
          theme_id: string
          total_cost_inr: number
          updated_at: string
        }
        Insert: {
          image_count?: number
          pictocart_response?: Json | null
          reuse_hits?: number
          shipped_to_pictocart?: boolean
          theme_id: string
          total_cost_inr?: number
          updated_at?: string
        }
        Update: {
          image_count?: number
          pictocart_response?: Json | null
          reuse_hits?: number
          shipped_to_pictocart?: boolean
          theme_id?: string
          total_cost_inr?: number
          updated_at?: string
        }
        Relationships: []
      }
      theme_master_projects: {
        Row: {
          category: string | null
          client_patch_prompt: string
          compare_at_price: number | null
          created_at: string
          current_version: string
          customisable_slots: Json | null
          description: string | null
          features: Json | null
          id: string
          is_active: boolean
          is_default: boolean
          is_premium: boolean
          latest_changelog: string | null
          lovable_project_url: string | null
          name: string
          preview_image: string | null
          price: number
          remix_url: string | null
          theme_id: string
          updated_at: string
        }
        Insert: {
          category?: string | null
          client_patch_prompt?: string
          compare_at_price?: number | null
          created_at?: string
          current_version?: string
          customisable_slots?: Json | null
          description?: string | null
          features?: Json | null
          id?: string
          is_active?: boolean
          is_default?: boolean
          is_premium?: boolean
          latest_changelog?: string | null
          lovable_project_url?: string | null
          name: string
          preview_image?: string | null
          price?: number
          remix_url?: string | null
          theme_id: string
          updated_at?: string
        }
        Update: {
          category?: string | null
          client_patch_prompt?: string
          compare_at_price?: number | null
          created_at?: string
          current_version?: string
          customisable_slots?: Json | null
          description?: string | null
          features?: Json | null
          id?: string
          is_active?: boolean
          is_default?: boolean
          is_premium?: boolean
          latest_changelog?: string | null
          lovable_project_url?: string | null
          name?: string
          preview_image?: string | null
          price?: number
          remix_url?: string | null
          theme_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      theme_master_versions: {
        Row: {
          created_at: string
          files_manifest: Json
          id: string
          theme_id: string
          version: number
        }
        Insert: {
          created_at?: string
          files_manifest?: Json
          id?: string
          theme_id: string
          version?: number
        }
        Update: {
          created_at?: string
          files_manifest?: Json
          id?: string
          theme_id?: string
          version?: number
        }
        Relationships: []
      }
      theme_packs: {
        Row: {
          ai_generation_cost: number
          category: string
          compare_at_price: number | null
          created_at: string
          created_by: string
          description: string | null
          id: string
          is_published: boolean
          layout_slug: string | null
          name: string
          pages: Json
          price: number
          sales_count: number
          theme_config: Json
          thumbnail: string | null
          updated_at: string
        }
        Insert: {
          ai_generation_cost?: number
          category?: string
          compare_at_price?: number | null
          created_at?: string
          created_by: string
          description?: string | null
          id?: string
          is_published?: boolean
          layout_slug?: string | null
          name: string
          pages?: Json
          price?: number
          sales_count?: number
          theme_config?: Json
          thumbnail?: string | null
          updated_at?: string
        }
        Update: {
          ai_generation_cost?: number
          category?: string
          compare_at_price?: number | null
          created_at?: string
          created_by?: string
          description?: string | null
          id?: string
          is_published?: boolean
          layout_slug?: string | null
          name?: string
          pages?: Json
          price?: number
          sales_count?: number
          theme_config?: Json
          thumbnail?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      theme_purchase_intents: {
        Row: {
          amount_inr: number
          created_at: string
          discount_inr: number
          id: string
          paid_at: string | null
          razorpay_order_id: string | null
          razorpay_payment_id: string | null
          status: string
          store_id: string
          theme_kind: string
          theme_ref: string
          user_id: string
        }
        Insert: {
          amount_inr: number
          created_at?: string
          discount_inr?: number
          id?: string
          paid_at?: string | null
          razorpay_order_id?: string | null
          razorpay_payment_id?: string | null
          status?: string
          store_id: string
          theme_kind: string
          theme_ref: string
          user_id: string
        }
        Update: {
          amount_inr?: number
          created_at?: string
          discount_inr?: number
          id?: string
          paid_at?: string | null
          razorpay_order_id?: string | null
          razorpay_payment_id?: string | null
          status?: string
          store_id?: string
          theme_kind?: string
          theme_ref?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "theme_purchase_intents_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      theme_purchases: {
        Row: {
          id: string
          purchased_at: string
          store_id: string
          theme_pack_id: string
        }
        Insert: {
          id?: string
          purchased_at?: string
          store_id: string
          theme_pack_id: string
        }
        Update: {
          id?: string
          purchased_at?: string
          store_id?: string
          theme_pack_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "theme_purchases_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "theme_purchases_theme_pack_id_fkey"
            columns: ["theme_pack_id"]
            isOneToOne: false
            referencedRelation: "theme_packs"
            referencedColumns: ["id"]
          },
        ]
      }
      theme_release_calendar: {
        Row: {
          archetype: string | null
          category: string
          created_at: string
          expected_cost_inr: number | null
          hero_style: string | null
          id: string
          planned_for: string
          research_brief: Json | null
          slot_date: string | null
          status: string
          theme_brief: Json | null
          theme_pack_id: string | null
        }
        Insert: {
          archetype?: string | null
          category: string
          created_at?: string
          expected_cost_inr?: number | null
          hero_style?: string | null
          id?: string
          planned_for: string
          research_brief?: Json | null
          slot_date?: string | null
          status?: string
          theme_brief?: Json | null
          theme_pack_id?: string | null
        }
        Update: {
          archetype?: string | null
          category?: string
          created_at?: string
          expected_cost_inr?: number | null
          hero_style?: string | null
          id?: string
          planned_for?: string
          research_brief?: Json | null
          slot_date?: string | null
          status?: string
          theme_brief?: Json | null
          theme_pack_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "theme_release_calendar_theme_pack_id_fkey"
            columns: ["theme_pack_id"]
            isOneToOne: false
            referencedRelation: "theme_packs"
            referencedColumns: ["id"]
          },
        ]
      }
      theme_research_corpus: {
        Row: {
          category: string | null
          copy_motifs: Json | null
          created_at: string
          fonts: Json | null
          hero_style: string | null
          id: string
          insights: Json
          palette: Json | null
          reuse_count: number
          scraped_at: string
          section_order: Json | null
          source_site: string
          source_url: string
        }
        Insert: {
          category?: string | null
          copy_motifs?: Json | null
          created_at?: string
          fonts?: Json | null
          hero_style?: string | null
          id?: string
          insights?: Json
          palette?: Json | null
          reuse_count?: number
          scraped_at?: string
          section_order?: Json | null
          source_site: string
          source_url: string
        }
        Update: {
          category?: string | null
          copy_motifs?: Json | null
          created_at?: string
          fonts?: Json | null
          hero_style?: string | null
          id?: string
          insights?: Json
          palette?: Json | null
          reuse_count?: number
          scraped_at?: string
          section_order?: Json | null
          source_site?: string
          source_url?: string
        }
        Relationships: []
      }
      theme_section_blueprints: {
        Row: {
          category_tags: string[]
          content_json: Json
          created_at: string
          id: string
          layout: string
          section_type: string
          variant_name: string
        }
        Insert: {
          category_tags?: string[]
          content_json?: Json
          created_at?: string
          id?: string
          layout?: string
          section_type: string
          variant_name: string
        }
        Update: {
          category_tags?: string[]
          content_json?: Json
          created_at?: string
          id?: string
          layout?: string
          section_type?: string
          variant_name?: string
        }
        Relationships: []
      }
      theme_settings: {
        Row: {
          auto_generate: boolean
          auto_research: boolean
          cadence_days: number
          id: number
          last_generation_at: string | null
          last_research_at: string | null
          research_query: string
          themes_per_batch: number
          updated_at: string
        }
        Insert: {
          auto_generate?: boolean
          auto_research?: boolean
          cadence_days?: number
          id?: number
          last_generation_at?: string | null
          last_research_at?: string | null
          research_query?: string
          themes_per_batch?: number
          updated_at?: string
        }
        Update: {
          auto_generate?: boolean
          auto_research?: boolean
          cadence_days?: number
          id?: number
          last_generation_at?: string | null
          last_research_at?: string | null
          research_query?: string
          themes_per_batch?: number
          updated_at?: string
        }
        Relationships: []
      }
      theme_versions: {
        Row: {
          changelog: string
          created_at: string
          id: string
          released_at: string
          summary: string
          theme_master_id: string
          version: string
        }
        Insert: {
          changelog?: string
          created_at?: string
          id?: string
          released_at?: string
          summary?: string
          theme_master_id: string
          version: string
        }
        Update: {
          changelog?: string
          created_at?: string
          id?: string
          released_at?: string
          summary?: string
          theme_master_id?: string
          version?: string
        }
        Relationships: [
          {
            foreignKeyName: "theme_versions_theme_master_id_fkey"
            columns: ["theme_master_id"]
            isOneToOne: false
            referencedRelation: "theme_master_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      trial_reminders_sent: {
        Row: {
          id: string
          recipient_email: string
          sent_at: string
          stage: string
          store_id: string
          subscription_id: string
        }
        Insert: {
          id?: string
          recipient_email: string
          sent_at?: string
          stage: string
          store_id: string
          subscription_id: string
        }
        Update: {
          id?: string
          recipient_email?: string
          sent_at?: string
          stage?: string
          store_id?: string
          subscription_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "trial_reminders_sent_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "subscriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      wishlists: {
        Row: {
          created_at: string
          id: string
          product_id: string
          store_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          product_id: string
          store_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          product_id?: string
          store_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "wishlists_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wishlists_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      apply_coupon_to_recent_order: {
        Args: { _coupon_id: string; _order_id: string }
        Returns: undefined
      }
      cancel_pending_plan_change: {
        Args: { _store_id: string }
        Returns: undefined
      }
      consume_credits: {
        Args: { _action_key: string; _cache_hit?: boolean; _store_id: string }
        Returns: number
      }
      credit_wallet: {
        Args: {
          _credits: number
          _granted_by_admin?: string
          _inr_value?: number
          _metadata?: Json
          _promo_code?: string
          _razorpay_order_id?: string
          _razorpay_payment_id?: string
          _reason?: string
          _store_id: string
          _type: Database["public"]["Enums"]["credit_txn_type"]
        }
        Returns: number
      }
      delete_email: {
        Args: { message_id: number; queue_name: string }
        Returns: boolean
      }
      enqueue_email: {
        Args: { payload: Json; queue_name: string }
        Returns: number
      }
      family_plan_slots_left: { Args: { _plan_id: string }; Returns: number }
      generate_referral_code: { Args: never; Returns: string }
      get_order_by_tracking: {
        Args: { tracking_code: string }
        Returns: {
          created_at: string
          fulfillment_mode: string
          guest_tracking_code: string
          id: string
          items: Json
          order_number: string
          prep_status: string
          status: string
          store_id: string
          table_label: string
          total: number
        }[]
      }
      get_storefront_cod_rules: {
        Args: { _store_id: string }
        Returns: {
          enabled: boolean
          max_order_value: number
          min_order_value: number
          min_prior_orders: number
          pincode_allowlist: string[]
          pincode_blocklist: string[]
          require_phone_verification: boolean
        }[]
      }
      grant_plan_signup_bonus: {
        Args: { _plan: string; _store_id: string }
        Returns: number
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      increment_coupon_usage: {
        Args: { coupon_id: string }
        Returns: undefined
      }
      is_phone_cod_blocked: {
        Args: { _phone: string; _store_id: string }
        Returns: boolean
      }
      is_store_access_blocked: { Args: { _store_id: string }; Returns: boolean }
      move_to_dlq: {
        Args: {
          dlq_name: string
          message_id: number
          payload: Json
          source_queue: string
        }
        Returns: number
      }
      next_invoice_number: {
        Args: { _prefix?: string; _store_id: string }
        Returns: string
      }
      pnl_report: {
        Args: { _from: string; _store_id: string; _to: string }
        Returns: {
          cogs: number
          expenses_total: number
          net_profit: number
          revenue: number
          tax_collected: number
        }[]
      }
      read_email_batch: {
        Args: { batch_size: number; queue_name: string; vt: number }
        Returns: {
          message: Json
          msg_id: number
          read_ct: number
        }[]
      }
      schedule_plan_change: {
        Args: { _new_plan: string; _store_id: string }
        Returns: Json
      }
    }
    Enums: {
      app_role:
        | "admin"
        | "seller"
        | "customer"
        | "freelancer"
        | "provider"
        | "front_desk"
        | "pharmacist"
      appointment_mode: "in_store" | "home_visit" | "teleconsult"
      appointment_status:
        | "pending"
        | "confirmed"
        | "en_route"
        | "in_progress"
        | "completed"
        | "cancelled"
        | "no_show"
      bill_payment_status: "paid" | "partial" | "unpaid"
      commission_invoice_status: "pending" | "paid" | "overdue" | "waived"
      commission_status: "accrued" | "invoiced" | "waived"
      coupon_type: "percentage" | "flat" | "bogo" | "tiered"
      credit_promo_type:
        | "code"
        | "sitewide"
        | "first_recharge"
        | "loyalty"
        | "referral"
      credit_txn_type: "debit" | "credit" | "bonus" | "refund" | "grant"
      family_plan_status: "active" | "expired" | "cancelled" | "waitlist"
      fulfillment_mode: "dine_in" | "takeaway" | "delivery"
      inv_movement_type:
        | "opening"
        | "purchase"
        | "sale"
        | "adjustment"
        | "return"
      khata_entry_type: "credit" | "payment"
      order_status:
        | "pending"
        | "confirmed"
        | "processing"
        | "shipped"
        | "delivered"
        | "cancelled"
        | "returned"
      payment_mode_t: "cash" | "upi" | "card" | "bank" | "credit" | "other"
      payment_status: "pending" | "paid" | "failed" | "refunded" | "cod"
      prep_status:
        | "received"
        | "preparing"
        | "ready"
        | "served"
        | "out_for_delivery"
        | "completed"
        | "cancelled"
      subscription_plan: "free" | "premium" | "starter" | "growth" | "scale"
      subscription_status:
        | "active"
        | "cancelled"
        | "past_due"
        | "trialing"
        | "incomplete"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: [
        "admin",
        "seller",
        "customer",
        "freelancer",
        "provider",
        "front_desk",
        "pharmacist",
      ],
      appointment_mode: ["in_store", "home_visit", "teleconsult"],
      appointment_status: [
        "pending",
        "confirmed",
        "en_route",
        "in_progress",
        "completed",
        "cancelled",
        "no_show",
      ],
      bill_payment_status: ["paid", "partial", "unpaid"],
      commission_invoice_status: ["pending", "paid", "overdue", "waived"],
      commission_status: ["accrued", "invoiced", "waived"],
      coupon_type: ["percentage", "flat", "bogo", "tiered"],
      credit_promo_type: [
        "code",
        "sitewide",
        "first_recharge",
        "loyalty",
        "referral",
      ],
      credit_txn_type: ["debit", "credit", "bonus", "refund", "grant"],
      family_plan_status: ["active", "expired", "cancelled", "waitlist"],
      fulfillment_mode: ["dine_in", "takeaway", "delivery"],
      inv_movement_type: [
        "opening",
        "purchase",
        "sale",
        "adjustment",
        "return",
      ],
      khata_entry_type: ["credit", "payment"],
      order_status: [
        "pending",
        "confirmed",
        "processing",
        "shipped",
        "delivered",
        "cancelled",
        "returned",
      ],
      payment_mode_t: ["cash", "upi", "card", "bank", "credit", "other"],
      payment_status: ["pending", "paid", "failed", "refunded", "cod"],
      prep_status: [
        "received",
        "preparing",
        "ready",
        "served",
        "out_for_delivery",
        "completed",
        "cancelled",
      ],
      subscription_plan: ["free", "premium", "starter", "growth", "scale"],
      subscription_status: [
        "active",
        "cancelled",
        "past_due",
        "trialing",
        "incomplete",
      ],
    },
  },
} as const
