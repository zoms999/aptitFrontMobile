/**
 * PWA utility functions for installation prompts, offline detection, and service worker management
 */

// Types for PWA functionality
export interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[]
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed'
    platform: string
  }>
  prompt(): Promise<void>
}

export interface PWAInstallState {
  isInstallable: boolean
  isInstalled: boolean
  isStandalone: boolean
  canInstall: boolean
}

export interface OfflineState {
  isOnline: boolean
  isOffline: boolean
  lastOnline: Date | null
}

// Global variables for PWA state
let deferredPrompt: BeforeInstallPromptEvent | null = null
let installPromptShown = false

/**
 * Initialize PWA functionality
 */
export function initializePWA(): void {
  if (typeof window === 'undefined') return

  // Register service worker
  registerServiceWorker()

  // Listen for install prompt
  setupInstallPrompt()

  // Setup offline detection
  setupOfflineDetection()

  // Setup standalone mode detection
  setupStandaloneMode()
}

/**
 * Register service worker
 */
export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    console.log('Service Worker not supported')
    return null
  }

  try {
    const registration = await navigator.serviceWorker.register('/sw.js', {
      scope: '/',
    })

    console.log('Service Worker registered successfully:', registration)

    // Listen for updates
    registration.addEventListener('updatefound', () => {
      const newWorker = registration.installing
      if (newWorker) {
        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            // New service worker is available
            showUpdateAvailableNotification()
          }
        })
      }
    })

    return registration
  } catch (error) {
    console.error('Service Worker registration failed:', error)
    return null
  }
}

/**
 * Setup install prompt handling
 */
function setupInstallPrompt(): void {
  window.addEventListener('beforeinstallprompt', (e: Event) => {
    e.preventDefault()
    deferredPrompt = e as BeforeInstallPromptEvent
    
    // Show install button or banner
    showInstallPrompt()
  })

  // Listen for app installed event
  window.addEventListener('appinstalled', () => {
    console.log('PWA was installed')
    deferredPrompt = null
    hideInstallPrompt()
    
    // Track installation
    trackPWAInstallation()
  })
}

/**
 * Show PWA install prompt
 */
export function showInstallPrompt(): void {
  if (installPromptShown || !deferredPrompt) return

  installPromptShown = true
  
  // Create install banner
  const banner = createInstallBanner()
  document.body.appendChild(banner)
}

/**
 * Hide PWA install prompt
 */
export function hideInstallPrompt(): void {
  const banner = document.getElementById('pwa-install-banner')
  if (banner) {
    banner.remove()
  }
  installPromptShown = false
}

/**
 * Trigger PWA installation
 */
export async function installPWA(): Promise<boolean> {
  if (!deferredPrompt) {
    console.log('No install prompt available')
    return false
  }

  try {
    await deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice
    
    console.log(`User ${outcome} the install prompt`)
    
    deferredPrompt = null
    hideInstallPrompt()
    
    return outcome === 'accepted'
  } catch (error) {
    console.error('Error during PWA installation:', error)
    return false
  }
}

/**
 * Create install banner element
 */
function createInstallBanner(): HTMLElement {
  const banner = document.createElement('div')
  banner.id = 'pwa-install-banner'
  banner.className = `
    fixed bottom-4 left-4 right-4 bg-blue-600 text-white p-4 rounded-lg shadow-lg z-50
    flex items-center justify-between animate-slide-up
  `
  
  banner.innerHTML = `
    <div class="flex items-center space-x-3">
      <div class="w-8 h-8 bg-white rounded-lg flex items-center justify-center">
        <svg class="w-5 h-5 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
          <path d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zM3 10a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1v-6zM14 9a1 1 0 00-1 1v6a1 1 0 001 1h2a1 1 0 001-1v-6a1 1 0 00-1-1h-2z"/>
        </svg>
      </div>
      <div>
        <div class="font-semibold">앱 설치</div>
        <div class="text-sm opacity-90">홈 화면에 Aptit을 추가하세요</div>
      </div>
    </div>
    <div class="flex space-x-2">
      <button id="pwa-install-btn" class="bg-white text-blue-600 px-4 py-2 rounded font-medium text-sm">
        설치
      </button>
      <button id="pwa-dismiss-btn" class="text-white opacity-75 hover:opacity-100">
        <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
          <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd"/>
        </svg>
      </button>
    </div>
  `
  
  // Add event listeners
  const installBtn = banner.querySelector('#pwa-install-btn')
  const dismissBtn = banner.querySelector('#pwa-dismiss-btn')
  
  installBtn?.addEventListener('click', installPWA)
  dismissBtn?.addEventListener('click', hideInstallPrompt)
  
  return banner
}

/**
 * Check PWA installation state
 */
export function getPWAInstallState(): PWAInstallState {
  const isStandalone = window.matchMedia('(display-mode: standalone)').matches ||
                      (window.navigator as any).standalone === true

  const isInstalled = isStandalone || 
                     document.referrer.includes('android-app://') ||
                     window.location.search.includes('utm_source=pwa')

  return {
    isInstallable: !!deferredPrompt,
    isInstalled,
    isStandalone,
    canInstall: !!deferredPrompt && !isInstalled
  }
}

/**
 * Setup offline detection
 */
function setupOfflineDetection(): void {
  window.addEventListener('online', handleOnline)
  window.addEventListener('offline', handleOffline)
  
  // Initial state
  updateOfflineState()
}

