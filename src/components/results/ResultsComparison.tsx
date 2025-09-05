'use client'

import { useState } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { TestResult, CategoryScore } from '@/types/result'
import { MobileChart } from '../charts/MobileChart'
import { 
  GitCompare, 
  TrendingUp, 
  TrendingDown, 
  Minus,
  Calendar,
  Trophy,
  Target,
  Clock,
  X
} from 'lucide-react'

interface ResultsComparisonProps {
  results: TestResult[]
  selectedResults: TestResult[]
  onResultToggle: (result: TestResult) => void
  onClose?: () => void
}

export function ResultsComparison({
  results,
  selectedResults,
  onResultToggle,
  onClose
}: ResultsComparisonProps) {
  const [comparisonView, setComparisonView] = useState<'overview' | 'detailed'>('overview')

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('ko-KR', {
      month: 'short',
      day: 'numeric'
    })
  }

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60)
    return `${minutes}분`
  }

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600'
    if (score >= 60) return 'text-yellow-600'
    return 'text-red-600'
  }

  const getScoreDifference = (current: number, previous: number) => {
    const diff = current - previous
    return {
      value: Math.abs(diff),
      isPositive: diff > 0,
      isNeutral: diff === 0
    }
  }

  const getComparisonData = (): CategoryScore[] => {
    if (selectedResults.length < 2) return []

    const [result1, result2] = selectedResults
    const categories = new Map<string, CategoryScore>()

    // Combine categories from both results
    const allCategories = result1.analysis.categoryScores.concat(result2.analysis.categoryScores);
    allCategories.forEach(category => {
      if (!categories.has(category.category)) {
        categories.set(category.category, {
          category: category.category,
          score: 0,
          maxScore: category.maxScore,
          percentile: 0,
          description: category.description
        })
      }
    })

    // Calculate average scores for comparison
    return Array.from(categories.values()).map(category => {
      const cat1 = result1.analysis.categoryScores.find(c => c.category === category.category)
      const cat2 = result2.analysis.categoryScores.find(c => c.category === category.category)
      
      const score1 = cat1?.score || 0
      const score2 = cat2?.score || 0
      
      return {
        ...category,
        score: (score1 + score2) / 2,
        percentile: ((cat1?.percentile || 0) + (cat2?.percentile || 0)) / 2
      }
    })
  }

  const comparisonData = getComparisonData()

  return (
    <div className="fixed inset-0 bg-white z-50 overflow-y-auto">
      {/* Header */}
      <div className="sticky top-0 bg-white border-b border-gray-200 px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <GitCompare className="h-5 w-5 text-blue-600" />
            <h1 className="text-lg font-semibold text-gray-900">결과 비교</h1>
          </div>
          {onClose && (
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>

        {/* View Toggle */}
        <div className="flex space-x-2 mt-3">
          <Button
            size="sm"
            variant={comparisonView === 'overview' ? 'default' : 'outline'}
            onClick={() => setComparisonView('overview')}
          >
            개요
          </Button>
          <Button
            size="sm"
            variant={comparisonView === 'detailed' ? 'default' : 'outline'}
            onClick={() => setComparisonView('detailed')}
          >
            상세
          </Button>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* Result Selection */}
        <Card className="p-4">
          <h2 className="font-semibold text-gray-900 mb-3">비교할 결과 선택 (최대 2개)</h2>
          <div className="space-y-2 max-h-40 overflow-y-auto">
            {results.map((result) => (
              <div
                key={result.id}
                className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                  selectedResults.some(r => r.id === result.id)
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
                onClick={() => onResultToggle(result)}
              >
                <div className="flex justify-between items-center">
                  <div>
                    <div className="font-medium text-sm">{result.test.title}</div>
                    <div className="text-xs text-gray-600">
                      {formatDate(result.completedAt)} • {result.score}점
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className={`text-sm font-bold ${getScoreColor(result.score)}`}>
                      {result.score}
                    </span>
                    {selectedResults.some(r => r.id === result.id) && (
                      <div className="w-2 h-2 bg-blue-500 rounded-full" />
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Comparison Content */}
        {selectedResults.length === 2 && (
          <>
            {comparisonView === 'overview' ? (
              <>
                {/* Overview Comparison */}
                <Card className="p-4">
                  <h2 className="font-semibold text-gray-900 mb-4">전체 비교</h2>
                  
                  <div className="grid grid-cols-2 gap-4">
                    {selectedResults.map((result, index) => (
                      <div key={result.id} className="space-y-3">
                        <div className="text-center">
                          <h3 className="font-medium text-gray-900 mb-1">
                            결과 {index + 1}
                          </h3>
                          <div className="text-xs text-gray-600">
                            {formatDate(result.completedAt)}
                          </div>
                        </div>

                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-gray-600">점수</span>
                            <span className={`font-bold ${getScoreColor(result.score)}`}>
                              {result.score}
                            </span>
                          </div>
                          
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-gray-600">상위</span>
                            <span className="font-bold text-blue-600">
                              {result.percentile}%
                            </span>
                          </div>
                          
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-gray-600">소요시간</span>
                            <span className="font-bold text-gray-600">
                              {formatTime(result.timeSpent)}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Score Difference */}
                  <div className="mt-4 pt-4 border-t">
                    <h4 className="font-medium text-gray-900 mb-2">점수 변화</h4>
                    <div className="flex items-center justify-center space-x-2">
                      {(() => {
                        const diff = getScoreDifference(
                          selectedResults[1].score,
                          selectedResults[0].score
                        )
                        return (
                          <>
                            {diff.isPositive ? (
                              <TrendingUp className="h-5 w-5 text-green-600" />
                            ) : diff.isNeutral ? (
                              <Minus className="h-5 w-5 text-gray-600" />
                            ) : (
                              <TrendingDown className="h-5 w-5 text-red-600" />
                            )}
                            <span className={`font-bold ${
                              diff.isPositive ? 'text-green-600' : 
                              diff.isNeutral ? 'text-gray-600' : 'text-red-600'
                            }`}>
                              {diff.isNeutral ? '변화 없음' : `${diff.value}점`}
                            </span>
                          </>
                        )
                      })()}
                    </div>
                  </div>
                </Card>

                {/* Category Comparison Chart */}
                {comparisonData.length > 0 && (
                  <Card className="p-4">
                    <h2 className="font-semibold text-gray-900 mb-4">영역별 평균 비교</h2>
                    <MobileChart
                      data={comparisonData}
                      type="radar"
                      height={250}
                    />
                  </Card>
                )}
              </>
            ) : (
              <>
                {/* Detailed Comparison */}
                <Card className="p-4">
                  <h2 className="font-semibold text-gray-900 mb-4">상세 비교</h2>
                  
                  {/* Test Information */}
                  <div className="grid grid-cols-2 gap-4 mb-6">
                    {selectedResults.map((result, index) => (
                      <div key={result.id} className="space-y-2">
                        <h3 className="font-medium text-gray-900">
                          {result.test.title}
                        </h3>
                        <div className="space-y-1 text-sm">
                          <div className="flex items-center space-x-2">
                            <Calendar className="h-3 w-3 text-gray-500" />
                            <span className="text-gray-600">
                              {formatDate(result.completedAt)}
                            </span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Trophy className="h-3 w-3 text-gray-500" />
                            <span className="text-gray-600">
                              {result.test.category}
                            </span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Clock className="h-3 w-3 text-gray-500" />
                            <span className="text-gray-600">
                              {formatTime(result.timeSpent)}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Category-by-Category Comparison */}
                  <div className="space-y-4">
                    <h4 className="font-medium text-gray-900">영역별 상세 비교</h4>
                    
                    {selectedResults[0].analysis.categoryScores.map((category1, index) => {
                      const category2 = selectedResults[1].analysis.categoryScores.find(
                        c => c.category === category1.category
                      )
                      
                      if (!category2) return null

                      const scoreDiff = getScoreDifference(category2.score, category1.score)
                      const percentileDiff = getScoreDifference(category2.percentile, category1.percentile)

                      return (
                        <div key={index} className="p-3 bg-gray-50 rounded-lg">
                          <h5 className="font-medium text-gray-900 mb-2">
                            {category1.category}
                          </h5>
                          
                          <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                              <div className="text-gray-600">결과 1</div>
                              <div className="font-medium">
                                {category1.score}/{category1.maxScore} (상위 {category1.percentile}%)
                              </div>
                            </div>
                            <div>
                              <div className="text-gray-600">결과 2</div>
                              <div className="font-medium">
                                {category2.score}/{category2.maxScore} (상위 {category2.percentile}%)
                              </div>
                            </div>
                          </div>

                          <div className="mt-2 flex items-center justify-between text-xs">
                            <div className="flex items-center space-x-1">
                              <span className="text-gray-600">점수 변화:</span>
                              <span className={`font-medium ${
                                scoreDiff.isPositive ? 'text-green-600' : 
                                scoreDiff.isNeutral ? 'text-gray-600' : 'text-red-600'
                              }`}>
                                {scoreDiff.isNeutral ? '변화 없음' : 
                                 `${scoreDiff.isPositive ? '+' : '-'}${scoreDiff.value}`}
                              </span>
                            </div>
                            <div className="flex items-center space-x-1">
                              <span className="text-gray-600">순위 변화:</span>
                              <span className={`font-medium ${
                                percentileDiff.isPositive ? 'text-green-600' : 
                                percentileDiff.isNeutral ? 'text-gray-600' : 'text-red-600'
                              }`}>
                                {percentileDiff.isNeutral ? '변화 없음' : 
                                 `${percentileDiff.isPositive ? '+' : '-'}${percentileDiff.value}%`}
                              </span>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </Card>
              </>
            )}
          </>
        )}

        {/* Instructions */}
        {selectedResults.length < 2 && (
          <Card className="p-6 text-center">
            <Target className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              결과를 선택해주세요
            </h3>
            <p className="text-gray-600">
              비교하려는 테스트 결과 2개를 선택해주세요
            </p>
          </Card>
        )}
      </div>
    </div>
  )
}