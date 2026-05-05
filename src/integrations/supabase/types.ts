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
          id: string
          name: string
          parent_id: string | null
          sort_order: number
          store_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          parent_id?: string | null
          sort_order?: number
          store_id: string
        }
        Update: {
          created_at?: string
          id?: string
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
      coupons: {
        Row: {
          code: string
          created_at: string
          expires_at: string | null
          id: string
          is_active: boolean
          max_uses: number | null
          min_order_amount: number | null
          starts_at: string | null
          store_id: string
          type: Database["public"]["Enums"]["coupon_type"]
          updated_at: string
          used_count: number
          value: number
        }
        Insert: {
          code: string
          created_at?: string
          expires_at?: string | null
          id?: string
          is_active?: boolean
          max_uses?: number | null
          min_order_amount?: number | null
          starts_at?: string | null
          store_id: string
          type?: Database["public"]["Enums"]["coupon_type"]
          updated_at?: string
          used_count?: number
          value?: number
        }
        Update: {
          code?: string
          created_at?: string
          expires_at?: string | null
          id?: string
          is_active?: boolean
          max_uses?: number | null
          min_order_amount?: number | null
          starts_at?: string | null
          store_id?: string
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
      customers: {
        Row: {
          created_at: string | null
          id: string
          saved_addresses: Json | null
          store_id: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          saved_addresses?: Json | null
          store_id: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
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
      master_theme_deliveries: {
        Row: {
          category: string | null
          delivered_at: string
          generation_cost_inr: number | null
          id: string
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
      orders: {
        Row: {
          created_at: string
          customer_address: Json | null
          customer_email: string | null
          customer_name: string | null
          customer_phone: string | null
          customer_user_id: string | null
          id: string
          items: Json
          notes: string | null
          order_number: string
          payment_method: string | null
          payment_status: Database["public"]["Enums"]["payment_status"] | null
          shipping: number | null
          status: Database["public"]["Enums"]["order_status"] | null
          store_id: string
          subtotal: number | null
          tax: number | null
          total: number | null
          tracking_number: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          customer_address?: Json | null
          customer_email?: string | null
          customer_name?: string | null
          customer_phone?: string | null
          customer_user_id?: string | null
          id?: string
          items?: Json
          notes?: string | null
          order_number: string
          payment_method?: string | null
          payment_status?: Database["public"]["Enums"]["payment_status"] | null
          shipping?: number | null
          status?: Database["public"]["Enums"]["order_status"] | null
          store_id: string
          subtotal?: number | null
          tax?: number | null
          total?: number | null
          tracking_number?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          customer_address?: Json | null
          customer_email?: string | null
          customer_name?: string | null
          customer_phone?: string | null
          customer_user_id?: string | null
          id?: string
          items?: Json
          notes?: string | null
          order_number?: string
          payment_method?: string | null
          payment_status?: Database["public"]["Enums"]["payment_status"] | null
          shipping?: number | null
          status?: Database["public"]["Enums"]["order_status"] | null
          store_id?: string
          subtotal?: number | null
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
          created_at: string
          description: string | null
          id: string
          images: string[] | null
          inventory_count: number | null
          is_active: boolean | null
          price: number
          seo_description: string | null
          seo_title: string | null
          short_description: string | null
          sku: string | null
          store_id: string
          tags: string[] | null
          title: string
          updated_at: string
          variants: Json | null
        }
        Insert: {
          ai_generated_data?: Json | null
          category?: string | null
          compare_at_price?: number | null
          created_at?: string
          description?: string | null
          id?: string
          images?: string[] | null
          inventory_count?: number | null
          is_active?: boolean | null
          price?: number
          seo_description?: string | null
          seo_title?: string | null
          short_description?: string | null
          sku?: string | null
          store_id: string
          tags?: string[] | null
          title: string
          updated_at?: string
          variants?: Json | null
        }
        Update: {
          ai_generated_data?: Json | null
          category?: string | null
          compare_at_price?: number | null
          created_at?: string
          description?: string | null
          id?: string
          images?: string[] | null
          inventory_count?: number | null
          is_active?: boolean | null
          price?: number
          seo_description?: string | null
          seo_title?: string | null
          short_description?: string | null
          sku?: string | null
          store_id?: string
          tags?: string[] | null
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
      reviews: {
        Row: {
          body: string | null
          created_at: string | null
          id: string
          images: string[] | null
          is_verified_purchase: boolean | null
          product_id: string
          rating: number
          store_id: string
          title: string | null
          user_id: string
        }
        Insert: {
          body?: string | null
          created_at?: string | null
          id?: string
          images?: string[] | null
          is_verified_purchase?: boolean | null
          product_id: string
          rating: number
          store_id: string
          title?: string | null
          user_id: string
        }
        Update: {
          body?: string | null
          created_at?: string | null
          id?: string
          images?: string[] | null
          is_verified_purchase?: boolean | null
          product_id?: string
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
      store_secrets: {
        Row: {
          created_at: string
          delhivery_api_token: string | null
          delhivery_test_mode: boolean | null
          razorpay_key_id: string | null
          razorpay_key_secret: string | null
          razorpay_test_mode: boolean | null
          store_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          delhivery_api_token?: string | null
          delhivery_test_mode?: boolean | null
          razorpay_key_id?: string | null
          razorpay_key_secret?: string | null
          razorpay_test_mode?: boolean | null
          store_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          delhivery_api_token?: string | null
          delhivery_test_mode?: boolean | null
          razorpay_key_id?: string | null
          razorpay_key_secret?: string | null
          razorpay_test_mode?: boolean | null
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
          cancelled_at: string | null
          created_at: string
          current_period_end: string | null
          current_period_start: string | null
          id: string
          plan: Database["public"]["Enums"]["subscription_plan"]
          razorpay_plan_id: string | null
          razorpay_subscription_id: string | null
          status: Database["public"]["Enums"]["subscription_status"]
          store_id: string
          updated_at: string
        }
        Insert: {
          cancelled_at?: string | null
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          plan?: Database["public"]["Enums"]["subscription_plan"]
          razorpay_plan_id?: string | null
          razorpay_subscription_id?: string | null
          status?: Database["public"]["Enums"]["subscription_status"]
          store_id: string
          updated_at?: string
        }
        Update: {
          cancelled_at?: string | null
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
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
      generate_referral_code: { Args: never; Returns: string }
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
      move_to_dlq: {
        Args: {
          dlq_name: string
          message_id: number
          payload: Json
          source_queue: string
        }
        Returns: number
      }
      read_email_batch: {
        Args: { batch_size: number; queue_name: string; vt: number }
        Returns: {
          message: Json
          msg_id: number
          read_ct: number
        }[]
      }
    }
    Enums: {
      app_role: "admin" | "seller" | "customer" | "freelancer"
      coupon_type: "percentage" | "flat"
      credit_promo_type:
        | "code"
        | "sitewide"
        | "first_recharge"
        | "loyalty"
        | "referral"
      credit_txn_type: "debit" | "credit" | "bonus" | "refund" | "grant"
      order_status:
        | "pending"
        | "confirmed"
        | "processing"
        | "shipped"
        | "delivered"
        | "cancelled"
        | "returned"
      payment_status: "pending" | "paid" | "failed" | "refunded" | "cod"
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
      app_role: ["admin", "seller", "customer", "freelancer"],
      coupon_type: ["percentage", "flat"],
      credit_promo_type: [
        "code",
        "sitewide",
        "first_recharge",
        "loyalty",
        "referral",
      ],
      credit_txn_type: ["debit", "credit", "bonus", "refund", "grant"],
      order_status: [
        "pending",
        "confirmed",
        "processing",
        "shipped",
        "delivered",
        "cancelled",
        "returned",
      ],
      payment_status: ["pending", "paid", "failed", "refunded", "cod"],
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
