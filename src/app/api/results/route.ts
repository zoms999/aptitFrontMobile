import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/db'
import { getAuthenticatedUser } from '@/lib/auth'

// Query parameters validation schema
const querySchema = z.object({
  page: z.string().optional().default('1').transform(Number),
  limit: z.string().optional().default('10').transform(Number),
  testId: z.string().optional(),
  fromDate: z.string().optional().transform(str => str ? new Date(str) : undefined),
  toDate: z.string().optional().transform(str => str ? new Date(str) : undefined)
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

    const { page, limit, testId, fromDate, toDate } = validationResult.data

    // Build where clause
    const where: any = {
      userId: user.id
    }

    if (testId) {
      where.testId = testId
    }

    if (fromDate || toDate) {
      where.completedAt = {}
      if (fromDate) where.completedAt.gte = fromDate
      if (toDate) where.completedAt.lte = toDate
    }

    // Calculate pagination
    const skip = (page - 1) * limit
    const take = Math.min(limit, 50) // Max 50 items per page

    // Fetch results with pagination
    const [results, totalCount] = await Promise.all([
      prisma.testResult.findMany({
        where,
        select: {
          id: true,
          testId: true,
          score: true,
          percentile: true,
          completedAt: true,
          timeSpent: true,
          submittedFrom: true,
          networkType: true,
          analysis: true,
          test: {
            select: {
              id: true,
              title: true,
              category: true,
              difficulty: true
            }
          }
        },
        orderBy: { completedAt: 'desc' },
        skip,
        take
      }),
      prisma.testResult.count({ where })
    ])

    // Calculate user statistics
    const userStats = await prisma.testResult.aggregate({
      where: { userId: user.id },
      _avg: { score: true, timeSpent: true },
      _count: { id: true },
      _max: { score: true },
      _min: { score: true }
    })

    // Get category performance
    const categoryStats = await prisma.testResult.groupBy({
      by: ['test'],
      where: { userId: user.id },
      _avg: { score: true },
      _count: { id: true }
    })

    // Calculate pagination info
    const totalPages = Math.ceil(totalCount / take)
    const hasNextPage = page < totalPages
    const hasPreviousPage = page > 1

    return NextResponse.json({
      success: true,
      data: {
        results,
        pagination: {
          currentPage: page,
          totalPages,
          totalCount,
          hasNextPage,
          hasPreviousPage,
          limit: take
        },
        statistics: {
          totalTests: userStats._count.id || 0,
          averageScore: userStats._avg.score || 0,
          averageTime: userStats._avg.timeSpent || 0,
          bestScore: userStats._max.score || 0,
          worstScore: userStats._min.score || 0
        }
      }
    })

  } catch (error) {
    console.error('Results fetch error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}