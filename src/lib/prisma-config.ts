// Optimized Prisma configuration for serverless environments
// Import PrismaClient conditionally to avoid test issues
let PrismaClient: any
try {
  PrismaClient = require('@prisma/client').PrismaClient
} catch (error) {
  // PrismaClient not available (e.g., in tests)
  PrismaClient = null
}

export interface PrismaClientConfig {
  log: Array<'query' | 'info' | 'warn' | 'error'>
  datasources: {
    db: {
      url: string
    }
  }
  transactionOptions: {
    maxWait: number
    timeout: number
    isolationLevel: 'ReadCommitted' | 'ReadUncommitted' | 'RepeatableRead' | 'Serializable'
  }
}

// Optimized configuration for serverless environments
export function getOptimizedPrismaConfig(): PrismaClientConfig {
  return {
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
    datasources: {
      db: {
        url: process.env.DATABASE_URL || ''
      }
    },
    // Optimized transaction settings for serverless
    transactionOptions: {
      maxWait: 5000, // 5 seconds max wait for transaction
      timeout: 10000, // 10 seconds transaction timeout
      isolationLevel: 'ReadCommitted' // Optimal for most use cases
    }
  }
}

// Connection pool optimization settings
export interface ConnectionPoolConfig {
  // Maximum number of connections in the pool
  maxConnections: number
  // Minimum number of connections to maintain
  minConnections: number
  // Connection timeout in milliseconds
  connectionTimeout: number
  // Idle timeout in milliseconds
  idleTimeout: number
  // Maximum lifetime of a connection in milliseconds
  maxLifetime: number
  // Health check interval in milliseconds
  healthCheckInterval: number
}

export function getServerlessConnectionPoolConfig(): ConnectionPoolConfig {
  const parsePositiveInt = (value: string | undefined, defaultValue: number): number => {
    if (!value) return defaultValue
    const parsed = parseInt(value)
    return isNaN(parsed) || parsed <= 0 ? defaultValue : parsed
  }

  return {
    maxConnections: parsePositiveInt(process.env.DB_MAX_CONNECTIONS, 10),
    minConnections: parsePositiveInt(process.env.DB_MIN_CONNECTIONS, 2),
    connectionTimeout: parsePositiveInt(process.env.DB_CONNECTION_TIMEOUT, 10000),
    idleTimeout: parsePositiveInt(process.env.DB_IDLE_TIMEOUT, 300000), // 5 minutes
    maxLifetime: parsePositiveInt(process.env.DB_MAX_LIFETIME, 1800000), // 30 minutes
    healthCheckInterval: parsePositiveInt(process.env.DB_HEALTH_CHECK_INTERVAL, 60000) // 1 minute
  }
}

// Environment-specific optimizations
export function getEnvironmentOptimizations() {
  const isProduction = process.env.NODE_ENV === 'production'
  const isServerless = !!(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME || process.env.NETLIFY)
  
  return {
    // Logging configuration
    enableQueryLogging: !isProduction,
    enableErrorLogging: true,
    enablePerformanceLogging: true,
    
    // Connection management
    enableConnectionPooling: true,
    enableConnectionReuse: isServerless,
    enableIdleConnectionCleanup: true,
    
    // Performance optimizations
    enableQueryCaching: isProduction,
    enableConnectionWarmup: isServerless,
    enableGracefulShutdown: true,
    
    // Monitoring
    enableMetricsCollection: true,
    enableHealthChecks: true,
    enableAlerts: isProduction
  }
}

// Database URL validation and optimization
export function validateAndOptimizeDatabaseUrl(url: string): string {
  if (!url || typeof url !== 'string') {
    throw new Error('DATABASE_URL is required')
  }

  try {
    const dbUrl = new URL(url)
    
    // Add connection pool parameters for PostgreSQL
    if (dbUrl.protocol === 'postgresql:' || dbUrl.protocol === 'postgres:') {
      const params = new URLSearchParams(dbUrl.search)
      
      // Set optimal connection pool parameters for serverless
      if (!params.has('connection_limit')) {
        params.set('connection_limit', '10')
      }
      
      if (!params.has('pool_timeout')) {
        params.set('pool_timeout', '20')
      }
      
      if (!params.has('connect_timeout')) {
        params.set('connect_timeout', '10')
      }
      
      // Enable connection pooling
      if (!params.has('pgbouncer')) {
        params.set('pgbouncer', 'true')
      }
      
      dbUrl.search = params.toString()
      return dbUrl.toString()
    }
    
    // For non-PostgreSQL URLs, return as-is
    return url
  } catch (error) {
    throw new Error(`Invalid DATABASE_URL format: ${error}`)
  }
}

// Serverless-specific Prisma client factory
export function createOptimizedPrismaClient(): any {
  if (!PrismaClient) {
    throw new Error('PrismaClient is not available')
  }
  
  const config = getOptimizedPrismaConfig()
  const optimizedUrl = validateAndOptimizeDatabaseUrl(config.datasources.db.url)
  
  return new PrismaClient({
    ...config,
    datasources: {
      db: {
        url: optimizedUrl
      }
    }
  })
}