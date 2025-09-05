/**
 * Conflict resolution for offline/online data synchronization
 * Handles data conflicts when syncing offline changes with server data
 */

import { offlineStorage } from './offline-storage'

export interface ConflictData<T = any> {
  id: string
  type: 'test-submission' | 'profile-update' | 'result-data'
  localData: T
  serverData: T
  localTimestamp: number
  serverTimestamp: number
  conflictFields: string[]
}

export interface ConflictResolution<T = any> {
  strategy: 'local-wins' | 'server-wins' | 'merge' | 'manual'
  resolvedData: T
  metadata?: {
    resolvedBy: 'system' | 'user'
    resolvedAt: number
    strategy: string
  }
}

export type ConflictResolver<T = any> = (conflict: ConflictData<T>) => Promise<ConflictResolution<T>>

// Built-in conflict resolution strategies
export class ConflictResolutionStrategies {
  
  /**
   * Local data takes precedence (last write wins from local perspective)
   */
  static localWins<T>(conflict: ConflictData<T>): ConflictResolution<T> {
    return {
      strategy: 'local-wins',
      resolvedData: conflict.localData,
      metadata: {
        resolvedBy: 'system',
        resolvedAt: Date.now(),
        strategy: 'local-wins'
      }
    }
  }

  /**
   * Server data takes precedence (server is source of truth)
   */
  static serverWins<T>(conflict: ConflictData<T>): ConflictResolution<T> {
    return {
      strategy: 'server-wins',
      resolvedData: conflict.serverData,
      metadata: {
        resolvedBy: 'system',
        resolvedAt: Date.now(),
        strategy: 'server-wins'
      }
    }
  }

  /**
   * Merge non-conflicting fields, prefer newer timestamps for conflicts
   */
  static smartMerge<T extends Record<string, any>>(conflict: ConflictData<T>): ConflictResolution<T> {
    const merged = { ...conflict.serverData }
    
    // For each field in local data
    Object.keys(conflict.localData).forEach(key => {
      const localValue = conflict.localData[key]
      const serverValue = conflict.serverData[key]
      
      // If field doesn't exist in server data, use local
      if (!(key in conflict.serverData)) {
        merged[key] = localValue
        return
      }
      
      // If values are the same, no conflict
      if (JSON.stringify(localValue) === JSON.stringify(serverValue)) {
        return
      }
      
      // For conflicting fields, prefer newer timestamp
      if (conflict.localTimestamp > conflict.serverTimestamp) {
        merged[key] = localValue
      }
      // Server value is already in merged object
    })
    
    return {
      strategy: 'merge',
      resolvedData: merged,
      metadata: {
        resolvedBy: 'system',
        resolvedAt: Date.now(),
        strategy: 'smart-merge'
      }
    }
  }

  /**
   * Timestamp-based resolution (newer wins)
   */
  static newerWins<T>(conflict: ConflictData<T>): ConflictResolution<T> {
    const useLocal = conflict.localTimestamp > conflict.serverTimestamp
    
    return {
      strategy: useLocal ? 'local-wins' : 'server-wins',
      resolvedData: useLocal ? conflict.localData : conflict.serverData,
      metadata: {
        resolvedBy: 'system',
        resolvedAt: Date.now(),
        strategy: 'newer-wins'
      }
    }
  }
}

// Conflict resolution manager
class ConflictResolutionManager {
  private resolvers: Map<string, ConflictResolver> = new Map()
  private pendingConflicts: Map<string, ConflictData> = new Map()

  constructor() {
    this.setupDefaultResolvers()
  }

  private setupDefaultResolvers(): void {
    // Test submissions: local wins (user's answers are authoritative)
    this.registerResolver('test-submission', async (conflict) => {
      return ConflictResolutionStrategies.localWins(conflict)
    })

    // Profile updates: smart merge with newer timestamp preference
    this.registerResolver('profile-update', async (conflict) => {
      return ConflictResolutionStrategies.smartMerge(conflict)
    })

    // Result data: server wins (server calculations are authoritative)
    this.registerResolver('result-data', async (conflict) => {
      return ConflictResolutionStrategies.serverWins(conflict)
    })
  }

