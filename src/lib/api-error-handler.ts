import { NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'
import { getDatabaseConnectionState } from './db'

// Error codes enum
export enum ErrorCodes {
  DATABASE_CONNECTION_FAILED = 'DB_CONNECTION_FAILED',
  PRISMA_CLIENT_ERROR = 'PRISMA_CLIENT_ERROR',
  QUERY_EXECUTION_FAILED = 'QUERY_EXECUTION_FAILED',
  CONNECTION_TIMEOUT = 'CONNECTION_TIMEOUT',
  AUTHENTICATION_REQUIRED = 'AUTHENTICATION_REQUIRED',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  INTERNAL_SERVER_ERROR = 'INTERNAL_SERVER_ERROR'
}

// API response interface
export interface APIResponse<T = any> {
  success: boolean
  data?: T
  error?: {
    message: string
    code: string
    details?: any
  }
  meta?: {
    timestamp: Date
    endpoint: string
    connectionState?: any
  }
}

export class APIErrorHandler {
  static handleDatabaseError(error: Error, endpoint: string): NextResponse {
    const timestamp = new Date()
    const connectionState = getDatabaseConnectionState()

    // Log the error with context
    this.logError(endpoint, error)

    // Determine error type and appropriate response
    if (error instanceof Prisma.PrismaClientInitializationError) {
      return NextResponse.json({
        success: false,
        error: {
          message: 'Database connection failed. Please try again later.',
          code: ErrorCodes.DATABASE_CONNECTION_FAILED,
          details: process.env.NODE_ENV === 'development' ? error.message : undefined
        },
        meta: {
          timestamp,
          endpoint,
          connectionState
        }
      } as APIResponse, { status: 503 })
    }

    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      return NextResponse.json({
        success: false,
        error: {
          message: 'Database query failed. Please check your request and try again.',
          code: ErrorCodes.QUERY_EXECUTION_FAILED,
          details: process.env.NODE_ENV === 'development' ? {
            code: error.code,
            message: error.message
          } : undefined
        },
        meta: {
          timestamp,
          endpoint,
          connectionState
        }
      } as APIResponse, { status: 400 })
    }

    if (error instanceof Prisma.PrismaClientUnknownRequestError) {
      return NextResponse.json({
        success: false,
        error: {
          message: 'An unexpected database error occurred. Please try again later.',
          code: ErrorCodes.PRISMA_CLIENT_ERROR,
          details: process.env.NODE_ENV === 'development' ? error.message : undefined
        },
        meta: {
          timestamp,
          endpoint,
          connectionState
        }
      } as APIResponse, { status: 500 })
    }

    if (error.message.includes('timeout') || error.message.includes('TIMEOUT')) {
      return NextResponse.json({
        success: false,
        error: {
          message: 'Database connection timeout. Please try again.',
          code: ErrorCodes.CONNECTION_TIMEOUT,
          details: process.env.NODE_ENV === 'development' ? error.message : undefined
        },
        meta: {
          timestamp,
          endpoint,
          connectionState
        }
      } as APIResponse, { status: 504 })
    }

    // Generic database error
    return NextResponse.json({
      success: false,
      error: {
        message: 'A database error occurred. Please try again later.',
        code: ErrorCodes.PRISMA_CLIENT_ERROR,
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      },
      meta: {
        timestamp,
        endpoint,
        connectionState
      }
    } as APIResponse, { status: 500 })
  }

  static handleValidationError(error: any, endpoint: string): NextResponse {
    this.logError(endpoint, error)

    return NextResponse.json({
      success: false,
      error: {
        message: 'Invalid request parameters',
        code: ErrorCodes.VALIDATION_ERROR,
        details: error.errors || error.message
      },
      meta: {
        timestamp: new Date(),
        endpoint
      }
    } as APIResponse, { status: 400 })
  }

  static handleAuthenticationError(endpoint: string): NextResponse {
    return NextResponse.json({
      success: false,
      error: {
        message: 'Authentication required',
        code: ErrorCodes.AUTHENTICATION_REQUIRED
      },
      meta: {
        timestamp: new Date(),
        endpoint
      }
    } as APIResponse, { status: 401 })
  }

  static handleGenericError(error: Error, endpoint: string): NextResponse {
    this.logError(endpoint, error)

    return NextResponse.json({
      success: false,
      error: {
        message: 'An unexpected error occurred. Please try again later.',
        code: ErrorCodes.INTERNAL_SERVER_ERROR,
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      },
      meta: {
        timestamp: new Date(),
        endpoint
      }
    } as APIResponse, { status: 500 })
  }

  static logError(endpoint: string, error: Error): void {
    const connectionState = getDatabaseConnectionState()
    
    // Enhanced logging with more database-specific context
    const logData = {
      endpoint,
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack,
        // Add Prisma-specific error details if available
        ...(error instanceof Prisma.PrismaClientKnownRequestError && {
          prismaCode: error.code,
          prismaClientVersion: error.clientVersion,
          prismaMeta: error.meta
        }),
        ...(error instanceof Prisma.PrismaClientInitializationError && {
          prismaClientVersion: error.clientVersion,
          prismaErrorCode: error.errorCode
        })
      },
      connectionState,
      timestamp: new Date().toISOString(),
      nodeEnv: process.env.NODE_ENV,
      // Add process information for debugging
      processInfo: {
        pid: process.pid,
        uptime: process.uptime(),
        memoryUsage: process.memoryUsage()
      }
    }

    // Log with appropriate level based on error severity
    if (error instanceof Prisma.PrismaClientInitializationError) {
      console.error('🔴 CRITICAL DATABASE ERROR:', logData)
    } else if (error instanceof Prisma.PrismaClientKnownRequestError) {
      console.warn('🟡 DATABASE QUERY ERROR:', logData)
    } else if (error.message.includes('timeout') || error.message.includes('TIMEOUT')) {
      console.warn('🟡 DATABASE TIMEOUT ERROR:', logData)
    } else {
      console.error('🔴 API ERROR:', logData)
    }
  }

  static async validateDatabaseConnection(): Promise<boolean> {
    try {
      const { ensureDatabaseConnection } = await import('./db')
      return await ensureDatabaseConnection()
    } catch (error) {
      console.error('Database connection validation failed:', error)
      return false
    }
  }

  static createSuccessResponse<T>(data: T, endpoint: string): NextResponse {
    return NextResponse.json({
      success: true,
      data,
      meta: {
        timestamp: new Date(),
        endpoint
      }
    } as APIResponse<T>)
  }

  /**
   * Comprehensive database connection problem handler
   * Provides detailed diagnostics and recovery suggestions
   */
  static handleDatabaseConnectionProblem(error: Error, endpoint: string, context?: any): NextResponse {
    const timestamp = new Date()
    const connectionState = getDatabaseConnectionState()

    // Enhanced logging for database connection problems
    console.error('🔴 DATABASE CONNECTION PROBLEM:', {
      endpoint,
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack
      },
      connectionState,
      context,
      timestamp: timestamp.toISOString(),
      diagnostics: {
        databaseUrl: process.env.DATABASE_URL ? 'configured' : 'missing',
        nodeEnv: process.env.NODE_ENV,
        platform: process.platform,
        nodeVersion: process.version
      }
    })

    // Determine specific connection issue type
    let errorCode = ErrorCodes.DATABASE_CONNECTION_FAILED
    let statusCode = 503
    let userMessage = 'Database connection failed. Please try again later.'

    if (error.message.includes('ECONNREFUSED')) {
      userMessage = 'Database server is not responding. Please try again later.'
      errorCode = ErrorCodes.CONNECTION_TIMEOUT
    } else if (error.message.includes('ENOTFOUND')) {
      userMessage = 'Database server could not be found. Please try again later.'
    } else if (error.message.includes('authentication')) {
      userMessage = 'Database authentication failed. Please try again later.'
      statusCode = 401
    } else if (error.message.includes('timeout')) {
      userMessage = 'Database connection timeout. Please try again.'
      errorCode = ErrorCodes.CONNECTION_TIMEOUT
      statusCode = 504
    }

    return NextResponse.json({
      success: false,
      error: {
        message: userMessage,
        code: errorCode,
        details: process.env.NODE_ENV === 'development' ? {
          originalError: error.message,
          connectionState,
          suggestions: [
            'Check database server status',
            'Verify DATABASE_URL configuration',
            'Check network connectivity',
            'Review connection pool settings'
          ]
        } : undefined
      },
      meta: {
        timestamp,
        endpoint,
        connectionState
      }
    } as APIResponse, { status: statusCode })
  }
}

