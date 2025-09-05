/**
 * Enhanced offline data caching system
 * Provides intelligent caching strategies for different data types
 */

import { offlineStorage, type CachedTest, type CachedResult } from './offline-storage'
import { offlineDetector } from './offline-detector'

export interface CacheConfig {
  maxAge: number // milliseconds
  maxEntries: number
  strategy: 'cache-first' | 'network-first' | 'stale-while-revalidate'
  priority: 'high' | 'medium' | 'low'
}

export interface CacheEntry<T = any> {
  id: string
  data: T
  timestamp: number
  expiresAt: number
  priority: CacheConfig['priority']
  accessCount: number
  lastAccessed: number
}

// Cache configurations for different data types
const CACHE_CONFIGS: Record<string, CacheConfig> = {
  'tests': {
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
    maxEntries: 50,
    strategy: 'stale-while-revalidate',
    priority: 'high'
  },
  'test-questions': {
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    maxEntries: 100,
    strategy: 'cache-first',
    priority: 'high'
  },
  'results': {
    maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
    maxEntries: 200,
    strategy: 'network-first',
    priority: 'medium'
  },
  'user-profile': {
    maxAge: 60 * 60 * 1000, // 1 hour
    maxEntries: 1,
    strategy: 'stale-while-revalidate',
    priority: 'high'
  },
  'analytics': {
    maxAge: 6 * 60 * 60 * 1000, // 6 hours
    maxEntries: 10,
    strategy: 'network-first',
    priority: 'low'
  }
}

class OfflineCache {
  private memoryCache: Map<string, CacheEntry> = new Map()
  private cacheStats = {
    hits: 0,
    misses: 0,
    evictions: 0
  }

  constructor() {
    this.initializeCache()
  }

  private initializeCache(): void {
    // Load frequently accessed items into memory cache on startup
    this.preloadCriticalData()
    
    // Set up periodic cleanup
    setInterval(() => {
      this.cleanup()
    }, 5 * 60 * 1000) // Every 5 minutes
  }

  private async preloadCriticalData(): Promise<void> {
    try {
      // Preload user profile if available
      const userProfile = await this.get('user-profile', 'current-user')
      if (userProfile) {
        console.log('Preloaded user profile into memory cache')
      }

      // Preload recent test data
      const recentTests = await this.getMultiple('tests', { limit: 5 })
      console.log(`Preloaded ${recentTests.length} recent tests into memory cache`)
    } catch (error) {
      console.warn('Failed to preload critical data:', error)
    }
  }

  /**
   * Get data from cache with fallback to network
   */
  public async get<T>(
    type: string, 
    id: string, 
    networkFallback?: () => Promise<T>
  ): Promise<T | null> {
    
    const config = CACHE_CONFIGS[type] || CACHE_CONFIGS['tests']
    const cacheKey = `${type}:${id}`

    try {
      // Check memory cache first
      const memoryEntry = this.memoryCache.get(cacheKey)
      if (memoryEntry && !this.isExpired(memoryEntry)) {
        this.updateAccessStats(memoryEntry)
        this.cacheStats.hits++
        return memoryEntry.data as T
      }

      // Check persistent cache
      const persistentEntry = await this.getPersistentEntry<T>(type, id)
      if (persistentEntry && !this.isExpired(persistentEntry)) {
        // Move to memory cache for faster access
        this.setMemoryCache(cacheKey, persistentEntry)
        this.cacheStats.hits++
        return persistentEntry.data
      }

      this.cacheStats.misses++

      // Handle cache miss based on strategy
      switch (config.strategy) {
        case 'cache-first':
          // Return stale data if available, otherwise try network
          if (persistentEntry) {
            console.log(`Returning stale data for ${cacheKey}`)
            return persistentEntry.data
          }
          break

        case 'network-first':
        case 'stale-while-revalidate':
          // Try network first, fall back to stale data
          if (networkFallback && offlineDetector.getNetworkState().isOnline) {
            try {
              const networkData = await networkFallback()
              await this.set(type, id, networkData)
              return networkData
            } catch (networkError) {
              console.warn(`Network fallback failed for ${cacheKey}:`, networkError)
              
              // Return stale data if available
              if (persistentEntry) {
                console.log(`Returning stale data after network failure for ${cacheKey}`)
                return persistentEntry.data
              }
            }
          }
          break
      }

      return null
    } catch (error) {
      console.error(`Cache get failed for ${cacheKey}:`, error)
      return null
    }
  }

  /**
   * Set data in cache
   */
  public async set<T>(type: string, id: string, data: T): Promise<void> {
    const config = CACHE_CONFIGS[type] || CACHE_CONFIGS['tests']
    const cacheKey = `${type}:${id}`
    const now = Date.now()

    const entry: CacheEntry<T> = {
      id: cacheKey,
      data,
      timestamp: now,
      expiresAt: now + config.maxAge,
      priority: config.priority,
      accessCount: 1,
      lastAccessed: now
    }

    try {
      // Set in memory cache
      this.setMemoryCache(cacheKey, entry)

      // Set in persistent cache
      await this.setPersistentEntry(type, id, entry)

      console.log(`Cached ${cacheKey} with expiry ${new Date(entry.expiresAt).toLocaleString()}`)
    } catch (error) {
      console.error(`Failed to cache ${cacheKey}:`, error)
    }
  }

