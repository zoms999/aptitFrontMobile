import jwt from 'jsonwebtoken'
import { NextRequest } from 'next/server'
import { prisma } from './db'

// Types
export interface User {
  id: string
  username?: string
  email: string
  name: string
  profileImage?: string | null
  preferences?: UserPreferences
  createdAt: Date
  updatedAt: Date
  type?: string
  ac_id?: string
}

export interface UserPreferences {
  language: 'ko' | 'en'
  notifications: boolean
  theme: 'light' | 'dark' | 'system'
  testReminders: boolean
  hapticFeedback?: boolean
  autoSave?: boolean
}

export interface AuthTokens {
  accessToken: string
  refreshToken: string
}

export interface JWTPayload {
  userId: string
  email: string
  type: 'access' | 'refresh'
  userType?: string
  sessionCode?: string
  loginType?: string
  isMobile?: boolean
  platform?: string
}

// Environment variables
const JWT_SECRET = process.env.JWT_SECRET || process.env.NEXTAUTH_SECRET || 'your-secret-key'
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || process.env.NEXTAUTH_SECRET || 'your-refresh-secret-key'
const ACCESS_TOKEN_EXPIRY = '15m'
const REFRESH_TOKEN_EXPIRY = '7d'

// JWT utilities
export function generateAccessToken(userId: string, email: string, extraPayload?: Partial<JWTPayload>): string {
  return jwt.sign(
    { userId, email, type: 'access', ...extraPayload },
    JWT_SECRET,
    { expiresIn: ACCESS_TOKEN_EXPIRY }
  )
}

export function generateRefreshToken(userId: string, email: string, extraPayload?: Partial<JWTPayload>): string {
  return jwt.sign(
    { userId, email, type: 'refresh', ...extraPayload },
    JWT_REFRESH_SECRET,
    { expiresIn: REFRESH_TOKEN_EXPIRY }
  )
}

export function generateTokens(userId: string, email: string, extraPayload?: Partial<JWTPayload>): AuthTokens {
  return {
    accessToken: generateAccessToken(userId, email, extraPayload),
    refreshToken: generateRefreshToken(userId, email, extraPayload)
  }
}

export function verifyAccessToken(token: string): JWTPayload | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as JWTPayload
    if (decoded.type !== 'access') return null
    return decoded
  } catch (error) {
    return null
  }
}

export function verifyRefreshToken(token: string): JWTPayload | null {
  try {
    const decoded = jwt.verify(token, JWT_REFRESH_SECRET) as JWTPayload
    if (decoded.type !== 'refresh') return null
    return decoded
  } catch (error) {
    return null
  }
}

// Alias for verifyAccessToken for compatibility with dashboard APIs
export function verifyToken(token: string): JWTPayload | null {
  return verifyAccessToken(token)
}

