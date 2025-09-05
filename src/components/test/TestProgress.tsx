'use client'

import { TestProgress as TestProgressType } from '@/types/test'
import { Progress } from '@/components/ui/progress'
import { Clock, CheckCircle2, Circle } from 'lucide-react'

interface TestProgressProps {
  progress: TestProgressType
  showTimeRemaining?: boolean
  showQuestionNumbers?: boolean
  className?: string
}

export function TestProgress({
  progress,
  showTimeRemaining = true,
  showQuestionNumbers = true,
  className = ''
}: TestProgressProps) {
  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const secs = seconds % 60

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`
  }

  return (
    <div className={`bg-white border-b border-gray-200 p-4 space-y-4 ${className}`}>
      {/* Progress Bar */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="font-medium text-gray-700">
            진행률 {Math.round(progress.percentComplete)}%
          </span>
          {showQuestionNumbers && (
            <span className="text-gray-500">
              {progress.currentQuestion + 1} / {progress.totalQuestions}
            </span>
          )}
        </div>
        
        <Progress 
          value={progress.percentComplete} 
          className="h-2"
        />
        
        <div className="flex items-center justify-between text-xs text-gray-500">
          <span>
            답변 완료: {progress.answeredQuestions} / {progress.totalQuestions}
          </span>
          <span>
            소요 시간: {formatTime(Math.floor(progress.timeSpent / 1000))}
          </span>
        </div>
      </div>

      {/* Time Information */}
      {showTimeRemaining && progress.timeRemaining && (
        <div className="flex items-center justify-center space-x-2 p-2 bg-blue-50 rounded-lg">
          <Clock className="w-4 h-4 text-blue-600" />
          <span className="text-sm font-medium text-blue-700">
            남은 시간: {formatTime(progress.timeRemaining)}
          </span>
        </div>
      )}

      {/* Question Status Indicators */}
      <div className="flex items-center justify-center space-x-1 overflow-x-auto pb-2">
        {Array.from({ length: progress.totalQuestions }, (_, index) => {
          const questionNumber = index + 1
          const isAnswered = index < progress.answeredQuestions
          const isCurrent = index === progress.currentQuestion
          
          return (
            <div
              key={index}
              className={`
                flex items-center justify-center w-8 h-8 rounded-full text-xs font-medium
                ${isCurrent 
                  ? 'bg-blue-600 text-white ring-2 ring-blue-200' 
                  : isAnswered 
                    ? 'bg-green-100 text-green-700' 
                    : 'bg-gray-100 text-gray-500'
                }
              `}
            >
              {isAnswered && !isCurrent ? (
                <CheckCircle2 className="w-4 h-4" />
              ) : (
                questionNumber
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}