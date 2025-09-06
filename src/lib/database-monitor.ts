import { PrismaClient } from '@prisma/client'

// Performance metrics interface
export interface DatabaseMetrics {
  connectionTime: number
  queryCount: number
  totalQueryTime: number
  averageQueryTime: number
  slowQueries: QueryMetric[]
  errorCount: number
  lastError?: Error
  connectionAttempts: number
  successfulConnections: number
  failedConnections: number
  uptime: number
  startTime: Date
}

// Individual query metrics
export interface QueryMetric {
  query: string
  duration: number
  timestamp: Date
  success: boolean
  error?: string
  endpoint?: string
}

// Connection lifecycle events
export enum ConnectionEvent {
  CONNECTING = 'CONNECTING',
  CONNECTED = 'CONNECTED',
  DISCONNECTED = 'DISCONNECTED',
  ERROR = 'ERROR',
  QUERY_START = 'QUERY_START',
  QUERY_END = 'QUERY_END',
  QUERY_ERROR = 'QUERY_ERROR',
  HEALTH_CHECK = 'HEALTH_CHECK',
  RECONNECT_ATTEMPT = 'RECONNECT_ATTEMPT'
}

// Connection event log entry
export interface ConnectionLogEntry {
  event: ConnectionEvent
  timestamp: Date
  duration?: number
  details?: any
  error?: Error
  endpoint?: string
  queryInfo?: {
    query: string
    params?: any
  }
}

export class DatabaseMonitor {
  private static instance: DatabaseMonitor
  private metrics: DatabaseMetrics
  private eventLog: ConnectionLogEntry[] = []
  private readonly maxLogEntries = 1000
  private readonly slowQueryThreshold = 1000 // 1 second
  private readonly maxSlowQueries = 50

  private constructor() {
    this.metrics = {
      connectionTime: 0,
      queryCount: 0,
      totalQueryTime: 0,
      averageQueryTime: 0,
      slowQueries: [],
      errorCount: 0,
      connectionAttempts: 0,
      successfulConnections: 0,
      failedConnections: 0,
      uptime: 0,
      startTime: new Date()
    }
  }

  static getInstance(): DatabaseMonitor {
    if (!DatabaseMonitor.instance) {
      DatabaseMonitor.instance = new DatabaseMonitor()
    }
    return DatabaseMonitor.instance
  }

  // Log connection lifecycle events
  logConnectionEvent(
    event: ConnectionEvent, 
    details?: any, 
    error?: Error,
    endpoint?: string,
    queryInfo?: { query: string; params?: any }
  ): void {
    const logEntry: ConnectionLogEntry = {
      event,
      timestamp: new Date(),
      details,
      error,
      endpoint,
      queryInfo
    }

    // Add to event log with size management
    this.eventLog.push(logEntry)
    if (this.eventLog.length > this.maxLogEntries) {
      this.eventLog = this.eventLog.slice(-this.maxLogEntries)
    }

    // Update metrics based on event type
    this.updateMetricsFromEvent(event, details, error)

    // Enhanced logging with structured format
    this.logEventToConsole(logEntry)
  }

  private updateMetricsFromEvent(event: ConnectionEvent, details?: any, error?: Error): void {
    const now = new Date()
    this.metrics.uptime = now.getTime() - this.metrics.startTime.getTime()

    switch (event) {
      case ConnectionEvent.CONNECTING:
        this.metrics.connectionAttempts++
        break

      case ConnectionEvent.CONNECTED:
        this.metrics.successfulConnections++
        if (details?.connectionTime) {
          this.metrics.connectionTime = details.connectionTime
        }
        break

      case ConnectionEvent.ERROR:
      case ConnectionEvent.QUERY_ERROR:
        this.metrics.errorCount++
        if (error) {
          this.metrics.lastError = error
        }
        if (event === ConnectionEvent.ERROR) {
          this.metrics.failedConnections++
        }
        break

      case ConnectionEvent.QUERY_END:
        this.metrics.queryCount++
        if (details?.duration) {
          this.metrics.totalQueryTime += details.duration
          this.metrics.averageQueryTime = this.metrics.totalQueryTime / this.metrics.queryCount

          // Track slow queries
          if (details.duration > this.slowQueryThreshold) {
            const slowQuery: QueryMetric = {
              query: details.query || 'Unknown query',
              duration: details.duration,
              timestamp: now,
              success: true,
              endpoint: details.endpoint
            }

            this.metrics.slowQueries.push(slowQuery)
            if (this.metrics.slowQueries.length > this.maxSlowQueries) {
              this.metrics.slowQueries = this.metrics.slowQueries.slice(-this.maxSlowQueries)
            }
          }
        }
        break
    }
  }

