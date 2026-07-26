import { Suspense, useRef } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import ProtectedRoute from '@/components/ProtectedRoute';
import DashboardLayout from '@/components/DashboardLayout';
import PageSkeleton from '@/components/ui/PageSkeleton';
import { useStore } from '@/hooks/useStore';

// Redirects to /onboarding only when we are CERTAIN the merchant has no store.
// While loading (including auth token refreshes), we keep the last known good
// state so the layout never unmounts and causes a blink.
const StoreGuard = ({ children }: { children: React.ReactNode }) => {
  const { store, loading } = useStore();

  // Keep the last known store so we don't unmount during re-fetches
  const lastStoreRef = useRef(store);
  if (store) lastStoreRef.current = store;

  // Still doing the first-ever load — show skeleton once
  if (loading && !lastStoreRef.current) return <PageSkeleton />;

  // Definitively no store and not loading → redirect to onboarding
  if (!loading && !lastStoreRef.current) return <Navigate to="/onboarding" replace />;

  // Either we have a store, or we're re-fetching (use last known) → render normally
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