  /**
   * Register a custom conflict resolver for a specific data type
   */
  public registerResolver(type: string, resolver: ConflictResolver): void {
    this.resolvers.set(type, resolver)
  }

  /**
   * Detect conflicts between local and server data
   */
  public detectConflicts<T extends Record<string, any>>(
    type: ConflictData['type'],
    localData: T,
    serverData: T,
    localTimestamp: number,
    serverTimestamp: number,
    id: string
  ): ConflictData<T> | null {
    
    const conflictFields: string[] = []
    
    // Compare all fields
    const allKeys = new Set([...Object.keys(localData), ...Object.keys(serverData)])
    
    for (const key of allKeys) {
      const localValue = localData[key]
      const serverValue = serverData[key]
      
      // Skip timestamp and metadata fields
      if (['timestamp', 'updatedAt', 'createdAt', 'synced'].includes(key)) {
        continue
      }
      
      // Check for differences
      if (JSON.stringify(localValue) !== JSON.stringify(serverValue)) {
        conflictFields.push(key)
      }
    }
    
    // No conflicts found
    if (conflictFields.length === 0) {
      return null
    }
    
    return {
      id,
      type,
      localData,
      serverData,
      localTimestamp,
      serverTimestamp,
      conflictFields
    }
  }

  /**
   * Resolve a conflict using the appropriate strategy
   */
  public async resolveConflict<T>(conflict: ConflictData<T>): Promise<ConflictResolution<T>> {
    const resolver = this.resolvers.get(conflict.type)
    
    if (!resolver) {
      console.warn(`No resolver found for conflict type: ${conflict.type}`)
      // Default to server wins
      return ConflictResolutionStrategies.serverWins(conflict)
    }
    
    try {
      const resolution = await resolver(conflict)
      
      // Log resolution for debugging
      console.log(`Conflict resolved for ${conflict.type}:${conflict.id}`, {
        strategy: resolution.strategy,
        conflictFields: conflict.conflictFields
      })
      
      return resolution
    } catch (error) {
      console.error(`Error resolving conflict for ${conflict.type}:${conflict.id}:`, error)
      
      // Fallback to server wins on error
      return ConflictResolutionStrategies.serverWins(conflict)
    }
  }

  /**
   * Add conflict to pending queue for manual resolution
   */
  public addPendingConflict(conflict: ConflictData): void {
    this.pendingConflicts.set(conflict.id, conflict)
  }

  /**
   * Get all pending conflicts
   */
  public getPendingConflicts(): ConflictData[] {
    return Array.from(this.pendingConflicts.values())
  }

  /**
   * Resolve pending conflict manually
   */
  public async resolvePendingConflict(
    conflictId: string, 
    resolution: ConflictResolution
  ): Promise<void> {
    const conflict = this.pendingConflicts.get(conflictId)
    if (!conflict) {
      throw new Error(`Conflict not found: ${conflictId}`)
    }
    
    // Mark as manually resolved
    resolution.metadata = {
      ...resolution.metadata,
      resolvedBy: 'user',
      resolvedAt: Date.now()
    }
    
    // Apply resolution based on conflict type
    await this.applyResolution(conflict, resolution)
    
    // Remove from pending
    this.pendingConflicts.delete(conflictId)
  }

  /**
   * Apply resolution to the appropriate data store
   */
  private async applyResolution(
    conflict: ConflictData, 
    resolution: ConflictResolution
  ): Promise<void> {
    
    switch (conflict.type) {
      case 'test-submission':
        await this.applyTestSubmissionResolution(conflict, resolution)
        break
        
      case 'profile-update':
        await this.applyProfileUpdateResolution(conflict, resolution)
        break
        
      case 'result-data':
        await this.applyResultDataResolution(conflict, resolution)
        break
        
      default:
        console.warn(`Unknown conflict type for resolution: ${conflict.type}`)
    }
  }

  private async applyTestSubmissionResolution(
    conflict: ConflictData,
    resolution: ConflictResolution
  ): Promise<void> {
    
    if (resolution.strategy === 'local-wins') {
      // Keep local data, mark as resolved
      console.log(`Test submission ${conflict.id}: keeping local data`)
    } else {
      // Update local data with resolved data
      console.log(`Test submission ${conflict.id}: updating with resolved data`)
      // Implementation would update the local test submission
    }
  }

