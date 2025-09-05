import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/db'
import { getAuthenticatedUser } from '@/lib/auth'

interface RouteParams {
    params: {
        testId: string
    }
}

// Validation schema for session operations
const sessionSchema = z.object({
    currentQuestion: z.number().min(0),
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
    }).optional()
})

// GET - Retrieve active session
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

        // Verify test exists and is active
        const test = await prisma.test.findUnique({
            where: {
                id: testId,
                isActive: true
            },
            select: {
                id: true,
                title: true,
                timeLimit: true
            }
        })

        if (!test) {
            return NextResponse.json(
                { error: 'Test not found or inactive' },
                { status: 404 }
            )
        }

        // Get active session
        const session = await prisma.testSession.findFirst({
            where: {
                userId: user.id,
                testId: testId,
                isCompleted: false,
                expiresAt: { gt: new Date() }
            }
        })

        if (!session) {
            return NextResponse.json({
                success: true,
                data: {
                    hasActiveSession: false,
                    session: null
                }
            })
        }

        return NextResponse.json({
            success: true,
            data: {
                hasActiveSession: true,
                session: {
                    id: session.id,
                    currentQuestion: session.currentQuestion,
                    answers: session.answers,
                    timeSpent: session.timeSpent,
                    lastActivity: session.lastActivity,
                    expiresAt: session.expiresAt
                }
            }
        })

    } catch (error) {
        console.error('Session retrieval error:', error)
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        )
    }
}

// POST - Create new session
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

        // Verify test exists and is active
        const test = await prisma.test.findUnique({
            where: {
                id: testId,
                isActive: true
            },
            select: {
                id: true,
                timeLimit: true
            }
        })

        if (!test) {
            return NextResponse.json(
                { error: 'Test not found or inactive' },
                { status: 404 }
            )
        }

        // Check if user already has an active session
        const existingSession = await prisma.testSession.findFirst({
            where: {
                userId: user.id,
                testId: testId,
                isCompleted: false,
                expiresAt: { gt: new Date() }
            }
        })

        if (existingSession) {
            return NextResponse.json({
                success: true,
                data: {
                    session: existingSession,
                    message: 'Active session already exists'
                }
            })
        }

        // Calculate session expiration
        const expirationHours = test.timeLimit ? Math.max(test.timeLimit / 60 + 2, 24) : 24
        const expiresAt = body.expiresAt ? new Date(body.expiresAt) : new Date(Date.now() + expirationHours * 60 * 60 * 1000)

        // Create new session
        const session = await prisma.testSession.create({
            data: {
                userId: user.id,
                testId: testId,
                currentQuestion: 0,
                answers: [],
                timeSpent: 0,
                deviceInfo: body.deviceInfo || {},
                lastActivity: new Date(),
                expiresAt
            }
        })

        return NextResponse.json({
            success: true,
            data: {
                session,
                message: 'Session created successfully'
            }
        })

    } catch (error) {
        console.error('Session creation error:', error)
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        )
    }
}

// PATCH - Update session (save progress)
export async function PATCH(request: NextRequest, { params }: RouteParams) {
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

        const { sessionId, currentQuestion, answers, timeSpent, deviceInfo, lastActivity } = body

        if (!sessionId) {
            return NextResponse.json(
                { error: 'Session ID is required' },
                { status: 400 }
            )
        }

        // Find and update the session
        const session = await prisma.testSession.findFirst({
            where: {
                id: sessionId,
                userId: user.id,
                testId: testId,
                isCompleted: false,
                expiresAt: { gt: new Date() }
            }
        })

        if (!session) {
            return NextResponse.json(
                { error: 'Session not found or expired' },
                { status: 404 }
            )
        }

        // Update session
        const updatedSession = await prisma.testSession.update({
            where: { id: sessionId },
            data: {
                currentQuestion: currentQuestion ?? session.currentQuestion,
                answers: answers ? answers as any : session.answers,
                timeSpent: timeSpent ?? session.timeSpent,
                deviceInfo: deviceInfo ? deviceInfo as any : session.deviceInfo,
                lastActivity: lastActivity ? new Date(lastActivity) : new Date()
            },
            select: {
                id: true,
                currentQuestion: true,
                timeSpent: true,
                lastActivity: true,
                expiresAt: true
            }
        })

        return NextResponse.json({
            success: true,
            data: {
                session: updatedSession,
                message: 'Progress saved successfully'
            }
        })

    } catch (error) {
        console.error('Session save error:', error)
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        )
    }
}

// DELETE - Clear session (abandon test)
export async function DELETE(request: NextRequest, { params }: RouteParams) {
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

        // Delete active session
        const deletedSession = await prisma.testSession.deleteMany({
            where: {
                userId: user.id,
                testId: testId,
                isCompleted: false
            }
        })

        return NextResponse.json({
            success: true,
            data: {
                deletedCount: deletedSession.count,
                message: 'Session cleared successfully'
            }
        })

    } catch (error) {
        console.error('Session deletion error:', error)
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        )
    }
}