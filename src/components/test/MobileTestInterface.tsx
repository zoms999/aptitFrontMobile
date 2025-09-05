'use client'

import { useState, useEffect, useCallback } from 'react'
import { Test, Question, Answer, TestProgress as TestProgressType } from '@/types/test'
import { QuestionDisplay } from './QuestionDisplay'
import { TestProgress } from './TestProgress'
import { TestNavigation } from './TestNavigation'
import { useSwipeGesture, useKeyboardNavigation } from '@/hooks/useSwipeGesture'
import { triggerHapticFeedback } from '@/lib/haptics'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { AlertTriangle, Pause, Play } from 'lucide-react'

interface MobileTestInterfaceProps {
  test: Test
  initialAnswers?: Answer[]
  initialCurrentQuestion?: number
  initialTimeSpent?: number
  onAnswer: (answer: Answer) => void
  onSave: () => Promise<void>
  onSubmit: () => Promise<void>
  onPause?: () => void
  onResume?: () => void
  isPaused?: boolean
  className?: string
}

export function MobileTestInterface({
  test,
  initialAnswers = [],
  initialCurrentQuestion = 0,
  initialTimeSpent = 0,
  onAnswer,
  onSave,
  onSubmit,
  onPause,
  onResume,
  isPaused = false,
  className = ''
}: MobileTestInterfaceProps) {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(initialCurrentQuestion)
  const [answers, setAnswers] = useState<Answer[]>(initialAnswers)
  const [timeSpent, setTimeSpent] = useState(initialTimeSpent)
  const [timeRemaining, setTimeRemaining] = useState<number | undefined>(
    test.timeLimit ? test.timeLimit * 60 : undefined
  )
  const [isSaving, setIsSaving] = useState(false)
  const [showExitWarning, setShowExitWarning] = useState(false)

  const currentQuestion = test.questions[currentQuestionIndex]
  const currentAnswer = answers.find(a => a.questionId === currentQuestion?.id)

  // Calculate progress
  const progress: TestProgressType = {
    currentQuestion: currentQuestionIndex,
    totalQuestions: test.questions.length,
    answeredQuestions: answers.length,
    timeSpent: timeSpent * 1000, // Convert to milliseconds
    timeRemaining,
    percentComplete: (answers.length / test.questions.length) * 100
  }

  // Timer effect
  useEffect(() => {
    if (isPaused) return

    const interval = setInterval(() => {
      setTimeSpent(prev => prev + 1)
      if (timeRemaining !== undefined) {
        setTimeRemaining(prev => prev ? Math.max(0, prev - 1) : 0)
      }
    }, 1000)

    return () => clearInterval(interval)
  }, [isPaused, timeRemaining])

  // Auto-submit when time runs out
  useEffect(() => {
    if (timeRemaining === 0) {
      handleSubmit()
    }
  }, [timeRemaining])

  // Navigation functions
  const goToNext = useCallback(() => {
    if (currentQuestionIndex < test.questions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1)
      triggerHapticFeedback('light')
    }
  }, [currentQuestionIndex, test.questions.length])

  const goToPrevious = useCallback(() => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(prev => prev - 1)
      triggerHapticFeedback('light')
    }
  }, [currentQuestionIndex])

  const handleAnswer = useCallback((answer: Answer) => {
    setAnswers(prev => {
      const filtered = prev.filter(a => a.questionId !== answer.questionId)
      return [...filtered, answer]
    })
    onAnswer(answer)
    triggerHapticFeedback('medium')
  }, [onAnswer])

  const handleSave = useCallback(async () => {
    setIsSaving(true)
    try {
      await onSave()
      triggerHapticFeedback('success')
    } catch (error) {
      console.error('Save failed:', error)
      triggerHapticFeedback('error')
    } finally {
      setIsSaving(false)
    }
  }, [onSave])

  const handleSubmit = useCallback(async () => {
    try {
      await onSubmit()
      triggerHapticFeedback('success')
    } catch (error) {
      console.error('Submit failed:', error)
      triggerHapticFeedback('error')
    }
  }, [onSubmit])

  const handlePause = useCallback(() => {
    onPause?.()
    triggerHapticFeedback('light')
  }, [onPause])

  const handleResume = useCallback(() => {
    onResume?.()
    triggerHapticFeedback('light')
  }, [onResume])

  // Swipe gesture support
  const swipeRef = useSwipeGesture({
    onSwipeLeft: () => {
      if (currentAnswer && currentQuestionIndex < test.questions.length - 1) {
        goToNext()
      }
    },
    onSwipeRight: () => {
      if (currentQuestionIndex > 0) {
        goToPrevious()
      }
    },
    threshold: 100,
    disabled: isPaused || showExitWarning
  })

  // Keyboard navigation support
  useKeyboardNavigation({
    onNext: () => {
      if (currentAnswer && currentQuestionIndex < test.questions.length - 1) {
        goToNext()
      }
    },
    onPrevious: () => {
      if (currentQuestionIndex > 0) {
        goToPrevious()
      }
    },
    onSubmit: () => {
      if (progress.answeredQuestions === progress.totalQuestions) {
        handleSubmit()
      }
    },
    disabled: isPaused || showExitWarning
  })

  // Prevent accidental page leave
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (answers.length > 0) {
        e.preventDefault()
        e.returnValue = ''
      }
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [answers.length])

  if (!currentQuestion) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="p-6 text-center">
          <AlertTriangle className="w-12 h-12 text-yellow-500 mx-auto mb-4" />
          <h2 className="text-lg font-semibold mb-2">문제를 불러올 수 없습니다</h2>
          <p className="text-gray-600">테스트 데이터에 문제가 있습니다.</p>
        </Card>
      </div>
    )
  }

  return (
    <div className={`min-h-screen bg-gray-50 flex flex-col ${className}`} ref={swipeRef}>
      {/* Progress Header */}
      <TestProgress 
        progress={progress}
        showTimeRemaining={!!timeRemaining}
        showQuestionNumbers={true}
      />

      {/* Pause/Resume Controls */}
      {(onPause || onResume) && (
        <div className="bg-white border-b border-gray-200 p-2">
          <div className="flex justify-center">
            {isPaused ? (
              <Button
                variant="outline"
                onClick={handleResume}
                className="flex items-center space-x-2"
              >
                <Play className="w-4 h-4" />
                <span>계속하기</span>
              </Button>
            ) : (
              <Button
                variant="outline"
                onClick={handlePause}
                className="flex items-center space-x-2"
              >
                <Pause className="w-4 h-4" />
                <span>일시정지</span>
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 p-4 pb-0">
        {isPaused ? (
          <Card className="p-6 text-center">
            <Pause className="w-12 h-12 text-blue-500 mx-auto mb-4" />
            <h2 className="text-lg font-semibold mb-2">테스트가 일시정지되었습니다</h2>
            <p className="text-gray-600 mb-4">
              준비가 되면 계속하기 버튼을 눌러주세요.
            </p>
            <Button onClick={handleResume}>
              <Play className="w-4 h-4 mr-2" />
              계속하기
            </Button>
          </Card>
        ) : (
          <QuestionDisplay
            question={currentQuestion}
            answer={currentAnswer}
            onAnswer={handleAnswer}
            questionNumber={currentQuestionIndex + 1}
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
          canGoNext={!!currentAnswer && currentQuestionIndex < test.questions.length - 1}
          canGoPrevious={currentQuestionIndex > 0}
          isAnswered={!!currentAnswer}
          isSaving={isSaving}
        />
      )}

      {/* Swipe Hint */}
      <div className="bg-gray-100 p-2 text-center text-xs text-gray-500">
        💡 좌우로 스와이프하여 문항을 이동할 수 있습니다
      </div>

      {/* Time Warning */}
      {timeRemaining && timeRemaining <= 300 && timeRemaining > 0 && (
        <div className="fixed top-4 left-4 right-4 z-50">
          <Card className="p-4 bg-red-50 border-red-200">
            <div className="flex items-center space-x-2 text-red-700">
              <AlertTriangle className="w-5 h-5" />
              <span className="font-medium">
                남은 시간: {Math.floor(timeRemaining / 60)}:{(timeRemaining % 60).toString().padStart(2, '0')}
              </span>
            </div>
          </Card>
        </div>
      )}
    </div>
  )
}