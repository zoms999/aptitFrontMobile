import { 
  getOptimizedPrismaConfig,
  getServerlessConnectionPoolConfig,
  getEnvironmentOptimizations,
  validateAndOptimizeDatabaseUrl
} from '../prisma-config'

// Mock environment variables
const originalEnv = process.env

beforeEach(() => {
  jest.resetModules()
  process.env = {
    ...originalEnv,
    DATABASE_URL: 'postgresql://test:test@localhost:5432/test_db',
    NODE_ENV: 'test'
  }
})

afterEach(() => {
  process.env = originalEnv
})

describe('Database Configuration Optimization', () => {
  describe('Prisma Configuration', () => {
    test('should generate optimized Prisma config', () => {
      const config = getOptimizedPrismaConfig()
      
      expect(config).toHaveProperty('log')
      expect(config).toHaveProperty('datasources')
      expect(config).toHaveProperty('transactionOptions')
      expect(config.transactionOptions.maxWait).toBe(5000)
      expect(config.transactionOptions.timeout).toBe(10000)
      expect(config.transactionOptions.isolationLevel).toBe('ReadCommitted')
    })

    test('should use different log levels for different environments', () => {
      // Test development environment
      process.env.NODE_ENV = 'development'
      const devConfig = getOptimizedPrismaConfig()
      expect(devConfig.log).toContain('query')
      expect(devConfig.log).toContain('error')
      expect(devConfig.log).toContain('warn')

      // Test production environment
      process.env.NODE_ENV = 'production'
      const prodConfig = getOptimizedPrismaConfig()
      expect(prodConfig.log).toEqual(['error'])
    })
  })

  describe('Connection Pool Configuration', () => {
    test('should generate serverless connection pool config', () => {
      const config = getServerlessConnectionPoolConfig()
      
      expect(config).toHaveProperty('maxConnections')
      expect(config).toHaveProperty('minConnections')
      expect(config).toHaveProperty('connectionTimeout')
      expect(config).toHaveProperty('idleTimeout')
      expect(config).toHaveProperty('maxLifetime')
      expect(config).toHaveProperty('healthCheckInterval')
      
      expect(config.maxConnections).toBe(10)
      expect(config.minConnections).toBe(2)
      expect(config.connectionTimeout).toBe(10000)
      expect(config.idleTimeout).toBe(300000)
    })

    test('should respect environment variable overrides', () => {
      process.env.DB_MAX_CONNECTIONS = '20'
      process.env.DB_MIN_CONNECTIONS = '5'
      process.env.DB_CONNECTION_TIMEOUT = '15000'
      
      const config = getServerlessConnectionPoolConfig()
      
      expect(config.maxConnections).toBe(20)
      expect(config.minConnections).toBe(5)
      expect(config.connectionTimeout).toBe(15000)
    })
  })

  describe('Environment Optimizations', () => {
    test('should detect production environment', () => {
      process.env.NODE_ENV = 'production'
      const optimizations = getEnvironmentOptimizations()
      
      expect(optimizations.enableQueryLogging).toBe(false)
      expect(optimizations.enableErrorLogging).toBe(true)
      expect(optimizations.enableQueryCaching).toBe(true)
      expect(optimizations.enableAlerts).toBe(true)
    })

    test('should detect serverless environment', () => {
      process.env.VERCEL = '1'
      const optimizations = getEnvironmentOptimizations()
      
      expect(optimizations.enableConnectionReuse).toBe(true)
      expect(optimizations.enableConnectionWarmup).toBe(true)
    })

    test('should detect development environment', () => {
      process.env.NODE_ENV = 'development'
      const optimizations = getEnvironmentOptimizations()
      
      expect(optimizations.enableQueryLogging).toBe(true)
      expect(optimizations.enableQueryCaching).toBe(false)
      expect(optimizations.enableAlerts).toBe(false)
    })
  })

  describe('Database URL Optimization', () => {
    test('should validate and optimize PostgreSQL URL', () => {
      const originalUrl = 'postgresql://user:pass@localhost:5432/db'
      const optimizedUrl = validateAndOptimizeDatabaseUrl(originalUrl)
      
      expect(optimizedUrl).toContain('connection_limit=10')
      expect(optimizedUrl).toContain('pool_timeout=20')
      expect(optimizedUrl).toContain('connect_timeout=10')
      expect(optimizedUrl).toContain('pgbouncer=true')
    })

    test('should preserve existing URL parameters', () => {
      const originalUrl = 'postgresql://user:pass@localhost:5432/db?schema=public&sslmode=require'
      const optimizedUrl = validateAndOptimizeDatabaseUrl(originalUrl)
      
      expect(optimizedUrl).toContain('schema=public')
      expect(optimizedUrl).toContain('sslmode=require')
      expect(optimizedUrl).toContain('connection_limit=10')
    })

    test('should throw error for invalid URL', () => {
      expect(() => {
        validateAndOptimizeDatabaseUrl('invalid-url')
      }).toThrow('Invalid DATABASE_URL format')
    })

    test('should throw error for empty URL', () => {
      expect(() => {
        validateAndOptimizeDatabaseUrl('')
      }).toThrow('DATABASE_URL is required')
    })
  })
})