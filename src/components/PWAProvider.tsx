'use client'

import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { 
  initializePWA, 
  getPWAInstallState, 
  getOfflineState, 
  installPWA,
  isPWASupported,
  requestNotificationPermission,
  type PWAInstallState,
  type OfflineState
} from '@/lib/pwa'

interface PWAContextType {
  // Installation state
  installState: PWAInstallState
  canInstall: boolean
  isInstalled: boolean
  
  // Offline state
  offlineState: OfflineState
  isOnline: boolean
  isOffline: boolean
  
  // Actions
  install: () => Promise<boolean>
  requestNotifications: () => Promise<NotificationPermission>
  
  // Support
  isSupported: boolean
}

const PWAContext = createContext<PWAContextType | null>(null)

interface PWAProviderProps {
  children: ReactNode
}

export function PWAProvider({ children }: PWAProviderProps) {
  const [installState, setInstallState] = useState<PWAInstallState>({
    isInstallable: false,
    isInstalled: false,
    isStandalone: false,
    canInstall: false
  })
  
  const [offlineState, setOfflineState] = useState<OfflineState>({
    isOnline: true,
    isOffline: false,
    lastOnline: null
  })
  
  const [isSupported, setIsSupported] = useState(false)

  useEffect(() => {
    // Check PWA support
    setIsSupported(isPWASupported())
    
    // Initialize PWA functionality
    initializePWA()
    
    // Update initial states
    updateStates()
    
    // Listen for install prompt events
    const handleBeforeInstallPrompt = () => {
      updateStates()
    }
    
    const handleAppInstalled = () => {
      updateStates()
    }
    
    const handleOnline = () => {
      updateStates()
    }
    
    const handleOffline = () => {
      updateStates()
    }
    
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    window.addEventListener('appinstalled', handleAppInstalled)
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    
    // Cleanup
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
      window.removeEventListener('appinstalled', handleAppInstalled)
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  const updateStates = () => {
    setInstallState(getPWAInstallState())
    setOfflineState(getOfflineState())
  }

  const install = async (): Promise<boolean> => {
    const result = await installPWA()
    updateStates()
    return result
  }

  const requestNotifications = async (): Promise<NotificationPermission> => {
    return await requestNotificationPermission()
  }

  const contextValue: PWAContextType = {
    // Installation state
    installState,
    canInstall: installState.canInstall,
    isInstalled: installState.isInstalled,
    
    // Offline state
    offlineState,
    isOnline: offlineState.isOnline,
    isOffline: offlineState.isOffline,
    
    // Actions
    install,
    requestNotifications,
    
    // Support
    isSupported
  }

  return (
    <PWAContext.Provider value={contextValue}>
      {children}
    </PWAContext.Provider>
  )
}

export function usePWA() {
  const context = useContext(PWAContext)
  if (!context) {
    throw new Error('usePWA must be used within a PWAProvider')
  }
  return context
}

// Hook for install prompt
export function useInstallPrompt() {
  const { canInstall, install, isInstalled } = usePWA()
  
  return {
    canInstall,
    install,
    isInstalled,
    showPrompt: canInstall && !isInstalled
  }
}

// Hook for offline state
export function useOfflineState() {
  const { isOnline, isOffline, offlineState } = usePWA()
  
  return {
    isOnline,
    isOffline,
    lastOnline: offlineState.lastOnline
  }
}