'use client'

import { useEffect, useState } from 'react'
import { offlineDetector, type NetworkState, type NetworkChangeEvent } from '@/lib/offline-detector'
import { backgroundSync } from '@/lib/background-sync'
import { WifiOff, Wifi, AlertTriangle, CheckCircle, Clock, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface OfflineFeedbackProps {
  className?: string
  showDetails?: boolean
}

export function OfflineFeedback({ className = '', showDetails = false }: OfflineFeedbackProps) {
  const [networkState, setNetworkState] = useState<NetworkState>(offlineDetector.getNetworkState())
  const [syncStatus, setSyncStatus] = useState<any>(null)
  const [showFeedback, setShowFeedback] = useState(false)

  useEffect(() => {
    // Listen for network changes
    const unsubscribe = offlineDetector.addListener((event: NetworkChangeEvent) => {
      setNetworkState(event.networkState)
      
      // Show feedback on network changes
      if (event.type === 'online' || event.type === 'offline') {
        setShowFeedback(true)
        
        // Auto-hide after 5 seconds for online events
        if (event.type === 'online') {
          setTimeout(() => setShowFeedback(false), 5000)
        }
      }
    })

    // Update sync status periodically
    const updateSyncStatus = async () => {
      try {
        const status = await backgroundSync.getSyncStatus()
        setSyncStatus(status)
      } catch (error) {
        console.error('Failed to get sync status:', error)
      }
    }

    updateSyncStatus()
    const syncInterval = setInterval(updateSyncStatus, 10000) // Every 10 seconds

    // Show feedback initially if offline
    if (networkState.isOffline) {
      setShowFeedback(true)
    }

    return () => {
      unsubscribe()
      clearInterval(syncInterval)
    }
  }, [])

  const handleRetrySync = async () => {
    try {
      await backgroundSync.forcSync()
      const status = await backgroundSync.getSyncStatus()
      setSyncStatus(status)
    } catch (error) {
      console.error('Failed to retry sync:', error)
    }
  }

  const getConnectionIcon = () => {
    if (networkState.isOffline) return <WifiOff className="w-5 h-5" />
    
    switch (networkState.connectionQuality) {
      case 'excellent':
      case 'good':
        return <Wifi className="w-5 h-5" />
      case 'fair':
      case 'poor':
        return <AlertTriangle className="w-5 h-5" />
      default:
        return <Wifi className="w-5 h-5" />
    }
  }

  const getConnectionColor = () => {
    if (networkState.isOffline) return 'text-red-600 bg-red-50 border-red-200'
    
    switch (networkState.connectionQuality) {
      case 'excellent':
        return 'text-green-600 bg-green-50 border-green-200'
      case 'good':
        return 'text-blue-600 bg-blue-50 border-blue-200'
      case 'fair':
        return 'text-yellow-600 bg-yellow-50 border-yellow-200'
      case 'poor':
        return 'text-orange-600 bg-orange-50 border-orange-200'
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200'
    }
  }

  const getConnectionMessage = () => {
    if (networkState.isOffline) {
      return '인터넷 연결이 끊어졌습니다. 일부 기능이 제한됩니다.'
    }
    
    switch (networkState.connectionQuality) {
      case 'excellent':
        return '연결 상태가 매우 좋습니다'
      case 'good':
        return '연결 상태가 좋습니다'
      case 'fair':
        return '연결 상태가 보통입니다'
      case 'poor':
        return '연결 상태가 좋지 않습니다. 일부 기능이 느려질 수 있습니다.'
      default:
        return '연결 상태를 확인하는 중...'
    }
  }

  if (!showFeedback && !showDetails) {
    return null
  }

  return (
    <div className={`space-y-3 ${className}`}>
      {/* Main connection status */}
      <div className={`
        flex items-center justify-between p-4 rounded-lg border
        ${getConnectionColor()}
      `}>
        <div className="flex items-center space-x-3">
          {getConnectionIcon()}
          <div>
            <p className="font-medium text-sm">
              {networkState.isOffline ? '오프라인' : '온라인'}
            </p>
            <p className="text-xs opacity-75">
              {getConnectionMessage()}
            </p>
          </div>
        </div>
        
        {networkState.isOffline && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowFeedback(false)}
            className="text-xs"
          >
            닫기
          </Button>
        )}
      </div>

      {/* Detailed information */}
      {showDetails && (
        <div className="bg-white border border-gray-200 rounded-lg p-4 space-y-3">
          <h4 className="font-medium text-sm text-gray-900">연결 정보</h4>
          
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div>
              <span className="text-gray-500">연결 타입:</span>
              <span className="ml-2 font-medium">
                {networkState.effectiveType.toUpperCase()}
              </span>
            </div>
            
            <div>
              <span className="text-gray-500">품질:</span>
              <span className="ml-2 font-medium">
                {networkState.connectionQuality === 'excellent' && '매우 좋음'}
                {networkState.connectionQuality === 'good' && '좋음'}
                {networkState.connectionQuality === 'fair' && '보통'}
                {networkState.connectionQuality === 'poor' && '나쁨'}
                {networkState.connectionQuality === 'offline' && '오프라인'}
              </span>
            </div>
            
            {networkState.downlink > 0 && (
              <div>
                <span className="text-gray-500">속도:</span>
                <span className="ml-2 font-medium">
                  {networkState.downlink.toFixed(1)} Mbps
                </span>
              </div>
            )}
            
            {networkState.rtt > 0 && (
              <div>
                <span className="text-gray-500">지연시간:</span>
                <span className="ml-2 font-medium">
                  {networkState.rtt}ms
                </span>
              </div>
            )}
          </div>

          {/* Sync status */}
          {syncStatus && (
            <div className="border-t border-gray-100 pt-3 mt-3">
              <h5 className="font-medium text-xs text-gray-700 mb-2">동기화 상태</h5>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2 text-xs">
                  {syncStatus.isActive ? (
                    <>
                      <RefreshCw className="w-3 h-3 animate-spin" />
                      <span>동기화 중...</span>
                    </>
                  ) : syncStatus.pendingItems > 0 ? (
                    <>
                      <Clock className="w-3 h-3 text-yellow-500" />
                      <span>{syncStatus.pendingItems}개 항목 대기 중</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-3 h-3 text-green-500" />
                      <span>모든 데이터 동기화됨</span>
                    </>
                  )}
                </div>
                
                {syncStatus.pendingItems > 0 && networkState.isOnline && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleRetrySync}
                    className="text-xs h-6 px-2"
                  >
                    재시도
                  </Button>
                )}
              </div>
              
              {syncStatus.lastSync && (
                <p className="text-xs text-gray-500 mt-1">
                  마지막 동기화: {new Date(syncStatus.lastSync).toLocaleTimeString()}
                </p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// Compact offline status for navigation bars
export function OfflineStatus({ className = '' }: { className?: string }) {
  const [networkState, setNetworkState] = useState<NetworkState>(offlineDetector.getNetworkState())

  useEffect(() => {
    const unsubscribe = offlineDetector.addListener((event: NetworkChangeEvent) => {
      setNetworkState(event.networkState)
    })

    return unsubscribe
  }, [])

  if (networkState.isOnline && networkState.connectionQuality !== 'poor') {
    return null
  }

  return (
    <div className={`
      inline-flex items-center space-x-1 px-2 py-1 text-xs rounded-full
      ${networkState.isOffline 
        ? 'bg-red-100 text-red-700 border border-red-200' 
        : 'bg-yellow-100 text-yellow-700 border border-yellow-200'
      }
      ${className}
    `}>
      {networkState.isOffline ? (
        <WifiOff className="w-3 h-3" />
      ) : (
        <AlertTriangle className="w-3 h-3" />
      )}
      <span>
        {networkState.isOffline ? '오프라인' : '연결 불안정'}
      </span>
    </div>
  )
}

// Sync progress indicator
export function SyncProgress({ className = '' }: { className?: string }) {
  const [syncStatus, setSyncStatus] = useState<any>(null)

  useEffect(() => {
    const updateSyncStatus = async () => {
      try {
        const status = await backgroundSync.getSyncStatus()
        setSyncStatus(status)
      } catch (error) {
        console.error('Failed to get sync status:', error)
      }
    }

    updateSyncStatus()
    const interval = setInterval(updateSyncStatus, 5000)

    return () => clearInterval(interval)
  }, [])

  if (!syncStatus || (!syncStatus.isActive && syncStatus.pendingItems === 0)) {
    return null
  }

  return (
    <div className={`
      flex items-center space-x-2 px-3 py-2 bg-blue-50 border border-blue-200 rounded-lg text-sm
      ${className}
    `}>
      <RefreshCw className={`w-4 h-4 text-blue-600 ${syncStatus.isActive ? 'animate-spin' : ''}`} />
      <span className="text-blue-700">
        {syncStatus.isActive 
          ? '동기화 중...' 
          : `${syncStatus.pendingItems}개 항목 동기화 대기`
        }
      </span>
    </div>
  )
}