'use client'

import React from 'react'
import { ArrowLeftIcon, Bars3Icon } from '@heroicons/react/24/outline'
import { useRouter, usePathname } from 'next/navigation'

interface MobileHeaderProps {
  title?: string
  showBackButton?: boolean
  showMenuButton?: boolean
  actions?: React.ReactNode
  onBackClick?: () => void
  onMenuClick?: () => void
}

export function MobileHeader({
  title,
  showBackButton = false,
  showMenuButton = false,
  actions,
  onBackClick,
  onMenuClick
}: MobileHeaderProps) {
  const router = useRouter()
  const pathname = usePathname()

  const handleBackClick = () => {
    if (onBackClick) {
      onBackClick()
    } else {
      router.back()
    }
  }

  const getPageTitle = () => {
    if (title) return title
    
    // Auto-generate title based on pathname
    switch (pathname) {
      case '/':
      case '/dashboard':
        return 'Aptit'
      case '/test':
        return '테스트'
      case '/results':
        return '결과'
      case '/profile':
        return '프로필'
      default:
        return 'Aptit'
    }
  }

  return (
    <header className="bg-white border-b border-gray-200 safe-area-top">
      <div className="flex items-center justify-between h-14 px-4">
        {/* Left side - Back button or Menu */}
        <div className="flex items-center">
          {showBackButton && (
            <button
              onClick={handleBackClick}
              className="p-2 -ml-2 rounded-full hover:bg-gray-100 active:bg-gray-200 transition-colors"
              aria-label="뒤로 가기"
            >
              <ArrowLeftIcon className="w-6 h-6 text-gray-700" />
            </button>
          )}
          
          {showMenuButton && (
            <button
              onClick={onMenuClick}
              className="p-2 -ml-2 rounded-full hover:bg-gray-100 active:bg-gray-200 transition-colors"
              aria-label="메뉴"
            >
              <Bars3Icon className="w-6 h-6 text-gray-700" />
            </button>
          )}
        </div>

        {/* Center - Title */}
        <div className="flex-1 text-center">
          <h1 className="text-lg font-semibold text-gray-900 truncate px-4">
            {getPageTitle()}
          </h1>
        </div>

        {/* Right side - Actions */}
        <div className="flex items-center">
          {actions}
        </div>
      </div>
    </header>
  )
}