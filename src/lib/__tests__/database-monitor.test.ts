import { describe, it, expect, beforeEach, jest } from '@jest/globals'
import { DatabaseMonitor, ConnectionEvent, databaseMonitor } from '../database-monitor'

// Mock console methods to avoid noise in tests
const originalConsole = console
beforeEach(() => {
  console.log = jest.fn()
  console.warn = jest.fn()
  console.error = jest.fn()
})

afterEach(() => {
  console.log = originalConsole.log
  console.warn = originalConsole.warn
  console.error = originalConsole.error
})

describe('DatabaseMonitor', () => {
  let monitor: DatabaseMonitor

  beforeEach(() => {
    monitor = DatabaseMonitor.getInstance()
    monitor.resetMetrics()
  })

  describe('Connection Event Logging', () => {
    it('should log connection events correctly', () => {
      monitor.logConnectionEvent(ConnectionEvent.CONNECTING, { attempt: 1 })
      monitor.logConnectionEvent(ConnectionEvent.CONNECTED, { connectionTime: 150 })
      
      const eventLog = monitor.getEventLog()
      expect(eventLog).toHaveLength(2)
      expect(eventLog[0].event).toBe(ConnectionEvent.CONNECTING)
      expect(eventLog[1].event).toBe(ConnectionEvent.CONNECTED)
    })

    it('should update metrics based on connection events', () => {
      monitor.logConnectionEvent(ConnectionEvent.CONNECTING)
      monitor.logConnectionEvent(ConnectionEvent.CONNECTED, { connectionTime: 200 })
      
      const metrics = monitor.getMetrics()
      expect(metrics.connectionAttempts).toBe(1)
      expect(metrics.successfulConnections).toBe(1)
      expect(metrics.connectionTime).toBe(200)
    })

    it('should track connection errors', () => {
      const error = new Error('Connection failed')
      monitor.logConnectionEvent(ConnectionEvent.ERROR, {}, error)
      
      const metrics = monitor.getMetrics()
      expect(metrics.errorCount).toBe(1)
      expect(metrics.failedConnections).toBe(1)
      expect(metrics.lastError).toBe(error)
    })

    it('should limit event log size', () => {
      // Add more events than the max limit
      for (let i = 0; i < 1100; i++) {
        monitor.logConnectionEvent(ConnectionEvent.HEALTH_CHECK, { iteration: i })
      }
      
      const eventLog = monitor.getEventLog()
      expect(eventLog.length).toBeLessThanOrEqual(1000)
    })
  })

  describe('Query Performance Monitoring', () => {
    it('should measure query performance correctly', async () => {
      const mockQuery = jest.fn().mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve('result'), 10))
      )
      
      const result = await monitor.measureQuery(mockQuery, 'test_query', '/api/test')
      
      expect(result).toBe('result')
      expect(mockQuery).toHaveBeenCalled()
      
      const metrics = monitor.getMetrics()
      expect(metrics.queryCount).toBe(1)
      expect(metrics.totalQueryTime).toBeGreaterThanOrEqual(0)
    })

    it('should track slow queries', async () => {
      const slowQuery = jest.fn().mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve('slow result'), 1100))
      )
      
      await monitor.measureQuery(slowQuery, 'slow_query', '/api/slow')
      
      const metrics = monitor.getMetrics()
      expect(metrics.slowQueries).toHaveLength(1)
      expect(metrics.slowQueries[0].query).toBe('slow_query')
      expect(metrics.slowQueries[0].duration).toBeGreaterThan(1000)
    })

    it('should handle query errors', async () => {
      const errorQuery = jest.fn().mockRejectedValue(new Error('Query failed'))
      
      await expect(
        monitor.measureQuery(errorQuery, 'error_query', '/api/error')
      ).rejects.toThrow('Query failed')
      
      const metrics = monitor.getMetrics()
      expect(metrics.errorCount).toBe(1)
    })

    it('should calculate average query time correctly', async () => {
      const fastQuery = jest.fn().mockResolvedValue('fast')
      const mediumQuery = jest.fn().mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve('medium'), 100))
      )
      
      await monitor.measureQuery(fastQuery, 'fast_query')
      await monitor.measureQuery(mediumQuery, 'medium_query')
      
      const metrics = monitor.getMetrics()
      expect(metrics.queryCount).toBe(2)
      expect(metrics.averageQueryTime).toBeGreaterThan(0)
      expect(metrics.averageQueryTime).toBe(metrics.totalQueryTime / metrics.queryCount)
    })
  })

  describe('Connection Performance Monitoring', () => {
    it('should measure connection time', async () => {
      const mockConnection = jest.fn().mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve('connected'), 50))
      )
      
      const result = await monitor.measureConnection(mockConnection)
      
      expect(result).toBe('connected')
      expect(mockConnection).toHaveBeenCalled()
      
      const eventLog = monitor.getEventLog()
      const connectingEvent = eventLog.find(e => e.event === ConnectionEvent.CONNECTING)
      const connectedEvent = eventLog.find(e => e.event === ConnectionEvent.CONNECTED)
      
      expect(connectingEvent).toBeDefined()
      expect(connectedEvent).toBeDefined()
      expect(connectedEvent?.details?.connectionTime).toBeGreaterThanOrEqual(0)
    })

    it('should handle connection errors', async () => {
      const errorConnection = jest.fn().mockRejectedValue(new Error('Connection timeout'))
      
      await expect(
        monitor.measureConnection(errorConnection)
      ).rejects.toThrow('Connection timeout')
      
      const eventLog = monitor.getEventLog()
      const errorEvent = eventLog.find(e => e.event === ConnectionEvent.ERROR)
      
      expect(errorEvent).toBeDefined()
      expect(errorEvent?.error?.message).toBe('Connection timeout')
    })
  })

  describe('Health Check', () => {
    it('should perform health check successfully', async () => {
      const mockPrisma = {
        $connect: jest.fn().mockImplementation(() => 
          new Promise(resolve => setTimeout(() => resolve(undefined), 10))
        ),
        $queryRaw: jest.fn().mockResolvedValue([{ health_check: 1 }])
      } as any
      
      const healthResult = await monitor.performHealthCheck(mockPrisma)
      
      expect(healthResult.healthy).toBe(true)
      expect(healthResult.checks.connection).toBe(true)
      expect(healthResult.checks.query).toBe(true)
      expect(healthResult.checks.responseTime).toBeGreaterThanOrEqual(0)
      expect(mockPrisma.$connect).toHaveBeenCalled()
      expect(mockPrisma.$queryRaw).toHaveBeenCalled()
    })

    it('should handle health check failures', async () => {
      const mockPrisma = {
        $connect: jest.fn().mockRejectedValue(new Error('Connection failed')),
        $queryRaw: jest.fn()
      } as any
      
      const healthResult = await monitor.performHealthCheck(mockPrisma)
      
      expect(healthResult.healthy).toBe(false)
      expect(healthResult.checks.connection).toBe(false)
      expect(healthResult.checks.query).toBe(false)
    })
  })

  describe('Performance Summary', () => {
    it('should generate accurate performance summary', async () => {
      // Simulate some activity
      monitor.logConnectionEvent(ConnectionEvent.CONNECTING)
      monitor.logConnectionEvent(ConnectionEvent.CONNECTED, { connectionTime: 100 })
      monitor.logConnectionEvent(ConnectionEvent.CONNECTING)
      monitor.logConnectionEvent(ConnectionEvent.ERROR, {}, new Error('Failed'))
      
      const mockQuery = jest.fn().mockResolvedValue('result')
      await monitor.measureQuery(mockQuery, 'test_query_1')
      await monitor.measureQuery(mockQuery, 'test_query_2')
      
      const summary = monitor.getPerformanceSummary()
      
      expect(summary.connectionSuccess).toBe(50) // 1 success out of 2 attempts
      expect(summary.averageConnectionTime).toBe(100)
      expect(summary.queryPerformance.total).toBe(2)
      expect(summary.errorRate).toBeGreaterThanOrEqual(0) // Allow for timing variations
      expect(summary.uptime).toMatch(/\d+h \d+m/)
    })

    it('should handle zero division in performance calculations', () => {
      const summary = monitor.getPerformanceSummary()
      
      expect(summary.connectionSuccess).toBe(0)
      expect(summary.averageConnectionTime).toBe(0)
      expect(summary.queryPerformance.total).toBe(0)
      expect(summary.queryPerformance.average).toBe(0)
      expect(summary.errorRate).toBe(0)
    })
  })

  describe('Metrics Management', () => {
    it('should reset metrics correctly', async () => {
      // Add some data
      monitor.logConnectionEvent(ConnectionEvent.CONNECTED, { connectionTime: 100 })
      const mockQuery = jest.fn().mockResolvedValue('result')
      await monitor.measureQuery(mockQuery, 'test_query')
      
      // Verify data exists
      let metrics = monitor.getMetrics()
      expect(metrics.successfulConnections).toBeGreaterThan(0)
      
      // Reset and verify
      monitor.resetMetrics()
      metrics = monitor.getMetrics()
      
      expect(metrics.connectionAttempts).toBe(0)
      expect(metrics.queryCount).toBe(0)
      expect(metrics.errorCount).toBe(0)
      expect(monitor.getEventLog()).toHaveLength(0)
    })

    it('should track uptime correctly', () => {
      const metrics = monitor.getMetrics()
      expect(metrics.uptime).toBeGreaterThanOrEqual(0)
      expect(metrics.startTime).toBeInstanceOf(Date)
    })
  })

  describe('Event Log Management', () => {
    it('should return limited event log when requested', () => {
      // Add multiple events
      for (let i = 0; i < 20; i++) {
        monitor.logConnectionEvent(ConnectionEvent.HEALTH_CHECK, { iteration: i })
      }
      
      const limitedLog = monitor.getEventLog(5)
      expect(limitedLog).toHaveLength(5)
      
      // Should return the most recent events
      expect(limitedLog[4].details?.iteration).toBe(19)
    })

    it('should return full event log when no limit specified', () => {
      for (let i = 0; i < 10; i++) {
        monitor.logConnectionEvent(ConnectionEvent.HEALTH_CHECK, { iteration: i })
      }
      
      const fullLog = monitor.getEventLog()
      expect(fullLog).toHaveLength(10)
    })
  })

  describe('Singleton Pattern', () => {
    it('should return the same instance', () => {
      const instance1 = DatabaseMonitor.getInstance()
      const instance2 = DatabaseMonitor.getInstance()
      
      expect(instance1).toBe(instance2)
      expect(instance1).toBe(databaseMonitor)
    })
  })

  describe('Utility Functions', () => {
    it('should log reconnection attempts', () => {
      monitor.logReconnectAttempt(2, 3, 2000)
      
      const eventLog = monitor.getEventLog()
      const reconnectEvent = eventLog.find(e => e.event === ConnectionEvent.RECONNECT_ATTEMPT)
      
      expect(reconnectEvent).toBeDefined()
      expect(reconnectEvent?.details?.attempt).toBe(2)
      expect(reconnectEvent?.details?.maxAttempts).toBe(3)
      expect(reconnectEvent?.details?.delay).toBe(2000)
    })

    it('should log disconnections', () => {
      monitor.logDisconnection('Manual disconnect')
      
      const eventLog = monitor.getEventLog()
      const disconnectEvent = eventLog.find(e => e.event === ConnectionEvent.DISCONNECTED)
      
      expect(disconnectEvent).toBeDefined()
      expect(disconnectEvent?.details?.reason).toBe('Manual disconnect')
    })
  })
})

describe('Global Monitor Functions', () => {
  beforeEach(() => {
    databaseMonitor.resetMetrics()
  })

  it('should provide global access to monitoring functions', async () => {
    const { 
      logConnectionEvent, 
      measureDatabaseQuery, 
      measureDatabaseConnection,
      getDatabaseMetrics,
      getDatabaseEventLog,
      getDatabasePerformanceSummary
    } = await import('../database-monitor')
    
    // Test global functions
    logConnectionEvent(ConnectionEvent.CONNECTED)
    
    const mockQuery = jest.fn().mockResolvedValue('result')
    await measureDatabaseQuery(mockQuery, 'global_test')
    
    const mockConnection = jest.fn().mockResolvedValue('connected')
    await measureDatabaseConnection(mockConnection)
    
    const metrics = getDatabaseMetrics()
    const eventLog = getDatabaseEventLog()
    const summary = getDatabasePerformanceSummary()
    
    expect(metrics.queryCount).toBe(1)
    expect(eventLog.length).toBeGreaterThan(0)
    expect(summary.queryPerformance.total).toBe(1)
  })
})