// 기존 웹앱과 동일한 로그인 로직 사용
export async function authenticateUser(username: string, password: string, loginType: string = 'personal', sessionCode?: string): Promise<User | null> {
  try {
    console.log('로그인 시도:', { username, loginType, hasSessionCode: !!sessionCode });
    
    // Test database connection first
    try {
      await prisma.$queryRaw`SELECT 1 as test`;
      console.log('데이터베이스 연결 성공');
    } catch (dbError) {
      console.error('데이터베이스 연결 실패:', dbError);
      throw new Error('Database connection failed');
    }

    if (loginType === 'personal') {
      // 개인 사용자 로그인
      const accountResult = await prisma.$queryRaw<any[]>`
        SELECT pe.pe_seq, pe.pe_name, ac.ac_gid, ac.ac_use, ac.ac_id
        FROM mwd_person pe
        JOIN mwd_account ac ON ac.pe_seq = pe.pe_seq 
        WHERE ac.ac_id = lower(${username}) 
          AND ac.ac_pw = CRYPT(${password}, ac.ac_pw)
      `;

      if (accountResult.length === 0 || accountResult[0].ac_use !== 'Y') {
        console.log('개인 로그인 실패: 계정 정보 없음 또는 비활성화');
        return null;
      }

      const userAccount = accountResult[0];
      
      // 기관 관리자 계정인지 확인 (pe_seq = -1인 경우 기관 관리자)
      if (userAccount.pe_seq === -1) {
        console.log('기관 관리자 계정이 일반 로그인 시도함');
        return null;
      }

      // 기관 소속 사용자인지 확인
      const instituteMemberCheck = await prisma.$queryRaw<{ count: number }[]>`
        SELECT COUNT(*) as count
        FROM mwd_institute_member im
        WHERE im.pe_seq = ${userAccount.pe_seq}
      `;

      if (instituteMemberCheck.length > 0 && instituteMemberCheck[0].count > 0) {
        console.log('기관 소속 사용자가 일반 로그인 시도함');
        return null;
      }

      // 로그인 로그 기록 (raw query 사용)
      try {
        const userAgentJson = JSON.stringify({ source: 'Mobile App Login' });
        await prisma.$executeRaw`
          INSERT INTO mwd_log_login_account (login_date, user_agent, ac_gid) 
          VALUES (now(), ${userAgentJson}::json, ${userAccount.ac_gid}::uuid)
        `;
        console.log('로그인 로그 기록 완료');
      } catch (logError) {
        console.error('로그인 로그 기록 실패:', logError);
      }

      return {
        id: userAccount.ac_gid,
        email: userAccount.ac_id,
        name: userAccount.pe_name,
        type: 'personal',
        ac_id: userAccount.ac_id,
        preferences: {
          language: 'ko',
          notifications: true,
          theme: 'system',
          testReminders: true
        },
        createdAt: new Date(),
        updatedAt: new Date()
      };

    } else if (loginType === 'organization') {
      // 기관 로그인
      if (!sessionCode) {
        console.log('기관 로그인 실패: 세션코드 누락');
        return null;
      }

      // 회차코드 유효성 검사
      const verificationResult = await prisma.$queryRaw<{ ins_seq: number; tur_seq: number }[]>`
        SELECT tur.ins_seq, tur.tur_seq
        FROM mwd_institute_turn tur
        WHERE tur.tur_code = ${sessionCode} AND tur.tur_use = 'Y'
      `;

      if (verificationResult.length === 0) {
        console.log('세션코드 검증 실패');
        return null;
      }

      const { ins_seq, tur_seq } = verificationResult[0];

      // 기관 관리자로 로그인 시도
      const adminAccountResult = await prisma.$queryRaw<any[]>`
        SELECT i.ins_seq, i.ins_manager1_name, i.ins_manager1_email, ac.ac_gid, ac.ac_use, ac.ac_id
        FROM mwd_institute i
        JOIN mwd_account ac ON ac.ins_seq = i.ins_seq
        WHERE ac.pe_seq = -1
          AND ac.ins_seq = ${ins_seq}
          AND ac.ac_id = lower(${username})
          AND ac.ac_pw = CRYPT(${password}, ac.ac_pw)
      `;

      if (adminAccountResult.length > 0 && adminAccountResult[0].ac_use === 'Y') {
        const adminAccount = adminAccountResult[0];
        return {
          id: adminAccount.ac_gid,
          email: adminAccount.ins_manager1_email || adminAccount.ac_id,
          name: adminAccount.ins_manager1_name,
          type: 'organization_admin',
          ac_id: adminAccount.ac_id,
          preferences: {
            language: 'ko',
            notifications: true,
            theme: 'system',
            testReminders: true
          },
          createdAt: new Date(),
          updatedAt: new Date()
        };
      }

      // 기관 소속 개인 사용자로 로그인 시도
      const memberAccountResult = await prisma.$queryRaw<any[]>`
        SELECT pe.pe_seq, pe.pe_name, pe.pe_email, ac.ac_gid, ac.ac_use, ac.ac_id
        FROM mwd_person pe
        JOIN mwd_account ac ON ac.pe_seq = pe.pe_seq
        JOIN mwd_institute_member im ON im.pe_seq = pe.pe_seq
        WHERE ac.ac_id = lower(${username})
          AND ac.ac_pw = CRYPT(${password}, ac.ac_pw)
          AND im.ins_seq = ${ins_seq}
          AND im.tur_seq = ${tur_seq}
      `;

      if (memberAccountResult.length > 0 && memberAccountResult[0].ac_use === 'Y') {
        const memberAccount = memberAccountResult[0];
        
        // 로그인 로그 기록 (raw query 사용)
        try {
          const userAgentJson = JSON.stringify({ source: 'Mobile App Login (Organization Member)' });
          await prisma.$executeRaw`
            INSERT INTO mwd_log_login_account (login_date, user_agent, ac_gid) 
            VALUES (now(), ${userAgentJson}::json, ${memberAccount.ac_gid}::uuid)
          `;
          console.log('기관 소속 사용자 로그 기록 완료');
        } catch (logError) {
          console.error('기관 소속 사용자 로그 기록 실패:', logError);
        }

        return {
          id: memberAccount.ac_gid,
          email: memberAccount.pe_email || memberAccount.ac_id,
          name: memberAccount.pe_name,
          type: 'organization_member',
          ac_id: memberAccount.ac_id,
          preferences: {
            language: 'ko',
            notifications: true,
            theme: 'system',
            testReminders: true
          },
          createdAt: new Date(),
          updatedAt: new Date()
        };
      }

      console.log('기관 로그인 실패: 일치하는 계정 정보 없음');
      return null;
    }

    return null;
  } catch (error) {
    console.error('인증 오류:', error);
    return null;
  }
}

