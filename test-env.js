console.log('환경변수 확인:')
console.log('DATABASE_URL:', process.env.DATABASE_URL)
console.log('NODE_ENV:', process.env.NODE_ENV)
console.log('NEXTAUTH_SECRET:', process.env.NEXTAUTH_SECRET)

// Prisma 연결 테스트
const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function testConnection() {
  try {
    console.log('\n데이터베이스 연결 테스트 중...')
    await prisma.$connect()
    console.log('✅ 데이터베이스 연결 성공!')
    
    const accountCount = await prisma.mwd_account.count()
    console.log(`✅ mwd_account 테이블에서 ${accountCount}개 계정 확인`)
    
  } catch (error) {
    console.error('❌ 데이터베이스 연결 실패:', error.message)
  } finally {
    await prisma.$disconnect()
  }
}

testConnection()