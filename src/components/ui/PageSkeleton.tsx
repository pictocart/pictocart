import { Skeleton } from '@/components/ui/skeleton';

export const PageSkeleton = () => (
  <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-4">
    <Skeleton className="h-8 w-48" />
    <Skeleton className="h-4 w-72" />
    <div className="grid gap-4 md:grid-cols-3">
      <Skeleton className="h-28 w-full" />
      <Skeleton className="h-28 w-full" />
      <Skeleton className="h-28 w-full" />
    </div>
    <Skeleton className="h-64 w-full" />
  </div>
);

export default PageSkeleton;
