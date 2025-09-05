import { createLazyComponent, ChartSkeleton } from '@/lib/lazy-loading';

// Lazy load chart components
export const LazyMobileChart = createLazyComponent(
  () => import('@/components/charts/MobileChart'),
  <ChartSkeleton />
);

export const LazyAnalyticsDashboard = createLazyComponent(
  () => import('@/components/charts/AnalyticsDashboard'),
  <ChartSkeleton />
);

export const LazyTouchInteractiveChart = createLazyComponent(
  () => import('@/components/charts/TouchInteractiveChart'),
  <ChartSkeleton />
);