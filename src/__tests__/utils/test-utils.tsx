import React, { ReactElement } from 'react'
import { render, RenderOptions } from '@testing-library/react'
import { AuthProvider } from '@/contexts/AuthContext'
import { NavigationProvider } from '@/contexts/NavigationContext'
import { ThemeProvider } from '@/contexts/ThemeContext'
import { LocalizationProvider } from '@/contexts/LocalizationContext'
import { TestSessionProvider } from '@/contexts/TestSessionContext'

// Mock user for testing
export const mockUser = {
  id: 'test-user-id',
  email: 'test@example.com',
  name: 'Test User',
  profileImage: null,
  preferences: {
    language: 'ko' as const,
    notifications: true,
    theme: 'light' as const,
    testReminders: true,
  },
  createdAt: new Date('2023-01-01'),
  updatedAt: new Date('2023-01-01'),
}

// Mock test data
export const mockTest = {
  id: 'test-id',
  title: 'Sample Test',
  description: 'A sample test for testing',
  category: 'aptitude',
  questions: [
    {
      id: 'q1',
      text: 'What is 2 + 2?',
      type: 'multiple-choice' as const,
      options: [
        { id: 'a', text: '3', value: 'a' },
        { id: 'b', text: '4', value: 'b' },
        { id: 'c', text: '5', value: 'c' },
      ],
      required: true,
      order: 1,
    },
  ],
  timeLimit: 3600,
  difficulty: 'medium' as const,
  isActive: true,
}

// Mock result data
export const mockResult = {
  id: 'result-id',
  userId: 'test-user-id',
  testId: 'test-id',
  answers: [
    {
      questionId: 'q1',
      value: 'b',
      timeSpent: 30,
    },
  ],
  score: 100,
  percentile: 95,
  completedAt: new Date('2023-01-01'),
  timeSpent: 30,
  deviceInfo: {
    userAgent: 'test-agent',
    screenWidth: 375,
    screenHeight: 812,
    devicePixelRatio: 2,
  },
  analysis: {
    strengths: ['Mathematical reasoning'],
    weaknesses: [],
    recommendations: ['Continue practicing'],
    categoryScores: [
      {
        category: 'math',
        score: 100,
        percentile: 95,
      },
    ],
  },
}

interface AllTheProvidersProps {
  children: React.ReactNode
}

const AllTheProviders = ({ children }: AllTheProvidersProps) => {
  return (
    <ThemeProvider>
      <LocalizationProvider>
        <AuthProvider>
          <NavigationProvider>
            <TestSessionProvider>
              {children}
            </TestSessionProvider>
          </NavigationProvider>
        </AuthProvider>
      </LocalizationProvider>
    </ThemeProvider>
  )
}

const customRender = (
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
) => render(ui, { wrapper: AllTheProviders, ...options })

export * from '@testing-library/react'
export { customRender as render }