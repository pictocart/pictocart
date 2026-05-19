import { Suspense } from 'react';
import { Outlet } from 'react-router-dom';
import ProtectedRoute from '@/components/ProtectedRoute';
import DashboardLayout from '@/components/DashboardLayout';
import PageSkeleton from '@/components/ui/PageSkeleton';

const DashboardShell = () => (
  <ProtectedRoute>
    <DashboardLayout>
      <Suspense fallback={<PageSkeleton />}>
        <Outlet />
      </Suspense>
    </DashboardLayout>
  </ProtectedRoute>
);

export default DashboardShell;
