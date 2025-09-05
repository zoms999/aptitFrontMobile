import { createLazyComponent, ResultsSkeleton, ComponentSkeleton } from '@/lib/lazy-loading';

// Lazy load results components
export const LazyDetailedAnalysis = createLazyComponent(
  () => import('@/components/results/DetailedAnalysis'),
  <ResultsSkeleton />
);

export const LazyResultsComparison = createLazyComponent(
  () => import('@/components/results/ResultsComparison'),
  <ResultsSkeleton />
);

export const LazyHistoricalDataNavigation = createLazyComponent(
  () => import('@/components/results/HistoricalDataNavigation'),
  <ComponentSkeleton className="h-48" />
);

export const LazyShareResults = createLazyComponent(
  () => import('@/components/results/ShareResults'),
  <ComponentSkeleton className="h-32" />
);