/**
 * Handle online event
 */
function handleOnline(): void {
  console.log('App is online')
  updateOfflineState()
  showOnlineNotification()
  
  // Trigger background sync
  if ('serviceWorker' in navigator && 'sync' in window.ServiceWorkerRegistration.prototype) {
    navigator.serviceWorker.ready.then((registration) => {
      registration.sync.register('background-sync')
    })
  }
}

/**
 * Handle offline event
 */
function handleOffline(): void {
  console.log('App is offline')
  updateOfflineState()
  showOfflineNotification()
}

/**
 * Get current offline state
 */
export function getOfflineState(): OfflineState {
  return {
    isOnline: navigator.onLine,
    isOffline: !navigator.onLine,
    lastOnline: navigator.onLine ? new Date() : null
  }
}

/**
 * Update offline state in UI
 */
function updateOfflineState(): void {
  const offlineIndicator = document.getElementById('offline-indicator')
  
  if (!navigator.onLine) {
    if (!offlineIndicator) {
      createOfflineIndicator()
    }
  } else {
    if (offlineIndicator) {
      offlineIndicator.remove()
    }
  }
}

/**
 * Create offline indicator
 */
function createOfflineIndicator(): void {
  const indicator = document.createElement('div')
  indicator.id = 'offline-indicator'
  indicator.className = `
    fixed top-0 left-0 right-0 bg-red-600 text-white text-center py-2 text-sm z-50
    animate-slide-down
  `
  indicator.textContent = '오프라인 모드 - 일부 기능이 제한될 수 있습니다'
  
  document.body.appendChild(indicator)
}

/**
 * Show online notification
 */
function showOnlineNotification(): void {
  showToast('인터넷에 연결되었습니다', 'success')
}

/**
 * Show offline notification
 */
function showOfflineNotification(): void {
  showToast('인터넷 연결이 끊어졌습니다', 'warning')
}

/**
 * Setup standalone mode detection
 */
function setupStandaloneMode(): void {
  const isStandalone = window.matchMedia('(display-mode: standalone)').matches
  
  if (isStandalone) {
    document.body.classList.add('standalone-mode')
    
    // Add status bar padding for iOS
    if (isIOS()) {
      document.body.classList.add('ios-standalone')
    }
  }
}

/**
 * Detect iOS device
 */
function isIOS(): boolean {
  return /iPad|iPhone|iPod/.test(navigator.userAgent)
}

/**
 * Show update available notification
 */
function showUpdateAvailableNotification(): void {
  const notification = document.createElement('div')
  notification.className = `
    fixed bottom-4 left-4 right-4 bg-green-600 text-white p-4 rounded-lg shadow-lg z-50
    flex items-center justify-between
  `
  
  notification.innerHTML = `
    <div>
      <div class="font-semibold">업데이트 사용 가능</div>
      <div class="text-sm opacity-90">새로운 버전이 준비되었습니다</div>
    </div>
    <button id="update-btn" class="bg-white text-green-600 px-4 py-2 rounded font-medium text-sm">
      업데이트
    </button>
  `
  
  const updateBtn = notification.querySelector('#update-btn')
  updateBtn?.addEventListener('click', () => {
    window.location.reload()
  })
  
  document.body.appendChild(notification)
  
  // Auto remove after 10 seconds
  setTimeout(() => {
    notification.remove()
  }, 10000)
}

/**
 * Show toast notification
 */
function showToast(message: string, type: 'success' | 'error' | 'warning' | 'info' = 'info'): void {
  const toast = document.createElement('div')
  const bgColor = {
    success: 'bg-green-600',
    error: 'bg-red-600',
    warning: 'bg-yellow-600',
    info: 'bg-blue-600'
  }[type]
  
  toast.className = `
    fixed top-4 left-4 right-4 ${bgColor} text-white p-3 rounded-lg shadow-lg z-50
    animate-slide-down
  `
  toast.textContent = message
  
  document.body.appendChild(toast)
  
  // Auto remove after 3 seconds
  setTimeout(() => {
    toast.classList.add('animate-slide-up')
    setTimeout(() => toast.remove(), 300)
  }, 3000)
}

/**
 * Track PWA installation for analytics
 */
function trackPWAInstallation(): void {
  // Track installation event
  if (typeof gtag !== 'undefined') {
    gtag('event', 'pwa_install', {
      event_category: 'PWA',
      event_label: 'Installation'
    })
  }
  
  // Store installation state
  localStorage.setItem('pwa_installed', 'true')
  localStorage.setItem('pwa_install_date', new Date().toISOString())
}

/**
 * Check if PWA features are supported
 */
export function isPWASupported(): boolean {
  return 'serviceWorker' in navigator && 'PushManager' in window
}

/**
 * Request notification permission
 */
export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!('Notification' in window)) {
    return 'denied'
  }
  
  if (Notification.permission === 'granted') {
    return 'granted'
  }
  
  if (Notification.permission !== 'denied') {
    const permission = await Notification.requestPermission()
    return permission
  }
  
  return Notification.permission
}

/**
 * Show local notification
 */
export function showNotification(title: string, options?: NotificationOptions): void {
  if (Notification.permission === 'granted') {
    new Notification(title, {
      icon: '/icons/icon-192.png',
      badge: '/icons/icon-192.png',
      ...options
    })
  }
}