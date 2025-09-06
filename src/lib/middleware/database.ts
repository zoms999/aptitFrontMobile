import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { getDatabaseClient, ensureDatabaseConnection } from '../db'
import { APIErrorHandler } from '../api-error-handler'

// Database middleware interface
export interface DatabaseMiddleware {
  withDatabaseConnection<T>(
    handler: (req: NextRequest, prisma: PrismaClient) => Promise<T>
  ): (req: NextRequest) => Promise<NextResponse>
}

// Connection validation options
interface ConnectionOptions {
  validateConnection?: boolean
  retryOnFailure?: boolean
  timeout?: number
  maxRetries?: number
  retryDelay?: number
}

class DatabaseMiddlewareImpl implements DatabaseMiddleware {
  private readonly defaultOptions: ConnectionOptions = {
    validateConnection: true,
    retryOnFailure: true,
    timeout: 10000,
    maxRetries: 2,
    retryDelay: 1000
  }

  withDatabaseConnection<T>(
    handler: (req: NextRequest, prisma: PrismaClient) => Promise<T>,
    options: ConnectionOptions = {}
  ): (req: NextRequest) => Promise<NextResponse> {
    const opts = { ...this.defaultOptions, ...options }

    return async (req: NextRequest): Promise<NextResponse> => {
      const endpoint = req.nextUrl.pathname
      let lastError: Error | null = null

      // Implement retry logic for connection failures
      for (let attempt = 0; attempt <= (opts.maxRetries || 0); attempt++) {
        try {
          // Validate database connection if required
          if (opts.validateConnection) {
            const isConnected = await this.validateConnectionWithRecovery(opts.timeout!)
            if (!isConnected) {
              throw new Error('Database connection validation failed after recovery attempts')
            }
          }

          // Get database client with connection state validation
          const prisma = await this.getDatabaseClientWithValidation()
          
          // Execute the handler with connection monitoring
          const result = await this.executeWithConnectionMonitoring(
            () => handler(req, prisma),
            endpoint
          )
          
          // If result is already a NextResponse, return it
          if (result instanceof NextResponse) {
            return result
          }
          
          // Otherwise, wrap in success response
          return APIErrorHandler.createSuccessResponse(result, endpoint)

        } catch (error) {
          lastError = error instanceof Error ? error : new Error('Unknown error')
          
          // Check if this is a retryable connection error
          const isRetryableError = this.isRetryableConnectionError(lastError)
          const shouldRetry = opts.retryOnFailure && 
            isRetryableError && 
            attempt < (opts.maxRetries || 0)

          if (shouldRetry) {
            console.warn(`🔄 Database middleware retry ${attempt + 1}/${opts.maxRetries} for ${endpoint}:`, lastError.message)
            
            // Wait before retry with exponential backoff
            const delay = (opts.retryDelay || 1000) * Math.pow(2, attempt)
            await new Promise(resolve => setTimeout(resolve, delay))
            continue
          }

          // Log the final error
          console.error(`Database middleware error for ${endpoint} (attempt ${attempt + 1}):`, lastError)
          break
        }
      }

      // Handle the final error
      if (lastError) {
        return APIErrorHandler.handleDatabaseError(lastError, endpoint)
      }
      
      return APIErrorHandler.handleGenericError(
        new Error('Database middleware error'),
        endpoint
      )
    }
  }

  private async validateConnection(timeout: number): Promise<boolean> {
    try {
      // Create a timeout promise
      const timeoutPromise = new Promise<boolean>((_, reject) => {
        setTimeout(() => reject(new Error('Connection validation timeout')), timeout)
      })

      // Race between connection check and timeout
      const connectionPromise = ensureDatabaseConnection()
      
      return await Promise.race([connectionPromise, timeoutPromise])
    } catch (error) {
      console.error('Connection validation failed:', error)
      return false
    }
  }

  private async validateConnectionWithRecovery(timeout: number): Promise<boolean> {
    try {
      // First attempt: standard validation
      let isConnected = await this.validateConnection(timeout)
      
      if (!isConnected) {
        console.warn('Initial connection validation failed, attempting recovery...')
        
        // Force reconnection by getting a fresh client
        const { databaseManager } = await import('../db')
        await databaseManager.disconnect()
        
        // Wait a moment before reconnecting
        await new Promise(resolve => setTimeout(resolve, 500))
        
        // Retry validation
        isConnected = await this.validateConnection(timeout)
        
        if (isConnected) {
          console.log('Database connection recovered successfully')
        }
      }
      
      return isConnected
    } catch (error) {
      console.error('Connection validation with recovery failed:', error)
      return false
    }
  }

