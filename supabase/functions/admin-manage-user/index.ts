import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No auth header");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Verify caller is admin
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) throw new Error("Unauthorized");

    const adminClient = createClient(supabaseUrl, serviceKey);
    const { data: isAdmin } = await adminClient.rpc("has_role", { _user_id: user.id, _role: "admin" });
    if (!isAdmin) throw new Error("Forbidden");

    const { action, userId, role, newPassword } = await req.json();

    if (action === "delete_user") {
      const { error } = await adminClient.auth.admin.deleteUser(userId);
      if (error) throw error;
      return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (action === "permanent_delete_user") {
      // Complete user deletion - remove all associated data
      try {
        console.log(`Starting permanent deletion for user: ${userId}`);
        
        // 1. Get user's stores first
        const { data: userStores } = await adminClient
          .from("stores")
          .select("id, slug")
          .eq("user_id", userId);

        if (userStores && userStores.length > 0) {
          for (const store of userStores) {
            console.log(`Deleting store: ${store.slug} (ID: ${store.id})`);
            
            // Delete store-related data in correct order (to handle foreign key constraints)
            
            // Delete order items first
            await adminClient.from("order_items").delete().eq("store_id", store.id);
            
            // Delete orders
            await adminClient.from("orders").delete().eq("store_id", store.id);
            
            // Delete product variants and images
            await adminClient.from("product_variants").delete().eq("store_id", store.id);
            await adminClient.from("product_images").delete().eq("store_id", store.id);
            
            // Delete products
            await adminClient.from("products").delete().eq("store_id", store.id);
            
            // Delete categories
            await adminClient.from("categories").delete().eq("store_id", store.id);
            
            // Delete coupons
            await adminClient.from("coupons").delete().eq("store_id", store.id);
            
            // Delete reviews
            await adminClient.from("reviews").delete().eq("store_id", store.id);
            
            // Delete blog posts
            await adminClient.from("blog_posts").delete().eq("store_id", store.id);
            
            // Delete custom pages
            await adminClient.from("custom_pages").delete().eq("store_id", store.id);
            
            // Delete newsletter subscribers
            await adminClient.from("newsletter_subscribers").delete().eq("store_id", store.id);
            
            // Delete customers
            await adminClient.from("customers").delete().eq("store_id", store.id);
            
            // Delete menu items and categories
            await adminClient.from("menu_items").delete().eq("store_id", store.id);
            await adminClient.from("menu_categories").delete().eq("store_id", store.id);
            
            // Delete appointments and services
            await adminClient.from("appointments").delete().eq("store_id", store.id);
            await adminClient.from("services").delete().eq("store_id", store.id);
            
            // Delete providers
            await adminClient.from("providers").delete().eq("store_id", store.id);
            
            // Delete support tickets
            await adminClient.from("support_tickets").delete().eq("store_id", store.id);
            
            // Delete returns
            await adminClient.from("returns").delete().eq("store_id", store.id);
            
            // Delete shipments
            await adminClient.from("shipments").delete().eq("store_id", store.id);
            
            // Delete wallet transactions
            await adminClient.from("wallet_transactions").delete().eq("store_id", store.id);
            
            // Delete commission records
            await adminClient.from("commission_records").delete().eq("store_id", store.id);
            
            // Delete invoices
            await adminClient.from("invoices").delete().eq("store_id", store.id);
            
            // Delete analytics data
            await adminClient.from("store_analytics").delete().eq("store_id", store.id);
            
            // Finally delete the store itself
            await adminClient.from("stores").delete().eq("id", store.id);
            
            console.log(`Store ${store.slug} deleted successfully`);
          }
        }

        // 2. Delete user profile data
        await adminClient.from("profiles").delete().eq("user_id", userId);
        
        // 3. Delete user roles
        await adminClient.from("user_roles").delete().eq("user_id", userId);
        
        // 4. Delete user subscription data
        await adminClient.from("subscriptions").delete().eq("user_id", userId);
        
        // 5. Delete partner relationships
        await adminClient.from("partner_hierarchies").delete().eq("user_id", userId);
        await adminClient.from("partner_hierarchies").delete().eq("parent_user_id", userId);
        
        // 6. Delete theme purchases
        await adminClient.from("theme_purchases").delete().eq("user_id", userId);
        
        // 7. Delete AI credits and usage
        await adminClient.from("ai_credits").delete().eq("user_id", userId);
        await adminClient.from("ai_usage_logs").delete().eq("user_id", userId);
        
        // 8. Delete accounts data
        await adminClient.from("accounts").delete().eq("user_id", userId);
        await adminClient.from("purchases").delete().eq("user_id", userId);
        await adminClient.from("suppliers").delete().eq("user_id", userId);
        
        // 9. Finally delete the auth user (this will cascade delete any remaining references)
        const { error: deleteAuthError } = await adminClient.auth.admin.deleteUser(userId);
        if (deleteAuthError) {
          console.error("Error deleting auth user:", deleteAuthError);
          throw deleteAuthError;
        }
        
        console.log(`User ${userId} permanently deleted successfully`);
        
        return new Response(JSON.stringify({ 
          success: true, 
          message: "User and all associated data permanently deleted" 
        }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
        
      } catch (error) {
        console.error("Error in permanent delete:", error);
        throw new Error(`Failed to permanently delete user: ${error.message}`);
      }
    }

    if (action === "add_role") {
      const { error } = await adminClient.from("user_roles").insert({ user_id: userId, role });
      if (error) throw error;
      return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (action === "remove_role") {
      const { error } = await adminClient.from("user_roles").delete().eq("user_id", userId).eq("role", role);
      if (error) throw error;
      return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (action === "reset_password") {
      if (!newPassword || typeof newPassword !== "string" || newPassword.length < 6) {
        throw new Error("Password must be at least 6 characters");
      }
      const { error } = await adminClient.auth.admin.updateUserById(userId, { password: newPassword });
      if (error) throw error;
      return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (action === "list_users") {
      const { data: { users }, error } = await adminClient.auth.admin.listUsers({ perPage: 1000 });
      if (error) throw error;
      return new Response(JSON.stringify({
        users: users.map(u => ({
          id: u.id,
          email: u.email,
          created_at: u.created_at,
          last_sign_in_at: u.last_sign_in_at,
          email_confirmed_at: u.email_confirmed_at,
          user_metadata: u.user_metadata || {},
        })),
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    throw new Error("Invalid action");
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
