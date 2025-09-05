// Enhanced service worker for PWA functionality with performance optimizations
const CACHE_VERSION = '2.0.0'
const CACHE_NAME = `aptit-mobile-v${CACHE_VERSION}`
const STATIC_CACHE = `aptit-static-v${CACHE_VERSION}`
const API_CACHE = `aptit-api-v${CACHE_VERSION}`
const IMAGE_CACHE = `aptit-images-v${CACHE_VERSION}`
const FONT_CACHE = `aptit-fonts-v${CACHE_VERSION}`
const RUNTIME_CACHE = `aptit-runtime-v${CACHE_VERSION}`

// Cache configuration
const CACHE_CONFIG = {
  maxEntries: 100,
  maxAgeSeconds: 30 * 24 * 60 * 60, // 30 days
  purgeOnQuotaError: true
}

// Static assets to cache immediately with priority
const CRITICAL_ASSETS = [
  '/',
  '/manifest.json',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
]

const STATIC_ASSETS = [
  ...CRITICAL_ASSETS,
  '/offline',
  '/browserconfig.xml',
]

// Preload assets for better performance
const PRELOAD_ASSETS = [
  '/dashboard',
  '/test',
  '/results',
  '/profile'
]

// API endpoints to cache with network-first strategy
const API_ENDPOINTS = [
  '/api/auth/',
  '/api/tests/',
  '/api/results/',
  '/api/profile/'
]

// Install event - cache static assets with performance optimization
self.addEventListener('install', (event) => {
  console.log('Service Worker: Installing...')
  event.waitUntil(
    Promise.all([
      // Cache critical assets first
      caches.open(STATIC_CACHE).then(async (cache) => {
        console.log('Service Worker: Caching critical assets')
        try {
          // Cache critical assets first
          await cache.addAll(CRITICAL_ASSETS)
          
          // Then cache other static assets
          const remainingAssets = STATIC_ASSETS.filter(asset => !CRITICAL_ASSETS.includes(asset))
          await Promise.allSettled(
            remainingAssets.map(asset => 
              cache.add(asset).catch(err => console.warn(`Failed to cache ${asset}:`, err))
            )
          )
          
          console.log('Service Worker: Static assets cached successfully')
        } catch (error) {
          console.error('Service Worker: Failed to cache assets:', error)
        }
      }),
      
      // Preload important routes
      caches.open(RUNTIME_CACHE).then(async (cache) => {
        console.log('Service Worker: Preloading routes')
        await Promise.allSettled(
          PRELOAD_ASSETS.map(route => 
            fetch(route).then(response => {
              if (response.ok) {
                return cache.put(route, response)
              }
            }).catch(err => console.warn(`Failed to preload ${route}:`, err))
          )
        )
      }),
      
      // Skip waiting to activate immediately
      self.skipWaiting()
    ])
  )
})

// Activate event - clean up old caches and optimize storage
self.addEventListener('activate', (event) => {
  console.log('Service Worker: Activating...')
  event.waitUntil(
    Promise.all([
      // Clean up old caches
      caches.keys().then(async (cacheNames) => {
        const currentCaches = [STATIC_CACHE, API_CACHE, IMAGE_CACHE, FONT_CACHE, RUNTIME_CACHE]
        
        const deletePromises = cacheNames.map((cacheName) => {
          if (!currentCaches.includes(cacheName)) {
            console.log('Service Worker: Deleting old cache:', cacheName)
            return caches.delete(cacheName)
          }
        }).filter(Boolean)
        
        await Promise.all(deletePromises)
        
        // Optimize cache sizes
        await optimizeCaches()
      }),
      
      // Take control of all clients
      self.clients.claim(),
      
      // Initialize performance monitoring
      initializePerformanceTracking()
    ])
  )
})

