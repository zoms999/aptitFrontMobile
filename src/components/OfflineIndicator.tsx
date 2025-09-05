'use client'

import { useOfflineState } from './PWAProvider'
import { WifiOff, Wifi, AlertTriangle } from 'lucide-react'
import { useEffect, useState } from 'react'

interface OfflineIndicatorProps {
  className?: string
  showOnlineStatus?: boolean
}

export function OfflineIndicator({ 
  className = '', 
  showOnlineStatus = false 
}: OfflineIndicatorProps) {
  const { isOnline, isOffline, lastOnline } = useOfflineState()
  const [showIndicator, setShowIndicator] = useState(false)
  const [justCameOnline, setJustCameOnline] = useState(false)

  useEffect(() => {
    if (isOffline) {
      setShowIndicator(true)
      setJustCameOnline(false)
    } else if (showOnlineStatus) {
      // Show online status briefly when coming back online
      setJustCameOnline(true)
      setShowIndicator(true)
      
      const timer = setTimeout(() => {
        setShowIndicator(false)
        setJustCameOnline(false)
      }, 3000)
      
      return () => clearTimeout(timer)
    } else {
      setShowIndicator(false)
    }
  }, [isOnline, isOffline, showOnlineStatus])

  if (!showIndicator) {
    return null
  }

  const getOfflineTime = () => {
    if (!lastOnline || isOnline) return null
    
    const now = new Date()
    const diffMs = now.getTime() - lastOnline.getTime()
    const diffMins = Math.floor(diffMs / (1000 * 60))
    
    if (diffMins < 1) return '방금 전'
    if (diffMins < 60) return `${diffMins}분 전`
    
    const diffHours = Math.floor(diffMins / 60)
    if (diffHours < 24) return `${diffHours}시간 전`
    
    const diffDays = Math.floor(diffHours / 24)
    return `${diffDays}일 전`
  }

  return (
    <div className={`
      fixed top-0 left-0 right-0 z-50 transition-all duration-300
      ${isOffline 
        ? 'bg-red-600 text-white' 
        : 'bg-green-600 text-white'
      }
      ${className}
    `}>
      <div className="px-4 py-2 flex items-center justify-center space-x-2 text-sm">
        {isOffline ? (
          <>
            <WifiOff className="w-4 h-4" />
            <span>오프라인</span>
            <span className="text-red-200">•</span>
            <span className="text-red-200 text-xs">
              일부 기능이 제한됩니다
            </span>
          </>
        ) : justCameOnline ? (
          <>
            <Wifi className="w-4 h-4" />
            <span>온라인 상태로 복구됨</span>
          </>
        ) : null}
      </div>
    </div>
  )
}

// Compact offline badge for use in navigation or status bars
export function OfflineBadge({ className = '' }: { className?: string }) {
  const { isOffline } = useOfflineState()

  if (!isOffline) {
    return null
  }

  return (
    <div className={`
      inline-flex items-center space-x-1 px-2 py-1 text-xs
      bg-red-100 text-red-700 rounded-full border border-red-200
      ${className}
    `}>
      <WifiOff className="w-3 h-3" />
      <span>오프라인</span>
    </div>
  )
}

// Offline warning for forms and critical actions
export function OfflineWarning({ 
  className = '',
  message = '현재 오프라인 상태입니다. 온라인 상태에서 다시 시도해주세요.'
}: { 
  className?: string
  message?: string 
}) {
  const { isOffline } = useOfflineState()

  if (!isOffline) {
    return null
  }

  return (
    <div className={`
      flex items-start space-x-3 p-4 bg-yellow-50 border border-yellow-200 rounded-lg
      ${className}
    `}>
      <AlertTriangle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
      <div>
        <h4 className="text-sm font-medium text-yellow-800">
          인터넷 연결 필요
        </h4>
        <p className="text-sm text-yellow-700 mt-1">
          {message}
        </p>
      </div>
    </div>
  )
}

// Connection status indicator for debugging
export function ConnectionStatus({ className = '' }: { className?: string }) {
  const { isOnline, isOffline, lastOnline } = useOfflineState()
  const [connectionType, setConnectionType] = useState<string>('unknown')

  useEffect(() => {
    // Get connection information if available
    const connection = (navigator as any).connection || 
                      (navigator as any).mozConnection || 
                      (navigator as any).webkitConnection

    if (connection) {
      setConnectionType(connection.effectiveType || connection.type || 'unknown')
      
      const updateConnection = () => {
        setConnectionType(connection.effectiveType || connection.type || 'unknown')
      }
      
      connection.addEventListener('change', updateConnection)
      return () => connection.removeEventListener('change', updateConnection)
    }
  }, [])

  return (
    <div className={`
      text-xs text-gray-500 flex items-center space-x-2
      ${className}
    `}>
      <div className={`
        w-2 h-2 rounded-full
        ${isOnline ? 'bg-green-500' : 'bg-red-500'}
      `} />
      <span>
        {isOnline ? '온라인' : '오프라인'}
        {connectionType !== 'unknown' && isOnline && (
          <span className="ml-1">({connectionType})</span>
        )}
      </span>
      {isOffline && lastOnline && (
        <span className="text-gray-400">
          • 마지막 연결: {new Date(lastOnline).toLocaleTimeString()}
        </span>
      )}
    </div>
  )
}