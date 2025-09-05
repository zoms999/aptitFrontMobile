import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUser, verifyPassword, hashPassword } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { z } from 'zod'

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z.string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, 'Password must contain uppercase, lowercase, and number')
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
    const validatedData = changePasswordSchema.parse(body)

    // Get user with password
    const userWithPassword = await prisma.user.findUnique({
      where: { id: user.id },
      select: { id: true, password: true }
    })

    if (!userWithPassword) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      )
    }

    // Verify current password
    const isCurrentPasswordValid = await verifyPassword(
      validatedData.currentPassword,
      userWithPassword.password
    )

    if (!isCurrentPasswordValid) {
      return NextResponse.json(
        { success: false, error: '현재 비밀번호가 올바르지 않습니다.' },
        { status: 400 }
      )
    }

    // Check if new password is different from current
    const isSamePassword = await verifyPassword(
      validatedData.newPassword,
      userWithPassword.password
    )

    if (isSamePassword) {
      return NextResponse.json(
        { success: false, error: '새 비밀번호는 현재 비밀번호와 달라야 합니다.' },
        { status: 400 }
      )
    }

    // Hash new password
    const hashedNewPassword = await hashPassword(validatedData.newPassword)

    // Update password
    await prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedNewPassword,
        updatedAt: new Date()
      }
    })

    return NextResponse.json({
      success: true,
      message: '비밀번호가 성공적으로 변경되었습니다.'
    })

  } catch (error) {
    console.error('Password change error:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: error.errors[0].message },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { success: false, error: '비밀번호 변경에 실패했습니다.' },
      { status: 500 }
    )
  }
}