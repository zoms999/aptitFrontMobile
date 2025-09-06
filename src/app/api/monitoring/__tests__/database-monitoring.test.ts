import { describe, it, expect, beforeEach, jest } from '@jest/globals'
import { NextRequest } from 'next/server'
import { GET, POST } from '../database/route'

// Mock the database monitoring functions
jest.mock('@/lib/db', () => ({
  getDatabaseMetrics: jest.fn(),
  getDatabaseEventLog: jest.fn(),
  getDatabasePerformanceSummary: jest.fn(),
  performDatabaseHealthCheck: jest.fn(),
  getDatabaseConnectionState: jest.fn()
}))

jest.mock('@/lib/database-monitor', () => ({
  databaseMonitor: {
    resetMetrics: jest.fn()
  }
}))

jest.mock('@/lib/api-error-handler', () => ({
  APIErrorHandler: {
    createSuccessResponse: jest.fn((data, endpoint) => ({
      json: () => Promise.resolve({
        success: true,
        data,
        meta: { endpoint, timestamp: new Date() }
      })
    })),
    handleGenericError: jest.fn((error, endpoint) => ({
      json: () => Promise.resolve({
        success: false,
        error: { message: error.message },
        meta: { endpoint, timestamp: new Date() }
      })
    }))
  }
}))

