'use client'

import React, { createContext, useContext, useCallback, useEffect, useState } from 'react'
import { Test, Answer, TestSession } from '@/types/test'
import { useTestSession } from '@/hooks/useTestSession'

interface TestSessionContextType {
  // Session state
  sessionId: string | null
  currentQuestion: number
  answers: Answer[]
  timeSpent: number
  isLoading: boolean
  isSaving: boolean
  lastSaved: Date | null
  error: string | null
  
  // Session actions
  addAnswer: (answer: Answer) => void
  goToQuestion: (questionIndex: number) => void
  saveProgress: () => Promise<void>
  submitTest: () => Promise<any>
  pauseSession: () => Promise<void>
  resumeSession: () => void
  initializeSession: () => Promise<void>
  
  // Computed values
  isAnswered: (questionId: string) => boolean
  getAnswer: (questionId: string) => Answer | undefined
  canGoNext: boolean
  canGoPrevious: boolean
  allQuestionsAnswered: boolean
  progressPercentage: number
}

const TestSessionContext = createContext<TestSessionContextType | null>(null)

interface TestSessionProviderProps {
  test: Test
  userId: string
  children: React.ReactNode
  autoSaveInterval?: number
  sessionTimeout?: number
}

export function TestSessionProvider({
  test,
  userId,
  children,
  autoSaveInterval = 30000,
  sessionTimeout = 3600000
}: TestSessionProviderProps) {
  const sessionHook = useTestSession({
    test,
    userId,
    autoSaveInterval,
    sessionTimeout
  })

  // Computed values
  const isAnswered = useCallback((questionId: string) => {
    return sessionHook.answers.some(answer => answer.questionId === questionId)
  }, [sessionHook.answers])

  const getAnswer = useCallback((questionId: string) => {
    return sessionHook.answers.find(answer => answer.questionId === questionId)
  }, [sessionHook.answers])

  const canGoNext = sessionHook.currentQuestion < test.questions.length - 1
  const canGoPrevious = sessionHook.currentQuestion > 0
  const allQuestionsAnswered = sessionHook.answers.length === test.questions.length
  const progressPercentage = (sessionHook.answers.length / test.questions.length) * 100

  const contextValue: TestSessionContextType = {
    ...sessionHook,
    isAnswered,
    getAnswer,
    canGoNext,
    canGoPrevious,
    allQuestionsAnswered,
    progressPercentage
  }

  return (
    <TestSessionContext.Provider value={contextValue}>
      {children}
    </TestSessionContext.Provider>
  )
}

export function useTestSessionContext() {
  const context = useContext(TestSessionContext)
  if (!context) {
    throw new Error('useTestSessionContext must be used within a TestSessionProvider')
  }
  return context
}

// Hook for session recovery after interruption
export function useSessionRecovery() {
  const [hasRecoverableSession, setHasRecoverableSession] = useState(false)
  const [recoveryData, setRecoveryData] = useState<{
    testId: string
    sessionId: string
    currentQuestion: number
    answers: Answer[]
    timeSpent: number
  } | null>(null)

  const checkForRecoverableSession = useCallback(async (testId: string) => {
    try {
      const response = await fetch(`/api/tests/${testId}/session`)
      if (response.ok) {
        const { data } = await response.json()
        if (data.hasActiveSession && data.session) {
          setHasRecoverableSession(true)
          setRecoveryData({
            testId,
            sessionId: data.session.id,
            currentQuestion: data.session.currentQuestion,
            answers: data.session.answers || [],
            timeSpent: data.session.timeSpent
          })
          return true
        }
      }
    } catch (error) {
      console.error('Error checking for recoverable session:', error)
    }
    
    setHasRecoverableSession(false)
    setRecoveryData(null)
    return false
  }, [])

  const clearRecoveryData = useCallback(() => {
    setHasRecoverableSession(false)
    setRecoveryData(null)
  }, [])

  return {
    hasRecoverableSession,
    recoveryData,
    checkForRecoverableSession,
    clearRecoveryData
  }
}

// Hook for handling session interruptions
export function useSessionInterruption() {
  const [isInterrupted, setIsInterrupted] = useState(false)
  const [interruptionReason, setInterruptionReason] = useState<string | null>(null)

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        setIsInterrupted(true)
        setInterruptionReason('Page became hidden')
      } else {
        setIsInterrupted(false)
        setInterruptionReason(null)
      }
    }

    const handleOnline = () => {
      setIsInterrupted(false)
      setInterruptionReason(null)
    }

    const handleOffline = () => {
      setIsInterrupted(true)
      setInterruptionReason('Network connection lost')
    }

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      setIsInterrupted(true)
      setInterruptionReason('Page is being unloaded')
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    window.addEventListener('beforeunload', handleBeforeUnload)

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
      window.removeEventListener('beforeunload', handleBeforeUnload)
    }
  }, [])

  return {
    isInterrupted,
    interruptionReason
  }
}