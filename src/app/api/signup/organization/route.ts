import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

// 응답 타입 정의
interface InstituteInfo {
  ins_seq: number;
  tur_seq: number;
  tur_use: string;
  tur_req_sum: number;
  tur_use_sum: number;
}

interface AccountInfo {
  ac_use: string;
}

export async function POST(request: NextRequest) {
  try {
    console.log('기관 회원가입 요청 시작');
    
    const {
      username,
      password,
      name,
      gender,
      birthdate,
      phone,
      additionalPhone,
      email,
      zipcode,
      roadAddress,
      jibunAddress,
      detailAddress,
      additionalAddress,
      academicGroup,
      schoolName,
      major,
      grade,
      jobGroup,
      companyName,
      jobDescription,
      userAgent,
      agreeTerms,
      agreePrivacy,
      agreeMarketing,
      instituteSeq: requestInstituteSeq,
      turnSeq: requestTurnSeq
    } = await request.json();

    // 쿠키에서 기관 정보 가져오기
    const instituteSeqCookie = request.cookies.get('institute_seq');
    const turnSeqCookie = request.cookies.get('turn_seq');
    
    // 요청 본문 값과 쿠키 값 중 사용할 값을 먼저 결정
    const rawInstituteSeq = requestInstituteSeq || instituteSeqCookie?.value;
    const rawTurnSeq = requestTurnSeq || turnSeqCookie?.value;
    
    // 결정된 값을 안전하게 숫자로 변환
    const instituteSeq = rawInstituteSeq && !isNaN(parseInt(String(rawInstituteSeq), 10))
      ? parseInt(String(rawInstituteSeq), 10)
      : null;

    const turnSeq = rawTurnSeq && !isNaN(parseInt(String(rawTurnSeq), 10))
      ? parseInt(String(rawTurnSeq), 10)
      : null;

    console.log('기관 정보:', { 
      final_instituteSeq: instituteSeq, 
      final_turnSeq: turnSeq,
      type_of_final_seq: typeof instituteSeq,
      requestInstituteSeq, 
      requestTurnSeq,
      instituteSeqCookie: instituteSeqCookie?.value,
      turnSeqCookie: turnSeqCookie?.value,
    });

    // 필수 필드 검증
    const requiredFields = [
      { field: 'username', value: username, message: '아이디를 입력해주세요.' },
      { field: 'password', value: password, message: '비밀번호를 입력해주세요.' },
      { field: 'name', value: name, message: '이름을 입력해주세요.' },
      { field: 'gender', value: gender, message: '성별을 선택해주세요.' },
      { field: 'birthdate', value: birthdate, message: '생년월일을 입력해주세요.' },
      { field: 'phone', value: phone, message: '휴대폰 번호를 입력해주세요.' },
      { field: 'email', value: email, message: '이메일을 입력해주세요.' },
      { field: 'zipcode', value: zipcode, message: '우편번호를 입력해주세요.' },
      { field: 'roadAddress', value: roadAddress, message: '주소를 입력해주세요.' },
      { field: 'academicGroup', value: academicGroup, message: '학업군을 선택해주세요.' },
      { field: 'jobGroup', value: jobGroup, message: '직업군을 선택해주세요.' },
      { field: 'agreeTerms', value: agreeTerms, message: '이용약관에 동의해주세요.' },
      { field: 'agreePrivacy', value: agreePrivacy, message: '개인정보 처리방침에 동의해주세요.' }
    ];
    
    for (const field of requiredFields) {
      if (field.field === 'agreeTerms' || field.field === 'agreePrivacy' || field.field === 'agreeMarketing') {
        if (field.value === undefined || field.value === null) {
          return NextResponse.json({ success: false, message: field.message }, { status: 400 });
        }
      } else if (!field.value && field.value !== 0) {
        return NextResponse.json({ success: false, message: field.message }, { status: 400 });
      }
    }
    
    // 기관 정보 검증
    if (!instituteSeq || !turnSeq) {
      return NextResponse.json(
        { success: false, message: '기관 정보가 없습니다. 회차코드를 다시 확인해주세요.' },
        { status: 400 }
      );
    }
    
    // 약관 동의 여부 확인
    if (!agreeTerms || !agreePrivacy) {
      return NextResponse.json(
        { success: false, message: '필수 약관에 동의해주세요.' },
        { status: 400 }
      );
    }
    
    // 이메일, 전화번호 형식 검증
    if (!/\S+@\S+\.\S+/.test(email)) {
      return NextResponse.json({ success: false, message: '유효한 이메일 주소를 입력해주세요.' }, { status: 400 });
    }
    if (!/^\d+$/.test(phone)) {
      return NextResponse.json({ success: false, message: '휴대폰 번호는 숫자만 입력 가능합니다.' }, { status: 400 });
    }

    // 문자열 필드 길이 조정
    const truncatedValues = {
      name: name?.substring(0, 50), 
      phone: phone?.substring(0, 20), 
      additionalPhone: (additionalPhone || '')?.substring(0, 20),
      email: email?.substring(0, 100), 
      zipcode: zipcode?.substring(0, 20), 
      roadAddress: roadAddress?.substring(0, 100),
      jibunAddress: (jibunAddress || '')?.substring(0, 100), 
      detailAddress: (detailAddress || '')?.substring(0, 100),
      additionalAddress: (additionalAddress || '')?.substring(0, 100), 
      schoolName: (schoolName || '')?.substring(0, 50),
      major: (major || '')?.substring(0, 50), 
      grade: (grade || '')?.substring(0, 10), 
      companyName: (companyName || '')?.substring(0, 50),
      jobDescription: (jobDescription || '')?.substring(0, 100)
    };

    // 1. 계정 사용 여부 조회
    console.log('1. 계정 사용 여부 조회 시작');
    try {
      const existingAccount = await prisma.$queryRaw<AccountInfo[]>`
        SELECT ac_use FROM mwd_account WHERE ac_id = ${username.toLowerCase()}
      `;
      if (existingAccount && existingAccount.length > 0) {
        return NextResponse.json({ success: false, message: '이미 사용 중인 아이디입니다.' }, { status: 400 });
      }
    } catch (error) {
      console.error('계정 사용 여부 조회 오류:', error);
      throw new Error(`계정 조회 오류: ${error instanceof Error ? error.message : '알 수 없는 오류'}`);
    }

    // 생년월일 파싱
    let birthYear = 0, birthMonth = 0, birthDay = 0;
    try {
      const birthParts = birthdate.split('-');
      birthYear = parseInt(birthParts[0]); 
      birthMonth = parseInt(birthParts[1]); 
      birthDay = parseInt(birthParts[2]);
      if (isNaN(birthYear) || isNaN(birthMonth) || isNaN(birthDay)) {
        throw new Error('생년월일 형식이 올바르지 않습니다.');
      }
    } catch (error) {
      console.error('생년월일 파싱 오류:', error);
      return NextResponse.json({ success: false, message: '생년월일 형식이 올바르지 않습니다.' }, { status: 400 });
    }

    // 성별 값 변환
    const genderValue = gender === 'male' ? 'M' : (gender === 'female' ? 'F' : gender);
    if (genderValue !== 'M' && genderValue !== 'F') {
      return NextResponse.json({ success: false, message: '성별 값이 올바르지 않습니다.' }, { status: 400 });
    }

    // 2. 기관 및 차수 정보 확인
    console.log('2. 기관 및 차수 정보 확인 시작');
    try {
      const instituteResult = await prisma.$queryRaw<InstituteInfo[]>`
        SELECT ins_seq, tur_seq, tur_use, tur_req_sum, tur_use_sum
        FROM mwd_institute_turn
        WHERE ins_seq = ${instituteSeq} AND tur_seq = ${turnSeq}
      `;
      
      if (!instituteResult || instituteResult.length === 0) {
        return NextResponse.json({ success: false, message: '유효하지 않은 기관 정보입니다.' }, { status: 400 });
      }
      
      const instituteInfo = instituteResult[0];
      
      if (instituteInfo.tur_use !== 'Y') {
        return NextResponse.json({ success: false, message: '사용 중지된 기관 회차입니다.' }, { status: 400 });
      }
      if (instituteInfo.tur_use_sum >= instituteInfo.tur_req_sum) {
        return NextResponse.json({ success: false, message: '해당 기관 회차의 신청 가능 인원이 초과되었습니다.' }, { status: 400 });
      }
    } catch (error) {
      console.error('기관 정보 확인 오류:', error);
      throw new Error(`기관 정보 확인 오류: ${error instanceof Error ? error.message : '알 수 없는 오류'}`);
    }

    console.log('3. 사용자(person) 정보 삽입 시작');
    let peSeq;
    try {
      const personResult = await prisma.$queryRaw<{pe_seq: number}[]>`
        INSERT INTO mwd_person (
          pe_seq, pe_email, pe_name, pe_birth_year, pe_birth_month, pe_birth_day, pe_sex, 
          pe_cellphone, pe_contact, pe_postcode, pe_road_addr, pe_jibun_addr, pe_detail_addr, 
          pe_extra_addr, pe_ur_education, pe_school_name, pe_school_major, pe_school_year, 
          pe_ur_job, pe_job_name, pe_job_detail
        ) VALUES (
          (SELECT NEXTVAL('pe_seq')), ${truncatedValues.email}, ${truncatedValues.name}, 
          ${birthYear}, ${birthMonth}, ${birthDay}, ${genderValue}, 
          ${truncatedValues.phone}, ${truncatedValues.additionalPhone}, 
          ${truncatedValues.zipcode}, ${truncatedValues.roadAddress}, 
          ${truncatedValues.jibunAddress}, ${truncatedValues.detailAddress}, 
          ${truncatedValues.additionalAddress}, ${academicGroup}, 
          ${truncatedValues.schoolName}, ${truncatedValues.major}, ${truncatedValues.grade}, 
          ${jobGroup}, ${truncatedValues.companyName}, ${truncatedValues.jobDescription}
        ) RETURNING pe_seq
      `;
      peSeq = personResult[0].pe_seq;
    } catch (error) {
      console.error('사용자 정보 삽입 오류:', error);
      throw new Error(`사용자 정보 삽입 오류: ${error instanceof Error ? error.message : '알 수 없는 오류'}`);
    }

    console.log('4. 계정(account) 정보 삽입 시작');
    let acGid;
    try {
      const termsUse = agreeTerms ? 'Y' : 'N';
      const termsPerson = agreePrivacy ? 'Y' : 'N';
      const termsEvent = agreeMarketing ? 'Y' : 'N';
      
      const accountResult = await prisma.$queryRaw<{ac_gid: string}[]>`
        INSERT INTO mwd_account (
          ac_gid, ac_id, ac_pw, ac_expire_date, ac_insert_date, ac_leave_date, ac_use, 
          ins_seq, pe_seq, ac_terms_use, ac_terms_person, ac_terms_event
        ) VALUES (
          (SELECT uuid_generate_v4()), lower(${username}), CRYPT(${password}, GEN_SALT('bf')), 
          (SELECT now() + interval '1 month'), now(), now(), 'Y', 
          ${instituteSeq}, ${peSeq}, ${termsUse}, ${termsPerson}, ${termsEvent}
        ) RETURNING ac_gid
      `;
      acGid = accountResult[0].ac_gid;
    } catch (error) {
      console.error('계정 정보 삽입 오류:', error);
      throw new Error(`계정 정보 삽입 오류: ${error instanceof Error ? error.message : '알 수 없는 오류'}`);
    }

    console.log('5. 로그인 기록 삽입 시작');
    try {
      await prisma.$queryRaw`
        INSERT INTO mwd_log_login_account (login_date, user_agent, ac_gid)
        VALUES (now(), ${JSON.stringify(userAgent || { ua: 'Unknown' })}::json, ${acGid}::uuid)
      `;
    } catch (error) {
      console.error('로그인 기록 삽입 오류:', error);
    }

    console.log('6. 계정 액션 기록 삽입 시작');
    try {
      await prisma.$queryRaw`
        INSERT INTO mwd_log_account (action_date, action_type, action_reason, action_result, action_func, ac_gid, mg_seq)
        VALUES (now(), 'I', '기관', 'true', '/account/insert', ${acGid}::uuid, -1)
      `;
    } catch (error) {
      console.error('계정 액션 기록 삽입 오류:', error);
    }

    console.log('7. 기관 차수에 회원 등록 시작');
    try {
      await prisma.$queryRaw`
        UPDATE mwd_institute_turn
        SET tur_use_sum = tur_use_sum + 1
        WHERE tur_use = 'Y' AND tur_use_sum < tur_req_sum AND ins_seq = ${instituteSeq} AND tur_seq = ${turnSeq}
      `;
      await prisma.$queryRaw`
        INSERT INTO mwd_institute_member (ins_seq, tur_seq, pe_seq, mem_insert_date)
        VALUES (${instituteSeq}, ${turnSeq}, ${peSeq}, now())
      `;
    } catch (error) {
      console.error('기관 차수에 회원 등록 오류:', error);
      throw new Error(`기관 차수에 회원 등록 오류: ${error instanceof Error ? error.message : '알 수 없는 오류'}`);
    }

    console.log('8. 선택 결과 저장 시작');
    try {
      const products = await prisma.$queryRaw<{pd_num: number}[]>`
        SELECT pd_num FROM mwd_product WHERE pd_num = 10010
      `;
      
      if (products && products.length > 0) {
        await prisma.$queryRaw`
          INSERT INTO mwd_choice_result (
            ac_gid, cr_seq, cr_pay, cr_duty, cr_study, cr_subject, cr_image, 
            pd_kind, pd_price, cr_paymentdate, pd_num, ins_seq, tur_seq
          ) VALUES (
            ${acGid}::uuid, (SELECT NEXTVAL('cr_seq')), 'Y', 'Y', 'Y', 'Y', 'Y', 
            'premium', 0, now(), 10010::int2, ${instituteSeq}, ${turnSeq}
          )
        `;
      } else {
        const defaultProducts = await prisma.$queryRaw<{pd_num: number}[]>`
          SELECT pd_num FROM mwd_product ORDER BY pd_num LIMIT 1
        `;
        if (defaultProducts && defaultProducts.length > 0) {
          const defaultPdNum = defaultProducts[0].pd_num;
          await prisma.$queryRaw`
            INSERT INTO mwd_choice_result (
              ac_gid, cr_seq, cr_pay, cr_duty, cr_study, cr_subject, cr_image, 
              pd_kind, pd_price, cr_paymentdate, pd_num, ins_seq, tur_seq
            ) VALUES (
              ${acGid}::uuid, (SELECT NEXTVAL('cr_seq')), 'Y', 'Y', 'Y', 'Y', 'Y', 
              'premium', 0, now(), ${defaultPdNum}::int2, ${instituteSeq}, ${turnSeq}
            )
          `;
        } else {
          throw new Error('사용 가능한 제품이 없습니다. 관리자에게 문의하세요.');
        }
      }
    } catch (error) {
      console.error('선택 결과 저장 오류:', error);
      throw new Error(`선택 결과 저장 오류: ${error instanceof Error ? error.message : '알 수 없는 오류'}`);
    }

    console.log('기관 회원가입 완료');
    return NextResponse.json({ 
      success: true, 
      message: '기관 회원가입이 완료되었습니다.', 
      userId: username,
      acGid
    });
  } catch (error) {
    console.error('기관 회원가입 오류:', error);
    return NextResponse.json(
      { 
        success: false, 
        message: '기관 회원가입 중 오류가 발생했습니다.', 
        error: error instanceof Error ? error.message : '알 수 없는 오류' 
      },
      { status: 500 }
    );
  }
}