// Fetch event - implement caching strategies
self.addEventListener('fetch', (event) => {
  const { request } = event
  const url = new URL(request.url)

  // Skip non-GET requests
  if (request.method !== 'GET') {
    return
  }

  // Handle different types of requests with optimized strategies
  if (isStaticAsset(request)) {
    // Cache-first strategy for static assets with compression
    event.respondWith(cacheFirstWithCompression(request, STATIC_CACHE))
  } else if (isAPIRequest(request)) {
    // Network-first strategy for API requests with timeout
    event.respondWith(networkFirstWithTimeout(request, API_CACHE, 3000))
  } else if (isImageRequest(request)) {
    // Cache-first strategy for images with WebP optimization
    event.respondWith(cacheFirstWithImageOptimization(request, IMAGE_CACHE))
  } else if (isFontRequest(request)) {
    // Cache-first strategy for fonts with long TTL
    event.respondWith(cacheFirst(request, FONT_CACHE))
  } else if (isDocumentRequest(request)) {
    // Stale-while-revalidate for pages with offline fallback
    event.respondWith(staleWhileRevalidateWithOffline(request, RUNTIME_CACHE))
  } else {
    // Default network-first for other requests
    event.respondWith(networkFirst(request, RUNTIME_CACHE))
  }
})

// Enhanced background sync for offline actions
self.addEventListener('sync', (event) => {
  console.log('Service Worker: Background sync triggered:', event.tag)
  
  switch (event.tag) {
    case 'test-submission':
      event.waitUntil(syncTestSubmissions())
      break
    case 'profile-update':
      event.waitUntil(syncProfileUpdates())
      break
    case 'result-fetch':
      event.waitUntil(syncResultFetches())
      break
    case 'general-sync':
      event.waitUntil(performGeneralSync())
      break
    default:
      console.log('Unknown sync tag:', event.tag)
  }
})

// Push notifications (for future use)
self.addEventListener('push', (event) => {
  if (event.data) {
    const data = event.data.json()
    const options = {
      body: data.body,
      icon: '/icons/icon-192.png',
      badge: '/icons/icon-72.png',
      vibrate: [200, 100, 200],
      data: data.data || {},
      actions: data.actions || []
    }
    
    event.waitUntil(
      self.registration.showNotification(data.title, options)
    )
  }
})

// Notification click handler
self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  
  event.waitUntil(
    clients.openWindow(event.notification.data.url || '/')
  )
})

// Helper functions for caching strategies

function isStaticAsset(request) {
  return request.url.includes('/_next/static/') ||
         request.url.includes('/manifest.json') ||
         request.url.includes('/icons/') ||
         request.url.match(/\.(css|js|woff|woff2|ttf|eot)$/)
}

function isAPIRequest(request) {
  return request.url.includes('/api/')
}

function isImageRequest(request) {
  return request.url.match(/\.(png|jpg|jpeg|svg|gif|webp|avif)$/)
}

function isFontRequest(request) {
  return request.url.match(/\.(woff|woff2|ttf|eot|otf)$/) ||
         request.url.includes('fonts.googleapis.com') ||
         request.url.includes('fonts.gstatic.com')
}

function isDocumentRequest(request) {
  return request.mode === 'navigate' || 
         (request.method === 'GET' && request.headers.get('accept').includes('text/html'))
}

// Cache-first strategy
async function cacheFirst(request, cacheName) {
  try {
    const cache = await caches.open(cacheName)
    const cachedResponse = await cache.match(request)
    
    if (cachedResponse) {
      return cachedResponse
    }
    
    const networkResponse = await fetch(request)
    if (networkResponse.ok) {
      cache.put(request, networkResponse.clone())
    }
    return networkResponse
  } catch (error) {
    console.error('Cache-first strategy failed:', error)
    return new Response('Offline', { status: 503 })
  }
}