// Utility function for wrapping API handlers with error handling
export function withErrorHandling(
  handler: (request: Request, ...args: any[]) => Promise<NextResponse>,
  endpoint: string
) {
  return async (request: Request, ...args: any[]): Promise<NextResponse> => {
    const startTime = Date.now()
    
    try {
      // Validate database connection before processing
      const isConnected = await APIErrorHandler.validateDatabaseConnection()
      if (!isConnected) {
        return APIErrorHandler.handleDatabaseConnectionProblem(
          new Error('Database connection validation failed'),
          endpoint,
          { preValidation: true }
        )
      }

      const result = await handler(request, ...args)
      
      // Log successful API calls for monitoring
      const duration = Date.now() - startTime
      console.log(`✅ API Success: ${endpoint} (${duration}ms)`)
      
      return result
    } catch (error) {
      const duration = Date.now() - startTime
      
      if (error instanceof Error) {
        // Enhanced database error detection
        const isDatabaseError = 
          error.name.includes('Prisma') || 
          error.message.includes('database') || 
          error.message.includes('connection') ||
          error.message.includes('ECONNREFUSED') ||
          error.message.includes('ENOTFOUND') ||
          error.message.includes('timeout')

        if (isDatabaseError) {
          return APIErrorHandler.handleDatabaseError(error, endpoint)
        }
        
        // Log non-database errors with timing
        console.error(`❌ API Error: ${endpoint} (${duration}ms)`, {
          error: error.message,
          stack: error.stack
        })
        
        return APIErrorHandler.handleGenericError(error, endpoint)
      }
      
      return APIErrorHandler.handleGenericError(
        new Error('Unknown error occurred'),
        endpoint
      )
    }
  }
}

