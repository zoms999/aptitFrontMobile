import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { authenticateUser, generateTokens, getTokenCookieOptions } from '@/lib/auth'

// Simplified validation schema
const loginSchema = z.object({
  username: z.string().min(1, 'Username is required'),
  password: z.string().min(1, 'Password is required'),
  rememberMe: z.boolean().optional().default(false),
  loginType: z.enum(['personal', 'organization']).optional().default('personal'),
  sessionCode: z.string().optional()
})

export async function POST(request: NextRequest) {
  try {
    console.log('로그인 API 호출됨')
    
    let body
    try {
      body = await request.json()
      console.log('로그인 요청 데이터:', body)
    } catch (parseError) {
      console.error('JSON 파싱 오류:', parseError)
      return NextResponse.json(
        { 
          success: false,
          error: 'Invalid JSON in request body' 
        },
        { status: 400 }
      )
    }
    
    // Basic validation
    if (!body.username || !body.password) {
      console.error('필수 필드 누락:', { username: !!body.username, password: !!body.password })
      return NextResponse.json(
        { 
          success: false,
          error: 'Username and password are required' 
        },
        { status: 400 }
      )
    }
    
    // Validate input with schema
    const validationResult = loginSchema.safeParse(body)
    if (!validationResult.success) {
      console.error('로그인 검증 실패:', validationResult.error.errors)
      return NextResponse.json(
        { 
          success: false,
          error: 'Validation failed', 
          details: validationResult.error.errors 
        },
        { status: 400 }
      )
    }
    
    const { username, password, rememberMe, loginType, sessionCode } = validationResult.data
    
    console.log('모바일 로그인 시도:', { username, loginType, hasSessionCode: !!sessionCode });
    
    // 기존 웹앱과 동일한 로그인 로직 사용
    const user = await authenticateUser(username, password, loginType, sessionCode)
    
    if (!user) {
      console.log('로그인 실패:', username);
      return NextResponse.json(
        { 
          success: false,
          error: 'Invalid username or password' 
        },
        { status: 401 }
      )
    }
    
    console.log('로그인 성공:', { id: user.id, name: user.name, type: user.type });
    
    // Generate tokens with mobile-specific claims
    const tokenPayload = {
      userId: user.id,
      email: user.email,
      userType: user.type,
      sessionCode: sessionCode,
      loginType,
      isMobile: true,
      platform: 'mobile'
    }
    const tokens = generateTokens(user.id, user.email, tokenPayload)
    
    // Prepare user data
    const userData = {
      id: user.id,
      email: user.email,
      name: user.name,
      profileImage: user.profileImage,
      preferences: user.preferences,
      loginType,
      type: user.type,
      ac_id: user.ac_id,
      lastLoginAt: new Date(),
      createdAt: user.createdAt,
      updatedAt: user.updatedAt
    }
    
    // Create response with mobile-specific data
    const response = NextResponse.json({
      success: true,
      user: userData,
      tokens: {
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken
      },
      isMobileLogin: true
    })
    
    // Set secure cookies
    const accessTokenOptions = getTokenCookieOptions(false)
    const refreshTokenOptions = getTokenCookieOptions(true)
    
    // Extend refresh token expiry if "remember me" is checked
    if (rememberMe) {
      refreshTokenOptions.maxAge = 30 * 24 * 60 * 60 // 30 days
    }
    
    response.cookies.set('accessToken', tokens.accessToken, accessTokenOptions)
    response.cookies.set('refreshToken', tokens.refreshToken, refreshTokenOptions)
    
    return response
    
  } catch (error) {
    console.error('Login error:', error)
    return NextResponse.json(
      { 
        success: false,
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}