// Network-first strategy
async function networkFirst(request, cacheName) {
  try {
    const networkResponse = await fetch(request)
    if (networkResponse.ok) {
      const cache = await caches.open(cacheName)
      cache.put(request, networkResponse.clone())
    }
    return networkResponse
  } catch (error) {
    console.log('Network failed, trying cache:', error)
    const cache = await caches.open(cacheName)
    const cachedResponse = await cache.match(request)
    
    if (cachedResponse) {
      return cachedResponse
    }
    
    return new Response(JSON.stringify({ 
      error: 'Offline', 
      message: 'This feature requires an internet connection' 
    }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' }
    })
  }
}

// Stale-while-revalidate strategy
async function staleWhileRevalidate(request, cacheName) {
  const cache = await caches.open(cacheName)
  const cachedResponse = await cache.match(request)
  
  const fetchPromise = fetch(request).then((networkResponse) => {
    if (networkResponse.ok) {
      cache.put(request, networkResponse.clone())
    }
    return networkResponse
  }).catch(() => cachedResponse)
  
  return cachedResponse || fetchPromise
}

// Enhanced background sync functions with conflict resolution
async function syncTestSubmissions() {
  try {
    console.log('Syncing test submissions...')
    const pendingSubmissions = await getPendingSubmissions()
    
    let successCount = 0
    let failureCount = 0
    
    for (const submission of pendingSubmissions) {
      try {
        // Check for existing submission to handle conflicts
        const checkResponse = await fetch(`/api/tests/${submission.testId}/submissions/${submission.userId}`, {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' }
        })

        let submissionData = submission.data
        
        if (checkResponse.ok) {
          const serverSubmission = await checkResponse.json()
          console.log('Conflict detected, resolving...')
          
          // Simple conflict resolution: local wins for test submissions
          submissionData = {
            ...submission.data,
            conflictResolution: {
              strategy: 'local-wins',
              resolvedAt: Date.now(),
              originalServerData: serverSubmission
            }
          }
        }

        const response = await fetch('/api/tests/submit', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(submissionData)
        })
        
        if (response.ok) {
          await removePendingSubmission(submission.id)
          successCount++
          console.log(`Successfully synced submission: ${submission.id}`)
        } else {
          failureCount++
          console.error(`Failed to sync submission ${submission.id}: HTTP ${response.status}`)
        }
      } catch (error) {
        failureCount++
        console.error(`Failed to sync submission ${submission.id}:`, error)
      }
    }
    
    console.log(`Test submission sync completed: ${successCount} success, ${failureCount} failures`)
    
    // Notify clients about sync completion
    await notifyClients('sync-completed', {
      type: 'test-submissions',
      success: successCount,
      failures: failureCount
    })
    
  } catch (error) {
    console.error('Test submission sync failed:', error)
  }
}

async function syncProfileUpdates() {
  try {
    console.log('Syncing profile updates...')
    const pendingUpdates = await getPendingProfileUpdates()
    
    let successCount = 0
    let failureCount = 0
    
    for (const update of pendingUpdates) {
      try {
        // Get current server profile for conflict resolution
        const profileResponse = await fetch(`/api/profile/${update.userId}`, {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' }
        })

        let updateData = update.data
        
        if (profileResponse.ok) {
          const serverProfile = await profileResponse.json()
          
          // Smart merge conflict resolution for profile updates
          updateData = mergeProfileData(update.data, serverProfile, update.timestamp)
          console.log('Profile conflict resolved with smart merge')
        }

        const response = await fetch('/api/profile/update', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            ...updateData,
            conflictResolution: {
              strategy: 'smart-merge',
              resolvedAt: Date.now()
            }
          })
        })
        
        if (response.ok) {
          await removePendingProfileUpdate(update.id)
          successCount++
          console.log(`Successfully synced profile update: ${update.id}`)
        } else {
          failureCount++
          console.error(`Failed to sync profile update ${update.id}: HTTP ${response.status}`)
        }
      } catch (error) {
        failureCount++
        console.error(`Failed to sync profile update ${update.id}:`, error)
      }
    }
    
    console.log(`Profile update sync completed: ${successCount} success, ${failureCount} failures`)
    
    await notifyClients('sync-completed', {
      type: 'profile-updates',
      success: successCount,
      failures: failureCount
    })
    
  } catch (error) {
    console.error('Profile update sync failed:', error)
  }
}

