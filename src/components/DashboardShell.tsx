import { Suspense } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import ProtectedRoute from '@/components/ProtectedRoute';
import DashboardLayout from '@/components/DashboardLayout';
import PageSkeleton from '@/components/ui/PageSkeleton';
import { useStore } from '@/hooks/useStore';

// Redirects to /onboarding when the authenticated merchant has no store yet.
// This guards ALL dashboard routes in one place.
const StoreGuard = ({ children }: { children: React.ReactNode }) => {
  const { store, loading } = useStore();

  if (loading) return <PageSkeleton />;

  if (!store) return <Navigate to="/onboarding" replace />;

  return <>{children}</>;
};

const DashboardShell = () => (
  <ProtectedRoute>
    <StoreGuard>
      <DashboardLayout>
        <Suspense fallback={<PageSkeleton />}>
          <Outlet />
        </Suspense>
      </DashboardLayout>
    </StoreGuard>
  </ProtectedRoute>
);

export default DashboardShell;