/**
 * Enhanced wrapper specifically for database-heavy operations
 * Provides additional database connection monitoring and recovery
 */
export function withDatabaseErrorHandling(
  handler: (request: Request, ...args: any[]) => Promise<NextResponse>,
  endpoint: string,
  options: { retryOnFailure?: boolean; maxRetries?: number } = {}
) {
  const { retryOnFailure = false, maxRetries = 1 } = options
  
  return async (request: Request, ...args: any[]): Promise<NextResponse> => {
    let lastError: Error | null = null
    
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        // Pre-flight database connection check
        const isConnected = await APIErrorHandler.validateDatabaseConnection()
        if (!isConnected) {
          throw new Error('Database connection validation failed')
        }

        return await handler(request, ...args)
      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Unknown error')
        
        // Only retry on database connection issues
        const shouldRetry = retryOnFailure && 
          attempt < maxRetries && 
          (lastError.message.includes('connection') || 
           lastError.message.includes('timeout') ||
           lastError instanceof Prisma.PrismaClientInitializationError)
        
        if (shouldRetry) {
          console.warn(`🔄 Retrying ${endpoint} (attempt ${attempt + 1}/${maxRetries + 1})`)
          // Brief delay before retry
          await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1)))
          continue
        }
        
        // Handle the error if no more retries
        if (lastError.name.includes('Prisma') || 
            lastError.message.includes('database') || 
            lastError.message.includes('connection')) {
          return APIErrorHandler.handleDatabaseConnectionProblem(lastError, endpoint, {
            attempts: attempt + 1,
            maxRetries
          })
        }
        
        return APIErrorHandler.handleGenericError(lastError, endpoint)
      }
    }
    
    // This should never be reached, but just in case
    return APIErrorHandler.handleGenericError(
      lastError || new Error('Maximum retries exceeded'),
      endpoint
    )
  }
}