// Smart merge function for profile data
function mergeProfileData(localData, serverData, localTimestamp) {
  const merged = { ...serverData }
  
  // Merge non-conflicting fields
  Object.keys(localData).forEach(key => {
    const localValue = localData[key]
    const serverValue = serverData[key]
    
    // If field doesn't exist in server data, use local
    if (!(key in serverData)) {
      merged[key] = localValue
      return
    }
    
    // If values are the same, no conflict
    if (JSON.stringify(localValue) === JSON.stringify(serverValue)) {
      return
    }
    
    // For conflicting fields, prefer newer timestamp
    const serverTimestamp = serverData.updatedAt ? new Date(serverData.updatedAt).getTime() : 0
    if (localTimestamp > serverTimestamp) {
      merged[key] = localValue
    }
  })
  
  return merged
}

// Enhanced sync functions
async function syncResultFetches() {
  try {
    console.log('Syncing result fetches...')
    
    // Refresh cached results with latest server data
    const cacheNames = await caches.keys()
    const apiCache = await caches.open(API_CACHE)
    
    // Clear old result cache entries
    const resultRequests = await apiCache.keys()
    const resultUrls = resultRequests.filter(req => req.url.includes('/api/results'))
    
    await Promise.all(resultUrls.map(req => apiCache.delete(req)))
    
    console.log('Result cache refreshed')
    
    await notifyClients('sync-completed', {
      type: 'result-fetches',
      success: resultUrls.length,
      failures: 0
    })
    
  } catch (error) {
    console.error('Result fetch sync failed:', error)
  }
}

async function performGeneralSync() {
  try {
    console.log('Performing general sync...')
    
    // Sync all pending operations
    await Promise.all([
      syncTestSubmissions(),
      syncProfileUpdates(),
      syncResultFetches()
    ])
    
    console.log('General sync completed')
    
  } catch (error) {
    console.error('General sync failed:', error)
  }
}

// Client notification system
async function notifyClients(type, data) {
  try {
    const clients = await self.clients.matchAll()
    
    clients.forEach(client => {
      client.postMessage({
        type,
        data,
        timestamp: Date.now()
      })
    })
    
    console.log(`Notified ${clients.length} clients about ${type}`)
  } catch (error) {
    console.error('Failed to notify clients:', error)
  }
}

// IndexedDB helpers with actual implementation
async function getPendingSubmissions() {
  try {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open('AptitMobileDB', 1)
      
      request.onsuccess = () => {
        const db = request.result
        const transaction = db.transaction(['testSubmissions'], 'readonly')
        const store = transaction.objectStore('testSubmissions')
        const index = store.index('synced')
        const getRequest = index.getAll(false)
        
        getRequest.onsuccess = () => resolve(getRequest.result || [])
        getRequest.onerror = () => reject(getRequest.error)
      }
      
      request.onerror = () => reject(request.error)
    })
  } catch (error) {
    console.error('Failed to get pending submissions:', error)
    return []
  }
}

async function removePendingSubmission(id) {
  try {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open('AptitMobileDB', 1)
      
      request.onsuccess = () => {
        const db = request.result
        const transaction = db.transaction(['testSubmissions'], 'readwrite')
        const store = transaction.objectStore('testSubmissions')
        
        // Mark as synced instead of deleting
        const getRequest = store.get(id)
        getRequest.onsuccess = () => {
          const submission = getRequest.result
          if (submission) {
            submission.synced = true
            const putRequest = store.put(submission)
            putRequest.onsuccess = () => resolve()
            putRequest.onerror = () => reject(putRequest.error)
          } else {
            resolve()
          }
        }
        getRequest.onerror = () => reject(getRequest.error)
      }
      
      request.onerror = () => reject(request.error)
    })
  } catch (error) {
    console.error('Failed to remove pending submission:', error)
  }
}

