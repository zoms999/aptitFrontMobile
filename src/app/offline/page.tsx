'use client'

import { useEffect, useState } from 'react'
import { WifiOff, RefreshCw, Home, Clock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useRouter } from 'next/navigation'
import { offlineDetector } from '@/lib/offline-detector'
import { offlineCache } from '@/lib/offline-cache'

export default function OfflinePage() {
  const router = useRouter()
  const [isOnline, setIsOnline] = useState(false)
  const [lastOnlineTime, setLastOnlineTime] = useState<Date | null>(null)
  const [cacheStats, setCacheStats] = useState<any>(null)
  const [retryCount, setRetryCount] = useState(0)

  useEffect(() => {
    // Check initial online status
    const networkState = offlineDetector.getNetworkState()
    setIsOnline(networkState.isOnline)
    setLastOnlineTime(networkState.lastOnlineTime)

    // Listen for network changes
    const unsubscribe = offlineDetector.addListener((event) => {
      setIsOnline(event.networkState.isOnline)
      
      if (event.type === 'online') {
        // Redirect to home when back online
        setTimeout(() => {
          router.push('/')
        }, 1000)
      }
    })

    // Get cache statistics
    const stats = offlineCache.getStats()
    setCacheStats(stats)

    return unsubscribe
  }, [router])

  const handleRetry = async () => {
    setRetryCount(prev => prev + 1)
    
    try {
      const connectivity = await offlineDetector.testConnectivity()
      
      if (connectivity.isConnected) {
        router.push('/')
      } else {
        // Still offline, show feedback
        console.log('Still offline, connectivity test failed')
      }
    } catch (error) {
      console.error('Connectivity test failed:', error)
    }
  }

  const handleGoHome = () => {
    router.push('/')
  }

  const formatLastOnlineTime = () => {
    if (!lastOnlineTime) return '알 수 없음'
    
    const now = new Date()
    const diffMs = now.getTime() - lastOnlineTime.getTime()
    const diffMins = Math.floor(diffMs / (1000 * 60))
    
    if (diffMins < 1) return '방금 전'
    if (diffMins < 60) return `${diffMins}분 전`
    
    const diffHours = Math.floor(diffMins / 60)
    if (diffHours < 24) return `${diffHours}시간 전`
    
    const diffDays = Math.floor(diffHours / 24)
    return `${diffDays}일 전`
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-6 text-center">
        {/* Offline icon */}
        <div className="mb-6">
          <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <WifiOff className="w-10 h-10 text-red-600" />
          </div>
          
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            인터넷 연결 없음
          </h1>
          
          <p className="text-gray-600">
            인터넷 연결을 확인하고 다시 시도해주세요.
          </p>
        </div>

        {/* Connection info */}
        <div className="bg-gray-50 rounded-lg p-4 mb-6 text-left">
          <h3 className="font-medium text-gray-900 mb-3">연결 정보</h3>
          
          <div className="space-y-2 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-gray-500">상태:</span>
              <span className={`font-medium ${isOnline ? 'text-green-600' : 'text-red-600'}`}>
                {isOnline ? '온라인' : '오프라인'}
              </span>
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-gray-500">마지막 연결:</span>
              <span className="font-medium text-gray-700">
                {formatLastOnlineTime()}
              </span>
            </div>
            
            {cacheStats && (
              <div className="flex items-center justify-between">
                <span className="text-gray-500">캐시된 데이터:</span>
                <span className="font-medium text-gray-700">
                  {cacheStats.memoryEntries}개 항목
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Action buttons */}
        <div className="space-y-3">
          <Button
            onClick={handleRetry}
            className="w-full"
            disabled={retryCount > 3}
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            {retryCount > 3 ? '재시도 제한 초과' : '다시 시도'}
          </Button>
          
          <Button
            onClick={handleGoHome}
            variant="outline"
            className="w-full"
          >
            <Home className="w-4 h-4 mr-2" />
            홈으로 이동 (오프라인 모드)
          </Button>
        </div>

        {/* Offline features info */}
        <div className="mt-6 p-4 bg-blue-50 rounded-lg">
          <div className="flex items-start space-x-3">
            <Clock className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="text-left">
              <h4 className="font-medium text-blue-900 text-sm">
                오프라인에서도 사용 가능
              </h4>
              <p className="text-blue-700 text-xs mt-1">
                캐시된 데이터로 일부 기능을 계속 사용할 수 있습니다. 
                연결이 복구되면 자동으로 동기화됩니다.
              </p>
            </div>
          </div>
        </div>

        {/* Tips */}
        <div className="mt-6 text-xs text-gray-500 text-left">
          <h4 className="font-medium mb-2">연결 문제 해결 방법:</h4>
          <ul className="space-y-1 list-disc list-inside">
            <li>Wi-Fi 또는 모바일 데이터 연결 확인</li>
            <li>비행기 모드가 꺼져 있는지 확인</li>
            <li>네트워크 설정 재시작</li>
            <li>다른 앱에서 인터넷이 작동하는지 확인</li>
          </ul>
        </div>
      </div>
    </div>
  )
}