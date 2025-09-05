'use client'

import React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useHaptics } from '@/lib/haptics'
import { 
  HomeIcon, 
  DocumentTextIcon, 
  ChartBarIcon, 
  UserIcon 
} from '@heroicons/react/24/outline'
import {
  HomeIcon as HomeIconSolid,
  DocumentTextIcon as DocumentTextIconSolid,
  ChartBarIcon as ChartBarIconSolid,
  UserIcon as UserIconSolid
} from '@heroicons/react/24/solid'

interface NavItem {
  href: string
  label: string
  icon: React.ComponentType<{ className?: string }>
  activeIcon: React.ComponentType<{ className?: string }>
}

const navigationItems: NavItem[] = [
  {
    href: '/dashboard',
    label: '홈',
    icon: HomeIcon,
    activeIcon: HomeIconSolid
  },
  {
    href: '/test',
    label: '테스트',
    icon: DocumentTextIcon,
    activeIcon: DocumentTextIconSolid
  },
  {
    href: '/results',
    label: '결과',
    icon: ChartBarIcon,
    activeIcon: ChartBarIconSolid
  },
  {
    href: '/profile',
    label: '프로필',
    icon: UserIcon,
    activeIcon: UserIconSolid
  }
]

export function MobileNavigation() {
  const pathname = usePathname()
  const { selection } = useHaptics()

  const isActive = (href: string) => {
    if (href === '/dashboard') {
      return pathname === '/' || pathname === '/dashboard'
    }
    return pathname.startsWith(href)
  }

  const handleNavClick = () => {
    selection() // Provide haptic feedback on navigation
  }

  return (
    <nav className="bg-white border-t border-gray-200 safe-area-bottom">
      <div className="flex items-center justify-around h-16 px-2">
        {navigationItems.map((item) => {
          const active = isActive(item.href)
          const IconComponent = active ? item.activeIcon : item.icon
          
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={handleNavClick}
              className={`
                flex flex-col items-center justify-center min-w-0 flex-1 px-2 py-1 rounded-lg
                transition-all duration-200 ease-in-out
                ${active 
                  ? 'text-blue-600 bg-blue-50' 
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50 active:bg-gray-100'
                }
              `}
              aria-label={item.label}
            >
              <div className="relative">
                <IconComponent 
                  className={`
                    w-6 h-6 transition-transform duration-200
                    ${active ? 'scale-110' : 'scale-100'}
                  `} 
                />
                
                {/* Active indicator dot */}
                {active && (
                  <div className="absolute -top-1 -right-1 w-2 h-2 bg-blue-600 rounded-full" />
                )}
              </div>
              
              <span className={`
                text-xs font-medium mt-1 truncate
                ${active ? 'text-blue-600' : 'text-gray-500'}
              `}>
                {item.label}
              </span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}