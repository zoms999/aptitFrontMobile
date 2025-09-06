import { describe, it, expect, beforeAll, afterAll } from '@jest/globals'
import { 
  databaseManager, 
  ensureDatabaseConnection, 
  getDatabaseClient, 
  withDatabaseRetry 
} from '../db'
import { databaseMiddleware } from '../middleware/database'
import { NextRequest } from 'next/server'

describe('Database Integration Tests', () => {
  beforeAll(async () => {
    // Ensure we have a clean database connection for testing
    await databaseManager.disconnect()
  })

  afterAll(async () => {
    await databaseManager.disconnect()
  })

  describe('Connection Lifecycle', () => {
    it('should establish connection on first access', async () => {
      const client = await getDatabaseClient()
      expect(client).toBeDefined()
      
      // Test that we can perform a query
      const result = await client.$queryRaw`SELECT 1 as test`
      expect(result).toEqual([{ test: 1 }])
    })

    it('should reuse existing connection', async () => {
      const client1 = await getDatabaseClient()
      const client2 = await getDatabaseClient()
      
      // Both should reference the same client instance
      expect(client1).toBe(client2)
    })

    it('should handle connection validation', async () => {
      const isConnected = await ensureDatabaseConnection()
      expect(isConnected).toBe(true)
    })
  })

  describe('Error Recovery', () => {
    it('should recover from connection failures', async () => {
      // Simulate a connection failure by disconnecting
      await databaseManager.disconnect()
      
      // The next operation should automatically reconnect
      const result = await withDatabaseRetry(async (prisma) => {
        return await prisma.$queryRaw`SELECT 1 as recovery_test`
      })
      
      expect(result).toEqual([{ recovery_test: 1 }])
    })

    it('should handle multiple concurrent requests', async () => {
      const promises = Array.from({ length: 5 }, (_, i) => 
        withDatabaseRetry(async (prisma) => {
          return await prisma.$queryRaw`SELECT ${i} as request_id`
        })
      )
      
      const results = await Promise.all(promises)
      expect(results).toHaveLength(5)
      results.forEach((result, index) => {
        expect(result).toEqual([{ request_id: index }])
      })
    })
  })

  describe('Middleware Integration', () => {
    it('should work with database middleware', async () => {
      const mockRequest = new NextRequest('http://localhost:3000/api/test')
      
      const handler = databaseMiddleware.withDatabaseConnection(
        async (req, prisma) => {
          const result = await prisma.$queryRaw`SELECT 'middleware_test' as test`
          return { success: true, data: result }
        }
      )
      
      const response = await handler(mockRequest)
      expect(response).toBeDefined()
    })

    it('should perform health checks', async () => {
      const healthCheck = await databaseMiddleware.healthCheck()
      
      expect(healthCheck).toHaveProperty('isHealthy')
      expect(healthCheck).toHaveProperty('connectionState')
      expect(healthCheck).toHaveProperty('timestamp')
      expect(healthCheck.isHealthy).toBe(true)
    })
  })

  describe('Real Database Operations', () => {
    it('should be able to query actual tables', async () => {
      const client = await getDatabaseClient()
      
      // Test querying the mwd_account table (which exists in the schema)
      const count = await client.mwd_account.count()
      expect(typeof count).toBe('number')
      expect(count).toBeGreaterThanOrEqual(0)
    })

    it('should handle complex queries with retry', async () => {
      const result = await withDatabaseRetry(async (prisma) => {
        // Query multiple tables to test complex operations
        const [accountCount, commonCodeCount] = await Promise.all([
          prisma.mwd_account.count(),
          prisma.mwd_common_code.count()
        ])
        
        return {
          accounts: accountCount,
          commonCodes: commonCodeCount
        }
      })
      
      expect(result).toHaveProperty('accounts')
      expect(result).toHaveProperty('commonCodes')
      expect(typeof result.accounts).toBe('number')
      expect(typeof result.commonCodes).toBe('number')
    })
  })

  describe('Performance and Reliability', () => {
    it('should handle rapid successive connections', async () => {
      const startTime = Date.now()
      
      // Perform 10 rapid database operations
      const operations = Array.from({ length: 10 }, () => 
        getDatabaseClient().then(client => 
          client.$queryRaw`SELECT NOW() as timestamp`
        )
      )
      
      const results = await Promise.all(operations)
      const endTime = Date.now()
      
      expect(results).toHaveLength(10)
      expect(endTime - startTime).toBeLessThan(5000) // Should complete within 5 seconds
    })

    it('should maintain connection state correctly', async () => {
      // Perform several operations and check state
      await getDatabaseClient()
      const state1 = databaseManager.getConnectionState()
      
      await ensureDatabaseConnection()
      const state2 = databaseManager.getConnectionState()
      
      expect(state1.isConnected).toBe(true)
      expect(state2.isConnected).toBe(true)
      expect(state2.lastConnectionCheck.getTime()).toBeGreaterThanOrEqual(
        state1.lastConnectionCheck.getTime()
      )
    })
  })
})