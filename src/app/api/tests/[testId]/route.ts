import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getAuthenticatedUser } from '@/lib/auth'

interface RouteParams {
  params: {
    testId: string
  }
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    // Check authentication
    const user = await getAuthenticatedUser(request)
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const { testId } = params

    // Fetch test with full details
    const test = await prisma.test.findUnique({
      where: { 
        id: testId,
        isActive: true
      },
      select: {
        id: true,
        title: true,
        description: true,
        category: true,
        questions: true,
        timeLimit: true,
        difficulty: true,
        isMobileOptimized: true,
        estimatedTime: true,
        tags: true,
        version: true,
        createdAt: true,
        updatedAt: true
      }
    })

    if (!test) {
      return NextResponse.json(
        { error: 'Test not found or inactive' },
        { status: 404 }
      )
    }

    // Get user's previous results for this test
    const userResults = await prisma.testResult.findMany({
      where: {
        userId: user.id,
        testId: testId
      },
      select: {
        id: true,
        score: true,
        percentile: true,
        completedAt: true,
        timeSpent: true,
        analysis: true
      },
      orderBy: { completedAt: 'desc' },
      take: 5 // Last 5 attempts
    })

    // Check for active session
    const activeSession = await prisma.testSession.findUnique({
      where: {
        userId_testId: {
          userId: user.id,
          testId: testId
        },
        isCompleted: false,
        expiresAt: { gt: new Date() }
      },
      select: {
        id: true,
        currentQuestion: true,
        answers: true,
        timeSpent: true,
        lastActivity: true,
        expiresAt: true
      }
    })

    // Get test statistics
    const testStats = await prisma.testResult.aggregate({
      where: { testId: testId },
      _avg: { score: true, timeSpent: true },
      _count: { id: true },
      _max: { score: true },
      _min: { score: true }
    })

    return NextResponse.json({
      success: true,
      data: {
        test: {
          ...test,
          questions: test.questions // Full questions for authenticated users
        },
        userProgress: {
          previousResults: userResults,
          bestScore: userResults.length > 0 ? Math.max(...userResults.map(r => r.score)) : null,
          averageScore: userResults.length > 0 ? userResults.reduce((sum, r) => sum + r.score, 0) / userResults.length : null,
          totalAttempts: userResults.length,
          hasActiveSession: !!activeSession,
          activeSession: activeSession || null
        },
        statistics: {
          totalCompletions: testStats._count.id || 0,
          averageScore: testStats._avg.score || 0,
          averageTime: testStats._avg.timeSpent || 0,
          highestScore: testStats._max.score || 0,
          lowestScore: testStats._min.score || 0
        }
      }
    })

  } catch (error) {
    console.error('Test fetch error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}