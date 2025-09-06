import { describe, it, expect, beforeAll, afterAll, beforeEach, jest } from '@jest/globals'

// Mock Next.js modules
jest.mock('next/server', () => ({
  NextRequest: jest.fn().mockImplementation((url) => ({
    nextUrl: { pathname: new URL(url).pathname }
  })),
  NextResponse: {
    json: jest.fn().mockImplementation((data, options) => ({
      json: async () => data,
      status: options?.status || 200
    }))
  }
}))

// Mock the database modules
jest.mock('../db', () => ({
  databaseManager: {
    disconnect: jest.fn(),
    getConnectionState: jest.fn().mockReturnValue({
      isConnected: true,
      lastConnectionCheck: new Date(),
      connectionAttempts: 0
    })
  },
  ensureDatabaseConnection: jest.fn().mockResolvedValue(true),
  getDatabaseClient: jest.fn().mockResolvedValue({
    $queryRaw: jest.fn().mockResolvedValue([{ test: 1 }])
  }),
  getDatabaseConnectionState: jest.fn().mockReturnValue({
    isConnected: true,
    lastConnectionCheck: new Date(),
    connectionAttempts: 0
  })
}))

// Mock API error handler
jest.mock('../api-error-handler', () => ({
  APIErrorHandler: {
    handleDatabaseError: jest.fn().mockImplementation((error, endpoint) => ({
      json: async () => ({
        success: false,
        error: { message: error.message, code: 'DB_ERROR' },
        meta: { endpoint }
      })
    })),
    createSuccessResponse: jest.fn().mockImplementation((data, endpoint) => ({
      json: async () => ({
        success: true,
        data,
        meta: { endpoint }
      })
    })),
    handleGenericError: jest.fn().mockImplementation((error, endpoint) => ({
      json: async () => ({
        success: false,
        error: { message: error.message, code: 'GENERIC_ERROR' },
        meta: { endpoint }
      })
    }))
  }
}))

import { 
  databaseMiddleware, 
  withDatabase, 
  ConnectionMonitor,
  getDetailedConnectionState,
  validateRequestConnection
} from '../middleware/database'

// Mock console methods to avoid noise in tests
const originalConsoleLog = console.log
const originalConsoleWarn = console.warn
const originalConsoleError = console.error

