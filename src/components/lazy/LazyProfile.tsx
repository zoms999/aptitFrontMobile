import { createLazyComponent, ProfileSkeleton, ComponentSkeleton } from '@/lib/lazy-loading';

// Lazy load profile components
export const LazyProfileEditForm = createLazyComponent(
  () => import('@/components/profile/ProfileEditForm'),
  <ProfileSkeleton />
);

export const LazyPasswordChangeForm = createLazyComponent(
  () => import('@/components/profile/PasswordChangeForm'),
  <ComponentSkeleton className="h-64" />
);

export const LazyAccountDeletionForm = createLazyComponent(
  () => import('@/components/profile/AccountDeletionForm'),
  <ComponentSkeleton className="h-48" />
);

export const LazySettingsModal = createLazyComponent(
  () => import('@/components/profile/SettingsModal'),
  <ComponentSkeleton className="h-96" />
);