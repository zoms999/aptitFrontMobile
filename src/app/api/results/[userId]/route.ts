import { NextRequest, NextResponse } from 'next/server'
import { withDatabase } from '@/lib/middleware/database'
import { APIErrorHandler } from '@/lib/api-error-handler'
import { PrismaClient } from '@prisma/client'
import { measureDatabaseQuery } from '@/lib/db'

const ENDPOINT = '/api/results/[userId]'

export const GET = withDatabase(async (
  request: NextRequest,
  prisma: PrismaClient
) => {
  const url = new URL(request.url)
  const userId = url.pathname.split('/').pop()
  const { searchParams } = url
  
  console.log(`📋 Results API called for user: ${userId}`)
  
  // Validate userId parameter
  if (!userId || userId === '[userId]') {
    console.warn('❌ Results API: Missing or invalid userId parameter')
    return APIErrorHandler.handleValidationError(
      { message: 'User ID is required and must be a valid UUID' },
      ENDPOINT
    )
  }

  // Validate UUID format
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
  if (!uuidRegex.test(userId)) {
    console.warn(`❌ Results API: Invalid UUID format: ${userId}`)
    return APIErrorHandler.handleValidationError(
      { message: 'User ID must be a valid UUID format' },
      ENDPOINT
    )
  }

  // Parse and validate query parameters
  const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100) // Max 100 items per page
  const offset = Math.max(parseInt(searchParams.get('offset') || '0'), 0)
  
  console.log(`🔍 Fetching results for user: ${userId}, limit: ${limit}, offset: ${offset}`)

  try {
    // Query user's test results with performance monitoring
    const testResults = await measureDatabaseQuery(
      () => prisma.$queryRaw<any[]>`
        SELECT 
          ap.anp_seq as id,
          ap.anp_start_date as startDate,
          ap.anp_end_date as endDate,
          ap.anp_done as status,
          ap.qu_code as testCode,
          q.qu_kind1 as testType,
          q.qu_kind2 as testCategory,
          cr.cr_pay as isPaid,
          cr.pd_kind as productType
        FROM mwd_answer_progress ap
        LEFT JOIN mwd_question q ON ap.qu_code = q.qu_code
        LEFT JOIN mwd_choice_result cr ON ap.ac_gid = cr.ac_gid AND ap.cr_seq = cr.cr_seq
        WHERE ap.ac_gid = ${userId}::uuid
        ORDER BY ap.anp_start_date DESC
        LIMIT ${limit}
        OFFSET ${offset}
      `,
      'fetch_user_test_results',
      ENDPOINT
    )

    console.log(`📊 Results query returned ${testResults.length} results`)

    // Process and clean results data (BigInt safe conversion)
    const results = testResults.map(result => ({
      id: String(result.id), // BigInt to String conversion
      testCode: result.testcode,
      testType: result.testtype,
      testCategory: result.testcategory,
      status: result.status,
      startDate: result.startdate ? new Date(result.startdate).toISOString() : null,
      endDate: result.enddate ? new Date(result.enddate).toISOString() : null,
      isPaid: result.ispaid === 'Y',
      productType: result.producttype || '',
      isCompleted: result.status === 'Y'
    }))

    // Get total count for pagination with monitoring
    const totalCount = await measureDatabaseQuery(
      () => prisma.$queryRaw<{ count: bigint }[]>`
        SELECT COUNT(*) as count
        FROM mwd_answer_progress ap
        WHERE ap.ac_gid = ${userId}::uuid
      `,
      'count_user_test_results',
      ENDPOINT
    )

    const total = Number(totalCount[0]?.count || 0) // BigInt to Number conversion
    
    console.log(`✅ Results data successfully retrieved for user: ${userId}, total: ${total}`)

    const responseData = {
      results,
      pagination: {
        total,
        limit,
        offset,
        hasMore: total > offset + limit,
        currentPage: Math.floor(offset / limit) + 1,
        totalPages: Math.ceil(total / limit)
      }
    }

    return APIErrorHandler.createSuccessResponse(responseData, ENDPOINT)

  } catch (error) {
    console.error(`❌ Results API error for user ${userId}:`, {
      error: error instanceof Error ? error.message : error,
      stack: error instanceof Error ? error.stack : undefined,
      userId,
      limit,
      offset,
      timestamp: new Date().toISOString()
    })
    
    // Handle database-specific errors with fallback behavior
    if (error instanceof Error) {
      // Provide fallback behavior for connection failures
      if (error.message.includes('connection') || error.message.includes('timeout')) {
        console.warn(`⚠️ Results API: Connection issue, providing fallback data for user: ${userId}`)
        
        const fallbackData = {
          results: [],
          pagination: {
            total: 0,
            limit,
            offset,
            hasMore: false,
            currentPage: 1,
            totalPages: 0
          },
          fallback: true,
          message: 'Using fallback data due to connection issues'
        }
        
        return NextResponse.json({
          success: true,
          data: fallbackData,
          meta: {
            timestamp: new Date(),
            endpoint: ENDPOINT,
            fallback: true,
            userId
          }
        }, { status: 200 })
      }
    }
    
    // Let the database middleware handle database-specific errors
    throw error
  }
}, {
  validateConnection: true,
  retryOnFailure: true,
  maxRetries: 2,
  timeout: 10000
})