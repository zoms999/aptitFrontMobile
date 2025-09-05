import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/auth';
import { prisma } from '@/lib/db';

export async function GET() {
  try {
    const cookieStore = cookies();
    const token = cookieStore.get('accessToken')?.value;

    if (!token) {
      return NextResponse.json({ error: '인증되지 않았습니다.' }, { status: 401 });
    }

    const payload = await verifyToken(token);
    if (!payload) {
      return NextResponse.json({ error: '유효하지 않은 토큰입니다.' }, { status: 401 });
    }

    const userId = payload.userId;
    console.log('일반회원 대시보드 - 사용자 ID:', userId);

    // 일반 회원 여부 검증
    const user = await prisma.mwd_account.findFirst({
      where: {
        ac_gid: userId,
        ac_use: 'Y'
      }
    });

    if (!user) {
      return NextResponse.json({ error: '계정 정보를 찾을 수 없습니다.' }, { status: 404 });
    }

    if (user.ins_seq !== -1) {
      return NextResponse.json({ error: '일반 회원 계정이 아닙니다.' }, { status: 403 });
    }

    // 검사 목록 조회
    const testsResult = await prisma.$queryRaw`
      SELECT row_number() OVER (ORDER BY cr.cr_seq DESC) AS num, 
            cr.cr_seq, 
            cr.cr_pay, 
            cr.pd_kind,
            pr.pd_name,
            COALESCE(ap.anp_seq, -1) AS anp_seq, 
            COALESCE(TO_CHAR(ap.anp_start_date, 'yyyy-mm-dd hh24:mi:ss'), '') AS startdate,
            COALESCE(TO_CHAR(ap.anp_end_date, 'yyyy-mm-dd'), '') AS enddate,
            COALESCE(ap.anp_done, 'R') AS done,
            CASE 
                WHEN cr.pd_kind = 'basic' 
                    AND ac.ac_expire_date >= now() 
                    AND COALESCE(ap.anp_done, '') = 'E' THEN 'Y'
                WHEN cr.pd_kind = 'basic' 
                    AND ac.ac_expire_date <= now() THEN 'E'
                WHEN cr.pd_kind LIKE 'premium%' 
                    AND COALESCE(ap.anp_done, '') = 'E' THEN 'P'
                ELSE 'N'
            END AS rview,
            TO_CHAR(ac.ac_expire_date, 'yyyy-mm-dd') AS expiredate
      FROM mwd_product pr, mwd_account ac, mwd_choice_result cr
      LEFT JOIN mwd_answer_progress ap ON ap.cr_seq = cr.cr_seq
      WHERE ac.ac_gid = ${userId}::uuid
        AND cr.ac_gid = ac.ac_gid 
        AND pr.pd_num = cr.pd_num
    ` as any[];

    // 사용자 정보 조회
    const userInfoResult = await prisma.$queryRaw`
      SELECT pe.pe_name, pe.pe_sex, pe.pe_email, pe.pe_cellphone,
            pe.pe_birth_year, pe.pe_birth_month, pe.pe_birth_day
      FROM mwd_account ac
      JOIN mwd_person pe ON ac.pe_seq = pe.pe_seq
      WHERE ac.ac_gid = ${userId}::uuid
      AND ac.ac_use = 'Y'
    ` as any[];

    if (!Array.isArray(userInfoResult) || userInfoResult.length === 0) {
      return NextResponse.json({ error: '사용자 정보를 찾을 수 없습니다.' }, { status: 404 });
    }

    // 완료된 검사 수 계산
    const completedTests = Array.isArray(testsResult)
      ? testsResult.filter(test => test.done === 'E').length
      : 0;

    // BigInt 값을 문자열로 변환하는 함수
    const convertBigIntToString = (obj: unknown): unknown => {
      if (obj === null || obj === undefined) return obj;

      if (typeof obj === 'bigint') {
        return obj.toString();
      }

      if (Array.isArray(obj)) {
        return obj.map(item => convertBigIntToString(item));
      }

      if (typeof obj === 'object') {
        const result: Record<string, unknown> = {};
        for (const key in obj) {
          result[key] = convertBigIntToString((obj as Record<string, unknown>)[key]);
        }
        return result;
      }

      return obj;
    };

    // 결과 처리
    const safeTests = Array.isArray(testsResult)
      ? convertBigIntToString(testsResult)
      : [];

    const safeUserInfo = Array.isArray(userInfoResult) && userInfoResult.length > 0
      ? convertBigIntToString(userInfoResult[0])
      : null;

    return NextResponse.json({
      tests: safeTests,
      completedTests,
      userInfo: safeUserInfo,
      isOrganization: false
    });

  } catch (error) {
    console.error('일반회원 대시보드 정보 조회 오류:', error);
    return NextResponse.json(
      { error: '일반회원 대시보드 정보를 가져오는 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}