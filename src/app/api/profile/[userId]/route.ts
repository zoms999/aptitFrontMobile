import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET(
  request: NextRequest,
  { params }: { params: { userId: string } }
) {
  try {
    const { userId } = params
    
    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      )
    }

    // mwd_account와 mwd_person 테이블에서 사용자 정보 조회
    const userProfile = await prisma.$queryRaw<any[]>`
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
    `

    if (userProfile.length === 0) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    const profile = userProfile[0]
    
    // 사용자 프로필 데이터 정리
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
        testReminders: true
      }
    }

    return NextResponse.json({
      success: true,
      profile: profileData
    })

  } catch (error) {
    console.error('Profile fetch error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}