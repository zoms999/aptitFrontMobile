import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { z } from 'zod'

const preferencesSchema = z.object({
  preferences: z.object({
    language: z.enum(['ko', 'en']).default('ko'),
    notifications: z.boolean().default(true),
    theme: z.enum(['light', 'dark', 'system']).default('system'),
    testReminders: z.boolean().default(true),
    hapticFeedback: z.boolean().default(true).optional(),
    autoSave: z.boolean().default(true).optional()
  })
})

export async function PUT(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request)
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const validatedData = preferencesSchema.parse(body)

    // Update user preferences
    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: {
        preferences: validatedData.preferences,
        updatedAt: new Date()
      },
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

    return NextResponse.json({
      success: true,
      user: {
        ...updatedUser,
        profileImage: updatedUser.profileImage || undefined,
        preferences: updatedUser.preferences ? (updatedUser.preferences as any) : undefined
      },
      message: '설정이 성공적으로 저장되었습니다.'
    })

  } catch (error) {
    console.error('Preferences update error:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: error.errors[0].message },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { success: false, error: '설정 저장에 실패했습니다.' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request)
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const userData = await prisma.user.findUnique({
      where: { id: user.id },
      select: {
        preferences: true
      }
    })

    return NextResponse.json({
      success: true,
      preferences: userData?.preferences || {
        language: 'ko',
        notifications: true,
        theme: 'system',
        testReminders: true,
        hapticFeedback: true,
        autoSave: true
      }
    })

  } catch (error) {
    console.error('Preferences fetch error:', error)
    return NextResponse.json(
      { success: false, error: '설정을 불러오는데 실패했습니다.' },
      { status: 500 }
    )
  }
}