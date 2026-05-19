import { Suspense } from 'react';
import { Outlet } from 'react-router-dom';
import AdminRoute from '@/components/AdminRoute';
import AdminLayout from '@/components/AdminLayout';
import PageSkeleton from '@/components/ui/PageSkeleton';

const AdminShell = () => (
  <AdminRoute>
    <AdminLayout>
      <Suspense fallback={<PageSkeleton />}>
        <Outlet />
      </Suspense>
    </AdminLayout>
  </AdminRoute>
);

export default AdminShell;
