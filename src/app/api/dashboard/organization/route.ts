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
    const userType = payload.userType;
    const sessionCode = payload.sessionCode;

    console.log('기관 대시보드 - 사용자 정보:', { userId, userType, sessionCode });

    // 기관 관련 계정인지 검증
    if (userType !== 'organization_admin' && userType !== 'organization_member') {
      return NextResponse.json({ error: '기관 계정이 아닙니다.' }, { status: 403 });
    }

    const user = await prisma.mwd_account.findFirst({
      where: {
        ac_gid: userId,
        ac_use: 'Y'
      }
    });

    if (!user) {
      return NextResponse.json({ error: '계정 정보를 찾을 수 없습니다.' }, { status: 404 });
    }

    const ins_seq = user.ins_seq;
    if (ins_seq <= 0) {
      return NextResponse.json({ error: '유효하지 않은 기관 정보입니다.' }, { status: 403 });
    }

    // 기관 정보 조회
    const instituteResult = await prisma.$queryRaw`
      SELECT ins.ins_seq, ins.ins_name, tur.tur_seq, tur.tur_code,
            tur.tur_req_sum, tur.tur_use_sum, tur.tur_is_paid, tur.tur_allow_no_payment
      FROM mwd_account ac
      JOIN mwd_institute ins ON ac.ins_seq = ins.ins_seq
      JOIN mwd_institute_turn tur ON ins.ins_seq = tur.ins_seq
      WHERE ac.ac_gid = ${userId}::uuid
      AND tur.tur_use = 'Y'
      AND tur.tur_code = ${sessionCode}
      ORDER BY tur_seq DESC
    ` as any[];

    if (!Array.isArray(instituteResult) || instituteResult.length === 0) {
      return NextResponse.json({ error: '기관 정보를 찾을 수 없습니다.' }, { status: 404 });
    }

    // 계정 상태 조회
    const accountStatusResult = await prisma.$queryRaw`
      SELECT cr_pay, pd_kind, expire, state 
      FROM (
        SELECT ac.ac_gid, 
            row_number() OVER (ORDER BY cr.cr_seq DESC) rnum,
            COALESCE(cr.cr_pay, 'N') cr_pay, 
            COALESCE(cr.pd_kind, '') pd_kind,
            CASE 
                WHEN ac.ac_expire_date >= now() THEN 'Y' 
                ELSE 'N' 
            END expire,
            COALESCE(ap.anp_done, 'R') state
        FROM mwd_account ac
        LEFT JOIN mwd_choice_result cr ON cr.ac_gid = ac.ac_gid
        LEFT JOIN mwd_answer_progress ap ON ap.cr_seq = cr.cr_seq
        WHERE ac.ac_gid = ${userId}::uuid
          AND ac.ac_use = 'Y'
      ) t 
      WHERE rnum = 1
    ` as any[];

    // 검사 목록 조회
    const testsResult = await prisma.$queryRaw`
      SELECT row_number() OVER (ORDER BY cr.cr_seq DESC) AS num, 
            cr.cr_seq, 
            cr.cr_pay, 
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

    // 기관 회원 목록 조회 (기관 관리자일 때만)
    let membersResult: any[] = [];
    let membersWithTestStatus: any[] = [];

    if (userType === 'organization_admin') {
      const currentInstituteInfo = instituteResult[0];

      // 기본 회원 목록 조회
      membersResult = await prisma.$queryRaw`
        WITH LastTestInfo AS (
          SELECT
            ap.ac_gid,
            TO_CHAR(ap.anp_start_date, 'yyyy-mm-dd hh24:mi:ss') AS startdate,
            TO_CHAR(ap.anp_end_date, 'yyyy-mm-dd') AS enddate,
            ROW_NUMBER() OVER(PARTITION BY ap.ac_gid ORDER BY ap.anp_seq DESC) as rn
          FROM mwd_answer_progress ap
        )
        SELECT
          pe.pe_seq,
          pe.pe_name,
          pe.pe_email,
          pe.pe_sex,
          pe.pe_cellphone,
          TO_CHAR(im.mem_insert_date, 'yyyy-mm-dd') AS join_date,
          ac.ac_gid,
          ac.ac_id,
          COALESCE(lti.startdate, '') AS startdate,
          COALESCE(lti.enddate, '') AS enddate,
          TO_CHAR(ac.ac_expire_date, 'yyyy-mm-dd') AS expiredate
        FROM mwd_institute ins
        JOIN mwd_institute_turn tur ON ins.ins_seq = tur.ins_seq
        JOIN mwd_institute_member im ON tur.ins_seq = im.ins_seq AND tur.tur_seq = im.tur_seq
        JOIN mwd_person pe ON im.pe_seq = pe.pe_seq
        LEFT JOIN mwd_account ac ON pe.pe_seq = ac.pe_seq
        LEFT JOIN LastTestInfo lti ON ac.ac_gid = lti.ac_gid AND lti.rn = 1
        WHERE ins.ins_seq = ${currentInstituteInfo.ins_seq}
        AND tur.tur_use = 'Y'
        ORDER BY im.mem_insert_date DESC
      ` as any[];

      // 각 회원의 검사 상태 조회
      if (Array.isArray(membersResult) && membersResult.length > 0) {
        for (const member of membersResult) {
          let testStatus = { hasTest: false, testCount: 0, completedCount: 0, latestTestStatus: 'none', latestCrSeq: null as string | null };

          if (member?.ac_gid) {
            const summaryResult = await prisma.$queryRaw`
              SELECT 
                  COUNT(*) AS total_tests,
                  SUM(CASE WHEN COALESCE(ap.anp_done, 'R') = 'E' THEN 1 ELSE 0 END) AS completed_tests
              FROM mwd_choice_result cr
              LEFT JOIN mwd_answer_progress ap ON ap.cr_seq = cr.cr_seq
              WHERE cr.ac_gid = ${member.ac_gid}::uuid
            ` as any[];

            const latestStatusResult = await prisma.$queryRaw`
              SELECT COALESCE(ap.anp_done, 'R') as latest_status, cr.cr_seq as latest_cr_seq
              FROM mwd_choice_result cr
              LEFT JOIN mwd_answer_progress ap ON ap.cr_seq = cr.cr_seq
              WHERE cr.ac_gid = ${member.ac_gid}::uuid
              ORDER BY cr.cr_seq DESC
              LIMIT 1
            ` as any[];

            const summaryData = summaryResult?.[0];
            const latestStatusData = latestStatusResult?.[0];

            if (summaryData && parseInt(summaryData.total_tests) > 0) {
              testStatus = {
                hasTest: true,
                testCount: parseInt(summaryData.total_tests),
                completedCount: parseInt(summaryData.completed_tests || '0'),
                latestTestStatus: latestStatusData?.latest_status || 'none',
                latestCrSeq: latestStatusData?.latest_cr_seq || null
              };
            }
          }

          membersWithTestStatus.push({
            ...member,
            testStatus
          });
        }
      }
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
    const safeAccountStatus = Array.isArray(accountStatusResult) && accountStatusResult.length > 0
      ? convertBigIntToString(accountStatusResult[0])
      : { cr_pay: 'N', pd_kind: '', expire: 'N', state: 'R' };

    const safeTests = Array.isArray(testsResult)
      ? convertBigIntToString(testsResult)
      : [];

    const safeInstituteInfo = Array.isArray(instituteResult) && instituteResult.length > 0
      ? convertBigIntToString(instituteResult[0])
      : null;

    const safeMembers = userType === 'organization_admin'
      ? convertBigIntToString(membersWithTestStatus)
      : [];

    return NextResponse.json({
      accountStatus: safeAccountStatus,
      tests: safeTests,
      completedTests,
      instituteInfo: safeInstituteInfo,
      members: safeMembers,
      isOrganization: true,
      isOrganizationAdmin: userType === 'organization_admin',
      userType: userType
    });

  } catch (error) {
    console.error('기관 대시보드 정보 조회 오류:', error);
    return NextResponse.json(
      { error: '기관 대시보드 정보를 가져오는 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}