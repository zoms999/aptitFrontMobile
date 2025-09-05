'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { AlertCircle, RotateCcw, Trash2, Clock, FileText } from 'lucide-react'
import { Answer } from '@/types/test'

interface SessionRecoveryProps {
  testTitle: string
  sessionData: {
    testId: string
    sessionId: string
    currentQuestion: number
    answers: Answer[]
    timeSpent: number
    lastActivity?: Date
  }
  onRecover: () => void
  onDiscard: () => void
  onCancel: () => void
  isLoading?: boolean
}

export function SessionRecovery({
  testTitle,
  sessionData,
  onRecover,
  onDiscard,
  onCancel,
  isLoading = false
}: SessionRecoveryProps) {
  const [showDetails, setShowDetails] = useState(false)

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const secs = seconds % 60

    if (hours > 0) {
      return `${hours}시간 ${minutes}분 ${secs}초`
    }
    return `${minutes}분 ${secs}초`
  }

  const formatLastActivity = (date?: Date) => {
    if (!date) return '알 수 없음'
    
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const minutes = Math.floor(diff / (1000 * 60))
    const hours = Math.floor(minutes / 60)
    const days = Math.floor(hours / 24)

    if (days > 0) {
      return `${days}일 전`
    } else if (hours > 0) {
      return `${hours}시간 전`
    } else if (minutes > 0) {
      return `${minutes}분 전`
    } else {
      return '방금 전'
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <AlertCircle className="w-12 h-12 text-blue-500" />
          </div>
          <CardTitle className="text-lg">이전 세션 발견</CardTitle>
        </CardHeader>
        
        <CardContent className="space-y-4">
          <div className="text-center text-gray-600">
            <p className="mb-2">
              <strong>{testTitle}</strong> 테스트의 진행 중인 세션이 있습니다.
            </p>
            <p className="text-sm">
              이어서 진행하시겠습니까?
            </p>
          </div>

          {/* Session Summary */}
          <div className="bg-gray-50 rounded-lg p-4 space-y-3">
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center space-x-2">
                <FileText className="w-4 h-4 text-gray-500" />
                <span>진행률</span>
              </div>
              <span className="font-medium">
                {sessionData.currentQuestion + 1} / {sessionData.answers.length} 문항
              </span>
            </div>

            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center space-x-2">
                <Clock className="w-4 h-4 text-gray-500" />
                <span>소요 시간</span>
              </div>
              <span className="font-medium">
                {formatTime(sessionData.timeSpent)}
              </span>
            </div>

            {sessionData.lastActivity && (
              <div className="flex items-center justify-between text-sm">
                <span>마지막 활동</span>
                <span className="font-medium">
                  {formatLastActivity(sessionData.lastActivity)}
                </span>
              </div>
            )}

            {/* Progress Bar */}
            <div className="space-y-1">
              <div className="flex justify-between text-xs text-gray-500">
                <span>답변 완료</span>
                <span>{sessionData.answers.length} 문항</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                  style={{ 
                    width: `${(sessionData.answers.length / (sessionData.currentQuestion + 1)) * 100}%` 
                  }}
                />
              </div>
            </div>
          </div>

          {/* Details Toggle */}
          <div className="text-center">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowDetails(!showDetails)}
              className="text-gray-500"
            >
              {showDetails ? '세부 정보 숨기기' : '세부 정보 보기'}
            </Button>
          </div>

          {/* Detailed Information */}
          {showDetails && (
            <div className="bg-gray-50 rounded-lg p-4 space-y-2 text-sm">
              <div className="flex justify-between">
                <span>세션 ID:</span>
                <span className="font-mono text-xs">
                  {sessionData.sessionId.slice(0, 8)}...
                </span>
              </div>
              <div className="flex justify-between">
                <span>현재 문항:</span>
                <span>{sessionData.currentQuestion + 1}</span>
              </div>
              <div className="flex justify-between">
                <span>답변한 문항:</span>
                <span>{sessionData.answers.length}</span>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="space-y-3">
            <Button
              onClick={onRecover}
              disabled={isLoading}
              className="w-full h-12"
            >
              <RotateCcw className="w-4 h-4 mr-2" />
              {isLoading ? '복구 중...' : '이어서 진행하기'}
            </Button>

            <div className="grid grid-cols-2 gap-3">
              <Button
                variant="outline"
                onClick={onCancel}
                disabled={isLoading}
                className="h-10"
              >
                취소
              </Button>
              
              <Button
                variant="destructive"
                onClick={onDiscard}
                disabled={isLoading}
                className="h-10"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                새로 시작
              </Button>
            </div>
          </div>

          {/* Warning */}
          <div className="text-xs text-gray-500 text-center">
            <p>
              "새로 시작"을 선택하면 이전 진행 상황이 모두 삭제됩니다.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}