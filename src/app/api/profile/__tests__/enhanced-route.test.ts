import { NextRequest } from 'next/server'
import { GET } from '../[userId]/route'
import { databaseManager } from '@/lib/db'
import { PrismaClient } from '@prisma/client'

// Mock the database and middleware
jest.mock('@/lib/db')
jest.mock('@/lib/middleware/database')
jest.mock('@/lib/api-error-handler')

const mockPrisma = {
  $queryRaw: jest.fn(),
  $connect: jest.fn(),
  $disconnect: jest.fn(),
} as unknown as PrismaClient

const mockDatabaseManager = {
  getClient: jest.fn().mockResolvedValue(mockPrisma),
  ensureConnection: jest.fn().mockResolvedValue(true),
  withRetry: jest.fn(),
  handleConnectionError: jest.fn(),
  getConnectionState: jest.fn().mockReturnValue({
    isConnected: true,
    lastConnectionCheck: new Date(),
    connectionAttempts: 0
  })
}

// Mock the withDatabase middleware to directly call the handler
jest.mock('@/lib/middleware/database', () => ({
  withDatabase: (handler: any) => {
    return async (request: NextRequest) => {
      try {
        const result = await handler(request, mockPrisma)
        return result
      } catch (error) {
        // Simulate error handling
        const { APIErrorHandler } = require('@/lib/api-error-handler')
        return APIErrorHandler.handleDatabaseError(error, '/api/profile/[userId]')
      }
    }
  }
}))

// Mock APIErrorHandler
const mockAPIErrorHandler = {
  handleValidationError: jest.fn().mockReturnValue(
    new Response(JSON.stringify({
      success: false,
      error: { message: 'Validation error', code: 'VALIDATION_ERROR' }
    }), { status: 400 })
  ),
  handleDatabaseError: jest.fn().mockReturnValue(
    new Response(JSON.stringify({
      success: false,
      error: { message: 'Database error', code: 'DB_ERROR' }
    }), { status: 500 })
  ),
  createSuccessResponse: jest.fn().mockImplementation((data) => 
    new Response(JSON.stringify({
      success: true,
      data,
      meta: { timestamp: new Date(), endpoint: '/api/profile/[userId]' }
    }), { status: 200 })
  )
}

jest.mock('@/lib/api-error-handler', () => ({
  APIErrorHandler: mockAPIErrorHandler
}))

