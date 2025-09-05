import { NextRequest, NextResponse } from 'next/server'
import { verifySessionCode } from '@/lib/auth'

export async function POST(request: NextRequest) {
  try {
    const { code } = await request.json()
    
    if (!code) {
      return NextResponse.json(
        { valid: false, message: '회차코드를 입력해주세요' },
        { status: 400 }
      )
    }
    
    const isValid = await verifySessionCode(code)
    
    return NextResponse.json({
      valid: isValid,
      message: isValid ? '유효한 회차코드입니다' : '유효하지 않은 회차코드입니다'
    })
    
  } catch (error) {
    console.error('Session code verification error:', error)
    return NextResponse.json(
      { valid: false, message: '회차코드 검증 중 오류가 발생했습니다' },
      { status: 500 }
    )
  }
}