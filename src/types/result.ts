export interface TestResult {
  id: string
  userId: string
  testId: string
  test: {
    id: string
    title: string
    category: string
    difficulty: 'easy' | 'medium' | 'hard'
  }
  answers: Answer[]
  score: number
  percentile: number
  completedAt: Date
  timeSpent: number
  deviceInfo: DeviceInfo
  analysis: ResultAnalysis
}

export interface Answer {
  questionId: string
  value: string | number | boolean
  timeSpent: number
  timestamp: Date
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

export interface ResultAnalysis {
  strengths: string[]
  weaknesses: string[]
  recommendations: string[]
  categoryScores: CategoryScore[]
  overallRating: 'excellent' | 'good' | 'average' | 'needs-improvement'
  detailedFeedback: string
}

export interface CategoryScore {
  category: string
  score: number
  maxScore: number
  percentile: number
  description: string
}

export interface ResultSummary {
  totalTests: number
  averageScore: number
  bestCategory: string
  improvementArea: string
  recentTrend: 'improving' | 'stable' | 'declining'
  lastTestDate: Date
}

export interface ShareableResult {
  testTitle: string
  score: number
  percentile: number
  completedAt: Date
  highlights: string[]
  shareUrl?: string
}