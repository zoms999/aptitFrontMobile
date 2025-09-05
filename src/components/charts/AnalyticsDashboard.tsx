'use client'

import { useState } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { MobileChart } from './MobileChart'
import { TestResult, CategoryScore } from '@/types/result'
import { 
  BarChart3, 
  LineChart, 
  PieChart, 
  Radar,
  Calendar,
  Filter,
  TrendingUp,
  Target
} from 'lucide-react'

interface AnalyticsDashboardProps {
  results: TestResult[]
  currentResult?: TestResult
}

type ChartType = 'bar' | 'line' | 'radar' | 'doughnut'
type TimeRange = '1week' | '1month' | '3months' | '1year' | 'all'

export function AnalyticsDashboard({ results, currentResult }: AnalyticsDashboardProps) {
  const [chartType, setChartType] = useState<ChartType>('bar')
  const [timeRange, setTimeRange] = useState<TimeRange>('3months')
  const [selectedCategory, setSelectedCategory] = useState<string>('all')

  const chartTypes = [
    { type: 'bar' as ChartType, icon: BarChart3, label: '막대' },
    { type: 'line' as ChartType, icon: LineChart, label: '선형' },
    { type: 'radar' as ChartType, icon: Radar, label: '레이더' },
    { type: 'doughnut' as ChartType, icon: PieChart, label: '도넛' }
  ]

  const timeRanges = [
    { value: '1week' as TimeRange, label: '1주' },
    { value: '1month' as TimeRange, label: '1개월' },
    { value: '3months' as TimeRange, label: '3개월' },
    { value: '1year' as TimeRange, label: '1년' },
    { value: 'all' as TimeRange, label: '전체' }
  ]

  const filterResultsByTimeRange = (results: TestResult[], range: TimeRange) => {
    const now = new Date()
    const cutoffDate = new Date()

    switch (range) {
      case '1week':
        cutoffDate.setDate(now.getDate() - 7)
        break
      case '1month':
        cutoffDate.setMonth(now.getMonth() - 1)
        break
      case '3months':
        cutoffDate.setMonth(now.getMonth() - 3)
        break
      case '1year':
        cutoffDate.setFullYear(now.getFullYear() - 1)
        break
      case 'all':
        return results
    }

    return results.filter(result => new Date(result.completedAt) >= cutoffDate)
  }

  const getFilteredResults = () => {
    let filtered = filterResultsByTimeRange(results, timeRange)
    
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(result => result.test.category === selectedCategory)
    }

    return filtered
  }

  const getAggregatedCategoryScores = (): CategoryScore[] => {
    const filtered = getFilteredResults()
    
    if (filtered.length === 0 && currentResult) {
      return currentResult.analysis.categoryScores
    }

    const categoryMap = new Map<string, {
      totalScore: number
      totalMaxScore: number
      count: number
      percentiles: number[]
    }>()

    filtered.forEach(result => {
      result.analysis.categoryScores.forEach(category => {
        const existing = categoryMap.get(category.category) || {
          totalScore: 0,
          totalMaxScore: 0,
          count: 0,
          percentiles: []
        }

        existing.totalScore += category.score
        existing.totalMaxScore += category.maxScore
        existing.count += 1
        existing.percentiles.push(category.percentile)

        categoryMap.set(category.category, existing)
      })
    })

    return Array.from(categoryMap.entries()).map(([category, data]) => ({
      category,
      score: Math.round(data.totalScore / data.count),
      maxScore: Math.round(data.totalMaxScore / data.count),
      percentile: Math.round(data.percentiles.reduce((a, b) => a + b, 0) / data.percentiles.length),
      description: `${data.count}회 평균 성과`
    }))
  }

  const getScoreTrend = () => {
    const filtered = getFilteredResults()
    return filtered.map(result => ({
      date: new Date(result.completedAt).toLocaleDateString('ko-KR', { 
        month: 'short', 
        day: 'numeric' 
      }),
      score: result.score,
      percentile: result.percentile
    }))
  }

  const getCategories = () => {
    const categories = new Set(results.map(result => result.test.category))
    return Array.from(categories)
  }

  const getPerformanceStats = () => {
    const filtered = getFilteredResults()
    
    if (filtered.length === 0) {
      return {
        averageScore: currentResult?.score || 0,
        bestScore: currentResult?.score || 0,
        totalTests: currentResult ? 1 : 0,
        improvement: 0
      }
    }

    const scores = filtered.map(r => r.score)
    const averageScore = scores.reduce((a, b) => a + b, 0) / scores.length
    const bestScore = Math.max(...scores)
    
    let improvement = 0
    if (filtered.length >= 2) {
      const recent = filtered.slice(-3).map(r => r.score)
      const older = filtered.slice(0, -3).map(r => r.score)
      
      if (older.length > 0) {
        const recentAvg = recent.reduce((a, b) => a + b, 0) / recent.length
        const olderAvg = older.reduce((a, b) => a + b, 0) / older.length
        improvement = ((recentAvg - olderAvg) / olderAvg) * 100
      }
    }

    return {
      averageScore: Math.round(averageScore),
      bestScore,
      totalTests: filtered.length,
      improvement: Math.round(improvement)
    }
  }

  const categoryScores = getAggregatedCategoryScores()
  const performanceStats = getPerformanceStats()

  return (
    <div className="space-y-6 p-4">
      {/* Performance Stats */}
      <Card className="p-4">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">성과 요약</h2>
        <div className="grid grid-cols-2 gap-4">
          <div className="text-center p-3 bg-blue-50 rounded-lg">
            <div className="text-2xl font-bold text-blue-600">
              {performanceStats.averageScore}
            </div>
            <div className="text-sm text-blue-700">평균 점수</div>
          </div>
          <div className="text-center p-3 bg-green-50 rounded-lg">
            <div className="text-2xl font-bold text-green-600">
              {performanceStats.bestScore}
            </div>
            <div className="text-sm text-green-700">최고 점수</div>
          </div>
          <div className="text-center p-3 bg-purple-50 rounded-lg">
            <div className="text-2xl font-bold text-purple-600">
              {performanceStats.totalTests}
            </div>
            <div className="text-sm text-purple-700">총 테스트</div>
          </div>
          <div className="text-center p-3 bg-orange-50 rounded-lg">
            <div className="flex items-center justify-center space-x-1">
              <TrendingUp className="h-4 w-4 text-orange-600" />
              <div className="text-lg font-bold text-orange-600">
                {performanceStats.improvement > 0 ? '+' : ''}{performanceStats.improvement}%
              </div>
            </div>
            <div className="text-sm text-orange-700">개선도</div>
          </div>
        </div>
      </Card>

      {/* Filters */}
      <Card className="p-4">
        <div className="flex items-center space-x-2 mb-4">
          <Filter className="h-4 w-4 text-gray-600" />
          <h3 className="font-semibold text-gray-900">필터</h3>
        </div>
        
        <div className="space-y-4">
          {/* Time Range Filter */}
          <div>
            <label className="text-sm font-medium text-gray-700 mb-2 block">기간</label>
            <div className="flex flex-wrap gap-2">
              {timeRanges.map(range => (
                <Button
                  key={range.value}
                  variant={timeRange === range.value ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setTimeRange(range.value)}
                >
                  {range.label}
                </Button>
              ))}
            </div>
          </div>

          {/* Category Filter */}
          <div>
            <label className="text-sm font-medium text-gray-700 mb-2 block">카테고리</label>
            <div className="flex flex-wrap gap-2">
              <Button
                variant={selectedCategory === 'all' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedCategory('all')}
              >
                전체
              </Button>
              {getCategories().map(category => (
                <Button
                  key={category}
                  variant={selectedCategory === category ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedCategory(category)}
                >
                  {category}
                </Button>
              ))}
            </div>
          </div>
        </div>
      </Card>

      {/* Chart Type Selector */}
      <Card className="p-4">
        <div className="flex items-center space-x-2 mb-4">
          <BarChart3 className="h-4 w-4 text-gray-600" />
          <h3 className="font-semibold text-gray-900">차트 유형</h3>
        </div>
        
        <div className="flex flex-wrap gap-2">
          {chartTypes.map(({ type, icon: Icon, label }) => (
            <Button
              key={type}
              variant={chartType === type ? 'default' : 'outline'}
              size="sm"
              onClick={() => setChartType(type)}
              className="flex items-center space-x-2"
            >
              <Icon className="h-4 w-4" />
              <span>{label}</span>
            </Button>
          ))}
        </div>
      </Card>

      {/* Main Chart */}
      {categoryScores.length > 0 && (
        <Card className="p-4">
          <MobileChart
            data={categoryScores}
            type={chartType}
            title="영역별 성과 분석"
            height={300}
          />
        </Card>
      )}

      {/* Additional Insights */}
      <Card className="p-4">
        <div className="flex items-center space-x-2 mb-4">
          <Target className="h-4 w-4 text-gray-600" />
          <h3 className="font-semibold text-gray-900">인사이트</h3>
        </div>
        
        <div className="space-y-3">
          {categoryScores.length > 0 && (
            <>
              <div className="p-3 bg-green-50 rounded-lg">
                <div className="text-sm font-medium text-green-800">
                  최고 성과 영역
                </div>
                <div className="text-sm text-green-700">
                  {categoryScores.reduce((best, current) => 
                    current.percentile > best.percentile ? current : best
                  ).category}
                </div>
              </div>
              
              <div className="p-3 bg-orange-50 rounded-lg">
                <div className="text-sm font-medium text-orange-800">
                  개선 필요 영역
                </div>
                <div className="text-sm text-orange-700">
                  {categoryScores.reduce((worst, current) => 
                    current.percentile < worst.percentile ? current : worst
                  ).category}
                </div>
              </div>
            </>
          )}
          
          <div className="p-3 bg-blue-50 rounded-lg">
            <div className="text-sm font-medium text-blue-800">
              분석 기간
            </div>
            <div className="text-sm text-blue-700">
              {timeRanges.find(r => r.value === timeRange)?.label} 데이터 기준
            </div>
          </div>
        </div>
      </Card>
    </div>
  )
}