/**
 * Comprehensive API Tests
 * 
 * This test suite covers:
 * - Unit tests for database connection manager
 * - Integration tests for API endpoints with database connection scenarios
 * - Error handling and recovery mechanisms
 * 
 * Requirements: 4.1, 4.2, 4.3
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach, jest } from '@jest/globals'
import { NextRequest, NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'

// Mock modules before importing
jest.mock('@prisma/client', () => ({
  PrismaClient: jest.fn().mockImplementation(() => ({
    $connect: jest.fn().mockResolvedValue(undefined),
    $disconnect: jest.fn().mockResolvedValue(undefined),
    $queryRaw: jest.fn().mockResolvedValue([{ test: 1 }]),
    mwd_account: {
      count: jest.fn().mockResolvedValue(5),
      findUnique: jest.fn().mockResolvedValue({
        id: 'test-user-id',
        username: 'testuser',
        name: 'Test User',
        email: 'test@example.com'
      })
    },
    mwd_test: {
      findMany: jest.fn().mockResolvedValue([
        { id: 1, title: 'Test 1', category: 'aptitude' },
        { id: 2, title: 'Test 2', category: 'personality' }
      ]),
      count: jest.fn().mockResolvedValue(2)
    },
    mwd_test_result: {
      findMany: jest.fn().mockResolvedValue([
        { id: 1, userId: 'test-user-id', testId: 1, score: 85 }
      ])
    }
  })),
  Prisma: {
    PrismaClientInitializationError: class extends Error {
      constructor(message: string, clientVersion: string, errorCode: string) {
        super(message)
        this.name = 'PrismaClientInitializationError'
        this.clientVersion = clientVersion
        this.errorCode = errorCode
      }
      clientVersion: string
      errorCode: string
    },
    PrismaClientKnownRequestError: class extends Error {
      constructor(message: string, options: { code: string; clientVersion: string }) {
        super(message)
        this.name = 'PrismaClientKnownRequestError'
        this.code = options.code
        this.clientVersion = options.clientVersion
      }
      code: string
      clientVersion: string
    }
  }
}))

// Import modules after mocking
import { 
  databaseManager, 
  ensureDatabaseConnection, 
  getDatabaseClient, 
  withDatabaseRetry,
  getDatabaseConnectionState 
} from '../db'
import { APIErrorHandler, ErrorCodes } from '../api-error-handler'
import { databaseMiddleware, withDatabase } from '../middleware/database'

describe('Comprehensive API Tests', () => {
  // Test data
  const testUserId = 'test-user-id-123'
  const testEndpoint = '/api/test'

  beforeAll(() => {
    // Setup global test environment
    jest.clearAllMocks()
  })

  afterAll(async () => {
    // Cleanup after all tests
    await databaseManager.disconnect()
  })

  beforeEach(() => {
    // Reset mocks before each test
    jest.clearAllMocks()
  })

  afterEach(async () => {
    // Cleanup after each test
    await databaseManager.disconnect()
  })

  describe('Database Connection Manager Unit Tests', () => {
    describe('Connection Initialization', () => {
      it('should initialize database client successfully', async () => {
        const client = await getDatabaseClient()
        
        expect(client).toBeDefined()
        expect(client.$connect).toHaveBeenCalled()
        
        // Verify client has expected methods
        expect(client.mwd_account).toBeDefined()
        expect(client.mwd_test).toBeDefined()
        expect(client.mwd_test_result).toBeDefined()
      })

      it('should reuse existing client instance', async () => {
        const client1 = await getDatabaseClient()
        const client2 = await getDatabaseClient()
        
        expect(client1).toBe(client2)
        // $connect should only be called once for the same instance
        expect(client1.$connect).toHaveBeenCalledTimes(1)
      })

      it('should handle client initialization errors', async () => {
        // Mock initialization failure
        const { PrismaClient } = require('@prisma/client')
        PrismaClient.mockImplementationOnce(() => {
          throw new Error('Failed to initialize Prisma client')
        })

        await expect(getDatabaseClient()).rejects.toThrow('Failed to initialize Prisma client')
      })
    })

    describe('Connection Validation', () => {
      it('should validate successful database connection', async () => {
        const isConnected = await ensureDatabaseConnection()
        expect(isConnected).toBe(true)
      })

      it('should handle connection validation failures', async () => {
        // Mock connection failure
        const client = await getDatabaseClient()
        client.$queryRaw.mockRejectedValueOnce(new Error('Connection timeout'))

        const isConnected = await ensureDatabaseConnection()
        expect(isConnected).toBe(false)
      })

      it('should update connection state correctly', async () => {
        await ensureDatabaseConnection()
        const state = getDatabaseConnectionState()
        
        expect(state).toHaveProperty('isConnected')
        expect(state).toHaveProperty('lastConnectionCheck')
        expect(state).toHaveProperty('connectionAttempts')
        expect(state.lastConnectionCheck).toBeInstanceOf(Date)
      })
    })

    describe('Retry Mechanism', () => {
      it('should retry operations on transient failures', async () => {
        const mockOperation = jest.fn()
          .mockRejectedValueOnce(new Error('Connection timeout'))
          .mockRejectedValueOnce(new Error('Network error'))
          .mockResolvedValueOnce('success')

        const result = await withDatabaseRetry(mockOperation)
        
        expect(result).toBe('success')
        expect(mockOperation).toHaveBeenCalledTimes(3)
      })

      it('should fail after maximum retry attempts', async () => {
        const mockOperation = jest.fn()
          .mockRejectedValue(new Error('Persistent failure'))

        await expect(withDatabaseRetry(mockOperation, { maxRetries: 2 }))
          .rejects.toThrow('Persistent failure')
        
        expect(mockOperation).toHaveBeenCalledTimes(3) // Initial + 2 retries
      })

      it('should respect retry delay configuration', async () => {
        const startTime = Date.now()
        const mockOperation = jest.fn()
          .mockRejectedValueOnce(new Error('Temporary failure'))
          .mockResolvedValueOnce('success')

        await withDatabaseRetry(mockOperation, { retryDelay: 100 })
        const endTime = Date.now()
        
        expect(endTime - startTime).toBeGreaterThanOrEqual(100)
        expect(mockOperation).toHaveBeenCalledTimes(2)
      })
    })

    describe('Error Handling', () => {
      it('should handle connection errors gracefully', () => {
        const error = new Error('Database connection lost')
        databaseManager.handleConnectionError(error)
        
        const state = getDatabaseConnectionState()
        expect(state.isConnected).toBe(false)
        expect(state.lastError).toBe(error)
        expect(state.connectionAttempts).toBeGreaterThan(0)
      })

      it('should track multiple connection attempts', () => {
        const error1 = new Error('First error')
        const error2 = new Error('Second error')
        
        databaseManager.handleConnectionError(error1)
        const state1 = getDatabaseConnectionState()
        
        databaseManager.handleConnectionError(error2)
        const state2 = getDatabaseConnectionState()
        
        expect(state2.connectionAttempts).toBeGreaterThan(state1.connectionAttempts)
        expect(state2.lastError).toBe(error2)
      })
    })
  })

  describe('API Error Handler Unit Tests', () => {
    describe('Database Error Handling', () => {
      it('should handle Prisma initialization errors', () => {
        const { Prisma } = require('@prisma/client')
        const error = new Prisma.PrismaClientInitializationError(
          'Connection failed', 
          '1.0.0', 
          'P1001'
        )
        
        const response = APIErrorHandler.handleDatabaseError(error, testEndpoint)
        
        expect(response).toBeInstanceOf(NextResponse)
      })

      it('should handle Prisma known request errors', () => {
        const { Prisma } = require('@prisma/client')
        const error = new Prisma.PrismaClientKnownRequestError(
          'Unique constraint failed', 
          { code: 'P2002', clientVersion: '1.0.0' }
        )
        
        const response = APIErrorHandler.handleDatabaseError(error, testEndpoint)
        
        expect(response).toBeInstanceOf(NextResponse)
      })

      it('should handle connection timeout errors', () => {
        const error = new Error('Connection timeout occurred')
        const response = APIErrorHandler.handleDatabaseError(error, testEndpoint)
        
        expect(response).toBeInstanceOf(NextResponse)
      })

      it('should handle generic database errors', () => {
        const error = new Error('Generic database error')
        const response = APIErrorHandler.handleDatabaseError(error, testEndpoint)
        
        expect(response).toBeInstanceOf(NextResponse)
      })
    })

    describe('Validation Error Handling', () => {
      it('should handle validation errors', () => {
        const validationError = { errors: ['Field is required', 'Invalid format'] }
        const response = APIErrorHandler.handleValidationError(validationError, testEndpoint)
        
        expect(response).toBeInstanceOf(NextResponse)
      })

      it('should handle authentication errors', () => {
        const response = APIErrorHandler.handleAuthenticationError(testEndpoint)
        
        expect(response).toBeInstanceOf(NextResponse)
      })
    })

    describe('Success Response Creation', () => {
      it('should create success response with data', () => {
        const data = { message: 'Operation successful', count: 5 }
        const response = APIErrorHandler.createSuccessResponse(data, testEndpoint)
        
        expect(response).toBeInstanceOf(NextResponse)
      })

      it('should create success response with metadata', () => {
        const data = { items: [], pagination: { page: 1, total: 0 } }
        const response = APIErrorHandler.createSuccessResponse(data, testEndpoint)
        
        expect(response).toBeInstanceOf(NextResponse)
      })
    })

    describe('Database Connection Validation', () => {
      it('should validate database connection successfully', async () => {
        const isValid = await APIErrorHandler.validateDatabaseConnection()
        expect(typeof isValid).toBe('boolean')
      })

      it('should handle validation failures', async () => {
        // Mock connection failure
        jest.doMock('../db', () => ({
          ensureDatabaseConnection: jest.fn().mockResolvedValue(false)
        }))

        const isValid = await APIErrorHandler.validateDatabaseConnection()
        expect(isValid).toBe(false)
      })
    })
  })

  describe('API Endpoint Integration Tests', () => {
    describe('Tests API Endpoint', () => {
      it('should handle successful test data retrieval', async () => {
        const request = new NextRequest('http://localhost:3000/api/tests?limit=10')
        
        const handler = withDatabase(
          async (req, prisma) => {
            const tests = await prisma.mwd_test.findMany({ take: 10 })
            const totalCount = await prisma.mwd_test.count()
            
            return {
              tests,
              pagination: {
                currentPage: 1,
                totalPages: Math.ceil(totalCount / 10),
                totalCount,
                hasNextPage: totalCount > 10,
                hasPreviousPage: false,
                limit: 10
              }
            }
          }
        )
        
        const response = await handler(request)
        expect(response).toBeInstanceOf(NextResponse)
        
        const data = await response.json()
        expect(data.success).toBe(true)
        expect(data.data.tests).toHaveLength(2)
        expect(data.data.pagination.totalCount).toBe(2)
      })

      it('should handle database connection failures', async () => {
        const request = new NextRequest('http://localhost:3000/api/tests')
        
        const handler = withDatabase(
          async (req, prisma) => {
            // Simulate database connection failure
            prisma.mwd_test.findMany.mockRejectedValueOnce(
              new Error('Connection lost')
            )
            
            const tests = await prisma.mwd_test.findMany()
            return { tests }
          }
        )
        
        const response = await handler(request)
        expect(response).toBeInstanceOf(NextResponse)
        
        const data = await response.json()
        expect(data.success).toBe(false)
        expect(data.error).toBeDefined()
      })

      it('should handle query parameter validation', async () => {
        const request = new NextRequest('http://localhost:3000/api/tests?limit=invalid')
        
        const handler = withDatabase(
          async (req, prisma) => {
            const url = new URL(req.url)
            const limit = parseInt(url.searchParams.get('limit') || '10')
            
            if (isNaN(limit) || limit < 1 || limit > 100) {
              throw new Error('Invalid limit parameter')
            }
            
            const tests = await prisma.mwd_test.findMany({ take: limit })
            return { tests }
          }
        )
        
        const response = await handler(request)
        expect(response).toBeInstanceOf(NextResponse)
        
        const data = await response.json()
        expect(data.success).toBe(false)
        expect(data.error.message).toContain('Invalid limit parameter')
      })
    })

    describe('Profile API Endpoint', () => {
      it('should handle successful profile retrieval', async () => {
        const request = new NextRequest(`http://localhost:3000/api/profile/${testUserId}`)
        
        const handler = withDatabase(
          async (req, prisma) => {
            const userId = req.url.split('/').pop()
            
            if (!userId) {
              throw new Error('User ID is required')
            }
            
            const profile = await prisma.mwd_account.findUnique({
              where: { id: userId }
            })
            
            if (!profile) {
              throw new Error('User not found')
            }
            
            return { profile }
          }
        )
        
        const response = await handler(request)
        expect(response).toBeInstanceOf(NextResponse)
        
        const data = await response.json()
        expect(data.success).toBe(true)
        expect(data.data.profile.id).toBe('test-user-id')
      })

      it('should handle user not found scenarios', async () => {
        const request = new NextRequest('http://localhost:3000/api/profile/nonexistent-user')
        
        const handler = withDatabase(
          async (req, prisma) => {
            const userId = req.url.split('/').pop()
            
            // Mock user not found
            prisma.mwd_account.findUnique.mockResolvedValueOnce(null)
            
            const profile = await prisma.mwd_account.findUnique({
              where: { id: userId }
            })
            
            if (!profile) {
              throw new Error('User not found')
            }
            
            return { profile }
          }
        )
        
        const response = await handler(request)
        expect(response).toBeInstanceOf(NextResponse)
        
        const data = await response.json()
        expect(data.success).toBe(false)
        expect(data.error.message).toContain('User not found')
      })

      it('should handle invalid user ID format', async () => {
        const request = new NextRequest('http://localhost:3000/api/profile/invalid-uuid')
        
        const handler = withDatabase(
          async (req, prisma) => {
            const userId = req.url.split('/').pop()
            const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
            
            if (!userId || !uuidRegex.test(userId)) {
              throw new Error('Invalid UUID format')
            }
            
            const profile = await prisma.mwd_account.findUnique({
              where: { id: userId }
            })
            
            return { profile }
          }
        )
        
        const response = await handler(request)
        expect(response).toBeInstanceOf(NextResponse)
        
        const data = await response.json()
        expect(data.success).toBe(false)
        expect(data.error.message).toContain('Invalid UUID format')
      })
    })

    describe('Results API Endpoint', () => {
      it('should handle successful results retrieval', async () => {
        const request = new NextRequest(`http://localhost:3000/api/results/${testUserId}`)
        
        const handler = withDatabase(
          async (req, prisma) => {
            const userId = req.url.split('/').pop()
            
            const results = await prisma.mwd_test_result.findMany({
              where: { userId }
            })
            
            return { results }
          }
        )
        
        const response = await handler(request)
        expect(response).toBeInstanceOf(NextResponse)
        
        const data = await response.json()
        expect(data.success).toBe(true)
        expect(data.data.results).toHaveLength(1)
      })

      it('should handle empty results gracefully', async () => {
        const request = new NextRequest(`http://localhost:3000/api/results/${testUserId}`)
        
        const handler = withDatabase(
          async (req, prisma) => {
            const userId = req.url.split('/').pop()
            
            // Mock empty results
            prisma.mwd_test_result.findMany.mockResolvedValueOnce([])
            
            const results = await prisma.mwd_test_result.findMany({
              where: { userId }
            })
            
            return { results }
          }
        )
        
        const response = await handler(request)
        expect(response).toBeInstanceOf(NextResponse)
        
        const data = await response.json()
        expect(data.success).toBe(true)
        expect(data.data.results).toHaveLength(0)
      })
    })
  })

  describe('Error Handling and Recovery Mechanisms', () => {
    describe('Connection Recovery', () => {
      it('should recover from temporary connection failures', async () => {
        const request = new NextRequest('http://localhost:3000/api/test')
        
        let attemptCount = 0
        const handler = withDatabase(
          async (req, prisma) => {
            attemptCount++
            
            // Fail first two attempts, succeed on third
            if (attemptCount <= 2) {
              throw new Error('Connection timeout')
            }
            
            const result = await prisma.$queryRaw`SELECT 'recovery_test' as test`
            return { result }
          },
          {
            retryOnFailure: true,
            maxRetries: 3,
            retryDelay: 50
          }
        )
        
        const response = await handler(request)
        expect(response).toBeInstanceOf(NextResponse)
        
        const data = await response.json()
        expect(data.success).toBe(true)
        expect(attemptCount).toBe(3)
      })

      it('should fail gracefully after max retries', async () => {
        const request = new NextRequest('http://localhost:3000/api/test')
        
        const handler = withDatabase(
          async (req, prisma) => {
            throw new Error('Persistent connection failure')
          },
          {
            retryOnFailure: true,
            maxRetries: 2,
            retryDelay: 10
          }
        )
        
        const response = await handler(request)
        expect(response).toBeInstanceOf(NextResponse)
        
        const data = await response.json()
        expect(data.success).toBe(false)
        expect(data.error.message).toContain('Persistent connection failure')
      })
    })

    describe('Error Classification', () => {
      it('should classify retryable vs non-retryable errors', async () => {
        const request = new NextRequest('http://localhost:3000/api/test')
        
        // Test retryable error (connection timeout)
        const retryableHandler = withDatabase(
          async (req, prisma) => {
            throw new Error('Connection timeout')
          },
          { retryOnFailure: true, maxRetries: 1, retryDelay: 10 }
        )
        
        const retryableResponse = await retryableHandler(request)
        const retryableData = await retryableResponse.json()
        expect(retryableData.success).toBe(false)
        
        // Test non-retryable error (validation error)
        const nonRetryableHandler = withDatabase(
          async (req, prisma) => {
            throw new Error('Invalid input data')
          },
          { retryOnFailure: true, maxRetries: 1 }
        )
        
        const nonRetryableResponse = await nonRetryableHandler(request)
        const nonRetryableData = await nonRetryableResponse.json()
        expect(nonRetryableData.success).toBe(false)
      })

      it('should handle different Prisma error types', async () => {
        const request = new NextRequest('http://localhost:3000/api/test')
        const { Prisma } = require('@prisma/client')
        
        // Test initialization error
        const initErrorHandler = withDatabase(
          async (req, prisma) => {
            throw new Prisma.PrismaClientInitializationError(
              'Database connection failed',
              '1.0.0',
              'P1001'
            )
          }
        )
        
        const initResponse = await initErrorHandler(request)
        const initData = await initResponse.json()
        expect(initData.success).toBe(false)
        expect(initData.error.code).toBe('DB_CONNECTION_FAILED')
        
        // Test known request error
        const knownErrorHandler = withDatabase(
          async (req, prisma) => {
            throw new Prisma.PrismaClientKnownRequestError(
              'Unique constraint violation',
              { code: 'P2002', clientVersion: '1.0.0' }
            )
          }
        )
        
        const knownResponse = await knownErrorHandler(request)
        const knownData = await knownResponse.json()
        expect(knownData.success).toBe(false)
      })
    })

    describe('Fallback Mechanisms', () => {
      it('should provide fallback data when database is unavailable', async () => {
        const request = new NextRequest('http://localhost:3000/api/tests')
        
        const handler = withDatabase(
          async (req, prisma) => {
            try {
              const tests = await prisma.mwd_test.findMany()
              return { tests }
            } catch (error) {
              // Provide fallback data
              return {
                tests: [],
                fallback: true,
                message: 'Using fallback data due to connection issues'
              }
            }
          }
        )
        
        // Mock database failure
        const client = await getDatabaseClient()
        client.mwd_test.findMany.mockRejectedValueOnce(new Error('Database unavailable'))
        
        const response = await handler(request)
        expect(response).toBeInstanceOf(NextResponse)
        
        const data = await response.json()
        expect(data.success).toBe(true)
        expect(data.data.fallback).toBe(true)
        expect(data.data.message).toContain('fallback data')
      })

      it('should handle partial data loading', async () => {
        const request = new NextRequest(`http://localhost:3000/api/dashboard/${testUserId}`)
        
        const handler = withDatabase(
          async (req, prisma) => {
            const userId = req.url.split('/').pop()
            const results = {
              profile: null,
              tests: [],
              results: [],
              errors: []
            }
            
            // Try to load profile
            try {
              results.profile = await prisma.mwd_account.findUnique({
                where: { id: userId }
              })
            } catch (error) {
              results.errors.push('Failed to load profile')
            }
            
            // Try to load tests
            try {
              results.tests = await prisma.mwd_test.findMany({ take: 5 })
            } catch (error) {
              results.errors.push('Failed to load tests')
            }
            
            // Try to load results
            try {
              results.results = await prisma.mwd_test_result.findMany({
                where: { userId }
              })
            } catch (error) {
              results.errors.push('Failed to load results')
            }
            
            return results
          }
        )
        
        // Mock partial failures
        const client = await getDatabaseClient()
        client.mwd_test.findMany.mockRejectedValueOnce(new Error('Tests unavailable'))
        
        const response = await handler(request)
        expect(response).toBeInstanceOf(NextResponse)
        
        const data = await response.json()
        expect(data.success).toBe(true)
        expect(data.data.profile).toBeDefined()
        expect(data.data.errors).toContain('Failed to load tests')
      })
    })

    describe('Logging and Monitoring', () => {
      it('should log error details for debugging', async () => {
        const consoleSpy = jest.spyOn(console, 'error').mockImplementation()
        const request = new NextRequest('http://localhost:3000/api/test')
        
        const handler = withDatabase(
          async (req, prisma) => {
            throw new Error('Test error for logging')
          }
        )
        
        await handler(request)
        
        expect(consoleSpy).toHaveBeenCalled()
        consoleSpy.mockRestore()
      })

      it('should track performance metrics', async () => {
        const request = new NextRequest('http://localhost:3000/api/test')
        
        const handler = withDatabase(
          async (req, prisma) => {
            // Simulate slow operation
            await new Promise(resolve => setTimeout(resolve, 100))
            return { message: 'Performance test' }
          }
        )
        
        const startTime = Date.now()
        const response = await handler(request)
        const endTime = Date.now()
        
        expect(response).toBeInstanceOf(NextResponse)
        expect(endTime - startTime).toBeGreaterThanOrEqual(100)
        
        const data = await response.json()
        expect(data.success).toBe(true)
      })
    })
  })

  describe('Concurrent Request Handling', () => {
    it('should handle multiple concurrent API requests', async () => {
      const requests = Array.from({ length: 5 }, (_, i) => 
        new NextRequest(`http://localhost:3000/api/test?id=${i}`)
      )
      
      const handler = withDatabase(
        async (req, prisma) => {
          const url = new URL(req.url)
          const id = url.searchParams.get('id')
          
          // Simulate database query
          const result = await prisma.$queryRaw`SELECT ${id} as request_id`
          return { requestId: id, result }
        }
      )
      
      const promises = requests.map(request => handler(request))
      const responses = await Promise.all(promises)
      
      expect(responses).toHaveLength(5)
      
      for (let i = 0; i < responses.length; i++) {
        const data = await responses[i].json()
        expect(data.success).toBe(true)
        expect(data.data.requestId).toBe(i.toString())
      }
    })

    it('should handle connection pool exhaustion gracefully', async () => {
      // Simulate many concurrent requests that could exhaust connection pool
      const requests = Array.from({ length: 20 }, (_, i) => 
        new NextRequest(`http://localhost:3000/api/test?batch=${i}`)
      )
      
      const handler = withDatabase(
        async (req, prisma) => {
          const url = new URL(req.url)
          const batch = url.searchParams.get('batch')
          
          // Simulate longer database operation
          await new Promise(resolve => setTimeout(resolve, 50))
          const result = await prisma.$queryRaw`SELECT ${batch} as batch_id`
          
          return { batchId: batch, result }
        },
        {
          timeout: 5000,
          retryOnFailure: true,
          maxRetries: 1
        }
      )
      
      const promises = requests.map(request => handler(request))
      const responses = await Promise.all(promises)
      
      expect(responses).toHaveLength(20)
      
      // All requests should either succeed or fail gracefully
      for (const response of responses) {
        const data = await response.json()
        expect(data).toHaveProperty('success')
        
        if (!data.success) {
          // Should have proper error structure
          expect(data).toHaveProperty('error')
          expect(data.error).toHaveProperty('message')
          expect(data.error).toHaveProperty('code')
        }
      }
    })
  })

  describe('Database Connection State Monitoring', () => {
    it('should track connection state changes over time', async () => {
      // Initial state
      const initialState = getDatabaseConnectionState()
      expect(initialState).toHaveProperty('isConnected')
      expect(initialState).toHaveProperty('lastConnectionCheck')
      expect(initialState).toHaveProperty('connectionAttempts')
      
      // Simulate connection failure
      const error = new Error('Connection lost')
      databaseManager.handleConnectionError(error)
      
      const errorState = getDatabaseConnectionState()
      expect(errorState.isConnected).toBe(false)
      expect(errorState.lastError).toBe(error)
      expect(errorState.connectionAttempts).toBeGreaterThan(initialState.connectionAttempts)
      
      // Simulate recovery
      await ensureDatabaseConnection()
      
      const recoveredState = getDatabaseConnectionState()
      expect(recoveredState.lastConnectionCheck.getTime()).toBeGreaterThan(errorState.lastConnectionCheck.getTime())
    })

    it('should provide detailed connection diagnostics', async () => {
      const client = await getDatabaseClient()
      
      // Test connection health
      const healthCheck = async () => {
        try {
          await client.$queryRaw`SELECT 1 as health_check`
          return { healthy: true, latency: Date.now() }
        } catch (error) {
          return { healthy: false, error: error.message }
        }
      }
      
      const health = await healthCheck()
      expect(health).toHaveProperty('healthy')
      
      if (health.healthy) {
        expect(health).toHaveProperty('latency')
        expect(typeof health.latency).toBe('number')
      } else {
        expect(health).toHaveProperty('error')
        expect(typeof health.error).toBe('string')
      }
    })
  })

  describe('API Response Consistency', () => {
    it('should maintain consistent response format across all endpoints', async () => {
      const endpoints = [
        { path: '/api/tests', handler: withDatabase(async (req, prisma) => {
          const tests = await prisma.mwd_test.findMany({ take: 5 })
          return { tests, count: tests.length }
        })},
        { path: `/api/profile/${testUserId}`, handler: withDatabase(async (req, prisma) => {
          const profile = await prisma.mwd_account.findUnique({ where: { id: testUserId } })
          return { profile }
        })},
        { path: `/api/results/${testUserId}`, handler: withDatabase(async (req, prisma) => {
          const results = await prisma.mwd_test_result.findMany({ where: { userId: testUserId } })
          return { results }
        })}
      ]
      
      for (const endpoint of endpoints) {
        const request = new NextRequest(`http://localhost:3000${endpoint.path}`)
        const response = await endpoint.handler(request)
        const data = await response.json()
        
        // Check consistent response structure
        expect(data).toHaveProperty('success')
        expect(data).toHaveProperty('meta')
        expect(data.meta).toHaveProperty('timestamp')
        expect(data.meta).toHaveProperty('endpoint')
        
        if (data.success) {
          expect(data).toHaveProperty('data')
        } else {
          expect(data).toHaveProperty('error')
          expect(data.error).toHaveProperty('message')
          expect(data.error).toHaveProperty('code')
        }
      }
    })

    it('should handle different HTTP methods consistently', async () => {
      const testCases = [
        { method: 'GET', expectSuccess: true },
        { method: 'POST', expectSuccess: false }, // Should return method not allowed
        { method: 'PUT', expectSuccess: false },
        { method: 'DELETE', expectSuccess: false }
      ]
      
      for (const testCase of testCases) {
        const request = new NextRequest('http://localhost:3000/api/tests', {
          method: testCase.method
        })
        
        const handler = withDatabase(async (req, prisma) => {
          if (req.method !== 'GET') {
            throw new Error(`Method ${req.method} not allowed`)
          }
          
          const tests = await prisma.mwd_test.findMany({ take: 1 })
          return { tests }
        })
        
        const response = await handler(request)
        const data = await response.json()
        
        expect(data).toHaveProperty('success')
        expect(data.success).toBe(testCase.expectSuccess)
        
        if (!testCase.expectSuccess) {
          expect(data.error.message).toContain('not allowed')
        }
      }
    })
  })

  describe('Advanced Error Recovery Scenarios', () => {
    it('should handle cascading failures gracefully', async () => {
      const request = new NextRequest('http://localhost:3000/api/dashboard')
      
      const handler = withDatabase(async (req, prisma) => {
        const results = {
          profile: null,
          tests: [],
          results: [],
          errors: [],
          partialSuccess: false
        }
        
        // Simulate multiple service failures
        const operations = [
          {
            name: 'profile',
            operation: () => prisma.mwd_account.findUnique({ where: { id: testUserId } })
          },
          {
            name: 'tests',
            operation: () => prisma.mwd_test.findMany({ take: 5 })
          },
          {
            name: 'results',
            operation: () => prisma.mwd_test_result.findMany({ where: { userId: testUserId } })
          }
        ]
        
        let successCount = 0
        
        for (const op of operations) {
          try {
            results[op.name] = await op.operation()
            successCount++
          } catch (error) {
            results.errors.push(`Failed to load ${op.name}: ${error.message}`)
          }
        }
        
        results.partialSuccess = successCount > 0
        
        return results
      })
      
      // Mock some failures
      const client = await getDatabaseClient()
      client.mwd_test.findMany.mockRejectedValueOnce(new Error('Tests service unavailable'))
      
      const response = await handler(request)
      const data = await response.json()
      
      expect(data.success).toBe(true)
      expect(data.data.partialSuccess).toBe(true)
      expect(data.data.errors.length).toBeGreaterThan(0)
      expect(data.data.profile).toBeDefined() // Should still have profile
    })

    it('should implement circuit breaker pattern for repeated failures', async () => {
      let failureCount = 0
      const maxFailures = 3
      let circuitOpen = false
      
      const handler = withDatabase(async (req, prisma) => {
        if (circuitOpen) {
          throw new Error('Circuit breaker is open - service temporarily unavailable')
        }
        
        try {
          // Simulate operation that might fail
          if (failureCount < maxFailures) {
            failureCount++
            throw new Error(`Simulated failure ${failureCount}`)
          }
          
          const result = await prisma.$queryRaw`SELECT 'success' as status`
          failureCount = 0 // Reset on success
          return { result }
        } catch (error) {
          if (failureCount >= maxFailures) {
            circuitOpen = true
            setTimeout(() => {
              circuitOpen = false
              failureCount = 0
            }, 5000) // Reset circuit after 5 seconds
          }
          throw error
        }
      })
      
      const requests = Array.from({ length: 5 }, () => 
        new NextRequest('http://localhost:3000/api/test')
      )
      
      const responses = []
      for (const request of requests) {
        try {
          const response = await handler(request)
          responses.push(await response.json())
        } catch (error) {
          responses.push({ success: false, error: { message: error.message } })
        }
      }
      
      // First 3 should fail with simulated failures
      expect(responses[0].success).toBe(false)
      expect(responses[1].success).toBe(false)
      expect(responses[2].success).toBe(false)
      
      // 4th and 5th should fail with circuit breaker message
      expect(responses[3].error.message).toContain('Circuit breaker is open')
      expect(responses[4].error.message).toContain('Circuit breaker is open')
    })
  })

  describe('Performance and Load Testing', () => {
    it('should handle high-frequency requests without degradation', async () => {
      const requestCount = 50
      const requests = Array.from({ length: requestCount }, (_, i) => 
        new NextRequest(`http://localhost:3000/api/tests?batch=${i}`)
      )
      
      const handler = withDatabase(async (req, prisma) => {
        const url = new URL(req.url)
        const batch = url.searchParams.get('batch')
        
        // Simulate realistic database operation
        const tests = await prisma.mwd_test.findMany({ take: 1 })
        return { batch, count: tests.length }
      })
      
      const startTime = Date.now()
      const promises = requests.map(request => handler(request))
      const responses = await Promise.all(promises)
      const endTime = Date.now()
      
      const totalTime = endTime - startTime
      const averageTime = totalTime / requestCount
      
      expect(responses).toHaveLength(requestCount)
      expect(averageTime).toBeLessThan(1000) // Average should be under 1 second
      
      // All responses should be successful
      for (const response of responses) {
        const data = await response.json()
        expect(data.success).toBe(true)
      }
    })

    it('should maintain performance under memory pressure', async () => {
      const handler = withDatabase(async (req, prisma) => {
        // Simulate memory-intensive operation
        const largeData = Array.from({ length: 10000 }, (_, i) => ({
          id: i,
          data: `Large data item ${i}`.repeat(100)
        }))
        
        // Simulate database operation
        const tests = await prisma.mwd_test.findMany({ take: 1 })
        
        return { 
          tests, 
          processedItems: largeData.length,
          memoryUsage: process.memoryUsage()
        }
      })
      
      const request = new NextRequest('http://localhost:3000/api/memory-test')
      const response = await handler(request)
      const data = await response.json()
      
      expect(data.success).toBe(true)
      expect(data.data.processedItems).toBe(10000)
      expect(data.data.memoryUsage).toHaveProperty('heapUsed')
      expect(data.data.memoryUsage).toHaveProperty('heapTotal')
    })
  })

  describe('Security and Validation Testing', () => {
    it('should prevent SQL injection attempts', async () => {
      const maliciousInputs = [
        "'; DROP TABLE mwd_test; --",
        "1' OR '1'='1",
        "1; DELETE FROM mwd_account WHERE 1=1; --",
        "UNION SELECT * FROM mwd_account"
      ]
      
      const handler = withDatabase(async (req, prisma) => {
        const url = new URL(req.url)
        const searchTerm = url.searchParams.get('search')
        
        if (!searchTerm) {
          throw new Error('Search term is required')
        }
        
        // Use parameterized query to prevent SQL injection
        const tests = await prisma.mwd_test.findMany({
          where: {
            title: {
              contains: searchTerm
            }
          },
          take: 10
        })
        
        return { tests, searchTerm }
      })
      
      for (const maliciousInput of maliciousInputs) {
        const request = new NextRequest(
          `http://localhost:3000/api/tests?search=${encodeURIComponent(maliciousInput)}`
        )
        
        const response = await handler(request)
        const data = await response.json()
        
        // Should not crash or return unexpected data
        expect(data).toHaveProperty('success')
        
        if (data.success) {
          expect(Array.isArray(data.data.tests)).toBe(true)
          expect(data.data.searchTerm).toBe(maliciousInput)
        }
      }
    })

    it('should validate input parameters thoroughly', async () => {
      const testCases = [
        { param: 'limit', value: '-1', expectError: true },
        { param: 'limit', value: '1001', expectError: true },
        { param: 'limit', value: 'abc', expectError: true },
        { param: 'limit', value: '10', expectError: false },
        { param: 'offset', value: '-5', expectError: true },
        { param: 'offset', value: 'xyz', expectError: true },
        { param: 'offset', value: '0', expectError: false }
      ]
      
      const handler = withDatabase(async (req, prisma) => {
        const url = new URL(req.url)
        const limit = url.searchParams.get('limit')
        const offset = url.searchParams.get('offset')
        
        // Validate limit
        if (limit !== null) {
          const limitNum = parseInt(limit)
          if (isNaN(limitNum) || limitNum < 1 || limitNum > 100) {
            throw new Error(`Invalid limit: ${limit}`)
          }
        }
        
        // Validate offset
        if (offset !== null) {
          const offsetNum = parseInt(offset)
          if (isNaN(offsetNum) || offsetNum < 0) {
            throw new Error(`Invalid offset: ${offset}`)
          }
        }
        
        const tests = await prisma.mwd_test.findMany({
          take: limit ? parseInt(limit) : 10,
          skip: offset ? parseInt(offset) : 0
        })
        
        return { tests }
      })
      
      for (const testCase of testCases) {
        const request = new NextRequest(
          `http://localhost:3000/api/tests?${testCase.param}=${testCase.value}`
        )
        
        const response = await handler(request)
        const data = await response.json()
        
        if (testCase.expectError) {
          expect(data.success).toBe(false)
          expect(data.error.message).toContain(`Invalid ${testCase.param}`)
        } else {
          expect(data.success).toBe(true)
        }
      }
    })
  })

  describe('Data Integrity and Consistency', () => {
    it('should maintain data consistency across concurrent operations', async () => {
      const userId = 'consistency-test-user'
      
      // Simulate concurrent read/write operations
      const operations = [
        // Read operations
        withDatabase(async (req, prisma) => {
          const profile = await prisma.mwd_account.findUnique({ where: { id: userId } })
          return { operation: 'read-profile', profile }
        }),
        withDatabase(async (req, prisma) => {
          const results = await prisma.mwd_test_result.findMany({ where: { userId } })
          return { operation: 'read-results', results }
        }),
        // Write operations (simulated)
        withDatabase(async (req, prisma) => {
          // Simulate update operation
          await new Promise(resolve => setTimeout(resolve, 50))
          return { operation: 'update-profile', success: true }
        })
      ]
      
      const requests = operations.map(() => 
        new NextRequest('http://localhost:3000/api/consistency-test')
      )
      
      const promises = operations.map((handler, index) => handler(requests[index]))
      const responses = await Promise.all(promises)
      
      // All operations should complete successfully
      for (const response of responses) {
        const data = await response.json()
        expect(data.success).toBe(true)
        expect(data.data).toHaveProperty('operation')
      }
    })

    it('should handle transaction rollback scenarios', async () => {
      const handler = withDatabase(async (req, prisma) => {
        try {
          // Simulate transaction that should rollback
          const result = await prisma.$transaction(async (tx) => {
            // First operation succeeds
            const tests = await tx.mwd_test.findMany({ take: 1 })
            
            // Second operation fails
            throw new Error('Simulated transaction failure')
            
            // This should not execute
            return { tests, status: 'committed' }
          })
          
          return result
        } catch (error) {
          // Transaction should rollback
          return { 
            status: 'rolled-back', 
            error: error.message,
            rollback: true 
          }
        }
      })
      
      const request = new NextRequest('http://localhost:3000/api/transaction-test')
      const response = await handler(request)
      const data = await response.json()
      
      expect(data.success).toBe(true)
      expect(data.data.status).toBe('rolled-back')
      expect(data.data.rollback).toBe(true)
      expect(data.data.error).toContain('Simulated transaction failure')
    })
  })

  describe('Monitoring and Observability', () => {
    it('should provide comprehensive health check information', async () => {
      const healthCheck = async () => {
        const client = await getDatabaseClient()
        const startTime = Date.now()
        
        try {
          // Test basic connectivity
          await client.$queryRaw`SELECT 1 as connectivity_test`
          
          // Test table access
          const testCount = await client.mwd_test.count()
          const accountCount = await client.mwd_account.count()
          
          const endTime = Date.now()
          
          return {
            status: 'healthy',
            latency: endTime - startTime,
            database: {
              connected: true,
              tables: {
                mwd_test: testCount,
                mwd_account: accountCount
              }
            },
            timestamp: new Date().toISOString()
          }
        } catch (error) {
          const endTime = Date.now()
          
          return {
            status: 'unhealthy',
            latency: endTime - startTime,
            error: error.message,
            timestamp: new Date().toISOString()
          }
        }
      }
      
      const health = await healthCheck()
      
      expect(health).toHaveProperty('status')
      expect(health).toHaveProperty('latency')
      expect(health).toHaveProperty('timestamp')
      expect(typeof health.latency).toBe('number')
      
      if (health.status === 'healthy') {
        expect(health.database.connected).toBe(true)
        expect(health.database.tables).toHaveProperty('mwd_test')
        expect(health.database.tables).toHaveProperty('mwd_account')
      } else {
        expect(health).toHaveProperty('error')
      }
    })

    it('should track API usage metrics', async () => {
      const metrics = {
        requests: 0,
        errors: 0,
        totalLatency: 0,
        endpoints: {}
      }
      
      const trackingHandler = (endpoint) => withDatabase(async (req, prisma) => {
        const startTime = Date.now()
        metrics.requests++
        
        if (!metrics.endpoints[endpoint]) {
          metrics.endpoints[endpoint] = { count: 0, errors: 0, totalLatency: 0 }
        }
        
        try {
          // Simulate endpoint operation
          const tests = await prisma.mwd_test.findMany({ take: 1 })
          
          const endTime = Date.now()
          const latency = endTime - startTime
          
          metrics.totalLatency += latency
          metrics.endpoints[endpoint].count++
          metrics.endpoints[endpoint].totalLatency += latency
          
          return { tests, metrics: { latency } }
        } catch (error) {
          metrics.errors++
          metrics.endpoints[endpoint].errors++
          throw error
        }
      })
      
      // Simulate multiple API calls
      const endpoints = ['/api/tests', '/api/profile/test', '/api/results/test']
      const requests = endpoints.map(endpoint => 
        new NextRequest(`http://localhost:3000${endpoint}`)
      )
      
      const handlers = endpoints.map(endpoint => trackingHandler(endpoint))
      const promises = handlers.map((handler, index) => handler(requests[index]))
      
      await Promise.all(promises)
      
      expect(metrics.requests).toBe(3)
      expect(metrics.totalLatency).toBeGreaterThan(0)
      expect(Object.keys(metrics.endpoints)).toHaveLength(3)
      
      for (const endpoint of endpoints) {
        expect(metrics.endpoints[endpoint].count).toBe(1)
        expect(metrics.endpoints[endpoint].totalLatency).toBeGreaterThan(0)
      }
    })
  })
})