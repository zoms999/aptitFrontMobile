import { http, HttpResponse } from 'msw'
import { mockUser, mockTest, mockResult } from '../utils/test-utils'

export const handlers = [
  // Auth endpoints
  http.post('/api/auth/login', async ({ request }) => {
    const body = await request.json() as { email: string; password: string }
    
    if (body.email === 'test@example.com' && body.password === 'password') {
      return HttpResponse.json({
        user: mockUser,
        token: 'mock-jwt-token',
        refreshToken: 'mock-refresh-token',
      })
    }
    
    return HttpResponse.json(
      { error: 'Invalid credentials' },
      { status: 401 }
    )
  }),

  http.post('/api/auth/signup', async ({ request }) => {
    const body = await request.json() as { email: string; password: string; name: string }
    
    return HttpResponse.json({
      user: { ...mockUser, email: body.email, name: body.name },
      token: 'mock-jwt-token',
      refreshToken: 'mock-refresh-token',
    })
  }),

  http.post('/api/auth/refresh', () => {
    return HttpResponse.json({
      token: 'new-mock-jwt-token',
      refreshToken: 'new-mock-refresh-token',
    })
  }),

  // Test endpoints
  http.get('/api/tests', () => {
    return HttpResponse.json({
      tests: [mockTest],
      pagination: {
        page: 1,
        limit: 10,
        total: 1,
        totalPages: 1,
      },
    })
  }),

  http.get('/api/tests/:testId', ({ params }) => {
    if (params.testId === 'test-id') {
      return HttpResponse.json(mockTest)
    }
    return HttpResponse.json(
      { error: 'Test not found' },
      { status: 404 }
    )
  }),

  http.post('/api/tests/:testId/submit', async ({ request, params }) => {
    const body = await request.json()
    
    return HttpResponse.json({
      result: {
        ...mockResult,
        testId: params.testId,
        answers: body.answers,
      },
    })
  }),

  http.get('/api/tests/:testId/session', ({ params }) => {
    return HttpResponse.json({
      sessionId: 'mock-session-id',
      testId: params.testId,
      progress: {
        currentQuestion: 0,
        answers: [],
        timeSpent: 0,
      },
    })
  }),

  http.post('/api/tests/:testId/session', async ({ request, params }) => {
    const body = await request.json()
    
    return HttpResponse.json({
      sessionId: 'mock-session-id',
      testId: params.testId,
      progress: body.progress,
    })
  }),

  // Results endpoints
  http.get('/api/results', () => {
    return HttpResponse.json({
      results: [mockResult],
      analytics: {
        totalTests: 1,
        averageScore: 100,
        improvementTrend: 'positive',
      },
      trends: {
        monthly: [
          { month: '2023-01', score: 100, count: 1 },
        ],
      },
    })
  }),

  // Profile endpoints
  http.put('/api/profile/update', async ({ request }) => {
    const body = await request.json()
    
    return HttpResponse.json({
      user: { ...mockUser, ...body },
    })
  }),

  http.post('/api/profile/change-password', async ({ request }) => {
    const body = await request.json() as { currentPassword: string; newPassword: string }
    
    if (body.currentPassword === 'password') {
      return HttpResponse.json({ success: true })
    }
    
    return HttpResponse.json(
      { error: 'Current password is incorrect' },
      { status: 400 }
    )
  }),

  http.put('/api/profile/preferences', async ({ request }) => {
    const body = await request.json()
    
    return HttpResponse.json({
      preferences: { ...mockUser.preferences, ...body },
    })
  }),

  http.post('/api/profile/export-data', () => {
    return HttpResponse.json({
      downloadUrl: '/api/profile/download/user-data.json',
    })
  }),

  http.delete('/api/profile/delete-account', () => {
    return HttpResponse.json({ success: true })
  }),

  // Health check
  http.get('/api/health', () => {
    return HttpResponse.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
    })
  }),
]