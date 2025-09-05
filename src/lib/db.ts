import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const prisma = globalForPrisma.prisma ?? new PrismaClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma

// Type definitions for mobile-specific data structures
export interface UserPreferences {
  language: 'ko' | 'en'
  notifications: boolean
  theme: 'light' | 'dark' | 'system'
  testReminders: boolean
  hapticFeedback?: boolean
  autoSave?: boolean
}

export interface DeviceInfo {
  userAgent: string
  screenWidth: number
  screenHeight: number
  devicePixelRatio: number
  platform: string
  isMobile: boolean
  isTablet: boolean
  connectionType?: string
  batteryLevel?: number
}

export interface Question {
  id: string
  text: string
  type: 'multiple-choice' | 'rating' | 'text'
  options?: Option[]
  required: boolean
  order: number
  mobileOptimized?: boolean
}

export interface Option {
  id: string
  text: string
  value: string | number
  isCorrect?: boolean
}

export interface Answer {
  questionId: string
  value: string | number | string[]
  timeSpent: number
  timestamp: Date
}

export interface ResultAnalysis {
  strengths: string[]
  weaknesses: string[]
  recommendations: string[]
  categoryScores: CategoryScore[]
  overallScore: number
  percentileRank: number
}

export interface CategoryScore {
  category: string
  score: number
  maxScore: number
  percentile: number
}

export type TestCategory = 
  | 'aptitude'
  | 'personality'
  | 'cognitive'
  | 'technical'
  | 'language'
  | 'numerical'

export type TestDifficulty = 'easy' | 'medium' | 'hard'

export type SubmissionSource = 'mobile' | 'desktop' | 'tablet'

export type NetworkType = '4g' | '5g' | 'wifi' | 'offline'