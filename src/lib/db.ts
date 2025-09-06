// Import PrismaClient conditionally to avoid test issues
let PrismaClient: any
try {
  PrismaClient = require('@prisma/client').PrismaClient
} catch (error) {
  // PrismaClient not available (e.g., in tests)
  PrismaClient = null
}
import { 
  databaseMonitor, 
  ConnectionEvent, 
  measureDatabaseConnection, 
  measureDatabaseQuery,
  logConnectionEvent 
} from './database-monitor'
import { 
  createOptimizedPrismaClient,
  getServerlessConnectionPoolConfig,
  getEnvironmentOptimizations
} from './prisma-config'

// Connection state interface
interface ConnectionState {
  isConnected: boolean
  lastConnectionCheck: Date
  connectionAttempts: number
  lastError?: Error
}

// Database manager class for robust connection handling
class DatabaseManager {
  private static instance: DatabaseManager
  private _prisma: PrismaClient | null = null
  private connectionState: ConnectionState = {
    isConnected: false,
    lastConnectionCheck: new Date(),
    connectionAttempts: 0
  }
  private readonly maxRetries = 3
  private readonly retryDelay = 1000 // 1 second
  private readonly connectionTimeout: number
  private readonly maxIdleTime: number
  private readonly connectionCheckInterval: number
  private cleanupTimer: NodeJS.Timeout | null = null
  private lastActivity: Date = new Date()
  private readonly poolConfig = getServerlessConnectionPoolConfig()
  private readonly envOptimizations = getEnvironmentOptimizations()

  private constructor() {
    // Initialize configuration from optimized settings
    this.connectionTimeout = this.poolConfig.connectionTimeout
    this.maxIdleTime = this.poolConfig.idleTimeout
    this.connectionCheckInterval = this.poolConfig.healthCheckInterval
  }

  static getInstance(): DatabaseManager {
    if (!DatabaseManager.instance) {
      DatabaseManager.instance = new DatabaseManager()
    }
    return DatabaseManager.instance
  }

  private createPrismaClient(): any {
    try {
      // Use optimized configuration for serverless environments
      return createOptimizedPrismaClient()
    } catch (error) {
      // Fallback to basic configuration if optimization fails
      logConnectionEvent(ConnectionEvent.ERROR, {
        context: 'optimized_client_creation_failed',
        fallbackToBasic: true
      }, error as Error)
      
      if (!PrismaClient) {
        throw new Error('PrismaClient is not available')
      }
      
      return new PrismaClient({
        log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
        datasources: {
          db: {
            url: process.env.DATABASE_URL
          }
        },
        transactionOptions: {
          maxWait: 5000,
          timeout: 10000,
          isolationLevel: 'ReadCommitted'
        }
      })
    }
  }

  async initializeClient(): Promise<any> {
    if (this._prisma && this.connectionState.isConnected) {
      return this._prisma
    }

    return measureDatabaseConnection(async () => {
      try {
        if (this._prisma) {
          logConnectionEvent(ConnectionEvent.DISCONNECTED, { reason: 'Reinitializing client' })
          await this._prisma.$disconnect()
        }

        logConnectionEvent(ConnectionEvent.CONNECTING, { 
          attempt: this.connectionState.connectionAttempts + 1 
        })

        this._prisma = this.createPrismaClient()
        
        // Test the connection with timeout
        const connectionPromise = this._prisma.$connect()
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error('Database connection timeout')), this.connectionTimeout)
        })

        await Promise.race([connectionPromise, timeoutPromise])
        
        // Verify connection with a simple query and measure it
        await measureDatabaseQuery(
          () => this._prisma!.$queryRaw`SELECT 1`,
          'connection_verification',
          'db-init'
        )
        
        this.connectionState = {
          isConnected: true,
          lastConnectionCheck: new Date(),
          connectionAttempts: 0
        }

        logConnectionEvent(ConnectionEvent.CONNECTED, {
          connectionAttempts: this.connectionState.connectionAttempts
        })

