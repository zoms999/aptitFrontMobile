/**
 * Offline storage utilities for PWA functionality
 * Handles IndexedDB operations for offline data persistence
 */

// Database configuration
const DB_NAME = 'AptitMobileDB'
const DB_VERSION = 1

// Store names
const STORES = {
  TEST_SUBMISSIONS: 'testSubmissions',
  PROFILE_UPDATES: 'profileUpdates',
  CACHED_TESTS: 'cachedTests',
  CACHED_RESULTS: 'cachedResults',
  USER_PREFERENCES: 'userPreferences',
  SYNC_QUEUE: 'syncQueue'
} as const

// Types for offline data
export interface OfflineTestSubmission {
  id: string
  testId: string
  userId: string
  answers: any[]
  timestamp: number
  deviceInfo: any
  synced: boolean
}

export interface OfflineProfileUpdate {
  id: string
  userId: string
  updateData: any
  timestamp: number
  synced: boolean
}

export interface CachedTest {
  id: string
  data: any
  timestamp: number
  expiresAt: number
}

export interface CachedResult {
  id: string
  userId: string
  data: any
  timestamp: number
}

export interface SyncQueueItem {
  id: string
  type: 'test-submission' | 'profile-update' | 'result-fetch'
  data: any
  timestamp: number
  retryCount: number
  maxRetries: number
}

// IndexedDB wrapper class
class OfflineStorage {
  private db: IDBDatabase | null = null
  private dbPromise: Promise<IDBDatabase> | null = null

  constructor() {
    // Don't initialize DB in constructor to avoid SSR issues
  }

  private async initDB(): Promise<IDBDatabase> {
    // Check if we're in a browser environment
    if (typeof window === 'undefined' || !('indexedDB' in window)) {
      throw new Error('IndexedDB not supported')
    }

    if (this.dbPromise) {
      return this.dbPromise
    }

    this.dbPromise = new Promise((resolve, reject) => {

      const request = indexedDB.open(DB_NAME, DB_VERSION)

      request.onerror = () => {
        reject(new Error('Failed to open IndexedDB'))
      }

      request.onsuccess = () => {
        this.db = request.result
        resolve(request.result)
      }

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result

        // Create object stores
        if (!db.objectStoreNames.contains(STORES.TEST_SUBMISSIONS)) {
          const testStore = db.createObjectStore(STORES.TEST_SUBMISSIONS, { keyPath: 'id' })
          testStore.createIndex('userId', 'userId', { unique: false })
          testStore.createIndex('synced', 'synced', { unique: false })
          testStore.createIndex('timestamp', 'timestamp', { unique: false })
        }

        if (!db.objectStoreNames.contains(STORES.PROFILE_UPDATES)) {
          const profileStore = db.createObjectStore(STORES.PROFILE_UPDATES, { keyPath: 'id' })
          profileStore.createIndex('userId', 'userId', { unique: false })
          profileStore.createIndex('synced', 'synced', { unique: false })
        }

        if (!db.objectStoreNames.contains(STORES.CACHED_TESTS)) {
          const testsStore = db.createObjectStore(STORES.CACHED_TESTS, { keyPath: 'id' })
          testsStore.createIndex('expiresAt', 'expiresAt', { unique: false })
        }

        if (!db.objectStoreNames.contains(STORES.CACHED_RESULTS)) {
          const resultsStore = db.createObjectStore(STORES.CACHED_RESULTS, { keyPath: 'id' })
          resultsStore.createIndex('userId', 'userId', { unique: false })
        }

        if (!db.objectStoreNames.contains(STORES.USER_PREFERENCES)) {
          db.createObjectStore(STORES.USER_PREFERENCES, { keyPath: 'userId' })
        }

        if (!db.objectStoreNames.contains(STORES.SYNC_QUEUE)) {
          const syncStore = db.createObjectStore(STORES.SYNC_QUEUE, { keyPath: 'id' })
          syncStore.createIndex('type', 'type', { unique: false })
          syncStore.createIndex('timestamp', 'timestamp', { unique: false })
        }
      }
    })

