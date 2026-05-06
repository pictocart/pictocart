import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { User } from '@supabase/supabase-js';

// Tenant alias domain — non-deliverable. Real emails are sent via
// auth-email-hook which reads `customer_email` from user metadata.
// We use a non-gmail domain so Supabase's address normalization
// (gmail strips dots and `+tags`) cannot collide accounts across stores.
const TENANT_DOMAIN = 'customers.pictocart.in';

export const useCustomerAuth = (storeSlug: string) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const normalizeEmail = (value: string) => value.trim().toLowerCase();

  const getTenantEmail = (value: string) => {
    const normalized = normalizeEmail(value);
    if (!storeSlug) return normalized;
    // Encode the real email into a unique local-part. The result is a
    // valid RFC-5321 address, deterministic, and unique per (email, store).
    const localPart = normalized
      .replace('@', '-at-')
      .replace(/[^a-z0-9.\-_]/g, '-');
    return `${localPart}@${storeSlug}.${TENANT_DOMAIN}`;
  };

  const isStoreCustomer = (candidate: User | null) => {
    if (!candidate?.user_metadata?.is_customer || !storeSlug) return false;
    const metaSlug = candidate.user_metadata.store_slug;
    const email = candidate.email || '';
    return metaSlug === storeSlug || email.endsWith(`@${storeSlug}.${TENANT_DOMAIN}`);
  };

  useEffect(() => {
    let active = true;

    const setScopedUser = async (sessionUser: User | null) => {
      if (!active) return;
      if (!sessionUser?.user_metadata?.is_customer || !storeSlug) {
        setUser(null);
        setLoading(false);
        return;
      }
      if (isStoreCustomer(sessionUser)) {
        setUser(sessionUser);
        setLoading(false);
        return;
      }
      const { data: store } = await supabase.from('stores').select('id').eq('slug', storeSlug).maybeSingle();
      if (!active || !store?.id) {
        setUser(null);
        setLoading(false);
        return;
      }
      const { data: customer } = await supabase
        .from('customers')
        .select('user_id')
        .eq('user_id', sessionUser.id)
        .eq('store_id', store.id)
        .maybeSingle();
      if (active) {
        setUser(customer ? sessionUser : null);
        setLoading(false);
      }
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      const sessionUser = session?.user ?? null;
      void setScopedUser(sessionUser);
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      const sessionUser = session?.user ?? null;
      void setScopedUser(sessionUser);
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, [storeSlug]);

  // If a seller (or customer of a different store) is currently signed in,
  // sign them out before attempting a customer auth on this storefront so
  // their session doesn't get silently overwritten or block the new login.
  const clearForeignSession = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    const u = session?.user;
    if (!u) return;
    if (!isStoreCustomer(u)) {
      await supabase.auth.signOut();
    }
  };

  const signInWithEmail = async (email: string, password: string) => {
    await clearForeignSession();
    const { data, error } = await supabase.auth.signInWithPassword({
      email: getTenantEmail(email),
      password,
    });
    return { data, error };
  };

  const signUpWithEmail = async (email: string, password: string, fullName: string) => {
    await clearForeignSession();
    const realEmail = normalizeEmail(email);
    const { data, error } = await supabase.auth.signUp({
      email: getTenantEmail(realEmail),
      password,
      options: {
        data: {
          full_name: fullName,
          is_customer: true,
          store_slug: storeSlug,
          customer_email: realEmail,
        },
        emailRedirectTo: `${window.location.origin}/store/${storeSlug}/account`,
      },
    });
    return { data, error };
  };

  const signInWithOtp = async (phone: string) => {
    const { error } = await supabase.auth.signInWithOtp({ phone });
    return { error };
  };

  const verifyOtp = async (phone: string, token: string) => {
    const { error } = await supabase.auth.verifyOtp({ phone, token, type: 'sms' });
    return { error };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return { user, loading, signInWithEmail, signUpWithEmail, signInWithOtp, verifyOtp, signOut };
};
