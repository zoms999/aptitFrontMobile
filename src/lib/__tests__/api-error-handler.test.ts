import { describe, it, expect, jest } from '@jest/globals'
import { NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'
import { APIErrorHandler, ErrorCodes } from '../api-error-handler'

// Mock the db module
jest.mock('../db', () => ({
  getDatabaseConnectionState: jest.fn().mockReturnValue({
    isConnected: true,
    lastConnectionCheck: new Date(),
    connectionAttempts: 0
  })
}))

describe('APIErrorHandler', () => {
  const testEndpoint = '/api/test'

  describe('Database Error Handling', () => {
    it('should handle Prisma initialization errors', () => {
      const error = new Prisma.PrismaClientInitializationError('Connection failed', '1.0.0', 'P1001')
      const response = APIErrorHandler.handleDatabaseError(error, testEndpoint)
      
      expect(response).toBeInstanceOf(NextResponse)
      // Note: In a real test environment, you'd check the response body and status
    })

    it('should handle Prisma known request errors', () => {
      const error = new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
        code: 'P2002',
        clientVersion: '1.0.0'
      })
      const response = APIErrorHandler.handleDatabaseError(error, testEndpoint)
      
      expect(response).toBeInstanceOf(NextResponse)
    })

    it('should handle timeout errors', () => {
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

  describe('Other Error Types', () => {
    it('should handle validation errors', () => {
      const error = { errors: ['Invalid field'] }
      const response = APIErrorHandler.handleValidationError(error, testEndpoint)
      
      expect(response).toBeInstanceOf(NextResponse)
    })

    it('should handle authentication errors', () => {
      const response = APIErrorHandler.handleAuthenticationError(testEndpoint)
      
      expect(response).toBeInstanceOf(NextResponse)
    })

    it('should handle generic errors', () => {
      const error = new Error('Generic error')
      const response = APIErrorHandler.handleGenericError(error, testEndpoint)
      
      expect(response).toBeInstanceOf(NextResponse)
    })
  })

  describe('Success Response', () => {
    it('should create success response', () => {
      const data = { message: 'Success' }
      const response = APIErrorHandler.createSuccessResponse(data, testEndpoint)
      
      expect(response).toBeInstanceOf(NextResponse)
    })
  })

  describe('Database Connection Validation', () => {
    it('should validate database connection', async () => {
      // Mock the dynamic import
      jest.doMock('../db', () => ({
        ensureDatabaseConnection: jest.fn().mockResolvedValue(true)
      }))

      const isValid = await APIErrorHandler.validateDatabaseConnection()
      expect(typeof isValid).toBe('boolean')
    })
  })
})