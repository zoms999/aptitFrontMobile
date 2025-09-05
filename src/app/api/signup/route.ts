import { NextRequest, NextResponse } from 'next/server';
import { POST as personalSignup } from './personal/route';
import { POST as organizationSignup } from './organization/route';

export async function POST(request: NextRequest) {
  try {
    // 요청 복제
    const clonedRequest = request.clone();
    const data = await clonedRequest.json();
    
    // 회원 유형에 따라 적절한 라우팅
    if (data.type === 'organization') {
      // 기관 회원가입 - 직접 함수 호출
      return await organizationSignup(request);
    } else {
      // 일반 회원가입 - 직접 함수 호출
      return await personalSignup(request);
    }
  } catch (error) {
    console.error('회원가입 라우팅 오류:', error);
    return NextResponse.json(
      { 
        success: false, 
        message: '회원가입 처리 중 오류가 발생했습니다.',
        error: error instanceof Error ? error.message : '알 수 없는 오류'
      },
      { status: 500 }
    );
  }
}