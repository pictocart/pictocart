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
      agent_incidents: {
        Row: {
          action: string
          created_at: string
          details: Json | null
          domain: string | null
          id: string
          severity: string
          store_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          details?: Json | null
          domain?: string | null
          id?: string
          severity?: string
          store_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          details?: Json | null
          domain?: string | null
          id?: string
          severity?: string
          store_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "agent_incidents_store_id_fkey"
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
      domain_health_log: {
        Row: {
          checked_at: string
          domain: string
          error_message: string | null
          http_code: number | null
          id: string
          response_ms: number | null
          ssl_valid: boolean | null
          status: string
          store_id: string
        }
        Insert: {
          checked_at?: string
          domain: string
          error_message?: string | null
          http_code?: number | null
          id?: string
          response_ms?: number | null
          ssl_valid?: boolean | null
          status: string
          store_id: string
        }
        Update: {
          checked_at?: string
          domain?: string
          error_message?: string | null
          http_code?: number | null
          id?: string
          response_ms?: number | null
          ssl_valid?: boolean | null
          status?: string
          store_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "domain_health_log_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
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
      provision_requests: {
        Row: {
          client_patch_payload: Json
          completed_at: string | null
          error: string | null
          id: string
          new_project_subdomain: string | null
          new_project_url: string | null
          notes: string | null
          queued_at: string
          rendered_patch_prompt: string | null
          started_at: string | null
          status: string
          store_id: string
          theme_master_id: string | null
          updated_at: string
        }
        Insert: {
          client_patch_payload?: Json
          completed_at?: string | null
          error?: string | null
          id?: string
          new_project_subdomain?: string | null
          new_project_url?: string | null
          notes?: string | null
          queued_at?: string
          rendered_patch_prompt?: string | null
          started_at?: string | null
          status?: string
          store_id: string
          theme_master_id?: string | null
          updated_at?: string
        }
        Update: {
          client_patch_payload?: Json
          completed_at?: string | null
          error?: string | null
          id?: string
          new_project_subdomain?: string | null
          new_project_url?: string | null
          notes?: string | null
          queued_at?: string
          rendered_patch_prompt?: string | null
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
          cloudflare_hostname_id: string | null
          consecutive_failures: number
          created_at: string
          custom_domain: string | null
          description: string | null
          domain_state: string | null
          domain_strategy: string | null
          downtime_notified_at: string | null
          downtime_started_at: string | null
          id: string
          is_published: boolean | null
          last_health_check_at: string | null
          logo_url: string | null
          name: string
          ns_provider: string | null
          onboarding_step: number | null
          settings: Json | null
          slug: string
          ssl_last_checked_at: string | null
          ssl_status: string | null
          ssl_validation_name: string | null
          ssl_validation_value: string | null
          state_entered_at: string | null
          theme: Json | null
          updated_at: string
          user_id: string
        }
        Insert: {
          banner_url?: string | null
          category?: string | null
          cloudflare_hostname_id?: string | null
          consecutive_failures?: number
          created_at?: string
          custom_domain?: string | null
          description?: string | null
          domain_state?: string | null
          domain_strategy?: string | null
          downtime_notified_at?: string | null
          downtime_started_at?: string | null
          id?: string
          is_published?: boolean | null
          last_health_check_at?: string | null
          logo_url?: string | null
          name: string
          ns_provider?: string | null
          onboarding_step?: number | null
          settings?: Json | null
          slug: string
          ssl_last_checked_at?: string | null
          ssl_status?: string | null
          ssl_validation_name?: string | null
          ssl_validation_value?: string | null
          state_entered_at?: string | null
          theme?: Json | null
          updated_at?: string
          user_id: string
        }
        Update: {
          banner_url?: string | null
          category?: string | null
          cloudflare_hostname_id?: string | null
          consecutive_failures?: number
          created_at?: string
          custom_domain?: string | null
          description?: string | null
          domain_state?: string | null
          domain_strategy?: string | null
          downtime_notified_at?: string | null
          downtime_started_at?: string | null
          id?: string
          is_published?: boolean | null
          last_health_check_at?: string | null
          logo_url?: string | null
          name?: string
          ns_provider?: string | null
          onboarding_step?: number | null
          settings?: Json | null
          slug?: string
          ssl_last_checked_at?: string | null
          ssl_status?: string | null
          ssl_validation_name?: string | null
          ssl_validation_value?: string | null
          state_entered_at?: string | null
          theme?: Json | null
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
      theme_master_projects: {
        Row: {
          client_patch_prompt: string
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          lovable_project_url: string | null
          name: string
          preview_image: string | null
          remix_url: string | null
          theme_id: string
          updated_at: string
        }
        Insert: {
          client_patch_prompt?: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          lovable_project_url?: string | null
          name: string
          preview_image?: string | null
          remix_url?: string | null
          theme_id: string
          updated_at?: string
        }
        Update: {
          client_patch_prompt?: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          lovable_project_url?: string | null
          name?: string
          preview_image?: string | null
          remix_url?: string | null
          theme_id?: string
          updated_at?: string
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
      cleanup_domain_health_log: {
        Args: { _retain_days?: number }
        Returns: number
      }
      get_domain_health_summary: {
        Args: { _since: string }
        Returns: {
          store_id: string
          total: number
          up: number
        }[]
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
    }
    Enums: {
      app_role: "admin" | "seller" | "customer"
      coupon_type: "percentage" | "flat"
      order_status:
        | "pending"
        | "confirmed"
        | "processing"
        | "shipped"
        | "delivered"
        | "cancelled"
        | "returned"
      payment_status: "pending" | "paid" | "failed" | "refunded" | "cod"
      subscription_plan: "free" | "premium"
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
      app_role: ["admin", "seller", "customer"],
      coupon_type: ["percentage", "flat"],
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
      subscription_plan: ["free", "premium"],
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
