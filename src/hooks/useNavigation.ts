'use client'

import { usePathname, useRouter } from 'next/navigation'
import { useCallback, useMemo } from 'react'

export interface NavigationState {
  currentPath: string
  isActive: (path: string) => boolean
  navigate: (path: string) => void
  canGoBack: boolean
  goBack: () => void
}

export function useNavigation(): NavigationState {
  const pathname = usePathname()
  const router = useRouter()

  const isActive = useCallback((path: string) => {
    if (path === '/dashboard' || path === '/') {
      return pathname === '/' || pathname === '/dashboard'
    }
    return pathname.startsWith(path)
  }, [pathname])

  const navigate = useCallback((path: string) => {
    router.push(path)
  }, [router])

  const canGoBack = useMemo(() => {
    // Can go back if not on main dashboard
    return pathname !== '/' && pathname !== '/dashboard'
  }, [pathname])

  const goBack = useCallback(() => {
    if (canGoBack) {
      router.back()
    }
  }, [router, canGoBack])

  return {
    currentPath: pathname,
    isActive,
    navigate,
    canGoBack,
    goBack
  }
}