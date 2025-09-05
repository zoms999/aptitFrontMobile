'use client'

import React from 'react'
import { usePathname } from 'next/navigation'
import { MobileNavigation } from './MobileNavigation'
import { MobileHeader } from './MobileHeader'
import { useNavigationContext } from '@/contexts/NavigationContext'
import { useAuth } from '@/contexts/AuthContext'

interface PWAShellProps {
  children: React.ReactNode
}

export function PWAShell({ children }: PWAShellProps) {
  const pathname = usePathname()
  const { isAuthenticated, isLoading } = useAuth()
  const {
    showNavigation,
    headerTitle,
    showBackButton,
    headerActions
  } = useNavigationContext()

  // Don't show navigation on auth pages
  const isAuthPage = pathname?.startsWith('/login') || pathname?.startsWith('/signup')
  const shouldShowNavigation = showNavigation && isAuthenticated && !isAuthPage

  // Don't show header on auth pages
  const shouldShowHeader = !isAuthPage

  return (
    <div className="flex flex-col h-full bg-gray-50 safe-area-inset">
      {/* Header */}
      {shouldShowHeader && (
        <MobileHeader 
          title={headerTitle}
          showBackButton={showBackButton}
          actions={headerActions}
        />
      )}
      
      {/* Main content area */}
      <main className="flex-1 overflow-hidden relative">
        <div className="h-full overflow-y-auto overscroll-contain">
          {children}
        </div>
      </main>
      
      {/* Bottom navigation */}
      {shouldShowNavigation && (
        <MobileNavigation />
      )}
    </div>
  )
}