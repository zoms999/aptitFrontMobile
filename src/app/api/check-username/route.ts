import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

// 사용자 아이디 중복 확인 API
export async function POST(request: Request) {
  try {
    const { username } = await request.json();

    if (!username) {
      return NextResponse.json({ available: false, message: '아이디를 입력해주세요.' }, { status: 400 });
    }

    // 2. 계정 사용 여부 확인 (중복검사)
    const result = await prisma.$queryRaw<{ac_use: string}[]>`
      SELECT ac_use
      FROM mwd_account
      WHERE ac_id = lower(${username.toLowerCase()})
    `;
    
    if (result.length === 0) {
      // 존재하지 않는 아이디 = 사용 가능
      return NextResponse.json({ available: true });
    }
    
    // 이미 등록된 아이디 = 사용 불가
    return NextResponse.json({ available: false, message: '이미 사용중인 아이디입니다.' });

  } catch (error) {
    console.error('아이디 확인 오류:', error);
    return NextResponse.json({ available: false, message: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
}