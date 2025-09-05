const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function testConnection() {
  try {
    console.log('Testing database connection...')
    
    // Test basic connection
    await prisma.$connect()
    console.log('✅ Database connected successfully')
    
    // Test mwd_account table
    const accountCount = await prisma.mwd_account.count()
    console.log(`✅ Found ${accountCount} accounts in mwd_account table`)
    
    // Try to find a test account
    const testAccount = await prisma.mwd_account.findFirst({
      where: {
        ac_id: 'testuser'
      }
    })
    
    if (testAccount) {
      console.log('✅ Test account found:', testAccount.ac_id)
    } else {
      console.log('❌ Test account not found')
    }
    
  } catch (error) {
    console.error('❌ Database connection failed:', error.message)
  } finally {
    await prisma.$disconnect()
  }
}

testConnection()