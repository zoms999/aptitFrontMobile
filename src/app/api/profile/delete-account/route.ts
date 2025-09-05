import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUser, verifyPassword } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { z } from 'zod'

const deleteAccountSchema = z.object({
  password: z.string().min(1, 'Password is required'),
  confirmText: z.string().refine(val => val === 'DELETE', 'Confirmation text must be "DELETE"')
})

export async function DELETE(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request)
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const validatedData = deleteAccountSchema.parse(body)

    // Get user with password
    const userWithPassword = await prisma.user.findUnique({
      where: { id: user.id },
      select: { id: true, password: true, email: true }
    })

    if (!userWithPassword) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      )
    }

    // Verify password
    const isPasswordValid = await verifyPassword(
      validatedData.password,
      userWithPassword.password
    )

    if (!isPasswordValid) {
      return NextResponse.json(
        { success: false, error: '비밀번호가 올바르지 않습니다.' },
        { status: 400 }
      )
    }

    // Delete user data in transaction
    await prisma.$transaction(async (tx) => {
      // Delete test results
      await tx.testResult.deleteMany({
        where: { userId: user.id }
      })

      // Delete test sessions
      await tx.testSession.deleteMany({
        where: { userId: user.id }
      })

      // Delete user
      await tx.user.delete({
        where: { id: user.id }
      })
    })

    // Clear cookies
    const response = NextResponse.json({
      success: true,
      message: '계정이 성공적으로 삭제되었습니다.'
    })

    // Clear authentication cookies
    response.cookies.set('accessToken', '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 0,
      path: '/'
    })

    response.cookies.set('refreshToken', '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 0,
      path: '/'
    })

    return response

  } catch (error) {
    console.error('Account deletion error:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: error.errors[0].message },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { success: false, error: '계정 삭제에 실패했습니다.' },
      { status: 500 }
    )
  }
}