  private async applyProfileUpdateResolution(
    conflict: ConflictData,
    resolution: ConflictResolution
  ): Promise<void> {
    
    // Update local profile data with resolved data
    try {
      // This would typically update the user's profile in local storage
      console.log(`Profile update ${conflict.id}: applying resolution`, resolution.strategy)
      
      // Store resolved data locally
      await offlineStorage.saveUserPreferences(
        'current-user', // This should be the actual user ID
        resolution.resolvedData
      )
      
    } catch (error) {
      console.error('Failed to apply profile update resolution:', error)
    }
  }

  private async applyResultDataResolution(
    conflict: ConflictData,
    resolution: ConflictResolution
  ): Promise<void> {
    
    if (resolution.strategy === 'server-wins') {
      // Update local cache with server data
      console.log(`Result data ${conflict.id}: updating local cache with server data`)
      
      // This would update the cached results
      await offlineStorage.cacheResult({
        id: conflict.id,
        userId: 'current-user', // This should be the actual user ID
        data: resolution.resolvedData,
        timestamp: Date.now()
      })
    }
  }

  /**
   * Auto-resolve all conflicts using registered strategies
   */
  public async autoResolveConflicts(conflicts: ConflictData[]): Promise<ConflictResolution[]> {
    const resolutions: ConflictResolution[] = []
    
    for (const conflict of conflicts) {
      try {
        const resolution = await this.resolveConflict(conflict)
        await this.applyResolution(conflict, resolution)
        resolutions.push(resolution)
      } catch (error) {
        console.error(`Failed to auto-resolve conflict ${conflict.id}:`, error)
        
        // Add to pending for manual resolution
        this.addPendingConflict(conflict)
      }
    }
    
    return resolutions
  }

  /**
   * Clear all pending conflicts
   */
  public clearPendingConflicts(): void {
    this.pendingConflicts.clear()
  }
}

// Export singleton instance
export const conflictResolver = new ConflictResolutionManager()

// Utility functions for common conflict scenarios

/**
 * Resolve test submission conflicts
 */
export async function resolveTestSubmissionConflict(
  localSubmission: any,
  serverSubmission: any,
  submissionId: string
): Promise<ConflictResolution> {
  
  const conflict = conflictResolver.detectConflicts(
    'test-submission',
    localSubmission,
    serverSubmission,
    localSubmission.timestamp || Date.now(),
    serverSubmission.timestamp || Date.now(),
    submissionId
  )
  
  if (!conflict) {
    return {
      strategy: 'server-wins',
      resolvedData: serverSubmission,
      metadata: {
        resolvedBy: 'system',
        resolvedAt: Date.now(),
        strategy: 'no-conflict'
      }
    }
  }
  
  return await conflictResolver.resolveConflict(conflict)
}

/**
 * Resolve profile update conflicts
 */
export async function resolveProfileConflict(
  localProfile: any,
  serverProfile: any,
  userId: string
): Promise<ConflictResolution> {
  
  const conflict = conflictResolver.detectConflicts(
    'profile-update',
    localProfile,
    serverProfile,
    localProfile.updatedAt || Date.now(),
    serverProfile.updatedAt || Date.now(),
    userId
  )
  
  if (!conflict) {
    return {
      strategy: 'server-wins',
      resolvedData: serverProfile,
      metadata: {
        resolvedBy: 'system',
        resolvedAt: Date.now(),
        strategy: 'no-conflict'
      }
    }
  }
  
  return await conflictResolver.resolveConflict(conflict)
}

/**
 * Check if data needs conflict resolution
 */
export function needsConflictResolution(
  localData: any,
  serverData: any,
  excludeFields: string[] = ['timestamp', 'updatedAt', 'createdAt']
): boolean {
  
  const localKeys = Object.keys(localData).filter(key => !excludeFields.includes(key))
  const serverKeys = Object.keys(serverData).filter(key => !excludeFields.includes(key))
  
  // Check if keys are different
  if (localKeys.length !== serverKeys.length) {
    return true
  }
  
  // Check if any values are different
  for (const key of localKeys) {
    if (JSON.stringify(localData[key]) !== JSON.stringify(serverData[key])) {
      return true
    }
  }
  
  return false
}