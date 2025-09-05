const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function createTestUser() {
  try {
    console.log('데이터베이스 연결 테스트...');
    
    // Test database connection
    const testResult = await prisma.$queryRaw`SELECT 1 as test`;
    console.log('데이터베이스 연결 성공:', testResult);
    
    // Check if test user already exists
    const existingUser = await prisma.$queryRaw`
      SELECT ac.ac_id, pe.pe_name 
      FROM mwd_account ac
      JOIN mwd_person pe ON ac.pe_seq = pe.pe_seq
      WHERE ac.ac_id = 'testuser'
    `;
    
    if (existingUser.length > 0) {
      console.log('테스트 사용자가 이미 존재합니다:', existingUser[0]);
      return;
    }
    
    console.log('테스트 사용자 생성 중...');
    
    // Create a test person first
    const personResult = await prisma.$queryRaw`
      INSERT INTO mwd_person (pe_name, pe_sex, pe_email, pe_cellphone, pe_birth_year, pe_birth_month, pe_birth_day)
      VALUES ('테스트사용자', 'M', 'test@example.com', '010-1234-5678', 1990, 1, 1)
      RETURNING pe_seq
    `;
    
    const peSeq = personResult[0].pe_seq;
    console.log('Person 생성 완료, pe_seq:', peSeq);
    
    // Create account with encrypted password
    const accountResult = await prisma.$queryRaw`
      INSERT INTO mwd_account (
        ac_id, 
        ac_pw, 
        pe_seq, 
        ins_seq, 
        ac_use, 
        ac_expire_date,
        ac_insert_date
      )
      VALUES (
        'testuser',
        CRYPT('testpass', GEN_SALT('bf')),
        ${peSeq},
        -1,
        'Y',
        NOW() + INTERVAL '1 year',
        NOW()
      )
      RETURNING ac_gid, ac_id
    `;
    
    console.log('테스트 사용자 생성 완료:', accountResult[0]);
    console.log('로그인 정보: ID=testuser, PW=testpass');
    
  } catch (error) {
    console.error('테스트 사용자 생성 실패:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createTestUser();