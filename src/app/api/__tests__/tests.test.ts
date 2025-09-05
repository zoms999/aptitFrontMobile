import { GET as testsGET } from '../tests/route'
import { GET as testGET } from '../tests/[testId]/route'
import { POST as submitPOST } from '../tests/[testId]/submit/route'
import { NextRequest } from 'next/server'
import { server } from '@/../../__tests__/mocks/server'

// Setup MSW server
beforeAll(() => server.listen())
afterEach(() => server.resetHandlers())
afterAll(() => server.close())

describe('Tests API Routes', () => {
  describe('GET /api/tests', () => {
    it('should return list of tests', async () => {
      const request = new NextRequest('http://localhost:3000/api/tests')

      const response = await testsGET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.tests).toBeDefined()
      expect(Array.isArray(data.tests)).toBe(true)
      expect(data.pagination).toBeDefined()
    })

    it('should handle pagination parameters', async () => {
      const request = new NextRequest('http://localhost:3000/api/tests?page=2&limit=5')

      const response = await testsGET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.pagination.page).toBe(2)
      expect(data.pagination.limit).toBe(5)
    })

    it('should filter tests by category', async () => {
      const request = new NextRequest('http://localhost:3000/api/tests?category=aptitude')

      const response = await testsGET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.tests.every((test: any) => test.category === 'aptitude')).toBe(true)
    })

    it('should require authentication', async () => {
      const request = new NextRequest('http://localhost:3000/api/tests', {
        headers: {
          // No authorization header
        },
      })

      const response = await testsGET(request)

      expect(response.status).toBe(401)
    })
  })

  describe('GET /api/tests/[testId]', () => {
    it('should return specific test', async () => {
      const request = new NextRequest('http://localhost:3000/api/tests/test-id')

      const response = await testGET(request, { params: { testId: 'test-id' } })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.id).toBe('test-id')
      expect(data.questions).toBeDefined()
    })

    it('should return 404 for non-existent test', async () => {
      const request = new NextRequest('http://localhost:3000/api/tests/non-existent')

      const response = await testGET(request, { params: { testId: 'non-existent' } })

      expect(response.status).toBe(404)
    })

    it('should validate test access permissions', async () => {
      const request = new NextRequest('http://localhost:3000/api/tests/private-test', {
        headers: {
          authorization: 'Bearer invalid-token',
        },
      })

      const response = await testGET(request, { params: { testId: 'private-test' } })

      expect(response.status).toBe(403)
    })
  })

  describe('POST /api/tests/[testId]/submit', () => {
    it('should submit test answers successfully', async () => {
      const request = new NextRequest('http://localhost:3000/api/tests/test-id/submit', {
        method: 'POST',
        body: JSON.stringify({
          answers: [
            {
              questionId: 'q1',
              value: 'b',
              timeSpent: 30,
            },
          ],
          timeSpent: 30,
          deviceInfo: {
            userAgent: 'test-agent',
            screenWidth: 375,
            screenHeight: 812,
          },
        }),
        headers: {
          'Content-Type': 'application/json',
          authorization: 'Bearer valid-token',
        },
      })

      const response = await submitPOST(request, { params: { testId: 'test-id' } })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.result).toBeDefined()
      expect(data.result.score).toBeDefined()
      expect(data.result.analysis).toBeDefined()
    })

    it('should validate required answers', async () => {
      const request = new NextRequest('http://localhost:3000/api/tests/test-id/submit', {
        method: 'POST',
        body: JSON.stringify({
          answers: [], // empty answers
          timeSpent: 30,
        }),
        headers: {
          'Content-Type': 'application/json',
          authorization: 'Bearer valid-token',
        },
      })

      const response = await submitPOST(request, { params: { testId: 'test-id' } })
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toContain('answers required')
    })

    it('should validate answer format', async () => {
      const request = new NextRequest('http://localhost:3000/api/tests/test-id/submit', {
        method: 'POST',
        body: JSON.stringify({
          answers: [
            {
              questionId: 'q1',
              // missing value
              timeSpent: 30,
            },
          ],
          timeSpent: 30,
        }),
        headers: {
          'Content-Type': 'application/json',
          authorization: 'Bearer valid-token',
        },
      })

      const response = await submitPOST(request, { params: { testId: 'test-id' } })
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toContain('invalid answer format')
    })

    it('should handle time limit validation', async () => {
      const request = new NextRequest('http://localhost:3000/api/tests/test-id/submit', {
        method: 'POST',
        body: JSON.stringify({
          answers: [
            {
              questionId: 'q1',
              value: 'b',
              timeSpent: 30,
            },
          ],
          timeSpent: 7200, // exceeds time limit
        }),
        headers: {
          'Content-Type': 'application/json',
          authorization: 'Bearer valid-token',
        },
      })

      const response = await submitPOST(request, { params: { testId: 'test-id' } })
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toContain('time limit exceeded')
    })

    it('should prevent duplicate submissions', async () => {
      const requestData = {
        answers: [
          {
            questionId: 'q1',
            value: 'b',
            timeSpent: 30,
          },
        ],
        timeSpent: 30,
      }

      // First submission
      const request1 = new NextRequest('http://localhost:3000/api/tests/test-id/submit', {
        method: 'POST',
        body: JSON.stringify(requestData),
        headers: {
          'Content-Type': 'application/json',
          authorization: 'Bearer valid-token',
        },
      })

      await submitPOST(request1, { params: { testId: 'test-id' } })

      // Second submission
      const request2 = new NextRequest('http://localhost:3000/api/tests/test-id/submit', {
        method: 'POST',
        body: JSON.stringify(requestData),
        headers: {
          'Content-Type': 'application/json',
          authorization: 'Bearer valid-token',
        },
      })

      const response = await submitPOST(request2, { params: { testId: 'test-id' } })
      const data = await response.json()

      expect(response.status).toBe(409)
      expect(data.error).toContain('already submitted')
    })
  })
})