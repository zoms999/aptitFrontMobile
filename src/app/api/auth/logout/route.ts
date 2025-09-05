import { NextRequest, NextResponse } from 'next/server'
import { getTokenCookieOptions } from '@/lib/auth'

export async function POST(request: NextRequest) {
  try {
    // Create response
    const response = NextResponse.json({
      success: true,
      message: 'Logged out successfully'
    })
    
    // Clear authentication cookies
    const cookieOptions = {
      ...getTokenCookieOptions(false),
      maxAge: 0, // Expire immediately
      expires: new Date(0)
    }
    
    response.cookies.set('accessToken', '', cookieOptions)
    response.cookies.set('refreshToken', '', cookieOptions)
    
    return response
    
  } catch (error) {
    console.error('Logout error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// Also support GET for logout links
export async function GET(request: NextRequest) {
  return POST(request)
}