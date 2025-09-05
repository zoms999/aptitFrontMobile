import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma, Answer, DeviceInfo, ResultAnalysis } from '@/lib/db'
import { getAuthenticatedUser } from '@/lib/auth'

interface RouteParams {
  params: {
    testId: string
  }
}

// Validation schema for test submission
const submitSchema = z.object({
  answers: z.array(z.object({
    questionId: z.string(),
    value: z.union([z.string(), z.number(), z.array(z.string())]),
    timeSpent: z.number(),
    timestamp: z.string().transform(str => new Date(str))
  })),
  timeSpent: z.number().min(0),
  deviceInfo: z.object({
    userAgent: z.string(),
    screenWidth: z.number(),
    screenHeight: z.number(),
    devicePixelRatio: z.number(),
    platform: z.string(),
    isMobile: z.boolean(),
    isTablet: z.boolean(),
    connectionType: z.string().optional(),
    batteryLevel: z.number().optional()
  }).optional(),
  sessionId: z.string().optional()
})

export async function POST(request: NextRequest, { params }: RouteParams) {
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
    const body = await request.json()

    // Validate input
    const validationResult = submitSchema.safeParse(body)
    if (!validationResult.success) {
      return NextResponse.json(
        { 
          error: 'Validation failed', 
          details: validationResult.error.errors 
        },
        { status: 400 }
      )
    }

    const { answers, timeSpent, deviceInfo, sessionId } = validationResult.data

    // Fetch test to validate submission
    const test = await prisma.test.findUnique({
      where: { 
        id: testId,
        isActive: true
      },
      select: {
        id: true,
        title: true,
        questions: true,
        timeLimit: true
      }
    })

    if (!test) {
      return NextResponse.json(
        { error: 'Test not found or inactive' },
        { status: 404 }
      )
    }

    // Validate answers against test questions
    const testQuestions = test.questions as any[]
    const questionIds = testQuestions.map(q => q.id)
    const submittedQuestionIds = answers.map(a => a.questionId)
    
    // Check if all required questions are answered
    const requiredQuestions = testQuestions.filter(q => q.required)
    const missingRequired = requiredQuestions.filter(q => 
      !submittedQuestionIds.includes(q.id)
    )

    if (missingRequired.length > 0) {
      return NextResponse.json(
        { 
          error: 'Missing required answers',
          missingQuestions: missingRequired.map(q => q.id)
        },
        { status: 400 }
      )
    }

    // Check time limit if specified
    if (test.timeLimit && timeSpent > test.timeLimit * 60) {
      return NextResponse.json(
        { error: 'Time limit exceeded' },
        { status: 400 }
      )
    }

    // Calculate score (simplified scoring logic)
    const score = calculateTestScore(answers, testQuestions)
    
    // Generate analysis
    const analysis = generateResultAnalysis(answers, testQuestions, score)

    // Calculate percentile (simplified - in real app, this would be based on historical data)
    const percentile = await calculatePercentile(testId, score)

    // Determine submission source
    const submittedFrom = deviceInfo?.isMobile ? 'mobile' : 
                         deviceInfo?.isTablet ? 'tablet' : 'desktop'

    // Create test result
    const testResult = await prisma.testResult.create({
      data: {
        userId: user.id,
        testId: testId,
        answers: answers as any,
        score: score,
        percentile: percentile,
        timeSpent: timeSpent,
        deviceInfo: deviceInfo as any,
        analysis: analysis as any,
        submittedFrom: submittedFrom,
        networkType: deviceInfo?.connectionType || null
      },
      select: {
        id: true,
        score: true,
        percentile: true,
        completedAt: true,
        timeSpent: true,
        analysis: true,
        submittedFrom: true
      }
    })

    // Clean up active session if exists
    if (sessionId) {
      await prisma.testSession.updateMany({
        where: {
          userId: user.id,
          testId: testId,
          id: sessionId
        },
        data: {
          isCompleted: true
        }
      })
    }

    // Update user's last activity
    await prisma.user.update({
      where: { id: user.id },
      data: { updatedAt: new Date() }
    })

    return NextResponse.json({
      success: true,
      data: {
        result: testResult,
        test: {
          id: test.id,
          title: test.title
        },
        message: 'Test submitted successfully'
      }
    }, { status: 201 })

  } catch (error) {
    console.error('Test submission error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// Helper function to calculate test score
function calculateTestScore(answers: Answer[], questions: any[]): number {
  let totalScore = 0
  let maxScore = 0

  for (const question of questions) {
    const answer = answers.find(a => a.questionId === question.id)
    maxScore += question.maxPoints || 1

    if (answer && question.type === 'multiple-choice') {
      const correctOption = question.options?.find((opt: any) => opt.isCorrect)
      if (correctOption && answer.value === correctOption.value) {
        totalScore += question.maxPoints || 1
      }
    } else if (answer && question.type === 'rating') {
      // For rating questions, give partial credit based on scale
      const scale = question.scale || 5
      const points = (Number(answer.value) / scale) * (question.maxPoints || 1)
      totalScore += points
    }
  }

  return maxScore > 0 ? (totalScore / maxScore) * 100 : 0
}

// Helper function to generate result analysis
function generateResultAnalysis(answers: Answer[], questions: any[], score: number): ResultAnalysis {
  const categoryScores: { [key: string]: { total: number, max: number } } = {}
  
  // Calculate category scores
  for (const question of questions) {
    const category = question.category || 'general'
    const answer = answers.find(a => a.questionId === question.id)
    
    if (!categoryScores[category]) {
      categoryScores[category] = { total: 0, max: 0 }
    }
    
    categoryScores[category].max += question.maxPoints || 1
    
    if (answer && question.type === 'multiple-choice') {
      const correctOption = question.options?.find((opt: any) => opt.isCorrect)
      if (correctOption && answer.value === correctOption.value) {
        categoryScores[category].total += question.maxPoints || 1
      }
    }
  }

  // Generate category scores array
  const categoryScoresArray = Object.entries(categoryScores).map(([category, scores]) => ({
    category,
    score: scores.max > 0 ? (scores.total / scores.max) * 100 : 0,
    maxScore: 100,
    percentile: 0 // Would be calculated based on historical data
  }))

  // Generate strengths and weaknesses
  const strengths = categoryScoresArray
    .filter(cat => cat.score >= 70)
    .map(cat => cat.category)

  const weaknesses = categoryScoresArray
    .filter(cat => cat.score < 50)
    .map(cat => cat.category)

  // Generate recommendations
  const recommendations = weaknesses.map(weakness => 
    `Consider focusing on improving your ${weakness} skills`
  )

  return {
    strengths,
    weaknesses,
    recommendations,
    categoryScores: categoryScoresArray,
    overallScore: score,
    percentileRank: 0 // Would be calculated based on historical data
  }
}

// Helper function to calculate percentile
async function calculatePercentile(testId: string, score: number): Promise<number> {
  try {
    const totalResults = await prisma.testResult.count({
      where: { testId }
    })

    if (totalResults === 0) return 50 // Default percentile for first submission

    const lowerScores = await prisma.testResult.count({
      where: {
        testId,
        score: { lt: score }
      }
    })

    return Math.round((lowerScores / totalResults) * 100)
  } catch (error) {
    console.error('Error calculating percentile:', error)
    return 50 // Default percentile on error
  }
}