describe('/api/monitoring/database', () => {
  const mockMetrics = {
    connectionTime: 150,
    queryCount: 25,
    totalQueryTime: 5000,
    averageQueryTime: 200,
    slowQueries: [],
    errorCount: 2,
    connectionAttempts: 5,
    successfulConnections: 4,
    failedConnections: 1,
    uptime: 3600000,
    startTime: new Date()
  }

  const mockHealthCheck = {
    healthy: true,
    checks: {
      connection: true,
      query: true,
      responseTime: 45
    },
    metrics: mockMetrics,
    connectionState: {
      isConnected: true,
      lastConnectionCheck: new Date(),
      connectionAttempts: 0
    }
  }

  const mockPerformanceSummary = {
    connectionSuccess: 80,
    averageConnectionTime: 150,
    queryPerformance: {
      total: 25,
      average: 200,
      slowQueries: 0
    },
    errorRate: 8,
    uptime: '1h 0m'
  }

  const mockEventLog = [
    {
      event: 'CONNECTED',
      timestamp: new Date(),
      details: { connectionTime: 150 }
    },
    {
      event: 'QUERY_END',
      timestamp: new Date(),
      details: { query: 'test_query', duration: 200 }
    }
  ]

  const mockConnectionState = {
    isConnected: true,
    lastConnectionCheck: new Date(),
    connectionAttempts: 0
  }

  beforeEach(() => {
    jest.clearAllMocks()
    
    const { 
      getDatabaseMetrics,
      getDatabaseEventLog,
      getDatabasePerformanceSummary,
      performDatabaseHealthCheck,
      getDatabaseConnectionState
    } = require('@/lib/db')
    
    getDatabaseMetrics.mockReturnValue(mockMetrics)
    getDatabaseEventLog.mockReturnValue(mockEventLog)
    getDatabasePerformanceSummary.mockReturnValue(mockPerformanceSummary)
    performDatabaseHealthCheck.mockResolvedValue(mockHealthCheck)
    getDatabaseConnectionState.mockReturnValue(mockConnectionState)
  })

  describe('GET requests', () => {
    it('should return summary by default', async () => {
      const request = new NextRequest('http://localhost/api/monitoring/database')
      const response = await GET(request)
      
      expect(response).toBeDefined()
      
      const { APIErrorHandler } = require('@/lib/api-error-handler')
      expect(APIErrorHandler.createSuccessResponse).toHaveBeenCalledWith(
        expect.objectContaining({
          health: mockHealthCheck,
          performance: mockPerformanceSummary,
          connectionState: mockConnectionState,
          recentEvents: mockEventLog
        }),
        '/api/monitoring/database?type=summary'
      )
    })

    it('should return health check when type=health', async () => {
      const request = new NextRequest('http://localhost/api/monitoring/database?type=health')
      const response = await GET(request)
      
      expect(response).toBeDefined()
      
      const { performDatabaseHealthCheck } = require('@/lib/db')
      expect(performDatabaseHealthCheck).toHaveBeenCalled()
      
      const { APIErrorHandler } = require('@/lib/api-error-handler')
      expect(APIErrorHandler.createSuccessResponse).toHaveBeenCalledWith(
        mockHealthCheck,
        '/api/monitoring/database?type=health'
      )
    })

    it('should return metrics when type=metrics', async () => {
      const request = new NextRequest('http://localhost/api/monitoring/database?type=metrics')
      const response = await GET(request)
      
      expect(response).toBeDefined()
      
      const { getDatabaseMetrics } = require('@/lib/db')
      expect(getDatabaseMetrics).toHaveBeenCalled()
      
      const { APIErrorHandler } = require('@/lib/api-error-handler')
      expect(APIErrorHandler.createSuccessResponse).toHaveBeenCalledWith(
        mockMetrics,
        '/api/monitoring/database?type=metrics'
      )
    })

    it('should return events when type=events', async () => {
      const request = new NextRequest('http://localhost/api/monitoring/database?type=events&limit=5')
      const response = await GET(request)
      
      expect(response).toBeDefined()
      
      const { getDatabaseEventLog } = require('@/lib/db')
      expect(getDatabaseEventLog).toHaveBeenCalledWith(5)
      
      const { APIErrorHandler } = require('@/lib/api-error-handler')
      expect(APIErrorHandler.createSuccessResponse).toHaveBeenCalledWith(
        expect.objectContaining({
          events: mockEventLog,
          total: mockEventLog.length,
          limit: 5
        }),
        '/api/monitoring/database?type=events'
      )
    })

    it('should return performance when type=performance', async () => {
      const request = new NextRequest('http://localhost/api/monitoring/database?type=performance')
      const response = await GET(request)
      
      expect(response).toBeDefined()
      
      const { getDatabasePerformanceSummary } = require('@/lib/db')
      expect(getDatabasePerformanceSummary).toHaveBeenCalled()
      
      const { APIErrorHandler } = require('@/lib/api-error-handler')
      expect(APIErrorHandler.createSuccessResponse).toHaveBeenCalledWith(
        mockPerformanceSummary,
        '/api/monitoring/database?type=performance'
      )
    })

    it('should return connection state when type=connection', async () => {
      const request = new NextRequest('http://localhost/api/monitoring/database?type=connection')
      const response = await GET(request)
      
      expect(response).toBeDefined()
      
      const { getDatabaseConnectionState } = require('@/lib/db')
      expect(getDatabaseConnectionState).toHaveBeenCalled()
      
      const { APIErrorHandler } = require('@/lib/api-error-handler')
      expect(APIErrorHandler.createSuccessResponse).toHaveBeenCalledWith(
        mockConnectionState,
        '/api/monitoring/database?type=connection'
      )
    })

    it('should handle errors gracefully', async () => {
      const { getDatabaseMetrics } = require('@/lib/db')
      getDatabaseMetrics.mockImplementation(() => {
        throw new Error('Database connection failed')
      })
      
      const request = new NextRequest('http://localhost/api/monitoring/database?type=metrics')
      const response = await GET(request)
      
      expect(response).toBeDefined()
      
      const { APIErrorHandler } = require('@/lib/api-error-handler')
      expect(APIErrorHandler.handleGenericError).toHaveBeenCalledWith(
        expect.any(Error),
        '/api/monitoring/database'
      )
    })

    it('should handle events without limit parameter', async () => {
      const request = new NextRequest('http://localhost/api/monitoring/database?type=events')
      const response = await GET(request)
      
      expect(response).toBeDefined()
      
      const { getDatabaseEventLog } = require('@/lib/db')
      expect(getDatabaseEventLog).toHaveBeenCalledWith(undefined)
    })
  })

  describe('POST requests (metrics reset)', () => {
    it('should reset metrics in development mode', async () => {
      const originalEnv = process.env.NODE_ENV
      process.env.NODE_ENV = 'development'
      
      try {
        const request = new NextRequest('http://localhost/api/monitoring/database', {
          method: 'POST'
        })
        const response = await POST(request)
        
        expect(response).toBeDefined()
        
        const { databaseMonitor } = require('@/lib/database-monitor')
        expect(databaseMonitor.resetMetrics).toHaveBeenCalled()
        
        const { APIErrorHandler } = require('@/lib/api-error-handler')
        expect(APIErrorHandler.createSuccessResponse).toHaveBeenCalledWith(
          expect.objectContaining({
            message: 'Database monitoring metrics have been reset'
          }),
          '/api/monitoring/database/reset'
        )
      } finally {
        process.env.NODE_ENV = originalEnv
      }
    })

    it('should reject reset in production mode', async () => {
      const originalEnv = process.env.NODE_ENV
      process.env.NODE_ENV = 'production'
      
      try {
        const request = new NextRequest('http://localhost/api/monitoring/database', {
          method: 'POST'
        })
        const response = await POST(request)
        
        expect(response).toBeDefined()
        
        // Should return a NextResponse with 403 status
        const responseData = await response.json()
        expect(responseData.success).toBe(false)
        expect(responseData.error.message).toContain('development mode')
        
        const { databaseMonitor } = require('@/lib/database-monitor')
        expect(databaseMonitor.resetMetrics).not.toHaveBeenCalled()
      } finally {
        process.env.NODE_ENV = originalEnv
      }
    })

    it('should handle errors during reset', async () => {
      const originalEnv = process.env.NODE_ENV
      process.env.NODE_ENV = 'development'
      
      try {
        const { databaseMonitor } = require('@/lib/database-monitor')
        databaseMonitor.resetMetrics.mockImplementation(() => {
          throw new Error('Reset failed')
        })
        
        const request = new NextRequest('http://localhost/api/monitoring/database', {
          method: 'POST'
        })
        const response = await POST(request)
        
        expect(response).toBeDefined()
        
        const { APIErrorHandler } = require('@/lib/api-error-handler')
        expect(APIErrorHandler.handleGenericError).toHaveBeenCalledWith(
          expect.any(Error),
          '/api/monitoring/database/reset'
        )
      } finally {
        process.env.NODE_ENV = originalEnv
      }
    })
  })

  describe('Query parameter parsing', () => {
    it('should parse limit parameter correctly', async () => {
      const request = new NextRequest('http://localhost/api/monitoring/database?type=events&limit=15')
      await GET(request)
      
      const { getDatabaseEventLog } = require('@/lib/db')
      expect(getDatabaseEventLog).toHaveBeenCalledWith(15)
    })

    it('should handle invalid limit parameter', async () => {
      const request = new NextRequest('http://localhost/api/monitoring/database?type=events&limit=invalid')
      await GET(request)
      
      const { getDatabaseEventLog } = require('@/lib/db')
      expect(getDatabaseEventLog).toHaveBeenCalledWith(NaN)
    })

    it('should handle missing type parameter', async () => {
      const request = new NextRequest('http://localhost/api/monitoring/database')
      const response = await GET(request)
      
      expect(response).toBeDefined()
      
      // Should default to summary
      const { performDatabaseHealthCheck } = require('@/lib/db')
      expect(performDatabaseHealthCheck).toHaveBeenCalled()
    })
  })
})

describe('Monitoring API Integration', () => {
  it('should provide comprehensive monitoring data structure', async () => {
    const request = new NextRequest('http://localhost/api/monitoring/database?type=summary')
    const response = await GET(request)
    
    expect(response).toBeDefined()
    
    const { APIErrorHandler } = require('@/lib/api-error-handler')
    const callArgs = APIErrorHandler.createSuccessResponse.mock.calls[0]
    const summaryData = callArgs[0]
    
    expect(summaryData).toHaveProperty('health')
    expect(summaryData).toHaveProperty('performance')
    expect(summaryData).toHaveProperty('connectionState')
    expect(summaryData).toHaveProperty('recentEvents')
    
    expect(summaryData.health).toHaveProperty('healthy')
    expect(summaryData.health).toHaveProperty('checks')
    expect(summaryData.health).toHaveProperty('metrics')
    
    expect(summaryData.performance).toHaveProperty('connectionSuccess')
    expect(summaryData.performance).toHaveProperty('queryPerformance')
    expect(summaryData.performance).toHaveProperty('errorRate')
    
    expect(summaryData.connectionState).toHaveProperty('isConnected')
    expect(summaryData.connectionState).toHaveProperty('lastConnectionCheck')
  })
})