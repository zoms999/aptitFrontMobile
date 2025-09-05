import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/auth';
import { prisma } from '@/lib/db';

export async function GET() {
  try {
    const cookieStore = cookies();
    const token = cookieStore.get('accessToken')?.value;

    console.log('대시보드 API 호출됨, 토큰 존재:', !!token);

    if (!token) {
      console.log('토큰 없음, 401 반환');
      return NextResponse.json({ error: '인증되지 않았습니다.' }, { status: 401 });
    }

    const payload = verifyToken(token);
    if (!payload) {
      console.log('토큰 검증 실패, 401 반환');
      return NextResponse.json({ error: '유효하지 않은 토큰입니다.' }, { status: 401 });
    }

    const userId = payload.userId;
    console.log('대시보드 라우팅 - 사용자 ID:', userId);

    // 사용자 정보 조회
    const user = await prisma.mwd_account.findFirst({
      where: {
        ac_gid: userId,
        ac_use: 'Y'
      },
      include: {
        mwd_person: true
      }
    });

    if (!user) {
      return NextResponse.json({ error: '계정 정보를 찾을 수 없습니다.' }, { status: 404 });
    }

    console.log('대시보드 라우팅 - 사용자 정보:', { ins_seq: user.ins_seq, userType: payload.userType });

    // 사용자 타입에 따라 적절한 대시보드로 라우팅
    if (payload.userType === 'organization_admin' || payload.userType === 'organization_member') {
      // 기관 계정인 경우 - 기관 대시보드로 라우팅
      console.log('기관 대시보드로 라우팅 (타입:', payload.userType, ')');
      
      return NextResponse.json({
        redirect: '/api/dashboard/organization',
        userType: payload.userType,
        isOrganization: true
      });
      
    } else {
      // 일반 회원인 경우 - 개인 대시보드로 라우팅
      console.log('개인 대시보드로 라우팅');
      
      return NextResponse.json({
        redirect: '/api/dashboard/personal',
        userType: 'personal',
        isOrganization: false
      });
    }
    
  } catch (error) {
    console.error('대시보드 정보 조회 오류:', error);
    return NextResponse.json(
      { error: '대시보드 정보를 가져오는 중 오류가 발생했습니다.' }, 
      { status: 500 }
    );
  }
}