  private logEventToConsole(entry: ConnectionLogEntry): void {
    const logData = {
      event: entry.event,
      timestamp: entry.timestamp.toISOString(),
      ...(entry.duration && { duration: `${entry.duration}ms` }),
      ...(entry.endpoint && { endpoint: entry.endpoint }),
      ...(entry.queryInfo && { query: entry.queryInfo.query }),
      ...(entry.details && { details: entry.details }),
      ...(entry.error && { 
        error: {
          name: entry.error.name,
          message: entry.error.message,
          stack: process.env.NODE_ENV === 'development' ? entry.error.stack : undefined
        }
      })
    }

    // Use different log levels and emojis based on event type
    switch (entry.event) {
      case ConnectionEvent.CONNECTED:
        console.log('🟢 DB Connection:', logData)
        break

      case ConnectionEvent.CONNECTING:
        console.log('🔵 DB Connecting:', logData)
        break

      case ConnectionEvent.DISCONNECTED:
        console.warn('🟡 DB Disconnected:', logData)
        break

      case ConnectionEvent.ERROR:
      case ConnectionEvent.QUERY_ERROR:
        console.error('🔴 DB Error:', logData)
        break

      case ConnectionEvent.QUERY_START:
        if (process.env.NODE_ENV === 'development') {
          console.log('🔍 DB Query Start:', logData)
        }
        break

      case ConnectionEvent.QUERY_END:
        if (entry.duration && entry.duration > this.slowQueryThreshold) {
          console.warn('🐌 DB Slow Query:', logData)
        } else if (process.env.NODE_ENV === 'development') {
          console.log('✅ DB Query End:', logData)
        }
        break

      case ConnectionEvent.HEALTH_CHECK:
        console.log('💓 DB Health Check:', logData)
        break

      case ConnectionEvent.RECONNECT_ATTEMPT:
        console.warn('🔄 DB Reconnect Attempt:', logData)
        break

      default:
        console.log('📊 DB Event:', logData)
    }
  }

  // Measure query performance
  async measureQuery<T>(
    queryFn: () => Promise<T>,
    queryName: string,
    endpoint?: string
  ): Promise<T> {
    const startTime = Date.now()
    
    this.logConnectionEvent(ConnectionEvent.QUERY_START, {
      query: queryName,
      endpoint
    }, undefined, endpoint, { query: queryName })

    try {
      const result = await queryFn()
      const duration = Date.now() - startTime

      this.logConnectionEvent(ConnectionEvent.QUERY_END, {
        query: queryName,
        duration,
        endpoint
      }, undefined, endpoint, { query: queryName })

      return result
    } catch (error) {
      const duration = Date.now() - startTime
      
      this.logConnectionEvent(ConnectionEvent.QUERY_ERROR, {
        query: queryName,
        duration,
        endpoint
      }, error as Error, endpoint, { query: queryName })

      throw error
    }
  }

  // Measure connection time
  async measureConnection<T>(connectionFn: () => Promise<T>): Promise<T> {
    const startTime = Date.now()
    
    this.logConnectionEvent(ConnectionEvent.CONNECTING)

    try {
      const result = await connectionFn()
      const connectionTime = Date.now() - startTime

      this.logConnectionEvent(ConnectionEvent.CONNECTED, {
        connectionTime
      })

      return result
    } catch (error) {
      const connectionTime = Date.now() - startTime
      
      this.logConnectionEvent(ConnectionEvent.ERROR, {
        connectionTime
      }, error as Error)

      throw error
    }
  }

  // Get current metrics
  getMetrics(): DatabaseMetrics {
    return {
      ...this.metrics,
      uptime: new Date().getTime() - this.metrics.startTime.getTime()
    }
  }

  // Get recent event log
  getEventLog(limit?: number): ConnectionLogEntry[] {
    if (limit) {
      return this.eventLog.slice(-limit)
    }
    return [...this.eventLog]
  }