async function getPendingProfileUpdates() {
  try {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open('AptitMobileDB', 1)
      
      request.onsuccess = () => {
        const db = request.result
        const transaction = db.transaction(['profileUpdates'], 'readonly')
        const store = transaction.objectStore('profileUpdates')
        const index = store.index('synced')
        const getRequest = index.getAll(false)
        
        getRequest.onsuccess = () => resolve(getRequest.result || [])
        getRequest.onerror = () => reject(getRequest.error)
      }
      
      request.onerror = () => reject(request.error)
    })
  } catch (error) {
    console.error('Failed to get pending profile updates:', error)
    return []
  }
}

async function removePendingProfileUpdate(id) {
  try {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open('AptitMobileDB', 1)
      
      request.onsuccess = () => {
        const db = request.result
        const transaction = db.transaction(['profileUpdates'], 'readwrite')
        const store = transaction.objectStore('profileUpdates')
        
        // Mark as synced instead of deleting
        const getRequest = store.get(id)
        getRequest.onsuccess = () => {
          const update = getRequest.result
          if (update) {
            update.synced = true
            const putRequest = store.put(update)
            putRequest.onsuccess = () => resolve()
            putRequest.onerror = () => reject(putRequest.error)
          } else {
            resolve()
          }
        }
        getRequest.onerror = () => reject(getRequest.error)
      }
      
      request.onerror = () => reject(request.error)
    })
  } catch (error) {
    console.error('Failed to remove pending profile update:', error)
  }
}

// Enhanced caching strategies with performance optimizations

// Cache-first with compression support
async function cacheFirstWithCompression(request, cacheName) {
  try {
    const cache = await caches.open(cacheName)
    const cachedResponse = await cache.match(request)
    
    if (cachedResponse) {
      return cachedResponse
    }
    
    const networkResponse = await fetch(request)
    if (networkResponse.ok) {
      // Clone response for caching
      const responseToCache = networkResponse.clone()
      
      // Add compression headers if supported
      const headers = new Headers(responseToCache.headers)
      if (request.headers.get('accept-encoding')?.includes('gzip')) {
        headers.set('content-encoding', 'gzip')
      }
      
      const compressedResponse = new Response(responseToCache.body, {
        status: responseToCache.status,
        statusText: responseToCache.statusText,
        headers: headers
      })
      
      cache.put(request, compressedResponse)
    }
    return networkResponse
  } catch (error) {
    console.error('Cache-first with compression failed:', error)
    return new Response('Offline', { status: 503 })
  }
}

// Network-first with timeout
async function networkFirstWithTimeout(request, cacheName, timeout = 3000) {
  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), timeout)
    
    const networkResponse = await fetch(request, { 
      signal: controller.signal 
    })
    
    clearTimeout(timeoutId)
    
    if (networkResponse.ok) {
      const cache = await caches.open(cacheName)
      cache.put(request, networkResponse.clone())
    }
    return networkResponse
  } catch (error) {
    console.log('Network failed or timed out, trying cache:', error)
    const cache = await caches.open(cacheName)
    const cachedResponse = await cache.match(request)
    
    if (cachedResponse) {
      return cachedResponse
    }
    
    return new Response(JSON.stringify({ 
      error: 'Offline', 
      message: 'This feature requires an internet connection',
      timestamp: Date.now()
    }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' }
    })
  }
}

