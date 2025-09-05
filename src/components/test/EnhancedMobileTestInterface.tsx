'use client'

import { useState, useEffect, useCallback } from 'react'
import { Test, Question, Answer, TestProgress as TestProgressType } from '@/types/test'
import { QuestionDisplay } from './QuestionDisplay'
import { TestProgress } from './TestProgress'
import { TestNavigation } from './TestNavigation'
import { SessionRecovery } from './SessionRecovery'
import { useSwipeGesture, useKeyboardNavigation } from '@/hooks/useSwipeGesture'
import { useOrientation, useOrientationLayout } from '@/hooks/useOrientation'
import { useAccessibility, useScreenReaderAnnouncements, useFocusManagement } from '@/hooks/useAccessibility'
import { useTestSessionContext } from '@/contexts/TestSessionContext'
import { triggerHapticFeedback } from '@/lib/haptics'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { AlertTriangle, Pause, Play, RotateCcw, Smartphone, Volume2 } from 'lucide-react'

interface EnhancedMobileTestInterfaceProps {
  test: Test
  onComplete: (result: any) => void
  className?: string
}

export function EnhancedMobileTestInterface({
  test,
  onComplete,
  className = ''
}: EnhancedMobileTestInterfaceProps) {
  const {
    sessionId,
    currentQuestion,
    answers,
    timeSpent,
    isLoading,
    isSaving,
    error,
    addAnswer,
    goToQuestion,
    saveProgress,
    submitTest,
    pauseSession,
    resumeSession,
    canGoNext,
    canGoPrevious,
    allQuestionsAnswered,
    progressPercentage
  } = useTestSessionContext()

  const [isPaused, setIsPaused] = useState(false)
  const [showRecovery, setShowRecovery] = useState(false)
  const [timeRemaining, setTimeRemaining] = useState<number | undefined>(
    test.timeLimit ? test.timeLimit * 60 : undefined
  )

  // Accessibility and mobile features
  const { orientation, isPortrait, orientationClasses } = useOrientationLayout()
  const accessibility = useAccessibility()
  const { announce, announceNavigation, announceError, announceSuccess } = useScreenReaderAnnouncements()
  const { focusElement, focusFirstInteractive } = useFocusManagement()

  const currentQuestionData = test.questions[currentQuestion]
  const currentAnswer = answers.find(a => a.questionId === currentQuestionData?.id)

  // Calculate progress
  const progress: TestProgressType = {
    currentQuestion,
    totalQuestions: test.questions.length,
    answeredQuestions: answers.length,
    timeSpent: timeSpent * 1000,
    timeRemaining,
    percentComplete: progressPercentage
  }

  // Navigation functions with accessibility
  const goToNext = useCallback(() => {
    if (canGoNext) {
      goToQuestion(currentQuestion + 1)
      triggerHapticFeedback('light')
      announceNavigation(`문항 ${currentQuestion + 2}`)
      
      // Focus on the new question
      setTimeout(() => {
        focusElement('[role="main"] h2')
      }, 100)
    }
  }, [canGoNext, currentQuestion, goToQuestion, announceNavigation, focusElement])

  const goToPrevious = useCallback(() => {
    if (canGoPrevious) {
      goToQuestion(currentQuestion - 1)
      triggerHapticFeedback('light')
      announceNavigation(`문항 ${currentQuestion}`)
      
      // Focus on the new question
      setTimeout(() => {
        focusElement('[role="main"] h2')
      }, 100)
    }
  }, [canGoPrevious, currentQuestion, goToQuestion, announceNavigation, focusElement])

  const handleAnswer = useCallback((answer: Answer) => {
    addAnswer(answer)
    triggerHapticFeedback('medium')
    
    // Announce answer selection for screen readers
    if (accessibility.isScreenReaderActive) {
      announce('답변이 선택되었습니다', 'polite')
    }
  }, [addAnswer, accessibility.isScreenReaderActive, announce])

  const handleSave = useCallback(async () => {
    try {
      await saveProgress()
      triggerHapticFeedback('success')
      announceSuccess('진행 상황이 저장되었습니다')
    } catch (error) {
      console.error('Save failed:', error)
      triggerHapticFeedback('error')
      announceError('저장에 실패했습니다')
    }
  }, [saveProgress, announceSuccess, announceError])

  const handleSubmit = useCallback(async () => {
    try {
      const result = await submitTest()
      triggerHapticFeedback('success')
      announceSuccess('테스트가 제출되었습니다')
      onComplete(result)
    } catch (error) {
      console.error('Submit failed:', error)
      triggerHapticFeedback('error')
      announceError('제출에 실패했습니다')
    }
  }, [submitTest, onComplete, announceSuccess, announceError])

  const handlePause = useCallback(async () => {
    setIsPaused(true)
    await pauseSession()
    triggerHapticFeedback('light')
    announce('테스트가 일시정지되었습니다', 'polite')
  }, [pauseSession, announce])

  const handleResume = useCallback(() => {
    setIsPaused(false)
    resumeSession()
    triggerHapticFeedback('light')
    announce('테스트를 계속 진행합니다', 'polite')
    
    // Focus back on the question
    setTimeout(() => {
      focusFirstInteractive()
    }, 100)
  }, [resumeSession, announce, focusFirstInteractive])

  // Swipe gesture support with accessibility consideration
  const swipeRef = useSwipeGesture({
    onSwipeLeft: () => {
      if (!accessibility.prefersReducedMotion && currentAnswer && canGoNext) {
        goToNext()
      }
    },
    onSwipeRight: () => {
      if (!accessibility.prefersReducedMotion && canGoPrevious) {
        goToPrevious()
      }
    },
    threshold: 100,
    disabled: isPaused || showRecovery || accessibility.isKeyboardNavigation
  })

  // Keyboard navigation with enhanced accessibility
  useKeyboardNavigation({
    onNext: () => {
      if (currentAnswer && canGoNext) {
        goToNext()
      }
    },
    onPrevious: () => {
      if (canGoPrevious) {
        goToPrevious()
      }
    },
    onSubmit: () => {
      if (allQuestionsAnswered) {
        handleSubmit()
      }
    },
    disabled: isPaused || showRecovery
  })

  // Timer with accessibility announcements
  useEffect(() => {
    if (isPaused || !timeRemaining) return

    const interval = setInterval(() => {
      setTimeRemaining(prev => {
        if (prev && prev > 0) {
          const newTime = prev - 1
          
          // Announce time warnings for screen readers
          if (accessibility.isScreenReaderActive) {
            if (newTime === 300) { // 5 minutes
              announce('남은 시간 5분입니다', 'assertive')
            } else if (newTime === 60) { // 1 minute
              announce('남은 시간 1분입니다', 'assertive')
            } else if (newTime === 10) { // 10 seconds
              announce('남은 시간 10초입니다', 'assertive')
            }
          }
          
          return newTime
        }
        return prev
      })
    }, 1000)

    return () => clearInterval(interval)
  }, [isPaused, timeRemaining, accessibility.isScreenReaderActive, announce])

  // Auto-submit when time runs out
  useEffect(() => {
    if (timeRemaining === 0) {
      announce('시간이 종료되어 자동으로 제출됩니다', 'assertive')
      handleSubmit()
    }
  }, [timeRemaining, handleSubmit, announce])

  // Orientation change handling
  useEffect(() => {
    if (accessibility.isScreenReaderActive) {
      announce(`화면이 ${orientation === 'portrait' ? '세로' : '가로'} 모드로 변경되었습니다`, 'polite')
    }
  }, [orientation, accessibility.isScreenReaderActive, announce])

  // Error handling with accessibility
  useEffect(() => {
    if (error) {
      announceError(error)
      triggerHapticFeedback('error')
    }
  }, [error, announceError])

  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <Card className="p-6 text-center">
          <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4" />
          <h2 className="text-lg font-semibold mb-2">테스트 로딩 중...</h2>
          <p className="text-gray-600">잠시만 기다려주세요.</p>
        </Card>
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50 p-4">
        <Card className="p-6 text-center max-w-md">
          <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-lg font-semibold mb-2">오류가 발생했습니다</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <Button onClick={() => window.location.reload()}>
            <RotateCcw className="w-4 h-4 mr-2" />
            다시 시도
          </Button>
        </Card>
      </div>
    )
  }

  // No current question
  if (!currentQuestionData) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <Card className="p-6 text-center">
          <AlertTriangle className="w-12 h-12 text-yellow-500 mx-auto mb-4" />
          <h2 className="text-lg font-semibold mb-2">문제를 불러올 수 없습니다</h2>
          <p className="text-gray-600">테스트 데이터에 문제가 있습니다.</p>
        </Card>
      </div>
    )
  }

  return (
    <div 
      className={`min-h-screen bg-gray-50 flex flex-col ${orientationClasses.container} ${className}`} 
      ref={swipeRef}
      role="application"
      aria-label={`${test.title} 테스트`}
    >
      {/* Accessibility announcements region */}
      <div id="screen-reader-announcements" aria-live="polite" aria-atomic="true" className="sr-only" />

      {/* Progress Header */}
      <TestProgress 
        progress={progress}
        showTimeRemaining={!!timeRemaining}
        showQuestionNumbers={true}
        className={orientationClasses.content}
      />

      {/* Accessibility Controls */}
      {accessibility.isScreenReaderActive && (
        <div className="bg-blue-50 border-b border-blue-200 p-2">
          <div className="flex justify-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => announce(`현재 ${currentQuestion + 1}번째 문항입니다. 총 ${test.questions.length}개 문항 중 ${answers.length}개를 답변했습니다.`, 'polite')}
            >
              <Volume2 className="w-4 h-4 mr-2" />
              진행 상황 듣기
            </Button>
          </div>
        </div>
      )}

      {/* Pause/Resume Controls */}
      <div className="bg-white border-b border-gray-200 p-2">
        <div className="flex justify-center">
          {isPaused ? (
            <Button
              variant="outline"
              onClick={handleResume}
              className="flex items-center space-x-2"
              aria-label="테스트 계속하기"
            >
              <Play className="w-4 h-4" />
              <span>계속하기</span>
            </Button>
          ) : (
            <Button
              variant="outline"
              onClick={handlePause}
              className="flex items-center space-x-2"
              aria-label="테스트 일시정지"
            >
              <Pause className="w-4 h-4" />
              <span>일시정지</span>
            </Button>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className={`flex-1 p-4 pb-0 ${orientationClasses.content}`} role="main">
        {isPaused ? (
          <Card className="p-6 text-center">
            <Pause className="w-12 h-12 text-blue-500 mx-auto mb-4" />
            <h2 className="text-lg font-semibold mb-2">테스트가 일시정지되었습니다</h2>
            <p className="text-gray-600 mb-4">
              준비가 되면 계속하기 버튼을 눌러주세요.
            </p>
            <Button onClick={handleResume} autoFocus>
              <Play className="w-4 h-4 mr-2" />
              계속하기
            </Button>
          </Card>
        ) : (
          <QuestionDisplay
            question={currentQuestionData}
            answer={currentAnswer}
            onAnswer={handleAnswer}
            questionNumber={currentQuestion + 1}
            totalQuestions={test.questions.length}
            timeRemaining={timeRemaining}
          />
        )}
      </div>

      {/* Navigation Footer */}
      {!isPaused && (
        <TestNavigation
          progress={progress}
          onPrevious={goToPrevious}
          onNext={goToNext}
          onSave={handleSave}
          onSubmit={handleSubmit}
          canGoNext={!!currentAnswer && canGoNext}
          canGoPrevious={canGoPrevious}
          isAnswered={!!currentAnswer}
          isSaving={isSaving}
          className={orientationClasses.navigation}
        />
      )}

      {/* Mobile Hints */}
      {!accessibility.isScreenReaderActive && !accessibility.prefersReducedMotion && (
        <div className="bg-gray-100 p-2 text-center text-xs text-gray-500">
          <div className="flex items-center justify-center space-x-4">
            <span className="flex items-center">
              <Smartphone className="w-3 h-3 mr-1" />
              좌우 스와이프로 이동
            </span>
            {accessibility.isKeyboardNavigation && (
              <span>방향키로 탐색 가능</span>
            )}
          </div>
        </div>
      )}

      {/* Time Warning */}
      {timeRemaining && timeRemaining <= 300 && timeRemaining > 0 && (
        <div className="fixed top-4 left-4 right-4 z-50">
          <Card className="p-4 bg-red-50 border-red-200" role="alert">
            <div className="flex items-center space-x-2 text-red-700">
              <AlertTriangle className="w-5 h-5" />
              <span className="font-medium">
                남은 시간: {Math.floor(timeRemaining / 60)}:{(timeRemaining % 60).toString().padStart(2, '0')}
              </span>
            </div>
          </Card>
        </div>
      )}

      {/* Orientation Change Notice */}
      {!isPortrait && (
        <div className="fixed bottom-4 left-4 right-4 z-40">
          <Card className="p-3 bg-blue-50 border-blue-200">
            <div className="flex items-center justify-center space-x-2 text-blue-700 text-sm">
              <Smartphone className="w-4 h-4" />
              <span>가로 모드에서 사용 중입니다</span>
            </div>
          </Card>
        </div>
      )}
    </div>
  )
}