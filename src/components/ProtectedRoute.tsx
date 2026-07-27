import { useRef } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading, isPasswordRecovery } = useAuth();

  // Keep last known user so auth token refreshes don't flash a spinner
  const lastUserRef = useRef(user);
  if (user || !loading) lastUserRef.current = user;

  // Only show spinner on the very first load (no user seen yet at all)
  if (loading && !lastUserRef.current) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  // During password recovery, don't redirect — let ResetPassword page handle it
  if (isPasswordRecovery) return <>{children}</>;

  if (!loading && !lastUserRef.current) return <Navigate to="/auth" replace />;

  // Block storefront customer accounts from accessing the merchant dashboard.
  if (lastUserRef.current?.user_metadata?.is_customer === true) {
    import('@/integrations/supabase/client').then(({ supabase }) => supabase.auth.signOut());
    return <Navigate to="/auth" replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
