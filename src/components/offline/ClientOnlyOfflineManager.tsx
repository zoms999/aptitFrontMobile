'use client'

import dynamic from 'next/dynamic'
import { ReactNode } from 'react'

// Dynamically import OfflineManager with no SSR
const OfflineManager = dynamic(
  () => import('./OfflineManager').then(mod => ({ default: mod.OfflineManager })),
  {
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">앱을 초기화하는 중...</p>
        </div>
      </div>
    )
  }
)

interface ClientOnlyOfflineManagerProps {
  children: ReactNode
  enableAutoSync?: boolean
  enablePrefetch?: boolean
}

export function ClientOnlyOfflineManager({ 
  children, 
  enableAutoSync = true, 
  enablePrefetch = true 
}: ClientOnlyOfflineManagerProps) {
  return (
    <OfflineManager enableAutoSync={enableAutoSync} enablePrefetch={enablePrefetch}>
      {children}
    </OfflineManager>
  )
}