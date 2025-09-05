/**
 * Background sync utilities for PWA offline functionality
 * Handles syncing data when the app comes back online
 */

import { offlineStorage, generateId, type OfflineTestSubmission, type OfflineProfileUpdate } from './offline-storage'
import { conflictResolver, resolveTestSubmissionConflict, resolveProfileConflict } from './conflict-resolution'
import { offlineDetector } from './offline-detector'

// Sync event types
export type SyncEventType = 'test-submission' | 'profile-update' | 'result-fetch' | 'general-sync'

// Sync status
export interface SyncStatus {
  isActive: boolean
  lastSync: Date | null
  pendingItems: number
  errors: SyncError[]
}

export interface SyncError {
  id: string
  type: SyncEventType
  message: string
  timestamp: Date
  retryCount: number
}

// Background sync manager
class BackgroundSyncManager {
  private isOnline: boolean = true
  private syncInProgress: boolean = false
  private syncQueue: Set<SyncEventType> = new Set()
  private maxRetries: number = 3
  private retryDelay: number = 5000 // 5 seconds
  private initialized: boolean = false

  constructor() {
    // Don't initialize in constructor to avoid SSR issues
  }

  private initializeSync(): void {
    if (typeof window === 'undefined' || this.initialized) return

    this.initialized = true

    // Listen for online/offline events
    window.addEventListener('online', this.handleOnline.bind(this))
    window.addEventListener('offline', this.handleOffline.bind(this))
    
    // Set initial online state
    this.isOnline = navigator.onLine

    // Register service worker sync events
    this.registerSyncEvents()

    // Periodic sync check (every 30 seconds when online)
    setInterval(() => {
      if (this.isOnline && !this.syncInProgress) {
        this.performSync()
      }
    }, 30000)
  }

  private ensureInitialized(): void {
    if (!this.initialized) {
      this.initializeSync()
    }
  }

  private async registerSyncEvents(): Promise<void> {
    if ('serviceWorker' in navigator && 'sync' in window.ServiceWorkerRegistration.prototype) {
      try {
        const registration = await navigator.serviceWorker.ready
        
        // Register sync events for different types
        const syncTypes: SyncEventType[] = ['test-submission', 'profile-update', 'result-fetch']
        
        for (const type of syncTypes) {
          try {
            await registration.sync.register(type)
          } catch (error) {
            console.warn(`Failed to register sync for ${type}:`, error)
          }
        }
      } catch (error) {
        console.warn('Background sync not supported:', error)
      }
    }
  }

  private handleOnline(): void {
    console.log('Device came online, starting sync...')
    this.isOnline = true
    this.performSync()
  }

  private handleOffline(): void {
    console.log('Device went offline')
    this.isOnline = false
    this.syncInProgress = false
  }

  // Queue sync for specific type
  public queueSync(type: SyncEventType): void {
    this.ensureInitialized()
    this.syncQueue.add(type)
    
    if (this.isOnline && !this.syncInProgress) {
      // Debounce sync calls
      setTimeout(() => this.performSync(), 1000)
    }
  }

  // Perform sync for all queued types
  public async performSync(): Promise<void> {
    this.ensureInitialized()
    
    if (!this.isOnline || this.syncInProgress) {
      return
    }

    this.syncInProgress = true
    console.log('Starting background sync...')

    try {
      // Sync test submissions
      if (this.syncQueue.has('test-submission') || this.syncQueue.size === 0) {
        await this.syncTestSubmissions()
        this.syncQueue.delete('test-submission')
      }

      // Sync profile updates
      if (this.syncQueue.has('profile-update') || this.syncQueue.size === 0) {
        await this.syncProfileUpdates()
        this.syncQueue.delete('profile-update')
      }

      // Sync result fetches
      if (this.syncQueue.has('result-fetch') || this.syncQueue.size === 0) {
        await this.syncResultFetches()
        this.syncQueue.delete('result-fetch')
      }

      console.log('Background sync completed successfully')
    } catch (error) {
      console.error('Background sync failed:', error)
    } finally {
      this.syncInProgress = false
    }
  }

  // Sync pending test submissions
  private async syncTestSubmissions(): Promise<void> {
    try {
      const pendingSubmissions = await offlineStorage.getPendingTestSubmissions()
      
      for (const submission of pendingSubmissions) {
        try {
          await this.submitTest(submission)
          await offlineStorage.markTestSubmissionSynced(submission.id)
          console.log(`Synced test submission: ${submission.id}`)
        } catch (error) {
          console.error(`Failed to sync test submission ${submission.id}:`, error)
          // Could implement retry logic here
        }
      }
    } catch (error) {
      console.error('Failed to sync test submissions:', error)
    }
  }

  // Sync pending profile updates
  private async syncProfileUpdates(): Promise<void> {
    try {
      const pendingUpdates = await offlineStorage.getPendingProfileUpdates()
      
      for (const update of pendingUpdates) {
        try {
          await this.updateProfile(update)
          await offlineStorage.markProfileUpdateSynced(update.id)
          console.log(`Synced profile update: ${update.id}`)
        } catch (error) {
          console.error(`Failed to sync profile update ${update.id}:`, error)
        }
      }
    } catch (error) {
      console.error('Failed to sync profile updates:', error)
    }
  }

  // Sync result fetches (refresh cached results)
  private async syncResultFetches(): Promise<void> {
    try {
      // This would fetch latest results from server and update cache
      // Implementation depends on your API structure
      console.log('Syncing result fetches...')
    } catch (error) {
      console.error('Failed to sync result fetches:', error)
    }
  }

