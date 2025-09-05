import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { verifyRefreshToken, generateTokens, getUserById, getTokenCookieOptions } from '@/lib/auth'

export async function POST(request: NextRequest) {
  try {
    const cookieStore = cookies()
    const refreshToken = cookieStore.get('refreshToken')?.value

    if (!refreshToken) {
      return NextResponse.json(
        { error: 'No refresh token provided' },
        { status: 401 }
      )
    }

    const payload = verifyRefreshToken(refreshToken)
    if (!payload) {
      return NextResponse.json(
        { error: 'Invalid refresh token' },
        { status: 401 }
      )
    }

    const user = await getUserById(payload.userId)
    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    // Generate new tokens
    const tokens = generateTokens(user.id, user.email, {
      userType: user.type,
      loginType: payload.loginType,
      sessionCode: payload.sessionCode,
      isMobile: payload.isMobile,
      platform: payload.platform
    })

    // Create response
    const response = NextResponse.json({
      success: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        type: user.type,
        ac_id: user.ac_id
      },
      tokens
    })

    // Set new cookies
    response.cookies.set('accessToken', tokens.accessToken, getTokenCookieOptions(false))
    response.cookies.set('refreshToken', tokens.refreshToken, getTokenCookieOptions(true))

    return response

  } catch (error) {
    console.error('Token refresh error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}