  // Get performance summary
  getPerformanceSummary(): {
    connectionSuccess: number
    averageConnectionTime: number
    queryPerformance: {
      total: number
      average: number
      slowQueries: number
    }
    errorRate: number
    uptime: string
  } {
    const totalConnections = this.metrics.successfulConnections + this.metrics.failedConnections
    const connectionSuccess = totalConnections > 0 
      ? (this.metrics.successfulConnections / totalConnections) * 100 
      : 0

    const errorRate = this.metrics.queryCount > 0
      ? (this.metrics.errorCount / this.metrics.queryCount) * 100
      : 0

    const uptimeMs = new Date().getTime() - this.metrics.startTime.getTime()
    const uptimeHours = Math.floor(uptimeMs / (1000 * 60 * 60))
    const uptimeMinutes = Math.floor((uptimeMs % (1000 * 60 * 60)) / (1000 * 60))

    return {
      connectionSuccess: Math.round(connectionSuccess * 100) / 100,
      averageConnectionTime: this.metrics.connectionTime,
      queryPerformance: {
        total: this.metrics.queryCount,
        average: Math.round(this.metrics.averageQueryTime * 100) / 100,
        slowQueries: this.metrics.slowQueries.length
      },
      errorRate: Math.round(errorRate * 100) / 100,
      uptime: `${uptimeHours}h ${uptimeMinutes}m`
    }
  }

  // Health check with detailed diagnostics
  async performHealthCheck(prisma: PrismaClient): Promise<{
    healthy: boolean
    checks: {
      connection: boolean
      query: boolean
      responseTime: number
    }
    metrics: DatabaseMetrics
  }> {
    const startTime = Date.now()
    let connectionHealthy = false
    let queryHealthy = false

    try {
      // Test basic connection
      await prisma.$connect()
      connectionHealthy = true

      // Test query execution
      await this.measureQuery(
        () => prisma.$queryRaw`SELECT 1 as health_check`,
        'health_check',
        'health-check'
      )
      queryHealthy = true

      const responseTime = Date.now() - startTime

      this.logConnectionEvent(ConnectionEvent.HEALTH_CHECK, {
        healthy: true,
        responseTime,
        connectionHealthy,
        queryHealthy
      })

      return {
        healthy: connectionHealthy && queryHealthy,
        checks: {
          connection: connectionHealthy,
          query: queryHealthy,
          responseTime
        },
        metrics: this.getMetrics()
      }
    } catch (error) {
      const responseTime = Date.now() - startTime

      this.logConnectionEvent(ConnectionEvent.HEALTH_CHECK, {
        healthy: false,
        responseTime,
        connectionHealthy,
        queryHealthy
      }, error as Error)

      return {
        healthy: false,
        checks: {
          connection: connectionHealthy,
          query: queryHealthy,
          responseTime
        },
        metrics: this.getMetrics()
      }
    }
  }

  // Reset metrics (useful for testing)
  resetMetrics(): void {
    this.metrics = {
      connectionTime: 0,
      queryCount: 0,
      totalQueryTime: 0,
      averageQueryTime: 0,
      slowQueries: [],
      errorCount: 0,
      connectionAttempts: 0,
      successfulConnections: 0,
      failedConnections: 0,
      uptime: 0,
      startTime: new Date()
    }
    this.eventLog = []
  }

  // Log reconnection attempt
  logReconnectAttempt(attempt: number, maxAttempts: number, delay: number): void {
    this.logConnectionEvent(ConnectionEvent.RECONNECT_ATTEMPT, {
      attempt,
      maxAttempts,
      delay
    })
  }

  // Log disconnection
  logDisconnection(reason?: string): void {
    this.logConnectionEvent(ConnectionEvent.DISCONNECTED, {
      reason
    })
  }
}

// Global monitor instance
export const databaseMonitor = DatabaseMonitor.getInstance()

// Utility functions for easy integration
export function logConnectionEvent(
  event: ConnectionEvent,
  details?: any,
  error?: Error,
  endpoint?: string
): void {
  databaseMonitor.logConnectionEvent(event, details, error, endpoint)
}

export async function measureDatabaseQuery<T>(
  queryFn: () => Promise<T>,
  queryName: string,
  endpoint?: string
): Promise<T> {
  return databaseMonitor.measureQuery(queryFn, queryName, endpoint)
}

export async function measureDatabaseConnection<T>(
  connectionFn: () => Promise<T>
): Promise<T> {
  return databaseMonitor.measureConnection(connectionFn)
}

export function getDatabaseMetrics(): DatabaseMetrics {
  return databaseMonitor.getMetrics()
}

export function getDatabaseEventLog(limit?: number): ConnectionLogEntry[] {
  return databaseMonitor.getEventLog(limit)
}

export function getDatabasePerformanceSummary() {
  return databaseMonitor.getPerformanceSummary()
}