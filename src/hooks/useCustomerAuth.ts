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
    isStoreCustomer(candidate) ? { ...candidate, user_metadata: candidate?.user_metadata || {} } as User : null
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

  const sendEmailOtp = async (email: string, fullName = "", phone = "", password = "") => {
    await clearForeignSession();
    const { data, error } = await invokeCustomerAuth({
      action: 'send_email_otp',
      email,
      fullName,
      phone,
      password,
    });
    if (error) return { data: null, error };
    if (data?.error) {
      return { data: null, error: { message: data.error } };
    }
    return { data, error: null };
  };

  const verifyEmailOtp = async (email: string, token: string) => {
    await clearForeignSession();
    const { data, error } = await invokeCustomerAuth({
      action: 'verify_email_otp',
      email,
      token,
    });
    if (error) return { data: null, error };
    if (data?.error) {
      return { data: null, error: { message: data.error } };
    }
    if (data?.session) await applySession(data.session);
    return { data, error: null };
  };

  const sendPasswordResetOtp = async (email: string) => {
    const { data, error } = await invokeCustomerAuth({
      action: 'send_password_reset_otp',
      email,
    });
    if (error) return { data: null, error };
    if (data?.error) {
      return { data: null, error: { message: data.error } };
    }
    return { data, error: null };
  };

  const resetPasswordWithOtp = async (email: string, token: string, newPassword: string) => {
    await clearForeignSession();
    const { data, error } = await invokeCustomerAuth({
      action: 'reset_password_with_otp',
      email,
      token,
      newPassword,
    });
    if (error) return { data: null, error };
    if (data?.error) {
      const msg =
        data.error === 'invalid_otp' ? 'Invalid or expired OTP. Please try again.' :
        data.error === 'password_too_short' ? 'Password must be at least 6 characters.' :
        data.error === 'user_not_found' ? 'No account found with that email.' :
        'Could not reset password. Please try again.';
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

  /**
   * Send a 6-digit OTP to user's real email via the edge function's send_email_otp action.
   * This uses our branded transactional email (not Supabase magic link).
   * Stores name+password in sessionStorage for use after OTP verification.
   */
  const sendSignupOtp = async (email: string, fullName: string, password: string) => {
    await clearForeignSession();
    try {
      sessionStorage.setItem(`signup_intent_${storeSlug}`, JSON.stringify({ email, fullName, password }));
    } catch {}
    const { data, error } = await invokeCustomerAuth({
      action: 'send_email_otp',
      email,
      fullName,
      password,
    });
    if (error) return { error: { message: 'Could not send verification code. Please try again.' } };
    if (data?.error) return { error: { message: 'Could not send verification code. Please try again.' } };
    return { error: null };
  };

  /**
   * Verify the 6-digit OTP from send_email_otp, then create the tenant account.
   */
  const verifySignupOtp = async (email: string, token: string) => {
    // Retrieve stored signup intent
    let fullName = '';
    let password = '';
    try {
      const raw = sessionStorage.getItem(`signup_intent_${storeSlug}`);
      if (raw) { const p = JSON.parse(raw); fullName = p.fullName || ''; password = p.password || ''; }
      sessionStorage.removeItem(`signup_intent_${storeSlug}`);
    } catch {}

    if (!password) return { data: null, error: { message: 'Session expired. Please start signup again.' } };

    // Step 1: Verify OTP via edge function
    const { data: verifyData, error: verifyError } = await invokeCustomerAuth({
      action: 'verify_email_otp',
      email,
      token,
    });
    if (verifyError) return { data: null, error: { message: 'Invalid or expired code. Please try again.' } };
    if (verifyData?.error) return { data: null, error: { message: 'Invalid or expired code. Please try again.' } };

    // Step 2: If verify returned a session, apply it
    if (verifyData?.session) {
      await applySession(verifyData.session);
      return { data: verifyData, error: null };
    }

    // Step 3: Otherwise call signup to create the tenant account with password
    const { data: signupData, error: signupError } = await invokeCustomerAuth({
      action: 'signup',
      email,
      password,
      fullName,
    });
    if (signupError) return { data: null, error: { message: 'Could not create account. Please try again.' } };
    if (signupData?.error) {
      if (signupData.error === 'already_registered_for_this_store') {
        return await signInWithEmail(email, password);
      }
      return { data: null, error: { message: 'Could not create account. Please try again.' } };
    }
    if (signupData?.session) await applySession(signupData.session);
    return { data: signupData, error: null };
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
    sendEmailOtp,
    verifyEmailOtp,
    sendPasswordResetOtp,
    resetPasswordWithOtp,
    sendSignupOtp,
    verifySignupOtp,
  };
};
