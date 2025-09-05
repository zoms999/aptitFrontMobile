const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function checkUsers() {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        createdAt: true
      },
      take: 5
    })
    
    console.log('Existing users:')
    users.forEach(user => {
      console.log(`- ${user.email} (${user.name}) - Created: ${user.createdAt}`)
    })
    
    if (users.length === 0) {
      console.log('No users found in database')
    }
    
  } catch (error) {
    console.error('Error checking users:', error)
  } finally {
    await prisma.$disconnect()
  }
}

checkUsers()