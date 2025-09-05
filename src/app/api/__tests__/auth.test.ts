import { POST as loginPOST } from '../auth/login/route'
import { POST as signupPOST } from '../auth/signup/route'
import { POST as refreshPOST } from '../auth/refresh/route'
import { NextRequest } from 'next/server'
import { server } from '@/../../__tests__/mocks/server'

// Setup MSW server
beforeAll(() => server.listen())
afterEach(() => server.resetHandlers())
afterAll(() => server.close())

describe('Auth API Routes', () => {
  describe('POST /api/auth/login', () => {
    it('should login with valid credentials', async () => {
      const request = new NextRequest('http://localhost:3000/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({
          email: 'test@example.com',
          password: 'password',
        }),
        headers: {
          'Content-Type': 'application/json',
        },
      })

      const response = await loginPOST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.user).toBeDefined()
      expect(data.token).toBeDefined()
      expect(data.refreshToken).toBeDefined()
    })

    it('should reject invalid credentials', async () => {
      const request = new NextRequest('http://localhost:3000/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({
          email: 'test@example.com',
          password: 'wrongpassword',
        }),
        headers: {
          'Content-Type': 'application/json',
        },
      })

      const response = await loginPOST(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('Invalid credentials')
    })

    it('should validate required fields', async () => {
      const request = new NextRequest('http://localhost:3000/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({
          email: 'test@example.com',
          // missing password
        }),
        headers: {
          'Content-Type': 'application/json',
        },
      })

      const response = await loginPOST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toContain('validation')
    })

    it('should validate email format', async () => {
      const request = new NextRequest('http://localhost:3000/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({
          email: 'invalid-email',
          password: 'password',
        }),
        headers: {
          'Content-Type': 'application/json',
        },
      })

      const response = await loginPOST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toContain('email')
    })
  })

  describe('POST /api/auth/signup', () => {
    it('should create new user with valid data', async () => {
      const request = new NextRequest('http://localhost:3000/api/auth/signup', {
        method: 'POST',
        body: JSON.stringify({
          email: 'newuser@example.com',
          password: 'password123',
          name: 'New User',
        }),
        headers: {
          'Content-Type': 'application/json',
        },
      })

      const response = await signupPOST(request)
      const data = await response.json()

      expect(response.status).toBe(201)
      expect(data.user).toBeDefined()
      expect(data.user.email).toBe('newuser@example.com')
      expect(data.user.name).toBe('New User')
      expect(data.token).toBeDefined()
    })

    it('should validate password strength', async () => {
      const request = new NextRequest('http://localhost:3000/api/auth/signup', {
        method: 'POST',
        body: JSON.stringify({
          email: 'test@example.com',
          password: '123', // weak password
          name: 'Test User',
        }),
        headers: {
          'Content-Type': 'application/json',
        },
      })

      const response = await signupPOST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toContain('password')
    })

    it('should prevent duplicate email registration', async () => {
      // First registration
      const request1 = new NextRequest('http://localhost:3000/api/auth/signup', {
        method: 'POST',
        body: JSON.stringify({
          email: 'duplicate@example.com',
          password: 'password123',
          name: 'First User',
        }),
        headers: {
          'Content-Type': 'application/json',
        },
      })

      await signupPOST(request1)

      // Second registration with same email
      const request2 = new NextRequest('http://localhost:3000/api/auth/signup', {
        method: 'POST',
        body: JSON.stringify({
          email: 'duplicate@example.com',
          password: 'password123',
          name: 'Second User',
        }),
        headers: {
          'Content-Type': 'application/json',
        },
      })

      const response = await signupPOST(request2)
      const data = await response.json()

      expect(response.status).toBe(409)
      expect(data.error).toContain('already exists')
    })
  })

  describe('POST /api/auth/refresh', () => {
    it('should refresh token with valid refresh token', async () => {
      const request = new NextRequest('http://localhost:3000/api/auth/refresh', {
        method: 'POST',
        body: JSON.stringify({
          refreshToken: 'valid-refresh-token',
        }),
        headers: {
          'Content-Type': 'application/json',
        },
      })

      const response = await refreshPOST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.token).toBeDefined()
      expect(data.refreshToken).toBeDefined()
    })

    it('should reject invalid refresh token', async () => {
      const request = new NextRequest('http://localhost:3000/api/auth/refresh', {
        method: 'POST',
        body: JSON.stringify({
          refreshToken: 'invalid-refresh-token',
        }),
        headers: {
          'Content-Type': 'application/json',
        },
      })

      const response = await refreshPOST(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toContain('Invalid refresh token')
    })

    it('should handle missing refresh token', async () => {
      const request = new NextRequest('http://localhost:3000/api/auth/refresh', {
        method: 'POST',
        body: JSON.stringify({}),
        headers: {
          'Content-Type': 'application/json',
        },
      })

      const response = await refreshPOST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toContain('Refresh token required')
    })
  })
})