/**
 * Enhanced offline detection and network monitoring
 * Provides detailed network state information and connection quality
 */

export interface NetworkState {
  isOnline: boolean
  isOffline: boolean
  connectionType: string
  effectiveType: string
  downlink: number
  rtt: number
  saveData: boolean
  lastOnlineTime: Date | null
  lastOfflineTime: Date | null
  connectionQuality: 'excellent' | 'good' | 'fair' | 'poor' | 'offline'
}

export interface NetworkChangeEvent {
  type: 'online' | 'offline' | 'connection-change'
  networkState: NetworkState
  timestamp: Date
}

type NetworkChangeListener = (event: NetworkChangeEvent) => void

class OfflineDetector {
  private listeners: Set<NetworkChangeListener> = new Set()
  private networkState: NetworkState
  private checkInterval: NodeJS.Timeout | null = null
  private lastCheckTime: Date = new Date()

  constructor() {
    this.networkState = this.getInitialNetworkState()
    this.initialize()
  }

  private getInitialNetworkState(): NetworkState {
    if (typeof window === 'undefined') {
      return {
        isOnline: true,
        isOffline: false,
        connectionType: 'unknown',
        effectiveType: 'unknown',
        downlink: 0,
        rtt: 0,
        saveData: false,
        lastOnlineTime: new Date(),
        lastOfflineTime: null,
        connectionQuality: 'good'
      }
    }

    const connection = this.getConnection()
    const isOnline = navigator.onLine

    return {
      isOnline,
      isOffline: !isOnline,
      connectionType: connection?.type || 'unknown',
      effectiveType: connection?.effectiveType || 'unknown',
      downlink: connection?.downlink || 0,
      rtt: connection?.rtt || 0,
      saveData: connection?.saveData || false,
      lastOnlineTime: isOnline ? new Date() : null,
      lastOfflineTime: !isOnline ? new Date() : null,
      connectionQuality: this.calculateConnectionQuality(connection, isOnline)
    }
  }

  private getConnection(): any {
    return (navigator as any).connection || 
           (navigator as any).mozConnection || 
           (navigator as any).webkitConnection
  }

  private calculateConnectionQuality(connection: any, isOnline: boolean): NetworkState['connectionQuality'] {
    if (!isOnline) return 'offline'
    if (!connection) return 'good'

    const { effectiveType, downlink, rtt } = connection

    // Based on effective connection type
    if (effectiveType === '4g' && downlink > 1.5 && rtt < 150) return 'excellent'
    if (effectiveType === '4g' || (downlink > 0.5 && rtt < 300)) return 'good'
    if (effectiveType === '3g' || (downlink > 0.1 && rtt < 500)) return 'fair'
    
    return 'poor'
  }

  private initialize(): void {
    if (typeof window === 'undefined') return

    // Listen for online/offline events
    window.addEventListener('online', this.handleOnline.bind(this))
    window.addEventListener('offline', this.handleOffline.bind(this))

    // Listen for connection changes
    const connection = this.getConnection()
    if (connection) {
      connection.addEventListener('change', this.handleConnectionChange.bind(this))
    }

    // Start periodic connection quality checks
    this.startPeriodicChecks()
  }

  private handleOnline(): void {
    const previousState = { ...this.networkState }
    this.updateNetworkState()

    if (!previousState.isOnline) {
      this.notifyListeners({
        type: 'online',
        networkState: this.networkState,
        timestamp: new Date()
      })
    }
  }

  private handleOffline(): void {
    const previousState = { ...this.networkState }
    this.updateNetworkState()

    if (previousState.isOnline) {
      this.notifyListeners({
        type: 'offline',
        networkState: this.networkState,
        timestamp: new Date()
      })
    }
  }

  private handleConnectionChange(): void {
    const previousState = { ...this.networkState }
    this.updateNetworkState()

    // Only notify if there's a meaningful change
    if (this.hasSignificantChange(previousState, this.networkState)) {
      this.notifyListeners({
        type: 'connection-change',
        networkState: this.networkState,
        timestamp: new Date()
      })
    }
  }

  private hasSignificantChange(prev: NetworkState, current: NetworkState): boolean {
    return (
      prev.connectionQuality !== current.connectionQuality ||
      prev.effectiveType !== current.effectiveType ||
      Math.abs(prev.downlink - current.downlink) > 0.5 ||
      Math.abs(prev.rtt - current.rtt) > 100
    )
  }

