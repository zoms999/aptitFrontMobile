import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { PrismaClient } from '@prisma/client'
import { getAuthenticatedUser } from '@/lib/auth'
import { withDatabase } from '@/lib/middleware/database'
import { APIErrorHandler } from '@/lib/api-error-handler'
import { measureDatabaseQuery } from '@/lib/db'

// Query parameters validation schema
const querySchema = z.object({
  page: z.string().optional().default('1').transform(Number),
  limit: z.string().optional().default('10').transform(Number),
  category: z.string().optional(),
  difficulty: z.enum(['easy', 'medium', 'hard']).optional(),
  search: z.string().optional(),
  mobileOptimized: z.string().optional().transform(val => val === 'true')
})

// Enhanced GET handler with database connection validation and error handling
async function handleGET(request: NextRequest, prisma: PrismaClient) {
  const endpoint = '/api/tests'
  
  // Check authentication
  const user = await getAuthenticatedUser(request)
  if (!user) {
    return APIErrorHandler.handleAuthenticationError(endpoint)
  }

  // Parse and validate query parameters
  const url = new URL(request.url)
  const queryParams = Object.fromEntries(url.searchParams.entries())
  
  const validationResult = querySchema.safeParse(queryParams)
  if (!validationResult.success) {
    return APIErrorHandler.handleValidationError(validationResult.error, endpoint)
  }

  const { page, limit, category, difficulty, search, mobileOptimized } = validationResult.data

  // Build where clause
  const where: any = {
    isActive: true
  }

  if (category) {
    where.category = category
  }

  if (difficulty) {
    where.difficulty = difficulty
  }

  if (mobileOptimized !== undefined) {
    where.isMobileOptimized = mobileOptimized
  }

  if (search) {
    where.OR = [
      { title: { contains: search, mode: 'insensitive' } },
      { description: { contains: search, mode: 'insensitive' } },
      { tags: { has: search } }
    ]
  }

  // Calculate pagination
  const skip = (page - 1) * limit
  const take = Math.min(limit, 50) // Max 50 items per page

  try {
    // Fetch tests with pagination - wrapped with performance monitoring
    const [tests, totalCount] = await Promise.all([
      measureDatabaseQuery(
        () => prisma.test.findMany({
          where,
          select: {
            id: true,
            title: true,
            description: true,
            category: true,
            difficulty: true,
            timeLimit: true,
            estimatedTime: true,
            tags: true,
            isMobileOptimized: true,
            version: true,
            createdAt: true,
            updatedAt: true,
            _count: {
              select: {
                testResults: true
              }
            }
          },
          orderBy: [
            { isMobileOptimized: 'desc' }, // Mobile-optimized tests first
            { createdAt: 'desc' }
          ],
          skip,
          take
        }),
        'fetch_tests_paginated',
        endpoint
      ),
      measureDatabaseQuery(
        () => prisma.test.count({ where }),
        'count_tests',
        endpoint
      )
    ])

    // Get user's test history for progress tracking with monitoring
    const userTestResults = await measureDatabaseQuery(
      () => prisma.testResult.findMany({
        where: {
          userId: user.id,
          testId: { in: tests.map(test => test.id) }
        },
        select: {
          testId: true,
          score: true,
          completedAt: true
        },
        orderBy: { completedAt: 'desc' }
      }),
      'fetch_user_test_results',
      endpoint
    )

    // Get active test sessions with monitoring
    const activeSessions = await measureDatabaseQuery(
      () => prisma.testSession.findMany({
        where: {
          userId: user.id,
          testId: { in: tests.map(test => test.id) },
          isCompleted: false,
          expiresAt: { gt: new Date() }
        },
        select: {
          testId: true,
          currentQuestion: true,
          timeSpent: true,
          lastActivity: true
        }
      }),
      'fetch_active_sessions',
      endpoint
    )

    // Enhance tests with user-specific data
    const enhancedTests = tests.map(test => {
      const userResult = userTestResults.find(result => result.testId === test.id)
      const activeSession = activeSessions.find(session => session.testId === test.id)
      
      return {
        ...test,
        completionCount: test._count.testResults,
        userProgress: {
          hasCompleted: !!userResult,
          lastScore: userResult?.score || null,
          lastCompletedAt: userResult?.completedAt || null,
          hasActiveSession: !!activeSession,
          currentQuestion: activeSession?.currentQuestion || 0,
          sessionTimeSpent: activeSession?.timeSpent || 0,
          lastActivity: activeSession?.lastActivity || null
        }
      }
    })

    // Calculate pagination info
    const totalPages = Math.ceil(totalCount / take)
    const hasNextPage = page < totalPages
    const hasPreviousPage = page > 1

    const responseData = {
      tests: enhancedTests,
      pagination: {
        currentPage: page,
        totalPages,
        totalCount,
        hasNextPage,
        hasPreviousPage,
        limit: take
      }
    }

    return APIErrorHandler.createSuccessResponse(responseData, endpoint)

  } catch (error) {
    // Handle database-specific errors with fallback behavior
    if (error instanceof Error) {
      console.error('Database query error in tests API:', {
        error: error.message,
        stack: error.stack,
        query: { where, skip, take },
        user: user.id
      })
      
      // Provide fallback behavior for connection failures
      if (error.message.includes('connection') || error.message.includes('timeout')) {
        // Return cached or minimal data structure for graceful degradation
        const fallbackData = {
          tests: [],
          pagination: {
            currentPage: page,
            totalPages: 0,
            totalCount: 0,
            hasNextPage: false,
            hasPreviousPage: false,
            limit: take
          },
          fallback: true,
          message: 'Using fallback data due to connection issues'
        }
        
        return NextResponse.json({
          success: true,
          data: fallbackData,
          meta: {
            timestamp: new Date(),
            endpoint,
            fallback: true
          }
        }, { status: 200 })
      }
      
      return APIErrorHandler.handleDatabaseError(error, endpoint)
    }
    
    return APIErrorHandler.handleGenericError(
      new Error('Unknown error in tests API'),
      endpoint
    )
  }
}

// Export the enhanced GET handler with database middleware
export const GET = withDatabase(handleGET, {
  validateConnection: true,
  retryOnFailure: true,
  maxRetries: 2,
  timeout: 10000
})