  /**
   * Get multiple entries with filtering and pagination
   */
  public async getMultiple<T>(
    type: string, 
    options: {
      limit?: number
      offset?: number
      filter?: (entry: CacheEntry<T>) => boolean
    } = {}
  ): Promise<T[]> {
    
    const { limit = 10, offset = 0, filter } = options
    
    try {
      const entries = await this.getAllPersistentEntries<T>(type)
      
      let filteredEntries = entries.filter(entry => !this.isExpired(entry))
      
      if (filter) {
        filteredEntries = filteredEntries.filter(filter)
      }

      // Sort by last accessed (most recent first)
      filteredEntries.sort((a, b) => b.lastAccessed - a.lastAccessed)

      return filteredEntries
        .slice(offset, offset + limit)
        .map(entry => entry.data)
    } catch (error) {
      console.error(`Failed to get multiple entries for ${type}:`, error)
      return []
    }
  }

  /**
   * Remove entry from cache
   */
  public async remove(type: string, id: string): Promise<void> {
    const cacheKey = `${type}:${id}`
    
    try {
      // Remove from memory cache
      this.memoryCache.delete(cacheKey)

      // Remove from persistent cache
      await this.removePersistentEntry(type, id)
      
      console.log(`Removed ${cacheKey} from cache`)
    } catch (error) {
      console.error(`Failed to remove ${cacheKey}:`, error)
    }
  }

  /**
   * Clear all cache data for a type
   */
  public async clear(type?: string): Promise<void> {
    try {
      if (type) {
        // Clear specific type
        const keysToDelete = Array.from(this.memoryCache.keys())
          .filter(key => key.startsWith(`${type}:`))
        
        keysToDelete.forEach(key => this.memoryCache.delete(key))
        await this.clearPersistentType(type)
        
        console.log(`Cleared cache for type: ${type}`)
      } else {
        // Clear all cache
        this.memoryCache.clear()
        await offlineStorage.clearAllData()
        
        console.log('Cleared all cache data')
      }
    } catch (error) {
      console.error('Failed to clear cache:', error)
    }
  }

  /**
   * Get cache statistics
   */
  public getStats(): {
    memoryEntries: number
    hitRate: number
    totalHits: number
    totalMisses: number
    evictions: number
  } {
    const total = this.cacheStats.hits + this.cacheStats.misses
    
    return {
      memoryEntries: this.memoryCache.size,
      hitRate: total > 0 ? (this.cacheStats.hits / total) * 100 : 0,
      totalHits: this.cacheStats.hits,
      totalMisses: this.cacheStats.misses,
      evictions: this.cacheStats.evictions
    }
  }

  /**
   * Prefetch data for offline use
   */
  public async prefetch(type: string, ids: string[], fetcher: (id: string) => Promise<any>): Promise<void> {
    const networkState = offlineDetector.getNetworkState()
    
    // Only prefetch if we have a good connection
    if (!networkState.isOnline || networkState.connectionQuality === 'poor') {
      console.log('Skipping prefetch due to poor connection')
      return
    }

    console.log(`Prefetching ${ids.length} items of type ${type}`)
    
    const prefetchPromises = ids.map(async (id) => {
      try {
        // Check if already cached and not expired
        const existing = await this.get(type, id)
        if (existing) {
          return // Already cached
        }

        // Fetch and cache
        const data = await fetcher(id)
        await this.set(type, id, data)
        
        console.log(`Prefetched ${type}:${id}`)
      } catch (error) {
        console.warn(`Failed to prefetch ${type}:${id}:`, error)
      }
    })

    await Promise.allSettled(prefetchPromises)
  }

  // Private helper methods

  private isExpired(entry: CacheEntry): boolean {
    return Date.now() > entry.expiresAt
  }

  private updateAccessStats(entry: CacheEntry): void {
    entry.accessCount++
    entry.lastAccessed = Date.now()
  }

  private setMemoryCache(key: string, entry: CacheEntry): void {
    // Implement LRU eviction if memory cache is full
    const maxMemoryEntries = 100
    
    if (this.memoryCache.size >= maxMemoryEntries) {
      this.evictLeastRecentlyUsed()
    }

    this.memoryCache.set(key, entry)
  }

  private evictLeastRecentlyUsed(): void {
    let oldestKey = ''
    let oldestTime = Date.now()

    for (const [key, entry] of this.memoryCache.entries()) {
      if (entry.lastAccessed < oldestTime) {
        oldestTime = entry.lastAccessed
        oldestKey = key
      }
    }

    if (oldestKey) {
      this.memoryCache.delete(oldestKey)
      this.cacheStats.evictions++
      console.log(`Evicted ${oldestKey} from memory cache`)
    }
  }

