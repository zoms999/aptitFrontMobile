'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { Test, Answer, TestSession, DeviceInfo } from '@/types/test'

interface UseTestSessionOptions {
  test: Test
  userId: string
  autoSaveInterval?: number // in milliseconds
  sessionTimeout?: number // in milliseconds
}

interface TestSessionState {
  sessionId: string | null
  currentQuestion: number
  answers: Answer[]
  timeSpent: number
  isLoading: boolean
  isSaving: boolean
  lastSaved: Date | null
  error: string | null
}

export function useTestSession({
  test,
  userId,
  autoSaveInterval = 30000, // 30 seconds
  sessionTimeout = 3600000 // 1 hour
}: UseTestSessionOptions) {
  const [state, setState] = useState<TestSessionState>({
    sessionId: null,
    currentQuestion: 0,
    answers: [],
    timeSpent: 0,
    isLoading: true,
    isSaving: false,
    lastSaved: null,
    error: null
  })

  const autoSaveTimerRef = useRef<NodeJS.Timeout>()
  const sessionStartTime = useRef<number>(Date.now())
  const lastActivityRef = useRef<number>(Date.now())

  // Get device information
  const getDeviceInfo = useCallback((): DeviceInfo => {
    return {
      userAgent: navigator.userAgent,
      screenWidth: window.screen.width,
      screenHeight: window.screen.height,
      devicePixelRatio: window.devicePixelRatio,
      platform: navigator.platform,
      isMobile: /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent),
      isTablet: /iPad|Android(?!.*Mobile)/i.test(navigator.userAgent),
      orientation: window.screen.orientation?.type.includes('portrait') ? 'portrait' : 'landscape',
      connectionType: (navigator as any).connection?.effectiveType || 'unknown'
    }
  }, [])

  // Initialize or resume session
  const initializeSession = useCallback(async () => {
    setState(prev => ({ ...prev, isLoading: true, error: null }))

    try {
      // Check for existing session
      const response = await fetch(`/api/tests/${test.id}/session`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      })

      if (response.ok) {
        const { session } = await response.json()
        
        if (session && !session.isCompleted) {
          // Resume existing session
          setState(prev => ({
            ...prev,
            sessionId: session.id,
            currentQuestion: session.currentQuestion,
            answers: session.answers || [],
            timeSpent: session.timeSpent,
            isLoading: false,
            lastSaved: new Date(session.updatedAt)
          }))
          
          sessionStartTime.current = Date.now() - (session.timeSpent * 1000)
          return
        }
      }

      // Create new session
      const createResponse = await fetch(`/api/tests/${test.id}/session`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          deviceInfo: getDeviceInfo(),
          expiresAt: new Date(Date.now() + sessionTimeout)
        })
      })

      if (!createResponse.ok) {
        throw new Error('Failed to create test session')
      }

      const { session: newSession } = await createResponse.json()
      
      setState(prev => ({
        ...prev,
        sessionId: newSession.id,
        currentQuestion: 0,
        answers: [],
        timeSpent: 0,
        isLoading: false,
        lastSaved: new Date()
      }))

      sessionStartTime.current = Date.now()

    } catch (error) {
      console.error('Session initialization error:', error)
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to initialize session'
      }))
    }
  }, [test.id, sessionTimeout, getDeviceInfo])

  // Save session progress
  const saveProgress = useCallback(async (force = false) => {
    if (!state.sessionId || (state.isSaving && !force)) return

    setState(prev => ({ ...prev, isSaving: true, error: null }))

    try {
      const currentTime = Date.now()
      const totalTimeSpent = Math.floor((currentTime - sessionStartTime.current) / 1000)

      const response = await fetch(`/api/tests/${test.id}/session`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          sessionId: state.sessionId,
          currentQuestion: state.currentQuestion,
          answers: state.answers,
          timeSpent: totalTimeSpent,
          deviceInfo: getDeviceInfo(),
          lastActivity: new Date()
        })
      })

      if (!response.ok) {
        throw new Error('Failed to save progress')
      }

      setState(prev => ({
        ...prev,
        isSaving: false,
        timeSpent: totalTimeSpent,
        lastSaved: new Date()
      }))

      lastActivityRef.current = currentTime

    } catch (error) {
      console.error('Save progress error:', error)
      setState(prev => ({
        ...prev,
        isSaving: false,
        error: error instanceof Error ? error.message : 'Failed to save progress'
      }))
    }
  }, [state.sessionId, state.currentQuestion, state.answers, state.isSaving, test.id, getDeviceInfo])

  // Add or update answer
  const addAnswer = useCallback((answer: Answer) => {
    setState(prev => {
      const filteredAnswers = prev.answers.filter(a => a.questionId !== answer.questionId)
      return {
        ...prev,
        answers: [...filteredAnswers, answer]
      }
    })
    
    lastActivityRef.current = Date.now()
  }, [])

  // Navigate to question
  const goToQuestion = useCallback((questionIndex: number) => {
    if (questionIndex >= 0 && questionIndex < test.questions.length) {
      setState(prev => ({
        ...prev,
        currentQuestion: questionIndex
      }))
      
      lastActivityRef.current = Date.now()
    }
  }, [test.questions.length])

  // Submit test
  const submitTest = useCallback(async () => {
    if (!state.sessionId) {
      throw new Error('No active session')
    }

    setState(prev => ({ ...prev, isSaving: true, error: null }))

    try {
      const currentTime = Date.now()
      const totalTimeSpent = Math.floor((currentTime - sessionStartTime.current) / 1000)

      const response = await fetch(`/api/tests/${test.id}/submit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          sessionId: state.sessionId,
          answers: state.answers,
          timeSpent: totalTimeSpent,
          deviceInfo: getDeviceInfo(),
          submittedFrom: getDeviceInfo().isMobile ? 'mobile' : 'desktop',
          networkType: (navigator as any).connection?.effectiveType || 'unknown'
        })
      })

      if (!response.ok) {
        throw new Error('Failed to submit test')
      }

      const result = await response.json()
      
      // Clear auto-save timer
      if (autoSaveTimerRef.current) {
        clearInterval(autoSaveTimerRef.current)
      }

      setState(prev => ({
        ...prev,
        isSaving: false,
        timeSpent: totalTimeSpent
      }))

      return result

    } catch (error) {
      console.error('Submit test error:', error)
      setState(prev => ({
        ...prev,
        isSaving: false,
        error: error instanceof Error ? error.message : 'Failed to submit test'
      }))
      throw error
    }
  }, [state.sessionId, state.answers, test.id, getDeviceInfo])

  // Pause session
  const pauseSession = useCallback(async () => {
    await saveProgress(true)
    if (autoSaveTimerRef.current) {
      clearInterval(autoSaveTimerRef.current)
    }
  }, [saveProgress])

  // Resume session
  const resumeSession = useCallback(() => {
    // Restart auto-save timer
    if (autoSaveTimerRef.current) {
      clearInterval(autoSaveTimerRef.current)
    }
    
    autoSaveTimerRef.current = setInterval(() => {
      saveProgress()
    }, autoSaveInterval)

    lastActivityRef.current = Date.now()
  }, [saveProgress, autoSaveInterval])

  // Initialize session on mount
  useEffect(() => {
    initializeSession()
  }, [initializeSession])

  // Set up auto-save timer
  useEffect(() => {
    if (!state.isLoading && state.sessionId) {
      autoSaveTimerRef.current = setInterval(() => {
        saveProgress()
      }, autoSaveInterval)

      return () => {
        if (autoSaveTimerRef.current) {
          clearInterval(autoSaveTimerRef.current)
        }
      }
    }
  }, [state.isLoading, state.sessionId, saveProgress, autoSaveInterval])

  // Handle page visibility change
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        // Page is hidden, save progress
        saveProgress(true)
      } else {
        // Page is visible, update last activity
        lastActivityRef.current = Date.now()
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange)
  }, [saveProgress])

  // Handle beforeunload
  useEffect(() => {
    const handleBeforeUnload = () => {
      // Try to save progress before page unload
      if (state.sessionId && state.answers.length > 0) {
        navigator.sendBeacon(
          `/api/tests/${test.id}/session`,
          JSON.stringify({
            sessionId: state.sessionId,
            currentQuestion: state.currentQuestion,
            answers: state.answers,
            timeSpent: Math.floor((Date.now() - sessionStartTime.current) / 1000),
            lastActivity: new Date()
          })
        )
      }
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [state.sessionId, state.currentQuestion, state.answers, test.id])

  // Check for session timeout
  useEffect(() => {
    const checkTimeout = () => {
      const timeSinceLastActivity = Date.now() - lastActivityRef.current
      if (timeSinceLastActivity > sessionTimeout) {
        setState(prev => ({
          ...prev,
          error: 'Session has expired due to inactivity'
        }))
      }
    }

    const timeoutChecker = setInterval(checkTimeout, 60000) // Check every minute
    return () => clearInterval(timeoutChecker)
  }, [sessionTimeout])

  return {
    ...state,
    addAnswer,
    goToQuestion,
    saveProgress,
    submitTest,
    pauseSession,
    resumeSession,
    initializeSession
  }
}