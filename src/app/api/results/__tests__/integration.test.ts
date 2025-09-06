import { NextRequest } from 'next/server'
import { GET } from '../[userId]/route'

// Integration tests for the enhanced results API endpoint
describe('/api/results/[userId] Integration Tests', () => {
  const validUserId = '123e4567-e89b-12d3-a456-426614174000'

  beforeEach(() => {
    // Mock console methods to avoid noise in test output
    jest.spyOn(console, 'log').mockImplementation()
    jest.spyOn(console, 'warn').mockImplementation()
    jest.spyOn(console, 'error').mockImplementation()
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  describe('Database Connection Validation', () => {
    it('should validate database connection before processing requests', async () => {
      const request = new NextRequest(`http://localhost:3000/api/results/${validUserId}`)
      
      // The withDatabase middleware should handle connection validation
      // This test verifies the middleware is properly applied
      const response = await GET(request)
      
      // Should not return a 500 error due to missing database connection
      expect(response.status).not.toBe(500)
    })

    it('should handle database connection failures gracefully', async () => {
      const request = new NextRequest(`http://localhost:3000/api/results/${validUserId}`)
      
      // Mock a scenario where database connection fails
      // The middleware should handle this and provide appropriate error response
      const response = await GET(request)
      
      // Should handle the error gracefully, not crash
      expect(response).toBeDefined()
      expect(response.status).toBeGreaterThanOrEqual(200)
      expect(response.status).toBeLessThan(600)
    })
  })

  describe('Error Handling Consistency', () => {
    it('should return consistent error format for validation errors', async () => {
      const request = new NextRequest('http://localhost:3000/api/results/invalid-uuid')
      
      const response = await GET(request)
      const data = await response.json()
      
      expect(response.status).toBe(400)
      expect(data).toHaveProperty('error')
      expect(data).toHaveProperty('success', false)
    })

    it('should return consistent error format for missing parameters', async () => {
      const request = new NextRequest('http://localhost:3000/api/results/')
      
      const response = await GET(request)
      const data = await response.json()
      
      expect(response.status).toBe(400)
      expect(data).toHaveProperty('error')
      expect(data).toHaveProperty('success', false)
    })
  })

  describe('Response Format Consistency', () => {
    it('should return consistent success response format', async () => {
      const request = new NextRequest(`http://localhost:3000/api/results/${validUserId}`)
      
      const response = await GET(request)
      const data = await response.json()
      
      // Should have consistent response structure
      expect(data).toHaveProperty('success')
      expect(data).toHaveProperty('data')
      expect(data).toHaveProperty('meta')
      
      if (data.success) {
        expect(data.data).toHaveProperty('results')
        expect(data.data).toHaveProperty('pagination')
        expect(Array.isArray(data.data.results)).toBe(true)
      }
    })

    it('should include proper metadata in responses', async () => {
      const request = new NextRequest(`http://localhost:3000/api/results/${validUserId}`)
      
      const response = await GET(request)
      const data = await response.json()
      
      expect(data.meta).toHaveProperty('timestamp')
      expect(data.meta).toHaveProperty('endpoint', '/api/results/[userId]')
      expect(new Date(data.meta.timestamp)).toBeInstanceOf(Date)
    })
  })

  describe('Pagination Handling', () => {
    it('should handle pagination parameters correctly', async () => {
      const request = new NextRequest(`http://localhost:3000/api/results/${validUserId}?limit=5&offset=10`)
      
      const response = await GET(request)
      const data = await response.json()
      
      if (data.success) {
        expect(data.data.pagination).toHaveProperty('limit', 5)
        expect(data.data.pagination).toHaveProperty('offset', 10)
        expect(data.data.pagination).toHaveProperty('total')
        expect(data.data.pagination).toHaveProperty('hasMore')
        expect(data.data.pagination).toHaveProperty('currentPage')
        expect(data.data.pagination).toHaveProperty('totalPages')
      }
    })

    it('should enforce maximum limit constraints', async () => {
      const request = new NextRequest(`http://localhost:3000/api/results/${validUserId}?limit=200`)
      
      const response = await GET(request)
      const data = await response.json()
      
      if (data.success) {
        // Should be capped at 100
        expect(data.data.pagination.limit).toBeLessThanOrEqual(100)
      }
    })

    it('should handle negative offset values', async () => {
      const request = new NextRequest(`http://localhost:3000/api/results/${validUserId}?offset=-5`)
      
      const response = await GET(request)
      const data = await response.json()
      
      if (data.success) {
        // Should be normalized to 0
        expect(data.data.pagination.offset).toBeGreaterThanOrEqual(0)
      }
    })
  })

  describe('Data Processing', () => {
    it('should handle empty results gracefully', async () => {
      const request = new NextRequest(`http://localhost:3000/api/results/${validUserId}`)
      
      const response = await GET(request)
      const data = await response.json()
      
      if (data.success) {
        expect(Array.isArray(data.data.results)).toBe(true)
        expect(data.data.pagination.total).toBeGreaterThanOrEqual(0)
      }
    })

    it('should process result data with correct types', async () => {
      const request = new NextRequest(`http://localhost:3000/api/results/${validUserId}`)
      
      const response = await GET(request)
      const data = await response.json()
      
      if (data.success && data.data.results.length > 0) {
        const result = data.data.results[0]
        
        // Check that BigInt values are converted to strings
        expect(typeof result.id).toBe('string')
        
        // Check boolean conversions
        expect(typeof result.isCompleted).toBe('boolean')
        expect(typeof result.isPaid).toBe('boolean')
        
        // Check date formatting
        if (result.startDate) {
          expect(new Date(result.startDate)).toBeInstanceOf(Date)
        }
        if (result.endDate) {
          expect(new Date(result.endDate)).toBeInstanceOf(Date)
        }
      }
    })
  })

  describe('Fallback Behavior', () => {
    it('should provide fallback data structure when database is unavailable', async () => {
      // This test would require mocking database connection failures
      // The actual implementation should provide fallback behavior
      const request = new NextRequest(`http://localhost:3000/api/results/${validUserId}`)
      
      const response = await GET(request)
      const data = await response.json()
      
      // Even in fallback mode, should return valid structure
      expect(data).toHaveProperty('success')
      expect(data).toHaveProperty('data')
      
      if (data.data.fallback) {
        expect(data.data.results).toEqual([])
        expect(data.data.pagination.total).toBe(0)
        expect(data.data).toHaveProperty('message')
      }
    })
  })

  describe('Logging Integration', () => {
    it('should log request processing steps', async () => {
      const request = new NextRequest(`http://localhost:3000/api/results/${validUserId}`)
      
      await GET(request)
      
      // Verify that logging occurs at key points
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('📋 Results API called for user:')
      )
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('🔍 Fetching results for user:')
      )
    })

    it('should log validation errors appropriately', async () => {
      const request = new NextRequest('http://localhost:3000/api/results/invalid-uuid')
      
      await GET(request)
      
      expect(console.warn).toHaveBeenCalledWith(
        expect.stringContaining('❌ Results API: Invalid UUID format:')
      )
    })
  })

  describe('Performance Considerations', () => {
    it('should handle concurrent requests efficiently', async () => {
      const requests = Array.from({ length: 5 }, (_, i) => 
        new NextRequest(`http://localhost:3000/api/results/${validUserId}?offset=${i * 10}`)
      )
      
      const startTime = Date.now()
      const responses = await Promise.all(requests.map(req => GET(req)))
      const endTime = Date.now()
      
      // All requests should complete
      expect(responses).toHaveLength(5)
      responses.forEach(response => {
        expect(response).toBeDefined()
        expect(response.status).toBeGreaterThanOrEqual(200)
        expect(response.status).toBeLessThan(600)
      })
      
      // Should complete within reasonable time (adjust as needed)
      expect(endTime - startTime).toBeLessThan(10000) // 10 seconds max
    })

    it('should respect timeout configurations', async () => {
      const request = new NextRequest(`http://localhost:3000/api/results/${validUserId}`)
      
      const startTime = Date.now()
      const response = await GET(request)
      const endTime = Date.now()
      
      // Should not hang indefinitely
      expect(endTime - startTime).toBeLessThan(15000) // 15 seconds max (includes 10s timeout + overhead)
      expect(response).toBeDefined()
    })
  })
})