export async function verifySessionCode(sessionCode: string): Promise<boolean> {
  try {
    const verificationResult = await prisma.$queryRaw<{ count: number }[]>`
      SELECT COUNT(*) as count
      FROM mwd_institute_turn tur
      WHERE tur.tur_code = ${sessionCode} AND tur.tur_use = 'Y'
    `;
    
    return verificationResult.length > 0 && verificationResult[0].count > 0;
  } catch (error) {
    console.error('세션코드 검증 오류:', error);
    return false;
  }
}

// Legacy functions for compatibility
export async function getUserById(userId: string): Promise<User | null> {
  try {
    const account = await prisma.mwd_account.findUnique({
      where: { ac_gid: userId }
    });
    
    if (!account) return null;
    
    return {
      id: account.ac_gid,
      email: account.ac_id,
      name: account.ac_id,
      ac_id: account.ac_id,
      preferences: {
        language: 'ko',
        notifications: true,
        theme: 'system',
        testReminders: true
      },
      createdAt: account.ac_insert_date,
      updatedAt: account.ac_insert_date
    };
  } catch (error) {
    console.error('Error fetching user by ID:', error);
    return null;
  }
}

export async function getUserByEmail(email: string): Promise<(User & { password: string }) | null> {
  return null; // 더 이상 사용하지 않음
}

export async function getUserByUsername(username: string): Promise<(User & { username: string; password: string }) | null> {
  return null; // 더 이상 사용하지 않음
}

// Authentication middleware
export async function getAuthenticatedUser(request: NextRequest): Promise<User | null> {
  try {
    const authHeader = request.headers.get('authorization')
    let token: string | null = null
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7)
    }
    
    if (!token) {
      token = request.cookies.get('accessToken')?.value || null
    }
    
    if (!token) return null
    
    const payload = verifyAccessToken(token)
    if (!payload) return null
    
    const user = await getUserById(payload.userId)
    return user
  } catch (error) {
    console.error('Error in getAuthenticatedUser:', error)
    return null
  }
}

// Cookie utilities for secure token storage
export function getTokenCookieOptions(isRefreshToken = false) {
  const maxAge = isRefreshToken ? 7 * 24 * 60 * 60 : 15 * 60 // 7 days or 15 minutes
  
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict' as const,
    maxAge,
    path: '/'
  }
}