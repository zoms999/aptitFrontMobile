import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request)
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Collect all user data
    const userData = await prisma.user.findUnique({
      where: { id: user.id },
      select: {
        id: true,
        email: true,
        name: true,
        profileImage: true,
        preferences: true,
        createdAt: true,
        updatedAt: true
      }
    })

    const testResults = await prisma.testResult.findMany({
      where: { userId: user.id },
      select: {
        id: true,
        testId: true,
        score: true,
        percentile: true,
        completedAt: true,
        timeSpent: true,
        deviceInfo: true,
        analysis: true,
        answers: true,
        test: {
          select: {
            title: true,
            description: true,
            category: true
          }
        }
      },
      orderBy: { completedAt: 'desc' }
    })

    const testSessions = await prisma.testSession.findMany({
      where: { userId: user.id },
      select: {
        id: true,
        testId: true,
        currentQuestion: true,
        answers: true,
        startedAt: true,
        lastActivityAt: true,
        isCompleted: true,
        test: {
          select: {
            title: true,
            description: true
          }
        }
      },
      orderBy: { startedAt: 'desc' }
    })

    // Prepare export data
    const exportData = {
      exportInfo: {
        exportedAt: new Date().toISOString(),
        exportedBy: user.email,
        version: '1.0'
      },
      profile: {
        ...userData,
        profileImage: userData?.profileImage || null,
        preferences: userData?.preferences || null
      },
      testResults: testResults.map(result => ({
        ...result,
        deviceInfo: result.deviceInfo || null,
        analysis: result.analysis || null,
        answers: result.answers || null
      })),
      testSessions: testSessions.map(session => ({
        ...session,
        answers: session.answers || null
      })),
      statistics: {
        totalTests: testResults.length,
        totalSessions: testSessions.length,
        completedSessions: testSessions.filter(s => s.isCompleted).length,
        averageScore: testResults.length > 0 
          ? testResults.reduce((sum, r) => sum + (r.score || 0), 0) / testResults.length 
          : 0,
        firstTestDate: testResults.length > 0 
          ? testResults[testResults.length - 1].completedAt 
          : null,
        lastTestDate: testResults.length > 0 
          ? testResults[0].completedAt 
          : null
      }
    }

    // Create JSON response
    const jsonData = JSON.stringify(exportData, null, 2)
    
    return new NextResponse(jsonData, {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="aptit-data-${user.email}-${new Date().toISOString().split('T')[0]}.json"`,
        'Content-Length': Buffer.byteLength(jsonData, 'utf8').toString()
      }
    })

  } catch (error) {
    console.error('Data export error:', error)
    return NextResponse.json(
      { success: false, error: '데이터 내보내기에 실패했습니다.' },
      { status: 500 }
    )
  }
}