  // Submit test to server with conflict resolution
  private async submitTest(submission: OfflineTestSubmission): Promise<void> {
    try {
      // First, check if there's already a submission for this test
      const checkResponse = await fetch(`/api/tests/${submission.testId}/submissions/${submission.userId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      })

      let serverSubmission = null
      if (checkResponse.ok) {
        serverSubmission = await checkResponse.json()
      }

      // If server has a submission, resolve conflicts
      if (serverSubmission) {
        console.log('Conflict detected for test submission, resolving...')
        const resolution = await resolveTestSubmissionConflict(
          submission,
          serverSubmission,
          submission.id
        )

        // Use resolved data for submission
        const submissionData = {
          testId: submission.testId,
          answers: resolution.resolvedData.answers || submission.answers,
          deviceInfo: submission.deviceInfo,
          timestamp: submission.timestamp,
          conflictResolution: resolution.metadata
        }

        const response = await fetch('/api/tests/submit', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(submissionData)
        })

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`)
        }

        return response.json()
      } else {
        // No conflict, submit normally
        const response = await fetch('/api/tests/submit', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            testId: submission.testId,
            answers: submission.answers,
            deviceInfo: submission.deviceInfo,
            timestamp: submission.timestamp
          })
        })

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`)
        }

        return response.json()
      }
    } catch (error) {
      console.error('Failed to submit test with conflict resolution:', error)
      throw error
    }
  }

  // Update profile on server with conflict resolution
  private async updateProfile(update: OfflineProfileUpdate): Promise<void> {
    try {
      // First, get current server profile
      const profileResponse = await fetch(`/api/profile/${update.userId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      })

      if (profileResponse.ok) {
        const serverProfile = await profileResponse.json()
        
        // Resolve conflicts between local and server data
        const resolution = await resolveProfileConflict(
          update.updateData,
          serverProfile,
          update.userId
        )

        console.log('Profile conflict resolved:', resolution.strategy)

        // Update with resolved data
        const response = await fetch('/api/profile/update', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            ...resolution.resolvedData,
            conflictResolution: resolution.metadata
          })
        })

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`)
        }

        return response.json()
      } else {
        // No existing profile, create new
        const response = await fetch('/api/profile/update', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(update.updateData)
        })

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`)
        }

        return response.json()
      }
    } catch (error) {
      console.error('Failed to update profile with conflict resolution:', error)
      throw error
    }
  }

  // Get sync status
  public async getSyncStatus(): Promise<SyncStatus> {
    this.ensureInitialized()
    
    const pendingSubmissions = await offlineStorage.getPendingTestSubmissions()
    const pendingUpdates = await offlineStorage.getPendingProfileUpdates()
    
    return {
      isActive: this.syncInProgress,
      lastSync: null, // Could store this in localStorage
      pendingItems: pendingSubmissions.length + pendingUpdates.length,
      errors: [] // Could implement error tracking
    }
  }

  // Force sync now
  public async forcSync(): Promise<void> {
    this.ensureInitialized()
    
    if (!this.isOnline) {
      throw new Error('Cannot sync while offline')
    }

    this.syncQueue.clear()
    await this.performSync()
  }
}

// Export singleton instance
export const backgroundSync = new BackgroundSyncManager()

// Utility functions for offline operations

/**
 * Save test submission for offline sync
 */
export async function saveTestSubmissionOffline(
  testId: string,
  userId: string,
  answers: any[],
  deviceInfo: any
): Promise<string> {
  const submission: OfflineTestSubmission = {
    id: generateId(),
    testId,
    userId,
    answers,
    timestamp: Date.now(),
    deviceInfo,
    synced: false
  }

  await offlineStorage.saveTestSubmission(submission)
  
  // Queue for sync when online
  backgroundSync.queueSync('test-submission')
  
  return submission.id
}

/**
 * Save profile update for offline sync
 */
export async function saveProfileUpdateOffline(
  userId: string,
  updateData: any
): Promise<string> {
  const update: OfflineProfileUpdate = {
    id: generateId(),
    userId,
    updateData,
    timestamp: Date.now(),
    synced: false
  }

  await offlineStorage.saveProfileUpdate(update)
  
  // Queue for sync when online
  backgroundSync.queueSync('profile-update')
  
  return update.id
}

/**
 * Check if device is online
 */
export function isOnline(): boolean {
  return typeof window !== 'undefined' ? navigator.onLine : false
}

/**
 * Wait for device to come online
 */
export function waitForOnline(): Promise<void> {
  return new Promise((resolve) => {
    if (typeof window === 'undefined') {
      resolve()
      return
    }

    if (navigator.onLine) {
      resolve()
      return
    }

    const handleOnline = () => {
      window.removeEventListener('online', handleOnline)
      resolve()
    }

    window.addEventListener('online', handleOnline)
  })
}

/**
 * Retry function with exponential backoff
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000
): Promise<T> {
  let lastError: Error

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn()
    } catch (error) {
      lastError = error as Error
      
      if (attempt === maxRetries) {
        break
      }

      // Exponential backoff: 1s, 2s, 4s, 8s...
      const delay = baseDelay * Math.pow(2, attempt)
      await new Promise(resolve => setTimeout(resolve, delay))
    }
  }

  throw lastError!
}

/**
 * Network-aware fetch with offline fallback
 */
export async function fetchWithOfflineFallback<T>(
  url: string,
  options: RequestInit = {},
  fallbackData?: T
): Promise<T> {
  try {
    const response = await fetch(url, options)
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }
    
    return await response.json()
  } catch (error) {
    if (typeof window !== 'undefined' && !navigator.onLine && fallbackData !== undefined) {
      console.log('Using offline fallback data for:', url)
      return fallbackData
    }
    
    throw error
  }
}