    return this.dbPromise
  }

  // Check if IndexedDB is available
  public isAvailable(): boolean {
    return typeof window !== 'undefined' && 'indexedDB' in window
  }

  private async getStore(storeName: string, mode: IDBTransactionMode = 'readonly'): Promise<IDBObjectStore> {
    if (!this.isAvailable()) {
      throw new Error('IndexedDB not available')
    }
    
    const db = await this.initDB()
    const transaction = db.transaction([storeName], mode)
    return transaction.objectStore(storeName)
  }

  // Test submissions
  async saveTestSubmission(submission: OfflineTestSubmission): Promise<void> {
    const store = await this.getStore(STORES.TEST_SUBMISSIONS, 'readwrite')
    await new Promise<void>((resolve, reject) => {
      const request = store.put(submission)
      request.onsuccess = () => resolve()
      request.onerror = () => reject(request.error)
    })
  }

  async getPendingTestSubmissions(): Promise<OfflineTestSubmission[]> {
    const store = await this.getStore(STORES.TEST_SUBMISSIONS)
    
    return new Promise((resolve, reject) => {
      const request = store.getAll()
      request.onsuccess = () => {
        // 클라이언트 사이드에서 필터링
        const allResults = request.result || []
        const pendingResults = allResults.filter(item => item.synced === false)
        resolve(pendingResults)
      }
      request.onerror = () => reject(request.error)
    })
  }

  async markTestSubmissionSynced(id: string): Promise<void> {
    const store = await this.getStore(STORES.TEST_SUBMISSIONS, 'readwrite')
    
    return new Promise<void>((resolve, reject) => {
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
    })
  }

  async deleteTestSubmission(id: string): Promise<void> {
    const store = await this.getStore(STORES.TEST_SUBMISSIONS, 'readwrite')
    
    return new Promise<void>((resolve, reject) => {
      const request = store.delete(id)
      request.onsuccess = () => resolve()
      request.onerror = () => reject(request.error)
    })
  }

  // Profile updates
  async saveProfileUpdate(update: OfflineProfileUpdate): Promise<void> {
    const store = await this.getStore(STORES.PROFILE_UPDATES, 'readwrite')
    
    return new Promise<void>((resolve, reject) => {
      const request = store.put(update)
      request.onsuccess = () => resolve()
      request.onerror = () => reject(request.error)
    })
  }

  async getPendingProfileUpdates(): Promise<OfflineProfileUpdate[]> {
    const store = await this.getStore(STORES.PROFILE_UPDATES)
    
    return new Promise((resolve, reject) => {
      const request = store.getAll()
      request.onsuccess = () => {
        // 클라이언트 사이드에서 필터링
        const allResults = request.result || []
        const pendingResults = allResults.filter(item => item.synced === false)
        resolve(pendingResults)
      }
      request.onerror = () => reject(request.error)
    })
  }

  async markProfileUpdateSynced(id: string): Promise<void> {
    const store = await this.getStore(STORES.PROFILE_UPDATES, 'readwrite')
    
    return new Promise<void>((resolve, reject) => {
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
    })
  }

  // Cached tests
  async cacheTest(test: CachedTest): Promise<void> {
    const store = await this.getStore(STORES.CACHED_TESTS, 'readwrite')
    
    return new Promise<void>((resolve, reject) => {
      const request = store.put(test)
      request.onsuccess = () => resolve()
      request.onerror = () => reject(request.error)
    })
  }

  async getCachedTest(id: string): Promise<CachedTest | null> {
    const store = await this.getStore(STORES.CACHED_TESTS)
    
    return new Promise((resolve, reject) => {
      const request = store.get(id)
      request.onsuccess = () => {
        const test = request.result
        if (test && test.expiresAt > Date.now()) {
          resolve(test)
        } else {
          if (test) {
            // Remove expired test
            this.deleteCachedTest(id)
          }
          resolve(null)
        }
      }
      request.onerror = () => reject(request.error)
    })
  }

  async deleteCachedTest(id: string): Promise<void> {
    const store = await this.getStore(STORES.CACHED_TESTS, 'readwrite')
    
    return new Promise<void>((resolve, reject) => {
      const request = store.delete(id)
      request.onsuccess = () => resolve()
      request.onerror = () => reject(request.error)
    })
  }

  // Cached results
  async cacheResult(result: CachedResult): Promise<void> {
    const store = await this.getStore(STORES.CACHED_RESULTS, 'readwrite')
    
    return new Promise<void>((resolve, reject) => {
      const request = store.put(result)
      request.onsuccess = () => resolve()
      request.onerror = () => reject(request.error)
    })
  }

  async getCachedResults(userId: string): Promise<CachedResult[]> {
    const store = await this.getStore(STORES.CACHED_RESULTS)
    const index = store.index('userId')
    
    return new Promise((resolve, reject) => {
      const request = index.getAll(userId)
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    })
  }

  // User preferences
  async saveUserPreferences(userId: string, preferences: any): Promise<void> {
    const store = await this.getStore(STORES.USER_PREFERENCES, 'readwrite')
    
    return new Promise<void>((resolve, reject) => {
      const request = store.put({ userId, preferences, timestamp: Date.now() })
      request.onsuccess = () => resolve()
      request.onerror = () => reject(request.error)
    })
  }

  async getUserPreferences(userId: string): Promise<any | null> {
    const store = await this.getStore(STORES.USER_PREFERENCES)
    
    return new Promise((resolve, reject) => {
      const request = store.get(userId)
      request.onsuccess = () => {
        const result = request.result
        resolve(result ? result.preferences : null)
      }
      request.onerror = () => reject(request.error)
    })
  }

  // Sync queue
  async addToSyncQueue(item: SyncQueueItem): Promise<void> {
    const store = await this.getStore(STORES.SYNC_QUEUE, 'readwrite')
    
    return new Promise<void>((resolve, reject) => {
      const request = store.put(item)
      request.onsuccess = () => resolve()
      request.onerror = () => reject(request.error)
    })
  }

  async getSyncQueue(): Promise<SyncQueueItem[]> {
    const store = await this.getStore(STORES.SYNC_QUEUE)
    
    return new Promise((resolve, reject) => {
      const request = store.getAll()
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    })
  }

  async removeFromSyncQueue(id: string): Promise<void> {
    const store = await this.getStore(STORES.SYNC_QUEUE, 'readwrite')
    
    return new Promise<void>((resolve, reject) => {
      const request = store.delete(id)
      request.onsuccess = () => resolve()
      request.onerror = () => reject(request.error)
    })
  }

  // Cleanup expired data
  async cleanupExpiredData(): Promise<void> {
    const now = Date.now()
    const store = await this.getStore(STORES.CACHED_TESTS, 'readwrite')
    const index = store.index('expiresAt')
    
    return new Promise<void>((resolve, reject) => {
      const request = index.openCursor(IDBKeyRange.upperBound(now))
      request.onsuccess = () => {
        const cursor = request.result
        if (cursor) {
          cursor.delete()
          cursor.continue()
        } else {
          resolve()
        }
      }
      request.onerror = () => reject(request.error)
    })
  }

  // Clear all data
  async clearAllData(): Promise<void> {
    const db = await this.initDB()
    const storeNames = Object.values(STORES)
    
    const transaction = db.transaction(storeNames, 'readwrite')
    
    return new Promise<void>((resolve, reject) => {
      let completed = 0
      const total = storeNames.length
      
      storeNames.forEach(storeName => {
        const store = transaction.objectStore(storeName)
        const request = store.clear()
        
        request.onsuccess = () => {
          completed++
          if (completed === total) {
            resolve()
          }
        }
        
        request.onerror = () => reject(request.error)
      })
    })
  }
}