        return this._prisma

      } catch (error) {
        this.connectionState = {
          isConnected: false,
          lastConnectionCheck: new Date(),
          connectionAttempts: this.connectionState.connectionAttempts + 1,
          lastError: error as Error
        }

        logConnectionEvent(ConnectionEvent.ERROR, {
          connectionAttempts: this.connectionState.connectionAttempts,
          errorType: error instanceof Error ? error.name : 'Unknown'
        }, error as Error)

        throw error
      }
    })
  }

  async ensureConnection(): Promise<boolean> {
    try {
      if (!this._prisma) {
        await this.initializeClient()
        return true
      }

      // Check if connection is still alive with monitoring
      await measureDatabaseQuery(
        () => this._prisma!.$queryRaw`SELECT 1`,
        'connection_health_check',
        'db-health'
      )
      
      this.connectionState.isConnected = true
      this.connectionState.lastConnectionCheck = new Date()
      
      logConnectionEvent(ConnectionEvent.HEALTH_CHECK, {
        status: 'healthy',
        lastCheck: this.connectionState.lastConnectionCheck
      })
      
      return true

    } catch (error) {
      logConnectionEvent(ConnectionEvent.ERROR, {
        context: 'connection_health_check_failed'
      }, error as Error)
      
      this.connectionState.isConnected = false
      
      try {
        logConnectionEvent(ConnectionEvent.RECONNECT_ATTEMPT, {
          reason: 'health_check_failed'
        })
        
        await this.initializeClient()
        return true
      } catch (retryError) {
        logConnectionEvent(ConnectionEvent.ERROR, {
          context: 'reconnection_failed'
        }, retryError as Error)
        
        return false
      }
    }
  }

  async getClient(): Promise<any> {
    if (!this._prisma || !this.connectionState.isConnected) {
      await this.initializeClient()
    }

    if (!this._prisma) {
      throw new Error('Failed to initialize Prisma client')
    }

    this.updateActivity()
    return this._prisma
  }

  async withRetry<T>(operation: (prisma: any) => Promise<T>): Promise<T> {
    let lastError: Error | null = null

    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        const client = await this.getClient()
        this.updateActivity()
        
        // Measure the operation performance
        return await measureDatabaseQuery(
          () => operation(client),
          `retry_operation_attempt_${attempt}`,
          'db-retry'
        )
      } catch (error) {
        lastError = error as Error
        
        logConnectionEvent(ConnectionEvent.ERROR, {
          context: 'retry_operation_failed',
          attempt,
          maxRetries: this.maxRetries,
          willRetry: attempt < this.maxRetries
        }, error as Error)

        if (attempt < this.maxRetries) {
          // Reset connection state and wait before retry
          this.connectionState.isConnected = false
          const delay = this.retryDelay * attempt
          
          logConnectionEvent(ConnectionEvent.RECONNECT_ATTEMPT, {
            attempt,
            maxRetries: this.maxRetries,
            delay
          })
          
          await new Promise(resolve => setTimeout(resolve, delay))
        }
      }
    }

    throw lastError || new Error('Database operation failed after all retries')
  }

  handleConnectionError(error: Error): void {
    logConnectionEvent(ConnectionEvent.ERROR, {
      context: 'connection_error_handler',
      connectionState: this.connectionState,
      errorDetails: {
        name: error.name,
        message: error.message
      }
    }, error)

    this.connectionState = {
      isConnected: false,
      lastConnectionCheck: new Date(),
      connectionAttempts: this.connectionState.connectionAttempts + 1,
      lastError: error
    }
  }

  getConnectionState(): ConnectionState {
    return { ...this.connectionState }
  }

  async disconnect(): Promise<void> {
    if (this._prisma) {
      logConnectionEvent(ConnectionEvent.DISCONNECTED, {
        reason: 'manual_disconnect'
      })
      
      await this._prisma.$disconnect()
      this._prisma = null
      this.connectionState.isConnected = false
    }
    
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer)
      this.cleanupTimer = null
    }
  }

  // Connection cleanup and resource management
  private startConnectionCleanup(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer)
    }

    this.cleanupTimer = setInterval(async () => {
      try {
        const now = new Date()
        const timeSinceLastActivity = now.getTime() - this.lastActivity.getTime()

        // If connection has been idle for too long, disconnect
        if (timeSinceLastActivity > this.maxIdleTime && this._prisma) {
          logConnectionEvent(ConnectionEvent.DISCONNECTED, {
            reason: 'idle_timeout',
            idleTime: timeSinceLastActivity
          })

          await this._prisma.$disconnect()
          this._prisma = null
          this.connectionState.isConnected = false
        }
      } catch (error) {
        logConnectionEvent(ConnectionEvent.ERROR, {
          context: 'cleanup_timer_error'
        }, error as Error)
      }
    }, this.connectionCheckInterval)
  }

  private updateActivity(): void {
    this.lastActivity = new Date()
  }

  // Enhanced connection pooling optimization
  async optimizeConnectionPool(): Promise<void> {
    try {
      if (!this._prisma) {
        await this.initializeClient()
      }

      // Perform connection pool optimization
      logConnectionEvent(ConnectionEvent.CONNECTING, {
        context: 'pool_optimization'
      })

      // Test multiple concurrent connections to warm up the pool
      const connectionTests = Array.from({ length: 3 }, async (_, index) => {
        try {
          await measureDatabaseQuery(
            () => this._prisma!.$queryRaw`SELECT 1 as test_${index}`,
            `pool_warmup_${index}`,
            'pool-optimization'
          )
          return true
        } catch (error) {
          logConnectionEvent(ConnectionEvent.ERROR, {
            context: 'pool_warmup_failed',
            connectionIndex: index
          }, error as Error)
          return false
        }
      })

      const results = await Promise.allSettled(connectionTests)
      const successCount = results.filter(r => r.status === 'fulfilled' && r.value).length

      logConnectionEvent(ConnectionEvent.CONNECTED, {
        context: 'pool_optimization_complete',
        successfulConnections: successCount,
        totalAttempts: connectionTests.length
      })

      // Start cleanup timer after successful optimization
      this.startConnectionCleanup()

    } catch (error) {
      logConnectionEvent(ConnectionEvent.ERROR, {
        context: 'pool_optimization_failed'
      }, error as Error)
      throw error
    }
  }

  // Resource management for serverless environments
  async prepareForServerlessExecution(): Promise<void> {
    try {
      // Ensure we have a fresh connection for serverless execution
      if (this._prisma) {
        await this._prisma.$disconnect()
        this._prisma = null
      }

      // Initialize with optimized settings
      await this.initializeClient()
      
      // Optimize connection pool
      await this.optimizeConnectionPool()

      logConnectionEvent(ConnectionEvent.CONNECTED, {
        context: 'serverless_preparation_complete'
      })

    } catch (error) {
      logConnectionEvent(ConnectionEvent.ERROR, {
        context: 'serverless_preparation_failed'
      }, error as Error)
      throw error
    }
  }

  // Graceful shutdown for serverless environments
  async gracefulShutdown(): Promise<void> {
    try {
      logConnectionEvent(ConnectionEvent.DISCONNECTED, {
        reason: 'graceful_shutdown'
      })

      if (this.cleanupTimer) {
        clearInterval(this.cleanupTimer)
        this.cleanupTimer = null
      }

      if (this._prisma) {
        // Wait for any pending operations to complete
        await new Promise(resolve => setTimeout(resolve, 1000))
        
        await this._prisma.$disconnect()
        this._prisma = null
      }

      this.connectionState.isConnected = false

    } catch (error) {
      logConnectionEvent(ConnectionEvent.ERROR, {
        context: 'graceful_shutdown_error'
      }, error as Error)
    }
  }
}