  private async getDatabaseClientWithValidation(): Promise<PrismaClient> {
    try {
      const client = await getDatabaseClient()
      
      // Perform a lightweight validation query
      await client.$queryRaw`SELECT 1`
      
      return client
    } catch (error) {
      console.error('Database client validation failed:', error)
      throw new Error(`Database client validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  private async executeWithConnectionMonitoring<T>(
    operation: () => Promise<T>,
    endpoint: string
  ): Promise<T> {
    const startTime = Date.now()
    
    try {
      const result = await operation()
      const duration = Date.now() - startTime
      
      // Log successful operations for monitoring
      if (duration > 5000) { // Log slow operations
        console.warn(`⚠️ Slow database operation: ${endpoint} took ${duration}ms`)
      }
      
      return result
    } catch (error) {
      const duration = Date.now() - startTime
      console.error(`❌ Database operation failed: ${endpoint} (${duration}ms)`, error)
      throw error
    }
  }

  private isRetryableConnectionError(error: Error): boolean {
    const retryablePatterns = [
      'connection',
      'timeout',
      'ECONNREFUSED',
      'ENOTFOUND',
      'ETIMEDOUT',
      'PrismaClientInitializationError',
      'Database connection validation failed'
    ]
    
    return retryablePatterns.some(pattern => 
      error.message.toLowerCase().includes(pattern.toLowerCase()) ||
      error.name.toLowerCase().includes(pattern.toLowerCase())
    )
  }

  async healthCheck(): Promise<{
    isHealthy: boolean
    connectionState: any
    timestamp: Date
  }> {
    try {
      const isConnected = await ensureDatabaseConnection()
      const { getDatabaseConnectionState } = await import('../db')
      const connectionState = getDatabaseConnectionState()

      return {
        isHealthy: isConnected,
        connectionState,
        timestamp: new Date()
      }
    } catch (error) {
      console.error('Health check failed:', error)
      return {
        isHealthy: false,
        connectionState: { error: error instanceof Error ? error.message : 'Unknown error' },
        timestamp: new Date()
      }
    }
  }
}

// Export singleton instance
export const databaseMiddleware = new DatabaseMiddlewareImpl()

// Convenience function for common use case
export function withDatabase<T>(
  handler: (req: NextRequest, prisma: PrismaClient) => Promise<T>,
  options?: ConnectionOptions
) {
  return databaseMiddleware.withDatabaseConnection(handler, options)
}

// Health check endpoint helper
export async function createHealthCheckResponse(): Promise<NextResponse> {
  const healthCheck = await databaseMiddleware.healthCheck()
  
  return NextResponse.json({
    success: healthCheck.isHealthy,
    data: healthCheck,
    meta: {
      timestamp: healthCheck.timestamp,
      endpoint: '/health'
    }
  }, { 
    status: healthCheck.isHealthy ? 200 : 503 
  })
}

// Connection state monitoring
export class ConnectionMonitor {
  private static instance: ConnectionMonitor
  private monitoringInterval: NodeJS.Timeout | null = null
  private readonly checkInterval = 30000 // 30 seconds
  private connectionHistory: Array<{
    timestamp: Date
    isHealthy: boolean
    responseTime: number
    error?: string
  }> = []
  private readonly maxHistorySize = 100

  static getInstance(): ConnectionMonitor {
    if (!ConnectionMonitor.instance) {
      ConnectionMonitor.instance = new ConnectionMonitor()
    }
    return ConnectionMonitor.instance
  }

  startMonitoring(): void {
    if (this.monitoringInterval) {
      return // Already monitoring
    }

    console.log('Starting database connection monitoring...')
    
    this.monitoringInterval = setInterval(async () => {
      await this.performHealthCheck()
    }, this.checkInterval)
  }

  stopMonitoring(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval)
      this.monitoringInterval = null
      console.log('Database connection monitoring stopped')
    }
  }

  private async performHealthCheck(): Promise<void> {
    const startTime = Date.now()
    
    try {
      const healthCheck = await databaseMiddleware.healthCheck()
      const responseTime = Date.now() - startTime
      
      // Record in history
      this.recordHealthCheck({
        timestamp: new Date(),
        isHealthy: healthCheck.isHealthy,
        responseTime,
        error: healthCheck.isHealthy ? undefined : 'Health check failed'
      })
      
      if (!healthCheck.isHealthy) {
        console.warn('🟡 Database connection health check failed:', {
          responseTime,
          connectionState: healthCheck.connectionState
        })
        
        // Attempt recovery if connection is unhealthy
        await this.attemptConnectionRecovery()
      } else {
        // Only log healthy status in development or if there were recent issues
        const recentIssues = this.connectionHistory
          .slice(-5)
          .some(record => !record.isHealthy)
        
        if (process.env.NODE_ENV === 'development' || recentIssues) {
          console.log('✅ Database connection healthy:', {
            responseTime,
            timestamp: healthCheck.timestamp
          })
        }
      }
    } catch (error) {
      const responseTime = Date.now() - startTime
      
      this.recordHealthCheck({
        timestamp: new Date(),
        isHealthy: false,
        responseTime,
        error: error instanceof Error ? error.message : 'Unknown error'
      })
      
      console.error('🔴 Connection monitoring error:', {
        error: error instanceof Error ? error.message : error,
        responseTime
      })
    }
  }

  private recordHealthCheck(record: {
    timestamp: Date
    isHealthy: boolean
    responseTime: number
    error?: string
  }): void {
    this.connectionHistory.push(record)
    
    // Keep history size manageable
    if (this.connectionHistory.length > this.maxHistorySize) {
      this.connectionHistory = this.connectionHistory.slice(-this.maxHistorySize)
    }
  }

  private async attemptConnectionRecovery(): Promise<void> {
    try {
      console.log('🔄 Attempting database connection recovery...')
      
      const { databaseManager } = await import('../db')
      
      // Force disconnect and reconnect
      await databaseManager.disconnect()
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      // Test new connection
      const isRecovered = await ensureDatabaseConnection()
      
      if (isRecovered) {
        console.log('✅ Database connection recovered successfully')
      } else {
        console.error('❌ Database connection recovery failed')
      }
    } catch (error) {
      console.error('❌ Connection recovery attempt failed:', error)
    }
  }

  getConnectionHistory(): Array<{
    timestamp: Date
    isHealthy: boolean
    responseTime: number
    error?: string
  }> {
    return [...this.connectionHistory]
  }

  getConnectionStats(): {
    totalChecks: number
    healthyChecks: number
    unhealthyChecks: number
    averageResponseTime: number
    uptime: number
  } {
    const totalChecks = this.connectionHistory.length
    const healthyChecks = this.connectionHistory.filter(r => r.isHealthy).length
    const unhealthyChecks = totalChecks - healthyChecks
    const averageResponseTime = totalChecks > 0 
      ? this.connectionHistory.reduce((sum, r) => sum + r.responseTime, 0) / totalChecks
      : 0
    const uptime = totalChecks > 0 ? (healthyChecks / totalChecks) * 100 : 0

    return {
      totalChecks,
      healthyChecks,
      unhealthyChecks,
      averageResponseTime: Math.round(averageResponseTime),
      uptime: Math.round(uptime * 100) / 100
    }
  }
}

// Enhanced connection state management
export async function getDetailedConnectionState(): Promise<{
  database: any
  middleware: {
    isHealthy: boolean
    lastCheck: Date
    stats: any
  }
  monitor: {
    isActive: boolean
    history: any[]
    stats: any
  }
}> {
  const { getDatabaseConnectionState } = await import('../db')
  const monitor = ConnectionMonitor.getInstance()
  
  const middlewareHealth = await databaseMiddleware.healthCheck()
  
  return {
    database: getDatabaseConnectionState(),
    middleware: {
      isHealthy: middlewareHealth.isHealthy,
      lastCheck: middlewareHealth.timestamp,
      stats: middlewareHealth.connectionState
    },
    monitor: {
      isActive: monitor['monitoringInterval'] !== null,
      history: monitor.getConnectionHistory().slice(-10), // Last 10 checks
      stats: monitor.getConnectionStats()
    }
  }
}

// Request-level connection validation with detailed reporting
export async function validateRequestConnection(
  endpoint: string
): Promise<{
  isValid: boolean
  validationTime: number
  details: {
    databaseConnection: boolean
    clientInitialization: boolean
    queryExecution: boolean
  }
  error?: string
}> {
  const startTime = Date.now()
  const details = {
    databaseConnection: false,
    clientInitialization: false,
    queryExecution: false
  }
  
  try {
    // Step 1: Check database connection
    const isConnected = await ensureDatabaseConnection()
    details.databaseConnection = isConnected
    
    if (!isConnected) {
      throw new Error('Database connection failed')
    }
    
    // Step 2: Validate client initialization
    const client = await getDatabaseClient()
    details.clientInitialization = true
    
    // Step 3: Test query execution
    await client.$queryRaw`SELECT 1`
    details.queryExecution = true
    
    const validationTime = Date.now() - startTime
    
    return {
      isValid: true,
      validationTime,
      details
    }
  } catch (error) {
    const validationTime = Date.now() - startTime
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    
    console.error(`Request connection validation failed for ${endpoint}:`, {
      error: errorMessage,
      validationTime,
      details
    })
    
    return {
      isValid: false,
      validationTime,
      details,
      error: errorMessage
    }
  }
}

// Auto-start monitoring in production
if (process.env.NODE_ENV === 'production') {
  ConnectionMonitor.getInstance().startMonitoring()
}