// Safe wrapper for offline storage
class SafeOfflineStorage {
  private storage: OfflineStorage | null = null

  private getStorage(): OfflineStorage {
    if (!this.storage) {
      this.storage = new OfflineStorage()
    }
    return this.storage
  }

  public isAvailable(): boolean {
    return typeof window !== 'undefined' && 'indexedDB' in window
  }

  // Wrapper methods that handle unavailability gracefully
  async saveTestSubmission(submission: OfflineTestSubmission): Promise<void> {
    if (!this.isAvailable()) return
    return this.getStorage().saveTestSubmission(submission)
  }

  async getPendingTestSubmissions(): Promise<OfflineTestSubmission[]> {
    if (!this.isAvailable()) return []
    return this.getStorage().getPendingTestSubmissions()
  }

  async markTestSubmissionSynced(id: string): Promise<void> {
    if (!this.isAvailable()) return
    return this.getStorage().markTestSubmissionSynced(id)
  }

  async deleteTestSubmission(id: string): Promise<void> {
    if (!this.isAvailable()) return
    return this.getStorage().deleteTestSubmission(id)
  }

  async saveProfileUpdate(update: OfflineProfileUpdate): Promise<void> {
    if (!this.isAvailable()) return
    return this.getStorage().saveProfileUpdate(update)
  }

