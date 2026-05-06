import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { User } from '@supabase/supabase-js';

const TENANT_DOMAIN = 'customers.pictocart.in';

export const useCustomerAuth = (storeSlug: string) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

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
      // Session belongs to a different store / a seller — not this storefront's user.
      setUser(null);
      setLoading(false);
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      void setScopedUser(session?.user ?? null);
    });
    supabase.auth.getSession().then(({ data: { session } }) => {
      void setScopedUser(session?.user ?? null);
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, [storeSlug]);

  // If a foreign session (seller / other-store customer) is present, sign it out
  // before establishing a new customer session in this browser.
  const clearForeignSession = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    const u = session?.user;
    if (u && !isStoreCustomer(u)) await supabase.auth.signOut();
  };

  const invokeCustomerAuth = async (body: Record<string, unknown>) => {
    return await supabase.functions.invoke('customer-auth', {
      body: { storeSlug, ...body },
    });
  };

  const applySession = async (session: any) => {
    if (!session?.access_token || !session?.refresh_token) return;
    await supabase.auth.setSession({
      access_token: session.access_token,
      refresh_token: session.refresh_token,
    });
  };

  const signUpWithEmail = async (email: string, password: string, fullName: string) => {
    await clearForeignSession();
    const { data, error } = await invokeCustomerAuth({
      action: 'signup',
      email,
      password,
      fullName,
      redirectTo: `${window.location.origin}/store/${storeSlug}/account`,
    });
    if (error) return { data: null, error };
    if (data?.error) {
      const msg = data.error === 'already_registered_for_this_store'
        ? 'An account with this email already exists for this store. Try signing in.'
        : data.error === 'password_too_short'
          ? 'Password must be at least 6 characters.'
          : 'Sign-up failed. Please try again.';
      return { data: null, error: { message: msg } };
    }
    if (data?.session) await applySession(data.session);
    return { data, error: null };
  };

  const signInWithEmail = async (email: string, password: string) => {
    await clearForeignSession();
    const { data, error } = await invokeCustomerAuth({
      action: 'signin',
      email,
      password,
    });
    if (error) return { data: null, error };
    if (data?.error) {
      const msg = data.error === 'invalid_credentials'
        ? 'Invalid email or password for this store.'
        : 'Sign-in failed. Please try again.';
      return { data: null, error: { message: msg } };
    }
    if (data?.session) await applySession(data.session);
    return { data, error: null };
  };

  const requestPasswordReset = async (email: string) => {
    const { error } = await invokeCustomerAuth({
      action: 'request_password_reset',
      email,
      redirectTo: `${window.location.origin}/store/${storeSlug}/account`,
    });
    return { error };
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

  return {
    user,
    loading,
    signInWithEmail,
    signUpWithEmail,
    requestPasswordReset,
    signInWithOtp,
    verifyOtp,
    signOut,
  };
};
