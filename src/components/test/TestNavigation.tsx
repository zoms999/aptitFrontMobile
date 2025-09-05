'use client'

import { Button } from '@/components/ui/button'
import { ChevronLeft, ChevronRight, Flag, Save } from 'lucide-react'
import { TestProgress } from '@/types/test'

interface TestNavigationProps {
  progress: TestProgress
  onPrevious: () => void
  onNext: () => void
  onSave: () => void
  onSubmit: () => void
  canGoNext: boolean
  canGoPrevious: boolean
  isAnswered: boolean
  isSaving?: boolean
  className?: string
}

export function TestNavigation({
  progress,
  onPrevious,
  onNext,
  onSave,
  onSubmit,
  canGoNext,
  canGoPrevious,
  isAnswered,
  isSaving = false,
  className = ''
}: TestNavigationProps) {
  const isLastQuestion = progress.currentQuestion === progress.totalQuestions - 1
  const allQuestionsAnswered = progress.answeredQuestions === progress.totalQuestions

  return (
    <div className={`bg-white border-t border-gray-200 p-4 space-y-3 ${className}`}>
      {/* Main Navigation */}
      <div className="flex items-center justify-between space-x-3">
        {/* Previous Button */}
        <Button
          variant="outline"
          onClick={onPrevious}
          disabled={!canGoPrevious}
          className="flex-1 h-12"
        >
          <ChevronLeft className="w-4 h-4 mr-2" />
          이전
        </Button>

        {/* Save Button */}
        <Button
          variant="outline"
          onClick={onSave}
          disabled={isSaving}
          className="px-4 h-12"
        >
          <Save className="w-4 h-4 mr-2" />
          {isSaving ? '저장 중...' : '저장'}
        </Button>

        {/* Next/Submit Button */}
        {isLastQuestion ? (
          <Button
            onClick={onSubmit}
            disabled={!allQuestionsAnswered}
            className="flex-1 h-12 bg-green-600 hover:bg-green-700"
          >
            <Flag className="w-4 h-4 mr-2" />
            제출하기
          </Button>
        ) : (
          <Button
            onClick={onNext}
            disabled={!canGoNext}
            className="flex-1 h-12"
          >
            다음
            <ChevronRight className="w-4 h-4 ml-2" />
          </Button>
        )}
      </div>

      {/* Status Information */}
      <div className="flex items-center justify-between text-xs text-gray-500">
        <div className="flex items-center space-x-4">
          <span>
            {isAnswered ? '✓ 답변 완료' : '답변을 선택해주세요'}
          </span>
          {!isAnswered && (
            <span className="text-orange-600">
              답변 후 다음으로 이동할 수 있습니다
            </span>
          )}
        </div>
        
        {isLastQuestion && (
          <span className="text-blue-600 font-medium">
            마지막 문항입니다
          </span>
        )}
      </div>

      {/* Submit Warning */}
      {isLastQuestion && allQuestionsAnswered && (
        <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
          <p className="text-sm text-green-800">
            <strong>모든 문항을 완료했습니다!</strong> 제출하기 버튼을 눌러 테스트를 완료하세요.
          </p>
        </div>
      )}
    </div>
  )
}