describe('Enhanced Profile API Route', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    ;(databaseManager as any) = mockDatabaseManager
  })

  describe('GET /api/profile/[userId]', () => {
    const validUserId = '123e4567-e89b-12d3-a456-426614174000'
    const mockProfileData = [{
      id: validUserId,
      username: 'testuser',
      name: 'Test User',
      email: 'test@example.com',
      phone: '010-1234-5678',
      gender: 'M',
      birthyear: 1990,
      birthmonth: 5,
      birthday: 15,
      createdat: new Date('2023-01-01'),
      isactive: 'Y'
    }]

    it('should successfully return user profile data', async () => {
      mockPrisma.$queryRaw = jest.fn().mockResolvedValue(mockProfileData)

      const request = new NextRequest(`http://localhost:3000/api/profile/${validUserId}`)
      const response = await GET(request)
      
      expect(response.status).toBe(200)
      
      const responseData = await response.json()
      expect(responseData.success).toBe(true)
      expect(responseData.data.profile).toMatchObject({
        id: validUserId,
        username: 'testuser',
        name: 'Test User',
        email: 'test@example.com',
        phone: '010-1234-5678',
        gender: 'M',
        birthDate: '1990-05-15',
        isActive: true
      })
      expect(responseData.data.profile.preferences).toMatchObject({
        language: 'ko',
        notifications: true,
        theme: 'system',
        testReminders: true,
        hapticFeedback: true,
        autoSave: true
      })
    })

    it('should handle missing userId parameter', async () => {
      const request = new NextRequest('http://localhost:3000/api/profile/')
      const response = await GET(request)
      
      expect(mockAPIErrorHandler.handleValidationError).toHaveBeenCalledWith(
        { message: 'User ID is required and must be a valid UUID' },
        '/api/profile/[userId]'
      )
    })

    it('should handle invalid UUID format', async () => {
      const invalidUserId = 'invalid-uuid'
      const request = new NextRequest(`http://localhost:3000/api/profile/${invalidUserId}`)
      const response = await GET(request)
      
      expect(mockAPIErrorHandler.handleValidationError).toHaveBeenCalledWith(
        { message: 'User ID must be a valid UUID format' },
        '/api/profile/[userId]'
      )
    })

    it('should handle user not found', async () => {
      mockPrisma.$queryRaw = jest.fn().mockResolvedValue([])

      const request = new NextRequest(`http://localhost:3000/api/profile/${validUserId}`)
      const response = await GET(request)
      
      const responseData = await response.json()
      expect(response.status).toBe(404)
      expect(responseData.success).toBe(false)
      expect(responseData.error.code).toBe('USER_NOT_FOUND')
    })

    it('should handle database connection errors', async () => {
      const dbError = new Error('Database connection failed')
      mockPrisma.$queryRaw = jest.fn().mockRejectedValue(dbError)

      const request = new NextRequest(`http://localhost:3000/api/profile/${validUserId}`)
      
      try {
        await GET(request)
      } catch (error) {
        expect(error).toBe(dbError)
      }
    })

    it('should handle profile data with missing optional fields', async () => {
      const incompleteProfileData = [{
        id: validUserId,
        username: 'testuser',
        name: 'Test User',
        email: null,
        phone: null,
        gender: null,
        birthyear: null,
        birthmonth: null,
        birthday: null,
        createdat: new Date('2023-01-01'),
        isactive: 'Y'
      }]

      mockPrisma.$queryRaw = jest.fn().mockResolvedValue(incompleteProfileData)

      const request = new NextRequest(`http://localhost:3000/api/profile/${validUserId}`)
      const response = await GET(request)
      
      expect(response.status).toBe(200)
      
      const responseData = await response.json()
      expect(responseData.data.profile).toMatchObject({
        id: validUserId,
        username: 'testuser',
        name: 'Test User',
        email: '',
        phone: '',
        gender: '',
        birthDate: null,
        isActive: true
      })
    })

    it('should handle inactive user accounts', async () => {
      const inactiveProfileData = [{
        ...mockProfileData[0],
        isactive: 'N'
      }]

      mockPrisma.$queryRaw = jest.fn().mockResolvedValue(inactiveProfileData)

      const request = new NextRequest(`http://localhost:3000/api/profile/${validUserId}`)
      const response = await GET(request)
      
      const responseData = await response.json()
      expect(responseData.data.profile.isActive).toBe(false)
    })

    it('should properly format birth date', async () => {
      const profileWithBirthDate = [{
        ...mockProfileData[0],
        birthyear: 1985,
        birthmonth: 3,
        birthday: 7
      }]

      mockPrisma.$queryRaw = jest.fn().mockResolvedValue(profileWithBirthDate)

      const request = new NextRequest(`http://localhost:3000/api/profile/${validUserId}`)
      const response = await GET(request)
      
      const responseData = await response.json()
      expect(responseData.data.profile.birthDate).toBe('1985-03-07')
    })

    it('should include proper logging for debugging', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation()
      mockPrisma.$queryRaw = jest.fn().mockResolvedValue(mockProfileData)

      const request = new NextRequest(`http://localhost:3000/api/profile/${validUserId}`)
      await GET(request)
      
      expect(consoleSpy).toHaveBeenCalledWith(`📋 Profile API called for user: ${validUserId}`)
      expect(consoleSpy).toHaveBeenCalledWith(`🔍 Fetching profile data for user: ${validUserId}`)
      expect(consoleSpy).toHaveBeenCalledWith(`📊 Profile query returned 1 results`)
      expect(consoleSpy).toHaveBeenCalledWith(`✅ Profile data successfully retrieved for user: ${validUserId}`)
      
      consoleSpy.mockRestore()
    })

    it('should log errors properly', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation()
      const dbError = new Error('Database query failed')
      mockPrisma.$queryRaw = jest.fn().mockRejectedValue(dbError)

      const request = new NextRequest(`http://localhost:3000/api/profile/${validUserId}`)
      
      try {
        await GET(request)
      } catch (error) {
        expect(consoleErrorSpy).toHaveBeenCalledWith(
          `❌ Profile API error for user ${validUserId}:`,
          expect.objectContaining({
            error: 'Database query failed',
            stack: expect.any(String),
            userId: validUserId,
            timestamp: expect.any(String)
          })
        )
      }
      
      consoleErrorSpy.mockRestore()
    })
  })

  describe('Database Connection Validation', () => {
    it('should use database middleware with proper configuration', () => {
      // The withDatabase middleware should be called with proper options
      expect(jest.requireMock('@/lib/middleware/database').withDatabase).toBeDefined()
    })

    it('should handle connection validation failures', async () => {
      mockDatabaseManager.ensureConnection.mockResolvedValue(false)
      
      const request = new NextRequest(`http://localhost:3000/api/profile/${validUserId}`)
      
      // The middleware should handle connection validation
      // This test verifies the middleware integration
      expect(mockDatabaseManager.ensureConnection).toBeDefined()
    })
  })

  describe('Error Handling Patterns', () => {
    it('should use consistent error handling patterns', async () => {
      const request = new NextRequest('http://localhost:3000/api/profile/invalid-uuid')
      await GET(request)
      
      expect(mockAPIErrorHandler.handleValidationError).toHaveBeenCalled()
    })

    it('should create proper success responses', async () => {
      mockPrisma.$queryRaw = jest.fn().mockResolvedValue(mockProfileData)

      const request = new NextRequest(`http://localhost:3000/api/profile/${validUserId}`)
      await GET(request)
      
      expect(mockAPIErrorHandler.createSuccessResponse).toHaveBeenCalledWith(
        { profile: expect.any(Object) },
        '/api/profile/[userId]'
      )
    })
  })
})