import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/db'
import { hashPassword, generateTokens, getTokenCookieOptions, UserPreferences } from '@/lib/auth'

// Validation schema
const signupSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(50, 'Name must be less than 50 characters'),
  email: z.string().email('Invalid email format'),
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, 'Password must contain at least one lowercase letter, one uppercase letter, and one number'),
  confirmPassword: z.string(),
  preferences: z.object({
    language: z.enum(['ko', 'en']).default('ko'),
    notifications: z.boolean().default(true),
    theme: z.enum(['light', 'dark', 'system']).default('system'),
    testReminders: z.boolean().default(true),
    hapticFeedback: z.boolean().default(true),
    autoSave: z.boolean().default(true)
  }).optional(),
  deviceInfo: z.object({
    userAgent: z.string(),
    screenWidth: z.number(),
    screenHeight: z.number(),
    devicePixelRatio: z.number(),
    platform: z.string(),
    isMobile: z.boolean(),
    isTablet: z.boolean(),
    connectionType: z.string().optional(),
    batteryLevel: z.number().optional()
  }).optional()
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"]
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    // Validate input
    const validationResult = signupSchema.safeParse(body)
    if (!validationResult.success) {
      return NextResponse.json(
        { 
          error: 'Validation failed', 
          details: validationResult.error.errors 
        },
        { status: 400 }
      )
    }
    
    const { name, email, password, preferences, deviceInfo } = validationResult.data
    
    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email }
    })
    
    if (existingUser) {
      return NextResponse.json(
        { error: 'User with this email already exists' },
        { status: 409 }
      )
    }
    
    // Hash password
    const hashedPassword = await hashPassword(password)
    
    // Default preferences with mobile-specific settings
    const defaultPreferences: UserPreferences = {
      language: 'ko',
      notifications: true,
      theme: 'system',
      testReminders: true,
      hapticFeedback: deviceInfo?.isMobile || false,
      autoSave: true,
      ...preferences
    }
    
    // Create user
    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        preferences: defaultPreferences as any
      },
      select: {
        id: true,
        email: true,
        name: true,
        profileImage: true,
        preferences: true,
        createdAt: true,
        updatedAt: true
      }
    })
    
    // Generate tokens
    const tokens = generateTokens(user.id, user.email)
    
    // Prepare user data
    const userData = {
      ...user,
      profileImage: user.profileImage || undefined,
      preferences: user.preferences ? (user.preferences as unknown as UserPreferences) : undefined
    }
    
    // Create response
    const response = NextResponse.json({
      success: true,
      user: userData,
      tokens: {
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken
      }
    }, { status: 201 })
    
    // Set secure cookies
    const accessTokenOptions = getTokenCookieOptions(false)
    const refreshTokenOptions = getTokenCookieOptions(true)
    
    response.cookies.set('accessToken', tokens.accessToken, accessTokenOptions)
    response.cookies.set('refreshToken', tokens.refreshToken, refreshTokenOptions)
    
    return response
    
  } catch (error) {
    console.error('Signup error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}