'use client'

import { Card } from '@/components/ui/card'
import { TestResult, CategoryScore } from '@/types/result'
import { Progress } from '@/components/ui/progress'
import { BarChart3, PieChart, TrendingUp } from 'lucide-react'

interface DetailedAnalysisProps {
  result: TestResult
}

export function DetailedAnalysis({ result }: DetailedAnalysisProps) {
  const getScoreColor = (score: number, maxScore: number) => {
    const percentage = (score / maxScore) * 100
    if (percentage >= 80) return 'bg-green-500'
    if (percentage >= 60) return 'bg-yellow-500'
    return 'bg-red-500'
  }

  const getPercentileColor = (percentile: number) => {
    if (percentile >= 80) return 'text-green-600'
    if (percentile >= 60) return 'text-yellow-600'
    return 'text-red-600'
  }

  return (
    <div className="space-y-6 p-4">
      {/* Category Scores */}
      <Card className="p-6">
        <div className="flex items-center space-x-2 mb-4">
          <BarChart3 className="h-5 w-5 text-blue-600" />
          <h2 className="text-lg font-semibold text-gray-900">영역별 점수</h2>
        </div>
        
        <div className="space-y-4">
          {result.analysis.categoryScores.map((category, index) => (
            <div key={index} className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-gray-700">
                  {category.category}
                </span>
                <div className="flex items-center space-x-2">
                  <span className="text-sm font-bold text-gray-900">
                    {category.score}/{category.maxScore}
                  </span>
                  <span className={`text-xs font-medium ${getPercentileColor(category.percentile)}`}>
                    상위 {category.percentile}%
                  </span>
                </div>
              </div>
              
              <div className="relative">
                <Progress 
                  value={(category.score / category.maxScore) * 100} 
                  className="h-3"
                />
                <div 
                  className={`absolute top-0 left-0 h-3 rounded-full transition-all duration-300 ${getScoreColor(category.score, category.maxScore)}`}
                  style={{ width: `${(category.score / category.maxScore) * 100}%` }}
                />
              </div>
              
              <p className="text-xs text-gray-600">{category.description}</p>
            </div>
          ))}
        </div>
      </Card>

      {/* Performance Breakdown */}
      <Card className="p-6">
        <div className="flex items-center space-x-2 mb-4">
          <PieChart className="h-5 w-5 text-purple-600" />
          <h2 className="text-lg font-semibold text-gray-900">성과 분석</h2>
        </div>
        
        <div className="grid grid-cols-2 gap-4">
          <div className="text-center p-4 bg-green-50 rounded-lg">
            <div className="text-2xl font-bold text-green-600">
              {result.analysis.strengths.length}
            </div>
            <div className="text-sm text-green-700">강점 영역</div>
          </div>
          
          <div className="text-center p-4 bg-orange-50 rounded-lg">
            <div className="text-2xl font-bold text-orange-600">
              {result.analysis.weaknesses.length}
            </div>
            <div className="text-sm text-orange-700">개선 영역</div>
          </div>
        </div>
        
        <div className="mt-4 p-4 bg-blue-50 rounded-lg">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-blue-700">전체 성취도</span>
            <span className="text-lg font-bold text-blue-600">{result.score}점</span>
          </div>
          <div className="mt-2">
            <Progress value={result.score} className="h-2" />
          </div>
        </div>
      </Card>

      {/* Comparative Analysis */}
      <Card className="p-6">
        <div className="flex items-center space-x-2 mb-4">
          <TrendingUp className="h-5 w-5 text-indigo-600" />
          <h2 className="text-lg font-semibold text-gray-900">비교 분석</h2>
        </div>
        
        <div className="space-y-4">
          <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
            <span className="text-sm text-gray-700">전체 응시자 대비</span>
            <span className="text-sm font-bold text-gray-900">상위 {result.percentile}%</span>
          </div>
          
          <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
            <span className="text-sm text-gray-700">난이도</span>
            <span className="text-sm font-bold text-gray-900 capitalize">
              {result.test.difficulty}
            </span>
          </div>
          
          <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
            <span className="text-sm text-gray-700">카테고리</span>
            <span className="text-sm font-bold text-gray-900">
              {result.test.category}
            </span>
          </div>
        </div>
      </Card>

      {/* Recommendations Summary */}
      <Card className="p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">개선 방향</h2>
        
        <div className="space-y-3">
          {result.analysis.recommendations.slice(0, 3).map((recommendation, index) => (
            <div key={index} className="flex items-start space-x-3 p-3 bg-blue-50 rounded-lg">
              <div className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">
                {index + 1}
              </div>
              <p className="text-sm text-blue-800">{recommendation}</p>
            </div>
          ))}
        </div>
        
        {result.analysis.recommendations.length > 3 && (
          <div className="mt-3 text-center">
            <span className="text-xs text-gray-500">
              +{result.analysis.recommendations.length - 3}개 추가 추천사항
            </span>
          </div>
        )}
      </Card>
    </div>
  )
}