const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function createTestUser() {
  try {
    console.log('기존 데이터베이스 구조를 사용하여 테스트 계정을 확인합니다...')
    
    // 테스트 계정 확인
    const testAccount = await prisma.mwd_account.findFirst({
      where: {
        ac_id: 'testuser'
      }
    })
    
    if (testAccount) {
      console.log('✅ 테스트 계정이 이미 존재합니다:')
      console.log('아이디: testuser')
      console.log('계정 GUID:', testAccount.ac_gid)
      console.log('활성 상태:', testAccount.ac_use === 'Y' ? '활성' : '비활성')
    } else {
      console.log('❌ 테스트 계정을 찾을 수 없습니다.')
      console.log('데이터베이스에 기존 계정이 있는지 확인해보세요.')
      
      // 전체 계정 수 확인
      const totalAccounts = await prisma.mwd_account.count()
      console.log(`전체 계정 수: ${totalAccounts}`)
      
      if (totalAccounts > 0) {
        // 첫 번째 계정 정보 표시
        const firstAccount = await prisma.mwd_account.findFirst()
        console.log('첫 번째 계정 예시:', {
          ac_id: firstAccount.ac_id,
          ac_use: firstAccount.ac_use
        })
      }
    }
    
    // 기관 회차 코드 확인
    const sessionCodes = await prisma.mwd_institute_turn.findMany({
      where: {
        tur_use: 'Y'
      },
      take: 3
    })
    
    if (sessionCodes.length > 0) {
      console.log('\n✅ 사용 가능한 회차 코드:')
      sessionCodes.forEach(code => {
        console.log(`- ${code.tur_code} (기관: ${code.ins_seq}, 회차: ${code.tur_seq})`)
      })
    } else {
      console.log('\n❌ 사용 가능한 회차 코드가 없습니다.')
    }
    
  } catch (error) {
    console.error('오류 발생:', error.message)
  } finally {
    await prisma.$disconnect()
  }
}

createTestUser()