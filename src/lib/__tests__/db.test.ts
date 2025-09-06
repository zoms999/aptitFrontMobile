import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals'
import { 
  databaseManager, 
  ensureDatabaseConnection, 
  getDatabaseClient, 
  withDatabaseRetry,
  getDatabaseConnectionState 
} from '../db'

// Mock Prisma Client for testing
jest.mock('@prisma/client', () => ({
  PrismaClient: jest.fn().mockImplementation(() => ({
    $connect: jest.fn().mockResolvedValue(undefined),
    $disconnect: jest.fn().mockResolvedValue(undefined),
    $queryRaw: jest.fn().mockResolvedValue([{ test: 1 }])
  }))
}))

describe('Database Manager', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  afterEach(async () => {
    await databaseManager.disconnect()
  })

  describe('Connection Management', () => {
    it('should initialize database connection successfully', async () => {
      const client = await getDatabaseClient()
      expect(client).toBeDefined()
      expect(client.$connect).toHaveBeenCalled()
    })

    it('should ensure connection is established', async () => {
      const isConnected = await ensureDatabaseConnection()
      expect(isConnected).toBe(true)
    })

    it('should return connection state', () => {
      const state = getDatabaseConnectionState()
      expect(state).toHaveProperty('isConnected')
      expect(state).toHaveProperty('lastConnectionCheck')
      expect(state).toHaveProperty('connectionAttempts')
    })
  })

  describe('Retry Mechanism', () => {
    it('should retry operations on failure', async () => {
      const mockOperation = jest.fn()
        .mockRejectedValueOnce(new Error('Connection failed'))
        .mockResolvedValueOnce('success')

      const result = await withDatabaseRetry(mockOperation)
      expect(result).toBe('success')
      expect(mockOperation).toHaveBeenCalledTimes(2)
    })

    it('should fail after max retries', async () => {
      const mockOperation = jest.fn()
        .mockRejectedValue(new Error('Persistent failure'))

      await expect(withDatabaseRetry(mockOperation)).rejects.toThrow('Persistent failure')
      expect(mockOperation).toHaveBeenCalledTimes(3) // Default max retries
    })
  })

  describe('Error Handling', () => {
    it('should handle connection errors gracefully', () => {
      const error = new Error('Connection timeout')
      databaseManager.handleConnectionError(error)
      
      const state = getDatabaseConnectionState()
      expect(state.isConnected).toBe(false)
      expect(state.lastError).toBe(error)
    })
  })
})

describe('Database Connection State', () => {
  it('should track connection attempts', async () => {
    // Simulate connection failure
    const error = new Error('Test error')
    databaseManager.handleConnectionError(error)
    
    const state = getDatabaseConnectionState()
    expect(state.connectionAttempts).toBeGreaterThan(0)
    expect(state.lastError).toBe(error)
  })

  it('should update last connection check timestamp', async () => {
    const beforeTime = new Date()
    await ensureDatabaseConnection()
    const afterTime = new Date()
    
    const state = getDatabaseConnectionState()
    expect(state.lastConnectionCheck.getTime()).toBeGreaterThanOrEqual(beforeTime.getTime())
    expect(state.lastConnectionCheck.getTime()).toBeLessThanOrEqual(afterTime.getTime())
  })
})