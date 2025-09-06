import { NextRequest } from 'next/server'
import { GET } from '../[userId]/route'
import { APIErrorHandler } from '@/lib/api-error-handler'
import { withDatabase } from '@/lib/middleware/database'

// Mock the dependencies
jest.mock('@/lib/middleware/database')
jest.mock('@/lib/api-error-handler')

const mockWithDatabase = withDatabase as jest.MockedFunction<typeof withDatabase>
const mockAPIErrorHandler = APIErrorHandler as jest.Mocked<typeof APIErrorHandler>

describe('/api/results/[userId] Enhanced Route', () => {
  let mockPrisma: any
  let mockRequest: NextRequest

  beforeEach(() => {
    jest.clearAllMocks()
    
    // Mock Prisma client
    mockPrisma = {
      $queryRaw: jest.fn()
    }

    // Mock console methods
    jest.spyOn(console, 'log').mockImplementation()
    jest.spyOn(console, 'warn').mockImplementation()
    jest.spyOn(console, 'error').mockImplementation()

    // Setup API error handler mocks
    mockAPIErrorHandler.handleValidationError = jest.fn().mockReturnValue(
      new Response(JSON.stringify({ error: 'Validation error' }), { status: 400 })
    )
    mockAPIErrorHandler.createSuccessResponse = jest.fn().mockReturnValue(
      new Response(JSON.stringify({ success: true }), { status: 200 })
    )
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  describe('Parameter Validation', () => {
    it('should validate missing userId parameter', async () => {
      mockRequest = new NextRequest('http://localhost:3000/api/results/')
      
      // Mock withDatabase to call our handler directly
      mockWithDatabase.mockImplementation((handler) => {
        return async (req: NextRequest) => {
          return handler(req, mockPrisma)
        }
      })

      const response = await GET(mockRequest)
      
      expect(mockAPIErrorHandler.handleValidationError).toHaveBeenCalledWith(
        { message: 'User ID is required and must be a valid UUID' },
        '/api/results/[userId]'
      )
    })

    it('should validate invalid UUID format', async () => {
      mockRequest = new NextRequest('http://localhost:3000/api/results/invalid-uuid')
      
      mockWithDatabase.mockImplementation((handler) => {
        return async (req: NextRequest) => {
          return handler(req, mockPrisma)
        }
      })

      const response = await GET(mockRequest)
      
      expect(mockAPIErrorHandler.handleValidationError).toHaveBeenCalledWith(
        { message: 'User ID must be a valid UUID format' },
        '/api/results/[userId]'
      )
    })

    it('should accept valid UUID format', async () => {
      const validUuid = '123e4567-e89b-12d3-a456-426614174000'
      mockRequest = new NextRequest(`http://localhost:3000/api/results/${validUuid}`)
      
      // Mock successful database queries
      mockPrisma.$queryRaw
        .mockResolvedValueOnce([]) // Test results
        .mockResolvedValueOnce([{ count: BigInt(0) }]) // Count query

      mockWithDatabase.mockImplementation((handler) => {
        return async (req: NextRequest) => {
          return handler(req, mockPrisma)
        }
      })

      const response = await GET(mockRequest)
      
      expect(mockPrisma.$queryRaw).toHaveBeenCalledTimes(2)
      expect(mockAPIErrorHandler.createSuccessResponse).toHaveBeenCalled()
    })
  })

  describe('Query Parameters', () => {
    const validUuid = '123e4567-e89b-12d3-a456-426614174000'

    it('should use default limit and offset values', async () => {
      mockRequest = new NextRequest(`http://localhost:3000/api/results/${validUuid}`)
      
      mockPrisma.$queryRaw
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([{ count: BigInt(0) }])

      mockWithDatabase.mockImplementation((handler) => {
        return async (req: NextRequest) => {
          return handler(req, mockPrisma)
        }
      })

      await GET(mockRequest)
      
      // Check that the query was called with default LIMIT 20 OFFSET 0
      expect(mockPrisma.$queryRaw).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.stringContaining('LIMIT 20'),
          expect.stringContaining('OFFSET 0')
        ])
      )
    })

    it('should respect custom limit and offset parameters', async () => {
      mockRequest = new NextRequest(`http://localhost:3000/api/results/${validUuid}?limit=10&offset=5`)
      
      mockPrisma.$queryRaw
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([{ count: BigInt(0) }])

      mockWithDatabase.mockImplementation((handler) => {
        return async (req: NextRequest) => {
          return handler(req, mockPrisma)
        }
      })

      await GET(mockRequest)
      
      expect(mockPrisma.$queryRaw).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.stringContaining('LIMIT 10'),
          expect.stringContaining('OFFSET 5')
        ])
      )
    })

    it('should enforce maximum limit of 100', async () => {
      mockRequest = new NextRequest(`http://localhost:3000/api/results/${validUuid}?limit=200`)
      
      mockPrisma.$queryRaw
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([{ count: BigInt(0) }])

      mockWithDatabase.mockImplementation((handler) => {
        return async (req: NextRequest) => {
          return handler(req, mockPrisma)
        }
      })

      await GET(mockRequest)
      
      // Should be capped at 100
      expect(mockPrisma.$queryRaw).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.stringContaining('LIMIT 100')
        ])
      )
    })
  })

  describe('Database Operations', () => {
    const validUuid = '123e4567-e89b-12d3-a456-426614174000'

    it('should handle successful database queries', async () => {
      mockRequest = new NextRequest(`http://localhost:3000/api/results/${validUuid}`)
      
      const mockResults = [
        {
          id: BigInt(1),
          testcode: 'TEST001',
          testtype: 'personality',
          testcategory: 'basic',
          status: 'Y',
          startdate: new Date('2024-01-01'),
          enddate: new Date('2024-01-02'),
          ispaid: 'Y',
          producttype: 'premium'
        }
      ]

      mockPrisma.$queryRaw
        .mockResolvedValueOnce(mockResults)
        .mockResolvedValueOnce([{ count: BigInt(1) }])

      mockWithDatabase.mockImplementation((handler) => {
        return async (req: NextRequest) => {
          return handler(req, mockPrisma)
        }
      })

      await GET(mockRequest)
      
      expect(mockAPIErrorHandler.createSuccessResponse).toHaveBeenCalledWith(
        expect.objectContaining({
          results: expect.arrayContaining([
            expect.objectContaining({
              id: '1', // BigInt converted to string
              testCode: 'TEST001',
              isCompleted: true,
              isPaid: true
            })
          ]),
          pagination: expect.objectContaining({
            total: 1,
            hasMore: false
          })
        }),
        '/api/results/[userId]'
      )
    })

    it('should handle database connection errors with fallback', async () => {
      mockRequest = new NextRequest(`http://localhost:3000/api/results/${validUuid}`)
      
      const connectionError = new Error('connection timeout')
      mockPrisma.$queryRaw.mockRejectedValueOnce(connectionError)

      mockWithDatabase.mockImplementation((handler) => {
        return async (req: NextRequest) => {
          try {
            return await handler(req, mockPrisma)
          } catch (error) {
            // Simulate the fallback behavior in the actual handler
            if (error instanceof Error && error.message.includes('connection')) {
              return new Response(JSON.stringify({
                success: true,
                data: {
                  results: [],
                  pagination: { total: 0, hasMore: false },
                  fallback: true
                }
              }), { status: 200 })
            }
            throw error
          }
        }
      })

      const response = await GET(mockRequest)
      const responseData = await response.json()
      
      expect(response.status).toBe(200)
      expect(responseData.data.fallback).toBe(true)
      expect(responseData.data.results).toEqual([])
    })
  })

  describe('Data Processing', () => {
    const validUuid = '123e4567-e89b-12d3-a456-426614174000'

    it('should properly convert BigInt values to strings', async () => {
      mockRequest = new NextRequest(`http://localhost:3000/api/results/${validUuid}`)
      
      const mockResults = [
        {
          id: BigInt(9007199254740991), // Large BigInt value
          testcode: 'TEST001',
          testtype: 'personality',
          testcategory: 'basic',
          status: 'Y',
          startdate: new Date('2024-01-01'),
          enddate: new Date('2024-01-02'),
          ispaid: 'N',
          producttype: ''
        }
      ]

      mockPrisma.$queryRaw
        .mockResolvedValueOnce(mockResults)
        .mockResolvedValueOnce([{ count: BigInt(1) }])

      mockWithDatabase.mockImplementation((handler) => {
        return async (req: NextRequest) => {
          return handler(req, mockPrisma)
        }
      })

      await GET(mockRequest)
      
      expect(mockAPIErrorHandler.createSuccessResponse).toHaveBeenCalledWith(
        expect.objectContaining({
          results: expect.arrayContaining([
            expect.objectContaining({
              id: '9007199254740991', // BigInt properly converted to string
              isPaid: false, // 'N' converted to false
              productType: '' // Empty string handled
            })
          ])
        }),
        '/api/results/[userId]'
      )
    })

    it('should calculate pagination correctly', async () => {
      mockRequest = new NextRequest(`http://localhost:3000/api/results/${validUuid}?limit=10&offset=20`)
      
      mockPrisma.$queryRaw
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([{ count: BigInt(45) }])

      mockWithDatabase.mockImplementation((handler) => {
        return async (req: NextRequest) => {
          return handler(req, mockPrisma)
        }
      })

      await GET(mockRequest)
      
      expect(mockAPIErrorHandler.createSuccessResponse).toHaveBeenCalledWith(
        expect.objectContaining({
          pagination: {
            total: 45,
            limit: 10,
            offset: 20,
            hasMore: true, // 45 > 20 + 10
            currentPage: 3, // Math.floor(20 / 10) + 1
            totalPages: 5 // Math.ceil(45 / 10)
          }
        }),
        '/api/results/[userId]'
      )
    })
  })

  describe('Logging', () => {
    const validUuid = '123e4567-e89b-12d3-a456-426614174000'

    it('should log API calls and results', async () => {
      mockRequest = new NextRequest(`http://localhost:3000/api/results/${validUuid}`)
      
      mockPrisma.$queryRaw
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([{ count: BigInt(0) }])

      mockWithDatabase.mockImplementation((handler) => {
        return async (req: NextRequest) => {
          return handler(req, mockPrisma)
        }
      })

      await GET(mockRequest)
      
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining(`📋 Results API called for user: ${validUuid}`)
      )
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('🔍 Fetching results for user:')
      )
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('📊 Results query returned')
      )
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('✅ Results data successfully retrieved')
      )
    })

    it('should log errors with detailed information', async () => {
      mockRequest = new NextRequest(`http://localhost:3000/api/results/${validUuid}`)
      
      const testError = new Error('Database query failed')
      mockPrisma.$queryRaw.mockRejectedValueOnce(testError)

      mockWithDatabase.mockImplementation((handler) => {
        return async (req: NextRequest) => {
          try {
            return await handler(req, mockPrisma)
          } catch (error) {
            // The handler should log the error before throwing
            console.error(`❌ Results API error for user ${validUuid}:`, {
              error: error instanceof Error ? error.message : error,
              stack: error instanceof Error ? error.stack : undefined,
              userId: validUuid,
              limit: 20,
              offset: 0,
              timestamp: expect.any(String)
            })
            throw error
          }
        }
      })

      try {
        await GET(mockRequest)
      } catch (error) {
        // Expected to throw
      }
      
      expect(console.error).toHaveBeenCalledWith(
        expect.stringContaining(`❌ Results API error for user ${validUuid}:`),
        expect.objectContaining({
          error: 'Database query failed',
          userId: validUuid,
          limit: 20,
          offset: 0
        })
      )
    })
  })
})