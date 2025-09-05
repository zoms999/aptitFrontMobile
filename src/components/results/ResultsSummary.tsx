'use client'

import { useState } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { TestResult, ResultAnalysis } from '@/types/result'
import { Share2, ChevronDown, ChevronUp, Trophy, TrendingUp, Clock, Target } from 'lucide-react'

interface ResultsSummaryProps {
  result: TestResult
  onShare?: () => void
}

export function ResultsSummary({ result, onShare }: ResultsSummaryProps) {
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set())

  const toggleSection = (section: string) => {
    const newExpanded = new Set(expandedSections)
    if (newExpanded.has(section)) {
      newExpanded.delete(section)
    } else {
      newExpanded.add(section)
    }
    setExpandedSections(newExpanded)
  }

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    return `${minutes}분 ${remainingSeconds}초`
  }

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600'
    if (score >= 60) return 'text-yellow-600'
    return 'text-red-600'
  }

  const getRatingColor = (rating: string) => {
    switch (rating) {
      case 'excellent': return 'bg-green-100 text-green-800'
      case 'good': return 'bg-blue-100 text-blue-800'
      case 'average': return 'bg-yellow-100 text-yellow-800'
      case 'needs-improvement': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <div className="space-y-4 p-4">
      {/* Header Card */}
      <Card className="p-6 bg-gradient-to-r from-blue-50 to-indigo-50">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <Trophy className="h-6 w-6 text-yellow-500" />
            <h1 className="text-xl font-bold text-gray-900">{result.test.title}</h1>
          </div>
          {onShare && (
            <Button
              variant="outline"
              size="sm"
              onClick={onShare}
              className="flex items-center space-x-2"
            >
              <Share2 className="h-4 w-4" />
              <span>공유</span>
            </Button>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="text-center">
            <div className={`text-3xl font-bold ${getScoreColor(result.score)}`}>
              {result.score}점
            </div>
            <div className="text-sm text-gray-600">총점</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-blue-600">
              {result.percentile}%
            </div>
            <div className="text-sm text-gray-600">상위 백분율</div>
          </div>
        </div>

        <div className="flex items-center justify-center">
          <span className={`px-3 py-1 rounded-full text-sm font-medium ${getRatingColor(result.analysis.overallRating)}`}>
            {result.analysis.overallRating === 'excellent' && '우수'}
            {result.analysis.overallRating === 'good' && '양호'}
            {result.analysis.overallRating === 'average' && '보통'}
            {result.analysis.overallRating === 'needs-improvement' && '개선 필요'}
          </span>
        </div>
      </Card>

      {/* Quick Stats */}
      <Card className="p-4">
        <div className="grid grid-cols-3 gap-4 text-center">
          <div className="flex flex-col items-center">
            <Clock className="h-5 w-5 text-gray-500 mb-1" />
            <div className="text-sm font-medium">{formatTime(result.timeSpent)}</div>
            <div className="text-xs text-gray-500">소요시간</div>
          </div>
          <div className="flex flex-col items-center">
            <Target className="h-5 w-5 text-gray-500 mb-1" />
            <div className="text-sm font-medium">{result.test.difficulty}</div>
            <div className="text-xs text-gray-500">난이도</div>
          </div>
          <div className="flex flex-col items-center">
            <TrendingUp className="h-5 w-5 text-gray-500 mb-1" />
            <div className="text-sm font-medium">{result.test.category}</div>
            <div className="text-xs text-gray-500">카테고리</div>
          </div>
        </div>
      </Card>

      {/* Strengths Section */}
      <Card className="p-4">
        <button
          onClick={() => toggleSection('strengths')}
          className="w-full flex items-center justify-between text-left"
        >
          <h3 className="text-lg font-semibold text-gray-900">강점 영역</h3>
          {expandedSections.has('strengths') ? (
            <ChevronUp className="h-5 w-5 text-gray-500" />
          ) : (
            <ChevronDown className="h-5 w-5 text-gray-500" />
          )}
        </button>
        
        {expandedSections.has('strengths') && (
          <div className="mt-4 space-y-2">
            {result.analysis.strengths.map((strength, index) => (
              <div key={index} className="flex items-start space-x-2">
                <div className="w-2 h-2 bg-green-500 rounded-full mt-2 flex-shrink-0" />
                <p className="text-sm text-gray-700">{strength}</p>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Weaknesses Section */}
      <Card className="p-4">
        <button
          onClick={() => toggleSection('weaknesses')}
          className="w-full flex items-center justify-between text-left"
        >
          <h3 className="text-lg font-semibold text-gray-900">개선 영역</h3>
          {expandedSections.has('weaknesses') ? (
            <ChevronUp className="h-5 w-5 text-gray-500" />
          ) : (
            <ChevronDown className="h-5 w-5 text-gray-500" />
          )}
        </button>
        
        {expandedSections.has('weaknesses') && (
          <div className="mt-4 space-y-2">
            {result.analysis.weaknesses.map((weakness, index) => (
              <div key={index} className="flex items-start space-x-2">
                <div className="w-2 h-2 bg-orange-500 rounded-full mt-2 flex-shrink-0" />
                <p className="text-sm text-gray-700">{weakness}</p>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Recommendations Section */}
      <Card className="p-4">
        <button
          onClick={() => toggleSection('recommendations')}
          className="w-full flex items-center justify-between text-left"
        >
          <h3 className="text-lg font-semibold text-gray-900">추천 사항</h3>
          {expandedSections.has('recommendations') ? (
            <ChevronUp className="h-5 w-5 text-gray-500" />
          ) : (
            <ChevronDown className="h-5 w-5 text-gray-500" />
          )}
        </button>
        
        {expandedSections.has('recommendations') && (
          <div className="mt-4 space-y-2">
            {result.analysis.recommendations.map((recommendation, index) => (
              <div key={index} className="flex items-start space-x-2">
                <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0" />
                <p className="text-sm text-gray-700">{recommendation}</p>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Detailed Feedback */}
      <Card className="p-4">
        <button
          onClick={() => toggleSection('feedback')}
          className="w-full flex items-center justify-between text-left"
        >
          <h3 className="text-lg font-semibold text-gray-900">상세 피드백</h3>
          {expandedSections.has('feedback') ? (
            <ChevronUp className="h-5 w-5 text-gray-500" />
          ) : (
            <ChevronDown className="h-5 w-5 text-gray-500" />
          )}
        </button>
        
        {expandedSections.has('feedback') && (
          <div className="mt-4">
            <p className="text-sm text-gray-700 leading-relaxed">
              {result.analysis.detailedFeedback}
            </p>
          </div>
        )}
      </Card>
    </div>
  )
}