// Cache-first with image optimization
async function cacheFirstWithImageOptimization(request, cacheName) {
  try {
    const cache = await caches.open(cacheName)
    const cachedResponse = await cache.match(request)
    
    if (cachedResponse) {
      return cachedResponse
    }
    
    // Try to get WebP version if supported
    const supportsWebP = request.headers.get('accept')?.includes('image/webp')
    let optimizedRequest = request
    
    if (supportsWebP && !request.url.includes('.webp')) {
      const webpUrl = request.url.replace(/\.(jpg|jpeg|png)$/i, '.webp')
      optimizedRequest = new Request(webpUrl, request)
    }
    
    try {
      const networkResponse = await fetch(optimizedRequest)
      if (networkResponse.ok) {
        cache.put(request, networkResponse.clone())
        return networkResponse
      }
    } catch (webpError) {
      // Fallback to original request if WebP fails
      console.log('WebP fallback to original format')
    }
    
    const networkResponse = await fetch(request)
    if (networkResponse.ok) {
      cache.put(request, networkResponse.clone())
    }
    return networkResponse
  } catch (error) {
    console.error('Image optimization failed:', error)
    return new Response('Image not available offline', { status: 503 })
  }
}

// Stale-while-revalidate with offline fallback
async function staleWhileRevalidateWithOffline(request, cacheName) {
  const cache = await caches.open(cacheName)
  const cachedResponse = await cache.match(request)
  
  const fetchPromise = fetch(request).then((networkResponse) => {
    if (networkResponse.ok) {
      cache.put(request, networkResponse.clone())
    }
    return networkResponse
  }).catch(async (error) => {
    console.log('Network failed, checking for offline page')
    
    // Try to serve offline page for navigation requests
    if (request.mode === 'navigate') {
      const offlineResponse = await cache.match('/offline')
      if (offlineResponse) {
        return offlineResponse
      }
    }
    
    return cachedResponse || new Response('Offline', { status: 503 })
  })
  
  return cachedResponse || fetchPromise
}

// Cache optimization functions
async function optimizeCaches() {
  const cacheNames = await caches.keys()
  
  for (const cacheName of cacheNames) {
    const cache = await caches.open(cacheName)
    const requests = await cache.keys()
    
    // Remove expired entries
    const now = Date.now()
    const expiredRequests = []
    
    for (const request of requests) {
      const response = await cache.match(request)
      const cacheDate = response.headers.get('date')
      
      if (cacheDate) {
        const age = now - new Date(cacheDate).getTime()
        if (age > CACHE_CONFIG.maxAgeSeconds * 1000) {
          expiredRequests.push(request)
        }
      }
    }
    
    // Remove expired entries
    await Promise.all(
      expiredRequests.map(request => cache.delete(request))
    )
    
    // Limit cache size
    const remainingRequests = await cache.keys()
    if (remainingRequests.length > CACHE_CONFIG.maxEntries) {
      const excessRequests = remainingRequests.slice(CACHE_CONFIG.maxEntries)
      await Promise.all(
        excessRequests.map(request => cache.delete(request))
      )
    }
  }
}

// Performance tracking
function initializePerformanceTracking() {
  // Track cache hit rates
  self.cacheHitRate = {
    hits: 0,
    misses: 0,
    get rate() {
      const total = this.hits + this.misses
      return total > 0 ? (this.hits / total) * 100 : 0
    }
  }
  
  // Track network performance
  self.networkMetrics = {
    requests: 0,
    failures: 0,
    averageResponseTime: 0,
    totalResponseTime: 0
  }
  
  console.log('Performance tracking initialized')
}

// Quota management
self.addEventListener('quotaexceeded', (event) => {
  console.warn('Storage quota exceeded, cleaning up caches')
  event.waitUntil(
    optimizeCaches().then(() => {
      console.log('Cache cleanup completed')
    })
  )
})

// Performance monitoring message handler
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'GET_PERFORMANCE_METRICS') {
    event.ports[0].postMessage({
      cacheHitRate: self.cacheHitRate?.rate || 0,
      networkMetrics: self.networkMetrics || {},
      cacheSize: getCacheSize()
    })
  }
})

async function getCacheSize() {
  const cacheNames = await caches.keys()
  let totalSize = 0
  
  for (const cacheName of cacheNames) {
    const cache = await caches.open(cacheName)
    const requests = await cache.keys()
    totalSize += requests.length
  }
  
  return totalSize
}