  private async getPersistentEntry<T>(type: string, id: string): Promise<CacheEntry<T> | null> {
    try {
      switch (type) {
        case 'tests':
        case 'test-questions':
          const cachedTest = await offlineStorage.getCachedTest(id)
          if (cachedTest) {
            return {
              id: `${type}:${id}`,
              data: cachedTest.data,
              timestamp: cachedTest.timestamp,
              expiresAt: cachedTest.expiresAt,
              priority: 'high',
              accessCount: 1,
              lastAccessed: Date.now()
            }
          }
          break

        case 'results':
          const cachedResults = await offlineStorage.getCachedResults(id)
          if (cachedResults.length > 0) {
            return {
              id: `${type}:${id}`,
              data: cachedResults,
              timestamp: cachedResults[0].timestamp,
              expiresAt: Date.now() + CACHE_CONFIGS[type].maxAge,
              priority: 'medium',
              accessCount: 1,
              lastAccessed: Date.now()
            }
          }
          break

        case 'user-profile':
          const preferences = await offlineStorage.getUserPreferences(id)
          if (preferences) {
            return {
              id: `${type}:${id}`,
              data: preferences,
              timestamp: Date.now(),
              expiresAt: Date.now() + CACHE_CONFIGS[type].maxAge,
              priority: 'high',
              accessCount: 1,
              lastAccessed: Date.now()
            }
          }
          break
      }

      return null
    } catch (error) {
      console.error(`Failed to get persistent entry ${type}:${id}:`, error)
      return null
    }
  }

  private async setPersistentEntry<T>(type: string, id: string, entry: CacheEntry<T>): Promise<void> {
    try {
      switch (type) {
        case 'tests':
        case 'test-questions':
          await offlineStorage.cacheTest({
            id,
            data: entry.data,
            timestamp: entry.timestamp,
            expiresAt: entry.expiresAt
          })
          break

        case 'results':
          await offlineStorage.cacheResult({
            id,
            userId: 'current-user', // This should be the actual user ID
            data: entry.data,
            timestamp: entry.timestamp
          })
          break

        case 'user-profile':
          await offlineStorage.saveUserPreferences(id, entry.data)
          break
      }
    } catch (error) {
      console.error(`Failed to set persistent entry ${type}:${id}:`, error)
    }
  }

  private async getAllPersistentEntries<T>(type: string): Promise<CacheEntry<T>[]> {
    // This would need to be implemented based on the specific storage type
    // For now, return empty array
    return []
  }

  private async removePersistentEntry(type: string, id: string): Promise<void> {
    try {
      switch (type) {
        case 'tests':
        case 'test-questions':
          await offlineStorage.deleteCachedTest(id)
          break
        // Add other types as needed
      }
    } catch (error) {
      console.error(`Failed to remove persistent entry ${type}:${id}:`, error)
    }
  }

  private async clearPersistentType(type: string): Promise<void> {
    // This would need to be implemented to clear specific types from persistent storage
    console.log(`Clearing persistent storage for type: ${type}`)
  }

  private async cleanup(): Promise<void> {
    try {
      // Clean up expired entries from memory cache
      const expiredKeys: string[] = []
      
      for (const [key, entry] of this.memoryCache.entries()) {
        if (this.isExpired(entry)) {
          expiredKeys.push(key)
        }
      }

      expiredKeys.forEach(key => this.memoryCache.delete(key))
      
      if (expiredKeys.length > 0) {
        console.log(`Cleaned up ${expiredKeys.length} expired entries from memory cache`)
      }

      // Clean up persistent storage
      await offlineStorage.cleanupExpiredData()
    } catch (error) {
      console.error('Cache cleanup failed:', error)
    }
  }
}

// Export singleton instance
export const offlineCache = new OfflineCache()

// Utility functions for common caching patterns

/**
 * Cache-aware fetch function
 */
export async function cachedFetch<T>(
  type: string,
  id: string,
  fetcher: () => Promise<T>,
  options: { forceRefresh?: boolean } = {}
): Promise<T | null> {
  
  if (options.forceRefresh) {
    try {
      const data = await fetcher()
      await offlineCache.set(type, id, data)
      return data
    } catch (error) {
      console.error('Force refresh failed, trying cache:', error)
      return await offlineCache.get(type, id)
    }
  }

  return await offlineCache.get(type, id, fetcher)
}

/**
 * Prefetch critical data for offline use
 */
export async function prefetchCriticalData(userId: string): Promise<void> {
  const networkState = offlineDetector.getNetworkState()
  
  if (!networkState.isOnline || networkState.connectionQuality === 'poor') {
    console.log('Skipping critical data prefetch due to poor connection')
    return
  }

  try {
    // Prefetch user profile
    await cachedFetch('user-profile', userId, async () => {
      const response = await fetch(`/api/profile/${userId}`)
      return response.json()
    })

    // Prefetch recent tests
    await cachedFetch('tests', 'recent', async () => {
      const response = await fetch('/api/tests?limit=10')
      return response.json()
    })

    // Prefetch recent results
    await cachedFetch('results', userId, async () => {
      const response = await fetch(`/api/results/${userId}?limit=20`)
      return response.json()
    })

    console.log('Critical data prefetch completed')
  } catch (error) {
    console.error('Critical data prefetch failed:', error)
  }
}