// Global instance management for serverless environments
const globalForPrisma = globalThis as unknown as {
  databaseManager: DatabaseManager | undefined
}

export const databaseManager = globalForPrisma.databaseManager ?? DatabaseManager.getInstance()

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.databaseManager = databaseManager
}

// Legacy export for backward compatibility - but now with enhanced connection management
let _cachedPrismaClient: any | null = null

export const prisma = new Proxy({} as any, {
  get(target, prop, receiver) {
    // Handle special Prisma client methods
    if (typeof prop === 'string') {
      return async (...args: any[]) => {
        try {
          if (!_cachedPrismaClient) {
            _cachedPrismaClient = await databaseManager.getClient()
          }
          
          const method = (_cachedPrismaClient as any)[prop]
          if (typeof method === 'function') {
            return await method.apply(_cachedPrismaClient, args)
          }
          return method
        } catch (error) {
          // Reset cached client on error and retry once
          _cachedPrismaClient = null
          console.warn(`Prisma method ${prop} failed, retrying with fresh client:`, error)
          
          try {
            _cachedPrismaClient = await databaseManager.getClient()
            const method = (_cachedPrismaClient as any)[prop]
            if (typeof method === 'function') {
              return await method.apply(_cachedPrismaClient, args)
            }
            return method
          } catch (retryError) {
            databaseManager.handleConnectionError(retryError as Error)
            throw retryError
          }
        }
      }
    }
    
    return Reflect.get(target, prop, receiver)
  }
})

