import { NextRequest, NextResponse } from 'next/server'
import { withDatabase } from '@/lib/middleware/database'
import { APIErrorHandler } from '@/lib/api-error-handler'
import { PrismaClient } from '@prisma/client'
import { measureDatabaseQuery } from '@/lib/db'

const ENDPOINT = '/api/profile/[userId]'

export const GET = withDatabase(async (
  request: NextRequest,
  prisma: PrismaClient
) => {
  const url = new URL(request.url)
  const userId = url.pathname.split('/').pop()
  
  console.log(`📋 Profile API called for user: ${userId}`)
  
  // Validate userId parameter
  if (!userId || userId === '[userId]') {
    console.warn('❌ Profile API: Missing or invalid userId parameter')
    return APIErrorHandler.handleValidationError(
      { message: 'User ID is required and must be a valid UUID' },
      ENDPOINT
    )
  }

  // Validate UUID format
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
  if (!uuidRegex.test(userId)) {
    console.warn(`❌ Profile API: Invalid UUID format: ${userId}`)
    return APIErrorHandler.handleValidationError(
      { message: 'User ID must be a valid UUID format' },
      ENDPOINT
    )
  }

  try {
    console.log(`🔍 Fetching profile data for user: ${userId}`)
    
    // Query user profile with performance monitoring
    const userProfile = await measureDatabaseQuery(
      () => prisma.$queryRaw<any[]>`
        SELECT 
          ac.ac_gid as id,
          ac.ac_id as username,
          pe.pe_name as name,
          pe.pe_email as email,
          pe.pe_cellphone as phone,
          pe.pe_sex as gender,
          pe.pe_birth_year as birthYear,
          pe.pe_birth_month as birthMonth,
          pe.pe_birth_day as birthDay,
          ac.ac_insert_date as createdAt,
          ac.ac_use as isActive
        FROM mwd_account ac
        LEFT JOIN mwd_person pe ON ac.pe_seq = pe.pe_seq
        WHERE ac.ac_gid = ${userId}::uuid
          AND ac.ac_use = 'Y'
      `,
      'fetch_user_profile',
      ENDPOINT
    )

    console.log(`📊 Profile query returned ${userProfile.length} results`)

    if (userProfile.length === 0) {
      console.warn(`❌ Profile not found for user: ${userId}`)
      return NextResponse.json({
        success: false,
        error: {
          message: 'User profile not found',
          code: 'USER_NOT_FOUND'
        },
        meta: {
          timestamp: new Date(),
          endpoint: ENDPOINT,
          userId
        }
      }, { status: 404 })
    }

    const profile = userProfile[0]
    
    // Process and clean profile data
    const profileData = {
      id: profile.id,
      username: profile.username,
      name: profile.name,
      email: profile.email || '',
      phone: profile.phone || '',
      gender: profile.gender || '',
      birthDate: profile.birthyear && profile.birthmonth && profile.birthday 
        ? `${profile.birthyear}-${String(profile.birthmonth).padStart(2, '0')}-${String(profile.birthday).padStart(2, '0')}`
        : null,
      createdAt: profile.createdat,
      isActive: profile.isactive === 'Y',
      preferences: {
        language: 'ko',
        notifications: true,
        theme: 'system',
        testReminders: true,
        hapticFeedback: true,
        autoSave: true
      }
    }

    console.log(`✅ Profile data successfully retrieved for user: ${userId}`)
    
    return APIErrorHandler.createSuccessResponse({
      profile: profileData
    }, ENDPOINT)

  } catch (error) {
    console.error(`❌ Profile API error for user ${userId}:`, {
      error: error instanceof Error ? error.message : error,
      stack: error instanceof Error ? error.stack : undefined,
      userId,
      timestamp: new Date().toISOString()
    })
    
    // Let the database middleware handle database-specific errors
    throw error
  }
}, {
  validateConnection: true,
  retryOnFailure: true,
  maxRetries: 2,
  timeout: 10000
})