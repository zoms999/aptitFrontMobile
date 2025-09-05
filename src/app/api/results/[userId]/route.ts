import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET(
  request: NextRequest,
  { params }: { params: { userId: string } }
) {
  try {
    const { userId } = params
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '20')
    const offset = parseInt(searchParams.get('offset') || '0')
    
    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      )
    }

    // 사용자의 검사 결과 조회
    const testResults = await prisma.$queryRaw<any[]>`
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
    `

    // 결과 데이터 정리 (BigInt 안전 변환)
    const results = testResults.map(result => ({
      id: String(result.id), // BigInt를 String으로 변환
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

    // 전체 결과 수 조회
    const totalCount = await prisma.$queryRaw<{ count: bigint }[]>`
      SELECT COUNT(*) as count
      FROM mwd_answer_progress ap
      WHERE ap.ac_gid = ${userId}::uuid
    `

    return NextResponse.json({
      success: true,
      results,
      pagination: {
        total: Number(totalCount[0]?.count || 0), // BigInt를 Number로 변환
        limit,
        offset,
        hasMore: Number(totalCount[0]?.count || 0) > offset + limit
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