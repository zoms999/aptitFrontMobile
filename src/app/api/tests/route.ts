import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/db'
import { getAuthenticatedUser } from '@/lib/auth'

// Query parameters validation schema
const querySchema = z.object({
  page: z.string().optional().default('1').transform(Number),
  limit: z.string().optional().default('10').transform(Number),
  category: z.string().optional(),
  difficulty: z.enum(['easy', 'medium', 'hard']).optional(),
  search: z.string().optional(),
  mobileOptimized: z.string().optional().transform(val => val === 'true')
})

export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const user = await getAuthenticatedUser(request)
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    // Parse and validate query parameters
    const url = new URL(request.url)
    const queryParams = Object.fromEntries(url.searchParams.entries())
    
    const validationResult = querySchema.safeParse(queryParams)
    if (!validationResult.success) {
      return NextResponse.json(
        { 
          error: 'Invalid query parameters', 
          details: validationResult.error.errors 
        },
        { status: 400 }
      )
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

    // Fetch tests with pagination
    const [tests, totalCount] = await Promise.all([
      prisma.test.findMany({
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
      prisma.test.count({ where })
    ])

    // Get user's test history for progress tracking
    const userTestResults = await prisma.testResult.findMany({
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
    })

    // Get active test sessions
    const activeSessions = await prisma.testSession.findMany({
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
    })

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

    return NextResponse.json({
      success: true,
      data: {
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
    })

  } catch (error) {
    console.error('Tests fetch error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}