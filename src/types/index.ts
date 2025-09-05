// User types
export interface User {
  id: string
  email: string
  name: string
  profileImage?: string
  preferences: UserPreferences
  createdAt: Date
  updatedAt: Date
}

export interface UserPreferences {
  language: 'ko' | 'en'
  notifications: boolean
  theme: 'light' | 'dark' | 'system'
  testReminders: boolean
}

// Test types
export interface Test {
  id: string
  title: string
  description: string
  category: TestCategory
  questions: Question[]
  timeLimit?: number
  difficulty: 'easy' | 'medium' | 'hard'
  isActive: boolean
}

export interface Question {
  id: string
  text: string
  type: 'multiple-choice' | 'rating' | 'text'
  options?: Option[]
  required: boolean
  order: number
}

export interface Option {
  id: string
  text: string
  value: string | number
}

export interface Answer {
  questionId: string
  value: string | number | string[]
  timeSpent: number
}

// Result types
export interface TestResult {
  id: string
  userId: string
  testId: string
  answers: Answer[]
  score: number
  percentile?: number
  completedAt: Date
  timeSpent: number
  deviceInfo?: DeviceInfo
  analysis?: ResultAnalysis
}

export interface ResultAnalysis {
  strengths: string[]
  weaknesses: string[]
  recommendations: string[]
  categoryScores: CategoryScore[]
}

export interface CategoryScore {
  category: string
  score: number
  percentile: number
}

// Device and system types
export interface DeviceInfo {
  userAgent: string
  screenWidth: number
  screenHeight: number
  devicePixelRatio: number
  platform: string
  isStandalone: boolean
}

// API types
export interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

export interface PaginationInfo {
  page: number
  limit: number
  total: number
  totalPages: number
}

// Enum types
export type TestCategory = 
  | 'verbal'
  | 'numerical'
  | 'logical'
  | 'spatial'
  | 'personality'
  | 'general'