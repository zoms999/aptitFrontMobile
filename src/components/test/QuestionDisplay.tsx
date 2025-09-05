'use client'

import { useState, useEffect } from 'react'
import { Question, Answer, Option } from '@/types/test'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Slider } from '@/components/ui/slider'
import { CheckCircle2, Circle, Clock } from 'lucide-react'

interface QuestionDisplayProps {
  question: Question
  answer?: Answer
  onAnswer: (answer: Answer) => void
  questionNumber: number
  totalQuestions: number
  timeRemaining?: number
  isReadOnly?: boolean
}

export function QuestionDisplay({
  question,
  answer,
  onAnswer,
  questionNumber,
  totalQuestions,
  timeRemaining,
  isReadOnly = false
}: QuestionDisplayProps) {
  const [currentAnswer, setCurrentAnswer] = useState<string | number | boolean>('')
  const [startTime] = useState(Date.now())
  const [timeSpent, setTimeSpent] = useState(0)

  useEffect(() => {
    if (answer) {
      setCurrentAnswer(answer.value)
    }
  }, [answer])

  useEffect(() => {
    const interval = setInterval(() => {
      setTimeSpent(Date.now() - startTime)
    }, 1000)

    return () => clearInterval(interval)
  }, [startTime])

  const handleAnswerChange = (value: string | number | boolean) => {
    setCurrentAnswer(value)
    
    const newAnswer: Answer = {
      questionId: question.id,
      value,
      timeSpent: Date.now() - startTime,
      timestamp: new Date()
    }
    
    onAnswer(newAnswer)
  }

  const renderQuestionContent = () => {
    switch (question.type) {
      case 'multiple-choice':
        return (
          <div className="space-y-3">
            <RadioGroup
              value={currentAnswer as string}
              onValueChange={handleAnswerChange}
              disabled={isReadOnly}
              className="space-y-3"
            >
              {question.options?.map((option) => (
                <div
                  key={option.id}
                  className="flex items-center space-x-3 p-3 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
                >
                  <RadioGroupItem
                    value={option.value as string}
                    id={option.id}
                    className="min-w-[20px] min-h-[20px]"
                  />
                  <Label
                    htmlFor={option.id}
                    className="flex-1 text-sm leading-relaxed cursor-pointer"
                  >
                    {option.text}
                  </Label>
                </div>
              ))}
            </RadioGroup>
          </div>
        )

      case 'rating':
        return (
          <div className="space-y-4">
            <div className="px-2">
              <Slider
                value={[currentAnswer as number || 1]}
                onValueChange={(value) => handleAnswerChange(value[0])}
                max={question.options?.length || 5}
                min={1}
                step={1}
                disabled={isReadOnly}
                className="w-full"
              />
            </div>
            <div className="flex justify-between text-xs text-gray-500 px-2">
              {question.options?.map((option, index) => (
                <span key={option.id} className="text-center">
                  {option.text}
                </span>
              ))}
            </div>
            <div className="text-center text-sm font-medium text-gray-700">
              선택된 값: {currentAnswer || 1}
            </div>
          </div>
        )

      case 'text':
        return (
          <Textarea
            value={currentAnswer as string}
            onChange={(e) => handleAnswerChange(e.target.value)}
            placeholder="답변을 입력하세요..."
            disabled={isReadOnly}
            className="min-h-[120px] text-base"
            maxLength={500}
          />
        )

      case 'boolean':
        return (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <Button
                variant={currentAnswer === true ? "default" : "outline"}
                onClick={() => handleAnswerChange(true)}
                disabled={isReadOnly}
                className="h-12 text-base"
              >
                <CheckCircle2 className="w-5 h-5 mr-2" />
                예
              </Button>
              <Button
                variant={currentAnswer === false ? "default" : "outline"}
                onClick={() => handleAnswerChange(false)}
                disabled={isReadOnly}
                className="h-12 text-base"
              >
                <Circle className="w-5 h-5 mr-2" />
                아니오
              </Button>
            </div>
          </div>
        )

      default:
        return <div>지원되지 않는 질문 유형입니다.</div>
    }
  }

  return (
    <Card className="p-6 space-y-6">
      {/* Question Header */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <span className="text-sm font-medium text-blue-600 bg-blue-50 px-2 py-1 rounded-full">
              {questionNumber} / {totalQuestions}
            </span>
            {question.category && (
              <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
                {question.category}
              </span>
            )}
          </div>
          
          {timeRemaining && (
            <div className="flex items-center space-x-1 text-sm text-gray-600">
              <Clock className="w-4 h-4" />
              <span>{Math.floor(timeRemaining / 60)}:{(timeRemaining % 60).toString().padStart(2, '0')}</span>
            </div>
          )}
        </div>

        <div className="space-y-2">
          <h2 className="text-lg font-medium text-gray-900 leading-relaxed">
            {question.text}
          </h2>
          
          {question.required && (
            <p className="text-sm text-red-600">* 필수 문항</p>
          )}
        </div>
      </div>

      {/* Question Content */}
      <div className="space-y-4">
        {renderQuestionContent()}
      </div>

      {/* Question Footer */}
      {question.explanation && (
        <div className="p-4 bg-blue-50 rounded-lg">
          <p className="text-sm text-blue-800">
            <strong>참고:</strong> {question.explanation}
          </p>
        </div>
      )}

      {/* Answer Status */}
      <div className="flex items-center justify-between text-sm text-gray-500">
        <div>
          {currentAnswer !== '' && currentAnswer !== undefined ? (
            <span className="text-green-600 font-medium">✓ 답변 완료</span>
          ) : (
            <span>답변을 선택해주세요</span>
          )}
        </div>
        <div>
          소요 시간: {Math.floor(timeSpent / 1000)}초
        </div>
      </div>
    </Card>
  )
}