describe('Database Middleware Tests', () => {
  beforeAll(() => {
    // Quiet console output during tests
    console.log = jest.fn()
    console.warn = jest.fn()
    console.error = jest.fn()
  })

  afterAll(() => {
    // Restore console methods
    console.log = originalConsoleLog
    console.warn = originalConsoleWarn
    console.error = originalConsoleError
    
    // Clean up
    ConnectionMonitor.getInstance().stopMonitoring()
  })

  beforeEach(() => {
    // Clear mock calls
    jest.clearAllMocks()
  })

  describe('Connection Validation', () => {
    it('should validate database connection before processing', async () => {
      const { NextRequest } = require('next/server')
      const mockRequest = new NextRequest('http://localhost:3000/api/test')
      
      const handler = databaseMiddleware.withDatabaseConnection(
        async (req, prisma) => {
          const result = await prisma.$queryRaw`SELECT 'validation_test' as test`
          return { success: true, data: result }
        },
        { validateConnection: true }
      )
      
      const response = await handler(mockRequest)
      expect(response).toBeDefined()
      
      const responseData = await response.json()
      expect(responseData.success).toBe(true)
    })

    it('should handle connection validation failures', async () => {
      const { NextRequest } = require('next/server')
      const { ensureDatabaseConnection } = require('../db')
      
      // Mock connection failure
      ensureDatabaseConnection.mockResolvedValueOnce(false)
      
      const mockRequest = new NextRequest('http://localhost:3000/api/test')
      
      const handler = databaseMiddleware.withDatabaseConnection(
        async (req, prisma) => {
          return { success: true, data: 'should not reach here' }
        },
        { validateConnection: true, retryOnFailure: false }
      )
      
      const response = await handler(mockRequest)
      expect(response).toBeDefined()
      
      const responseData = await response.json()
      expect(responseData.success).toBe(false)
      expect(responseData.error).toBeDefined()
    })
  })

  describe('Connection Recovery', () => {
    it('should recover from connection failures with retry', async () => {
      const { NextRequest } = require('next/server')
      const mockRequest = new NextRequest('http://localhost:3000/api/test')
      
      let attemptCount = 0
      const handler = databaseMiddleware.withDatabaseConnection(
        async (req, prisma) => {
          attemptCount++
          
          // Fail first attempt, succeed on retry
          if (attemptCount === 1) {
            throw new Error('Connection timeout')
          }
          
          const result = await prisma.$queryRaw`SELECT 'recovery_test' as test`
          return { success: true, data: result }
        },
        { 
          validateConnection: true, 
          retryOnFailure: true, 
          maxRetries: 2,
          retryDelay: 10 // Very short delay for testing
        }
      )
      
      const response = await handler(mockRequest)
      expect(response).toBeDefined()
      
      const responseData = await response.json()
      expect(responseData.success).toBe(true)
      expect(attemptCount).toBe(2) // Should have retried once
    })

    it('should fail after max retries exceeded', async () => {
      const { NextRequest } = require('next/server')
      const mockRequest = new NextRequest('http://localhost:3000/api/test')
      
      const handler = databaseMiddleware.withDatabaseConnection(
        async (req, prisma) => {
          throw new Error('Persistent connection failure')
        },
        { 
          validateConnection: true, 
          retryOnFailure: true, 
          maxRetries: 1,
          retryDelay: 10
        }
      )
      
      const response = await handler(mockRequest)
      expect(response).toBeDefined()
      
      const responseData = await response.json()
      expect(responseData.success).toBe(false)
      expect(responseData.error.message).toContain('failure')
    })
  })

  describe('Connection State Management', () => {
    it('should provide detailed connection state', async () => {
      const state = await getDetailedConnectionState()
      
      expect(state).toHaveProperty('database')
      expect(state).toHaveProperty('middleware')
      expect(state).toHaveProperty('monitor')
      
      expect(state.middleware).toHaveProperty('isHealthy')
      expect(state.middleware).toHaveProperty('lastCheck')
      expect(state.middleware).toHaveProperty('stats')
      
      expect(state.monitor).toHaveProperty('isActive')
      expect(state.monitor).toHaveProperty('history')
      expect(state.monitor).toHaveProperty('stats')
    })

    it('should validate request-level connections', async () => {
      const validation = await validateRequestConnection('/api/test')
      
      expect(validation).toHaveProperty('isValid')
      expect(validation).toHaveProperty('validationTime')
      expect(validation).toHaveProperty('details')
      
      expect(validation.details).toHaveProperty('databaseConnection')
      expect(validation.details).toHaveProperty('clientInitialization')
      expect(validation.details).toHaveProperty('queryExecution')
      
      expect(typeof validation.validationTime).toBe('number')
      expect(validation.validationTime).toBeGreaterThan(0)
    })
  })

  describe('Connection Monitoring', () => {
    it('should perform health checks', async () => {
      const healthCheck = await databaseMiddleware.healthCheck()
      
      expect(healthCheck).toHaveProperty('isHealthy')
      expect(healthCheck).toHaveProperty('connectionState')
      expect(healthCheck).toHaveProperty('timestamp')
      
      expect(typeof healthCheck.isHealthy).toBe('boolean')
      expect(healthCheck.timestamp).toBeInstanceOf(Date)
    })

    it('should track connection history', async () => {
      const monitor = ConnectionMonitor.getInstance()
      
      // Perform a few health checks to build history
      await databaseMiddleware.healthCheck()
      await databaseMiddleware.healthCheck()
      
      const history = monitor.getConnectionHistory()
      expect(Array.isArray(history)).toBe(true)
      
      const stats = monitor.getConnectionStats()
      expect(stats).toHaveProperty('totalChecks')
      expect(stats).toHaveProperty('healthyChecks')
      expect(stats).toHaveProperty('unhealthyChecks')
      expect(stats).toHaveProperty('averageResponseTime')
      expect(stats).toHaveProperty('uptime')
      
      expect(typeof stats.totalChecks).toBe('number')
      expect(typeof stats.averageResponseTime).toBe('number')
      expect(typeof stats.uptime).toBe('number')
    })
  })

  describe('Convenience Functions', () => {
    it('should work with withDatabase helper', async () => {
      const mockRequest = new NextRequest('http://localhost:3000/api/test')
      
      const handler = withDatabase(
        async (req, prisma) => {
          const result = await prisma.$queryRaw`SELECT 'helper_test' as test`
          return { success: true, data: result }
        }
      )
      
      const response = await handler(mockRequest)
      expect(response).toBeInstanceOf(NextResponse)
      
      const responseData = await response.json()
      expect(responseData.success).toBe(true)
    })

    it('should handle different response types', async () => {
      const mockRequest = new NextRequest('http://localhost:3000/api/test')
      
      // Test handler that returns NextResponse directly
      const handler1 = withDatabase(
        async (req, prisma) => {
          return NextResponse.json({ custom: 'response' })
        }
      )
      
      const response1 = await handler1(mockRequest)
      const data1 = await response1.json()
      expect(data1.custom).toBe('response')
      
      // Test handler that returns plain data
      const handler2 = withDatabase(
        async (req, prisma) => {
          return { plain: 'data' }
        }
      )
      
      const response2 = await handler2(mockRequest)
      const data2 = await response2.json()
      expect(data2.success).toBe(true)
      expect(data2.data.plain).toBe('data')
    })
  })

  describe('Error Handling', () => {
    it('should handle database errors gracefully', async () => {
      const mockRequest = new NextRequest('http://localhost:3000/api/test')
      
      const handler = withDatabase(
        async (req, prisma) => {
          // Force a database error
          throw new Error('Database operation failed')
        }
      )
      
      const response = await handler(mockRequest)
      expect(response).toBeInstanceOf(NextResponse)
      
      const responseData = await response.json()
      expect(responseData.success).toBe(false)
      expect(responseData.error).toBeDefined()
      expect(responseData.meta).toBeDefined()
      expect(responseData.meta.endpoint).toBe('/api/test')
    })

    it('should distinguish retryable vs non-retryable errors', async () => {
      const mockRequest = new NextRequest('http://localhost:3000/api/test')
      
      // Test retryable error
      const retryableHandler = withDatabase(
        async (req, prisma) => {
          throw new Error('Connection timeout')
        },
        { retryOnFailure: true, maxRetries: 1, retryDelay: 50 }
      )
      
      const retryableResponse = await retryableHandler(mockRequest)
      const retryableData = await retryableResponse.json()
      expect(retryableData.success).toBe(false)
      
      // Test non-retryable error
      const nonRetryableHandler = withDatabase(
        async (req, prisma) => {
          throw new Error('Validation failed')
        },
        { retryOnFailure: true, maxRetries: 1 }
      )
      
      const nonRetryableResponse = await nonRetryableHandler(mockRequest)
      const nonRetryableData = await nonRetryableResponse.json()
      expect(nonRetryableData.success).toBe(false)
    })
  })

  describe('Performance Monitoring', () => {
    it('should monitor operation performance', async () => {
      const mockRequest = new NextRequest('http://localhost:3000/api/test')
      
      const handler = withDatabase(
        async (req, prisma) => {
          // Simulate a slow operation
          await new Promise(resolve => setTimeout(resolve, 100))
          return { success: true, data: 'slow_operation' }
        }
      )
      
      const startTime = Date.now()
      const response = await handler(mockRequest)
      const endTime = Date.now()
      
      expect(response).toBeInstanceOf(NextResponse)
      expect(endTime - startTime).toBeGreaterThan(100)
      
      const responseData = await response.json()
      expect(responseData.success).toBe(true)
    })
  })
})