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

    const body = await req.json();
    const { action, userId, role, newPassword } = body;

    if (action === "create_partner") {
      const { email, password, partnerIdCode, name, companyName, phone, partnerType } = body;
      
      if (!email || !password || !partnerIdCode || !name) {
        throw new Error("Missing required fields: email, password, partnerIdCode, and name are required");
      }
      
      // 1. Check if user already exists in auth.users by email
      const { data: existingUserId } = await adminClient.rpc("get_user_id_by_email", { p_email: email });
      
      // Check if a partner record already exists with this email
      const { data: existingPartner } = await adminClient
        .from("partners")
        .select("id")
        .eq("email", email)
        .maybeSingle();
      if (existingPartner) {
        throw new Error("A partner with this email address has already been registered");
      }

      let newUserId = existingUserId;
      let isNewUser = false;

      if (!newUserId) {
        // Create auth user with email_confirm = true so they can login immediately
        const { data: authData, error: authError } = await adminClient.auth.admin.createUser({
          email,
          password,
          email_confirm: true
        });
        if (authError) throw authError;
        if (!authData?.user) throw new Error("Failed to create auth user");
        newUserId = authData.user.id;
        isNewUser = true;
      } else {
        // Double check they aren't registered by user_id
        const { data: partnerByUserId } = await adminClient
          .from("partners")
          .select("id")
          .eq("user_id", newUserId)
          .maybeSingle();
        if (partnerByUserId) {
          throw new Error("A partner with this email address has already been registered");
        }
      }

      // 2. Generate referral code
      let referral_code: string;
      try {
        const { data: code } = await adminClient.rpc("generate_referral_code");
        referral_code = code as string;
      } catch {
        referral_code = "PT" + Math.random().toString(36).slice(2, 9).toUpperCase();
      }

      // 3. Create partner record
      const { data: partnerData, error: partnerError } = await adminClient.from("partners").insert({
        user_id: newUserId,
        partner_id_code: partnerIdCode,
        name,
        email,
        company_name: companyName,
        phone,
        partner_type: partnerType || "freelancer",
        referral_code,
        email_verified: false,
        invite_status: "active"
      }).select("id").single();

      if (partnerError) {
        if (isNewUser && newUserId) {
          // Rollback auth user
          await adminClient.auth.admin.deleteUser(newUserId);
        }
        throw partnerError;
      }

      // 4. Create user role 'partner'
      const { error: roleError } = await adminClient.from("user_roles").upsert({
        user_id: newUserId,
        role: "partner"
      }, { onConflict: "user_id,role" });
      if (roleError) console.error("Failed to add partner role:", roleError);
      
      // 5. Allocate default licenses: 10 starter licenses at ₹600 each
      try {
        await adminClient.rpc("allocate_partner_licenses", {
          _partner_id: partnerData.id
        });
      } catch (licError) {
        console.error("Failed to allocate default licenses:", licError);
      }
      
      return new Response(JSON.stringify({ success: true, partner_id: partnerData.id }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

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