  private updateNetworkState(): void {
    const connection = this.getConnection()
    const isOnline = navigator.onLine
    const now = new Date()

    this.networkState = {
      ...this.networkState,
      isOnline,
      isOffline: !isOnline,
      connectionType: connection?.type || 'unknown',
      effectiveType: connection?.effectiveType || 'unknown',
      downlink: connection?.downlink || 0,
      rtt: connection?.rtt || 0,
      saveData: connection?.saveData || false,
      connectionQuality: this.calculateConnectionQuality(connection, isOnline)
    }

    // Update timestamps
    if (isOnline && !this.networkState.lastOnlineTime) {
      this.networkState.lastOnlineTime = now
    } else if (!isOnline && this.networkState.isOnline) {
      this.networkState.lastOfflineTime = now
    }
  }

  private startPeriodicChecks(): void {
    // Check connection quality every 30 seconds
    this.checkInterval = setInterval(() => {
      this.performConnectionTest()
    }, 30000)
  }

  private async performConnectionTest(): Promise<void> {
    if (!this.networkState.isOnline) return

    const startTime = Date.now()
    
    try {
      // Test with a small request to check actual connectivity
      const response = await fetch('/api/health', {
        method: 'HEAD',
        cache: 'no-cache',
        signal: AbortSignal.timeout(5000)
      })

      const endTime = Date.now()
      const actualRtt = endTime - startTime

      // Update RTT with actual measurement
      const connection = this.getConnection()
      if (connection && Math.abs(actualRtt - this.networkState.rtt) > 100) {
        this.networkState.rtt = actualRtt
        this.networkState.connectionQuality = this.calculateConnectionQuality(connection, true)
        
        this.notifyListeners({
          type: 'connection-change',
          networkState: this.networkState,
          timestamp: new Date()
        })
      }
    } catch (error) {
      // If the test fails but navigator.onLine is true, we might have limited connectivity
      if (this.networkState.isOnline) {
        this.networkState.connectionQuality = 'poor'
        
        this.notifyListeners({
          type: 'connection-change',
          networkState: this.networkState,
          timestamp: new Date()
        })
      }
    }
  }

  private notifyListeners(event: NetworkChangeEvent): void {
    this.listeners.forEach(listener => {
      try {
        listener(event)
      } catch (error) {
        console.error('Error in network change listener:', error)
      }
    })
  }

  // Public API
  public getNetworkState(): NetworkState {
    return { ...this.networkState }
  }

  public addListener(listener: NetworkChangeListener): () => void {
    this.listeners.add(listener)
    
    // Return unsubscribe function
    return () => {
      this.listeners.delete(listener)
    }
  }

  public removeListener(listener: NetworkChangeListener): void {
    this.listeners.delete(listener)
  }

  public async testConnectivity(): Promise<{
    isConnected: boolean
    responseTime: number
    error?: string
  }> {
    const startTime = Date.now()
    
    try {
      const response = await fetch('/api/health', {
        method: 'HEAD',
        cache: 'no-cache',
        signal: AbortSignal.timeout(10000)
      })

      return {
        isConnected: response.ok,
        responseTime: Date.now() - startTime
      }
    } catch (error) {
      return {
        isConnected: false,
        responseTime: Date.now() - startTime,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  public destroy(): void {
    if (this.checkInterval) {
      clearInterval(this.checkInterval)
      this.checkInterval = null
    }

    if (typeof window !== 'undefined') {
      window.removeEventListener('online', this.handleOnline.bind(this))
      window.removeEventListener('offline', this.handleOffline.bind(this))

      const connection = this.getConnection()
      if (connection) {
        connection.removeEventListener('change', this.handleConnectionChange.bind(this))
      }
    }

    this.listeners.clear()
  }
}

// Export singleton instance
export const offlineDetector = new OfflineDetector()

// Utility functions
export function isOnline(): boolean {
  return offlineDetector.getNetworkState().isOnline
}

export function getConnectionQuality(): NetworkState['connectionQuality'] {
  return offlineDetector.getNetworkState().connectionQuality
}

export function shouldUseOfflineMode(): boolean {
  const state = offlineDetector.getNetworkState()
  return state.isOffline || state.connectionQuality === 'poor'
}

export function getOfflineDuration(): number | null {
  const state = offlineDetector.getNetworkState()
  if (state.isOnline || !state.lastOfflineTime) return null
  
  return Date.now() - state.lastOfflineTime.getTime()
}

export function formatConnectionInfo(state: NetworkState): string {
  if (state.isOffline) return '오프라인'
  
  const quality = {
    excellent: '매우 좋음',
    good: '좋음', 
    fair: '보통',
    poor: '나쁨',
    offline: '오프라인'
  }[state.connectionQuality]

  return `${quality} (${state.effectiveType.toUpperCase()})`
}