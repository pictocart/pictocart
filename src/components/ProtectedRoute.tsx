import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading, isPasswordRecovery } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  // During password recovery, don't redirect — let ResetPassword page handle it
  if (isPasswordRecovery) return <>{children}</>;

  if (!user) return <Navigate to="/auth" replace />;

  // Block storefront customer accounts from accessing the merchant dashboard.
  // Customer accounts are tagged with is_customer=true in their user_metadata
  // by the customer-auth edge function — they have no store and must not
  // reach any seller-only page.
  if (user.user_metadata?.is_customer === true) {
    // Sign out the customer session from the main auth pool so a merchant
    // can log in cleanly on the same browser.
    import('@/integrations/supabase/client').then(({ supabase }) => supabase.auth.signOut());
    return <Navigate to="/auth" replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
