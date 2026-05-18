import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { User } from '@supabase/supabase-js';

const TENANT_DOMAIN = 'customers.pictocart.in';
const CUSTOMER_AUTH_EVENT = 'pictocart:customer-auth-changed';

export const useCustomerAuth = (storeSlug: string) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const isStoreCustomer = (candidate: User | null) => {
    if (!candidate || !storeSlug) return false;
    const metaSlug = candidate.user_metadata?.store_slug;
    const email = candidate.email || '';
    const isCustomer = candidate.user_metadata?.is_customer === true || email.endsWith(`@${storeSlug}.${TENANT_DOMAIN}`);
    return isCustomer && (metaSlug === storeSlug || email.endsWith(`@${storeSlug}.${TENANT_DOMAIN}`));
  };

  const scopeCustomerUser = (candidate: User | null) => (
    isStoreCustomer(candidate) ? candidate : null
  );

  useEffect(() => {
    let active = true;
    let restored = false;

    const setScopedUser = (sessionUser: User | null, authReady = restored) => {
      if (!active) return;
      setUser(scopeCustomerUser(sessionUser));
      if (authReady) setLoading(false);
    };

    const refreshSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      restored = true;
      setScopedUser(session?.user ?? null, true);
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      const scopedUser = scopeCustomerUser(session?.user ?? null);
      if (!active) return;
      setUser(scopedUser);
      if (restored || scopedUser) setLoading(false);
    });
    void refreshSession();
    const handleCustomerAuthChanged = (event: Event) => {
      const changedStore = (event as CustomEvent<{ storeSlug?: string }>).detail?.storeSlug;
      if (!changedStore || changedStore === storeSlug) void refreshSession();
    };
    window.addEventListener(CUSTOMER_AUTH_EVENT, handleCustomerAuthChanged);

    return () => {
      active = false;
      window.removeEventListener(CUSTOMER_AUTH_EVENT, handleCustomerAuthChanged);
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
    const { data } = await supabase.auth.setSession({
      access_token: session.access_token,
      refresh_token: session.refresh_token,
    });
    setUser(scopeCustomerUser(data.session?.user ?? session.user ?? null));
    setLoading(false);
    window.dispatchEvent(new CustomEvent(CUSTOMER_AUTH_EVENT, { detail: { storeSlug } }));
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

  const signInWithGoogle = async (idToken: string) => {
    await clearForeignSession();
    const { data, error } = await invokeCustomerAuth({
      action: 'google',
      idToken,
    });
    if (error) return { data: null, error };
    if (data?.error) {
      const msg = data.error === 'invalid_google_token'
        ? 'Google sign-in token could not be verified.'
        : data.error === 'google_not_configured'
          ? 'Google sign-in is not enabled for this store yet.'
          : 'Google sign-in failed. Please try again.';
      return { data: null, error: { message: msg } };
    }
    if (data?.session) await applySession(data.session);
    return { data, error: null };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    window.dispatchEvent(new CustomEvent(CUSTOMER_AUTH_EVENT, { detail: { storeSlug } }));
  };

  return {
    user,
    loading,
    signInWithEmail,
    signUpWithEmail,
    requestPasswordReset,
    signInWithOtp,
    verifyOtp,
    signInWithGoogle,
    signOut,
  };
};