// Enhanced database utilities
export async function ensureDatabaseConnection(): Promise<boolean> {
  return databaseManager.ensureConnection()
}

export async function getDatabaseClient(): Promise<any> {
  return databaseManager.getClient()
}

export async function withDatabaseRetry<T>(
  operation: (prisma: any) => Promise<T>
): Promise<T> {
  return databaseManager.withRetry(operation)
}

export function getDatabaseConnectionState(): ConnectionState {
  return databaseManager.getConnectionState()
}

// Serverless optimization functions
export async function optimizeConnectionPool(): Promise<void> {
  return databaseManager.optimizeConnectionPool()
}

export async function prepareForServerlessExecution(): Promise<void> {
  return databaseManager.prepareForServerlessExecution()
}

export async function gracefulShutdown(): Promise<void> {
  return databaseManager.gracefulShutdown()
}

// Export monitoring functions
export { 
  getDatabaseMetrics, 
  getDatabaseEventLog, 
  getDatabasePerformanceSummary,
  measureDatabaseQuery,
  logConnectionEvent,
  ConnectionEvent
} from './database-monitor'

// Enhanced database health check
export async function performDatabaseHealthCheck(): Promise<{
  healthy: boolean
  checks: {
    connection: boolean
    query: boolean
    responseTime: number
  }
  metrics: any
  connectionState: ConnectionState
}> {
  try {
    const client = await databaseManager.getClient()
    const healthResult = await databaseMonitor.performHealthCheck(client)
    
    return {
      ...healthResult,
      connectionState: databaseManager.getConnectionState()
    }
  } catch (error) {
    logConnectionEvent(ConnectionEvent.ERROR, {
      context: 'health_check_failed'
    }, error as Error)
    
    return {
      healthy: false,
      checks: {
        connection: false,
        query: false,
        responseTime: 0
      },
      metrics: getDatabaseMetrics(),
      connectionState: databaseManager.getConnectionState()
    }
  }
}

// Type definitions for mobile-specific data structures
export interface UserPreferences {
  language: 'ko' | 'en'
  notifications: boolean
  theme: 'light' | 'dark' | 'system'
  testReminders: boolean
  hapticFeedback?: boolean
  autoSave?: boolean
}

export interface DeviceInfo {
  userAgent: string
  screenWidth: number
  screenHeight: number
  devicePixelRatio: number
  platform: string
  isMobile: boolean
  isTablet: boolean
  connectionType?: string
  batteryLevel?: number
}

export interface Question {
  id: string
  text: string
  type: 'multiple-choice' | 'rating' | 'text'
  options?: Option[]
  required: boolean
  order: number
  mobileOptimized?: boolean
}

export interface Option {
  id: string
  text: string
  value: string | number
  isCorrect?: boolean
}

export interface Answer {
  questionId: string
  value: string | number | string[]
  timeSpent: number
  timestamp: Date
}

export interface ResultAnalysis {
  strengths: string[]
  weaknesses: string[]
  recommendations: string[]
  categoryScores: CategoryScore[]
  overallScore: number
  percentileRank: number
}

export interface CategoryScore {
  category: string
  score: number
  maxScore: number
  percentile: number
}

export type TestCategory = 
  | 'aptitude'
  | 'personality'
  | 'cognitive'
  | 'technical'
  | 'language'
  | 'numerical'

export type TestDifficulty = 'easy' | 'medium' | 'hard'

export type SubmissionSource = 'mobile' | 'desktop' | 'tablet'

export type NetworkType = '4g' | '5g' | 'wifi' | 'offline'