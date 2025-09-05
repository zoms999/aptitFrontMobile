export interface Question {
  id: string
  text: string
  type: 'multiple-choice' | 'rating' | 'text' | 'boolean'
  options?: Option[]
  required: boolean
  order: number
  category?: string
  timeLimit?: number // in seconds
  explanation?: string
}

export interface Option {
  id: string
  text: string
  value: string | number
  isCorrect?: boolean
}

export interface Answer {
  questionId: string
  value: string | number | boolean
  timeSpent: number
  timestamp: Date
}

export interface Test {
  id: string
  title: string
  description: string
  category: string
  questions: Question[]
  timeLimit?: number
  difficulty: 'easy' | 'medium' | 'hard'
  isActive: boolean
  isMobileOptimized: boolean
  estimatedTime?: number
  tags: string[]
  version: string
}

export interface TestSession {
  id: string
  userId: string
  testId: string
  currentQuestion: number
  answers: Answer[]
  timeSpent: number
  isCompleted: boolean
  deviceInfo?: DeviceInfo
  lastActivity: Date
  expiresAt: Date
}

export interface DeviceInfo {
  userAgent: string
  screenWidth: number
  screenHeight: number
  devicePixelRatio: number
  platform: string
  isMobile: boolean
  isTablet: boolean
  orientation: 'portrait' | 'landscape'
  connectionType?: string
}

export interface TestProgress {
  currentQuestion: number
  totalQuestions: number
  answeredQuestions: number
  timeSpent: number
  timeRemaining?: number
  percentComplete: number
}