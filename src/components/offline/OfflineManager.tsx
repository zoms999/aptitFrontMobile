'use client'

import { useEffect, useState, useCallback } from 'react'
import { offlineDetector, type NetworkChangeEvent } from '@/lib/offline-detector'
import { backgroundSync } from '@/lib/background-sync'
import { offlineCache, prefetchCriticalData } from '@/lib/offline-cache'
import { conflictResolver } from '@/lib/conflict-resolution'
import { OfflineFeedback, SyncProgress } from './OfflineFeedback'
import { useAuth } from '@/contexts/AuthContext'

interface OfflineManagerProps {
  children: React.ReactNode
  enableAutoSync?: boolean
  enablePrefetch?: boolean
}

export function OfflineManager({ 
  children, 
  enableAutoSync = true, 
  enablePrefetch = true 
}: OfflineManagerProps) {
  
  const { user } = useAuth()
  const [isInitialized, setIsInitialized] = useState(false)
  const [syncStatus, setSyncStatus] = useState<any>(null)
  const [networkState, setNetworkState] = useState(offlineDetector.getNetworkState())

  // Initialize offline functionality
  useEffect(() => {
    const initialize = async () => {
      try {
        console.log('Initializing offline manager...')

        // Check if we're in a browser environment
        if (typeof window === 'undefined') {
          setIsInitialized(true)
          return
        }

        // Set up network change listener
        const unsubscribe = offlineDetector.addListener(handleNetworkChange)

        // Set up service worker message listener
        if ('serviceWorker' in navigator) {
          navigator.serviceWorker.addEventListener('message', handleServiceWorkerMessage)
        }

        // Prefetch critical data if user is logged in and we have good connection
        if (enablePrefetch && user && networkState.isOnline && networkState.connectionQuality !== 'poor') {
          try {
            await prefetchCriticalData(user.id)
          } catch (error) {
            console.warn('Failed to prefetch critical data:', error)
          }
        }

        // Update sync status
        try {
          await updateSyncStatus()
        } catch (error) {
          console.warn('Failed to update sync status:', error)
        }

        setIsInitialized(true)
        console.log('Offline manager initialized successfully')

        return () => {
          unsubscribe()
          if ('serviceWorker' in navigator) {
            navigator.serviceWorker.removeEventListener('message', handleServiceWorkerMessage)
          }
        }
      } catch (error) {
        console.error('Failed to initialize offline manager:', error)
        setIsInitialized(true) // Still mark as initialized to not block the app
      }
    }

    initialize()
  }, [user, enablePrefetch, networkState.isOnline, networkState.connectionQuality])

  // Handle network state changes
  const handleNetworkChange = useCallback(async (event: NetworkChangeEvent) => {
    setNetworkState(event.networkState)

    if (event.type === 'online' && enableAutoSync) {
      console.log('Device came online, triggering sync...')
      
      // Trigger background sync
      try {
        await backgroundSync.performSync()
        await updateSyncStatus()
      } catch (error) {
        console.error('Auto-sync failed:', error)
      }
    }

    // Update sync status on network changes
    await updateSyncStatus()
  }, [enableAutoSync])

  // Handle service worker messages
  const handleServiceWorkerMessage = useCallback(async (event: MessageEvent) => {
    const { type, data } = event.data

    switch (type) {
      case 'sync-completed':
        console.log('Sync completed:', data)
        await updateSyncStatus()
        
        // Show user feedback for successful sync
        if (data.success > 0) {
          showSyncNotification(`${data.success}개 항목이 동기화되었습니다.`)
        }
        break

      case 'sync-failed':
        console.error('Sync failed:', data)
        await updateSyncStatus()
        break

      case 'cache-updated':
        console.log('Cache updated:', data)
        break

      default:
        console.log('Unknown service worker message:', type, data)
    }
  }, [])

  // Update sync status
  const updateSyncStatus = useCallback(async () => {
    try {
      const status = await backgroundSync.getSyncStatus()
      setSyncStatus(status)
    } catch (error) {
      console.error('Failed to update sync status:', error)
    }
  }, [])

  // Show sync notification
  const showSyncNotification = useCallback((message: string) => {
    // This could be enhanced with a proper notification system
    console.log('Sync notification:', message)
    
    // For now, just log. In a real app, you might show a toast or banner
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification('Aptit 동기화', {
        body: message,
        icon: '/icons/icon-192.png',
        badge: '/icons/icon-192.png'
      })
    }
  }, [])

  // Manual sync trigger
  const triggerManualSync = useCallback(async () => {
    if (!networkState.isOnline) {
      console.warn('Cannot sync while offline')
      return
    }

    try {
      console.log('Triggering manual sync...')
      await backgroundSync.forcSync()
      await updateSyncStatus()
      showSyncNotification('수동 동기화가 완료되었습니다.')
    } catch (error) {
      console.error('Manual sync failed:', error)
    }
  }, [networkState.isOnline, showSyncNotification])

  // Clear offline data
  const clearOfflineData = useCallback(async () => {
    try {
      console.log('Clearing offline data...')
      await offlineCache.clear()
      conflictResolver.clearPendingConflicts()
      console.log('Offline data cleared')
    } catch (error) {
      console.error('Failed to clear offline data:', error)
    }
  }, [])

  // Provide offline context to children
  const offlineContext = {
    isInitialized,
    networkState,
    syncStatus,
    triggerManualSync,
    clearOfflineData,
    cacheStats: offlineCache.getStats(),
    pendingConflicts: conflictResolver.getPendingConflicts()
  }

  if (!isInitialized) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">오프라인 기능을 초기화하는 중...</p>
        </div>
      </div>
    )
  }

  return (
    <OfflineContext.Provider value={offlineContext}>
      <div className="relative">
        {/* Offline feedback components */}
        <OfflineFeedback className="fixed top-0 left-0 right-0 z-50" />
        
        {/* Sync progress indicator */}
        {syncStatus?.isActive && (
          <SyncProgress className="fixed top-16 left-4 right-4 z-40" />
        )}

        {/* Main content */}
        {children}
      </div>
    </OfflineContext.Provider>
  )
}

