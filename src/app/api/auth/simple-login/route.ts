import { NextRequest, NextResponse } from 'next/server'
import { authenticateUser, generateTokens, getTokenCookieOptions } from '@/lib/auth'

export async function POST(request: NextRequest) {
  try {
    console.warn('⚠️  DEPRECATED: /api/auth/simple-login is deprecated. Use /api/auth/login instead.')
    console.log('Simple login API called')
    
    const body = await request.json()
    console.log('Request body:', body)
    
    // Simple validation
    if (!body.username || !body.password) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Username and password required' 
        },
        { status: 400 }
      )
    }
    
    // Authenticate user with database
    const user = await authenticateUser(
      body.username, 
      body.password, 
      body.loginType || 'personal',
      body.sessionCode
    )
    
    if (!user) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Invalid credentials' 
        },
        { status: 401 }
      )
    }
    
    // Generate tokens
    const tokens = generateTokens(user.id, user.email, {
      userType: user.type,
      loginType: body.loginType || 'personal',
      sessionCode: body.sessionCode,
      isMobile: true,
      platform: 'mobile-app'
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
    
    // Set secure cookies if rememberMe is true
    if (body.rememberMe) {
      response.cookies.set('accessToken', tokens.accessToken, getTokenCookieOptions(false))
      response.cookies.set('refreshToken', tokens.refreshToken, getTokenCookieOptions(true))
    }
    
    return response
    
  } catch (error) {
    console.error('Simple login error:', error)
    return NextResponse.json(
      { 
        success: false,
        error: 'Server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}