  async getPendingProfileUpdates(): Promise<OfflineProfileUpdate[]> {
    if (!this.isAvailable()) return []
    return this.getStorage().getPendingProfileUpdates()
  }

  async markProfileUpdateSynced(id: string): Promise<void> {
    if (!this.isAvailable()) return
    return this.getStorage().markProfileUpdateSynced(id)
  }

  async cacheTest(test: CachedTest): Promise<void> {
    if (!this.isAvailable()) return
    return this.getStorage().cacheTest(test)
  }

  async getCachedTest(id: string): Promise<CachedTest | null> {
    if (!this.isAvailable()) return null
    return this.getStorage().getCachedTest(id)
  }

  async deleteCachedTest(id: string): Promise<void> {
    if (!this.isAvailable()) return
    return this.getStorage().deleteCachedTest(id)
  }

  async cacheResult(result: CachedResult): Promise<void> {
    if (!this.isAvailable()) return
    return this.getStorage().cacheResult(result)
  }

  async getCachedResults(userId: string): Promise<CachedResult[]> {
    if (!this.isAvailable()) return []
    return this.getStorage().getCachedResults(userId)
  }

  async saveUserPreferences(userId: string, preferences: any): Promise<void> {
    if (!this.isAvailable()) return
    return this.getStorage().saveUserPreferences(userId, preferences)
  }

  async getUserPreferences(userId: string): Promise<any | null> {
    if (!this.isAvailable()) return null
    return this.getStorage().getUserPreferences(userId)
  }

  async addToSyncQueue(item: SyncQueueItem): Promise<void> {
    if (!this.isAvailable()) return
    return this.getStorage().addToSyncQueue(item)
  }

  async getSyncQueue(): Promise<SyncQueueItem[]> {
    if (!this.isAvailable()) return []
    return this.getStorage().getSyncQueue()
  }

  async removeFromSyncQueue(id: string): Promise<void> {
    if (!this.isAvailable()) return
    return this.getStorage().removeFromSyncQueue(id)
  }

  async cleanupExpiredData(): Promise<void> {
    if (!this.isAvailable()) return
    return this.getStorage().cleanupExpiredData()
  }

  async clearAllData(): Promise<void> {
    if (!this.isAvailable()) return
    return this.getStorage().clearAllData()
  }
}

// Export singleton instance
export const offlineStorage = new SafeOfflineStorage()

// Utility functions
export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
}

export function isExpired(timestamp: number, maxAge: number): boolean {
  return Date.now() - timestamp > maxAge
}

export function createCacheKey(prefix: string, ...parts: string[]): string {
  return `${prefix}:${parts.join(':')}`
}