// Offline context for child components
import { createContext, useContext } from 'react'

interface OfflineContextType {
  isInitialized: boolean
  networkState: any
  syncStatus: any
  triggerManualSync: () => Promise<void>
  clearOfflineData: () => Promise<void>
  cacheStats: any
  pendingConflicts: any[]
}

const OfflineContext = createContext<OfflineContextType | null>(null)

export function useOfflineManager() {
  const context = useContext(OfflineContext)
  if (!context) {
    throw new Error('useOfflineManager must be used within OfflineManager')
  }
  return context
}

// Hook for offline-aware data fetching
export function useOfflineData<T>(
  type: string,
  id: string,
  fetcher: () => Promise<T>,
  options: { 
    enabled?: boolean
    refetchOnOnline?: boolean 
  } = {}
) {
  const { networkState } = useOfflineManager()
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const { enabled = true, refetchOnOnline = true } = options

  const fetchData = useCallback(async (forceRefresh = false) => {
    if (!enabled) return

    try {
      setLoading(true)
      setError(null)

      const cachedData = await offlineCache.get(type, id, async () => {
        if (!networkState.isOnline) {
          throw new Error('No network connection')
        }
        return await fetcher()
      })

      if (cachedData || forceRefresh) {
        setData(cachedData)
      }
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Unknown error'))
    } finally {
      setLoading(false)
    }
  }, [type, id, fetcher, enabled, networkState.isOnline])

  // Initial fetch
  useEffect(() => {
    fetchData()
  }, [fetchData])

  // Refetch when coming online
  useEffect(() => {
    if (refetchOnOnline && networkState.isOnline && data) {
      fetchData(true)
    }
  }, [networkState.isOnline, refetchOnOnline, data, fetchData])

  return {
    data,
    loading,
    error,
    refetch: () => fetchData(true),
    isStale: data && !networkState.isOnline
  }
}

// Hook for offline-aware mutations
export function useOfflineMutation<T, P>(
  mutationFn: (params: P) => Promise<T>,
  options: {
    onSuccess?: (data: T) => void
    onError?: (error: Error) => void
    optimisticUpdate?: (params: P) => void
  } = {}
) {
  const { networkState } = useOfflineManager()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const mutate = useCallback(async (params: P) => {
    try {
      setLoading(true)
      setError(null)

      // Apply optimistic update if provided
      if (options.optimisticUpdate) {
        options.optimisticUpdate(params)
      }

      if (networkState.isOnline) {
        // Online: execute mutation immediately
        const result = await mutationFn(params)
        options.onSuccess?.(result)
        return result
      } else {
        // Offline: queue for later sync
        console.log('Queuing mutation for offline sync')
        
        // This would need to be implemented based on the mutation type
        // For now, just throw an error
        throw new Error('Offline mutations not yet implemented for this operation')
      }
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Unknown error')
      setError(error)
      options.onError?.(error)
      throw error
    } finally {
      setLoading(false)
    }
  }, [mutationFn, networkState.isOnline, options])

  return {
    mutate,
    loading,
    error,
    isOffline: !networkState.isOnline
  }
}