'use client'

import { useState, useEffect } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { TestResult } from '@/types/result'
import { ResultsHistory } from './ResultsHistory'
import { ResultsComparison } from './ResultsComparison'
import { MobileResultsDisplay } from './MobileResultsDisplay'
import { ShareResults } from './ShareResults'
import { useInfiniteScroll } from '@/hooks/useInfiniteScroll'
import { 
  History, 
  GitCompare, 
  ArrowLeft, 
  Filter,
  Calendar,
  TrendingUp,
  BarChart3
} from 'lucide-react'

interface HistoricalDataNavigationProps {
  userId: string
  onBack?: () => void
}

type ViewMode = 'history' | 'comparison' | 'detail'

export function HistoricalDataNavigation({ userId, onBack }: HistoricalDataNavigationProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('history')
  const [results, setResults] = useState<TestResult[]>([])
  const [selectedResult, setSelectedResult] = useState<TestResult | null>(null)
  const [selectedForComparison, setSelectedForComparison] = useState<TestResult[]>([])
  const [shareResult, setShareResult] = useState<TestResult | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const [page, setPage] = useState(1)
  const [error, setError] = useState<string | null>(null)

  const fetchResults = async (pageNum: number = 1, reset: boolean = false) => {
    try {
      setIsLoading(true)
      setError(null)

      const response = await fetch(`/api/results?userId=${userId}&page=${pageNum}&limit=10`)
      
      if (!response.ok) {
        throw new Error('Failed to fetch results')
      }

      const data = await response.json()
      
      if (reset) {
        setResults(data.results)
      } else {
        setResults(prev => [...prev, ...data.results])
      }
      
      setHasMore(data.hasMore)
      setPage(pageNum)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  const fetchMoreResults = async () => {
    if (!hasMore || isLoading) return
    await fetchResults(page + 1, false)
  }

  const { isFetching, lastElementRef } = useInfiniteScroll(
    fetchMoreResults,
    hasMore,
    { enabled: viewMode === 'history' }
  )

  useEffect(() => {
    fetchResults(1, true)
  }, [userId])

  const handleResultSelect = (result: TestResult) => {
    setSelectedResult(result)
    setViewMode('detail')
  }

  const handleResultShare = (result: TestResult) => {
    setShareResult(result)
  }

  const handleComparisonToggle = (result: TestResult) => {
    setSelectedForComparison(prev => {
      const isSelected = prev.some(r => r.id === result.id)
      
      if (isSelected) {
        return prev.filter(r => r.id !== result.id)
      } else if (prev.length < 2) {
        return [...prev, result]
      } else {
        // Replace the first selected result with the new one
        return [prev[1], result]
      }
    })
  }

  const getViewTitle = () => {
    switch (viewMode) {
      case 'history':
        return '테스트 기록'
      case 'comparison':
        return '결과 비교'
      case 'detail':
        return selectedResult?.test.title || '결과 상세'
      default:
        return '테스트 기록'
    }
  }

  const getResultsStats = () => {
    if (results.length === 0) return null

    const totalTests = results.length
    const averageScore = results.reduce((sum, r) => sum + r.score, 0) / totalTests
    const bestScore = Math.max(...results.map(r => r.score))
    const recentResults = results.slice(0, 5)
    const olderResults = results.slice(5, 10)
    
    let trend = 'stable'
    if (recentResults.length > 0 && olderResults.length > 0) {
      const recentAvg = recentResults.reduce((sum, r) => sum + r.score, 0) / recentResults.length
      const olderAvg = olderResults.reduce((sum, r) => sum + r.score, 0) / olderResults.length
      
      if (recentAvg > olderAvg + 5) trend = 'improving'
      else if (recentAvg < olderAvg - 5) trend = 'declining'
    }

    return {
      totalTests,
      averageScore: Math.round(averageScore),
      bestScore,
      trend
    }
  }

  const stats = getResultsStats()

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="p-6 text-center max-w-md">
          <div className="text-red-500 mb-4">
            <BarChart3 className="h-12 w-12 mx-auto" />
          </div>
          <h2 className="text-lg font-semibold text-gray-900 mb-2">
            데이터를 불러올 수 없습니다
          </h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <Button onClick={() => fetchResults(1, true)}>
            다시 시도
          </Button>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white border-b border-gray-200 px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            {(viewMode !== 'history' || onBack) && (
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => {
                  if (viewMode === 'history') {
                    onBack?.()
                  } else {
                    setViewMode('history')
                    setSelectedResult(null)
                  }
                }}
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
            )}
            <h1 className="text-lg font-semibold text-gray-900">{getViewTitle()}</h1>
          </div>
          
          {viewMode === 'history' && (
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setViewMode('comparison')}
                disabled={results.length < 2}
                className="flex items-center space-x-1"
              >
                <GitCompare className="h-4 w-4" />
                <span className="hidden sm:inline">비교</span>
              </Button>
            </div>
          )}
        </div>

        {/* Stats Summary */}
        {viewMode === 'history' && stats && (
          <div className="mt-3 grid grid-cols-4 gap-2 text-center">
            <div className="p-2 bg-blue-50 rounded">
              <div className="text-sm font-bold text-blue-600">{stats.totalTests}</div>
              <div className="text-xs text-blue-700">총 테스트</div>
            </div>
            <div className="p-2 bg-green-50 rounded">
              <div className="text-sm font-bold text-green-600">{stats.averageScore}</div>
              <div className="text-xs text-green-700">평균 점수</div>
            </div>
            <div className="p-2 bg-purple-50 rounded">
              <div className="text-sm font-bold text-purple-600">{stats.bestScore}</div>
              <div className="text-xs text-purple-700">최고 점수</div>
            </div>
            <div className="p-2 bg-orange-50 rounded">
              <div className="flex items-center justify-center space-x-1">
                <TrendingUp className={`h-3 w-3 ${
                  stats.trend === 'improving' ? 'text-green-600' : 
                  stats.trend === 'declining' ? 'text-red-600' : 'text-gray-600'
                }`} />
                <div className={`text-xs font-bold ${
                  stats.trend === 'improving' ? 'text-green-600' : 
                  stats.trend === 'declining' ? 'text-red-600' : 'text-gray-600'
                }`}>
                  {stats.trend === 'improving' ? '상승' : 
                   stats.trend === 'declining' ? '하락' : '안정'}
                </div>
              </div>
              <div className="text-xs text-orange-700">추세</div>
            </div>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="pb-20">
        {viewMode === 'history' && (
          <ResultsHistory
            results={results}
            onResultSelect={handleResultSelect}
            onResultShare={handleResultShare}
            onLoadMore={fetchMoreResults}
            hasMore={hasMore}
            isLoading={isFetching || isLoading}
          />
        )}

        {viewMode === 'comparison' && (
          <ResultsComparison
            results={results}
            selectedResults={selectedForComparison}
            onResultToggle={handleComparisonToggle}
            onClose={() => setViewMode('history')}
          />
        )}

        {viewMode === 'detail' && selectedResult && (
          <MobileResultsDisplay
            result={selectedResult}
            onBack={() => setViewMode('history')}
          />
        )}
      </div>

      {/* Infinite Scroll Trigger */}
      {viewMode === 'history' && hasMore && (
        <div ref={lastElementRef} className="h-4" />
      )}

      {/* Share Modal */}
      {shareResult && (
        <ShareResults
          result={shareResult}
          onClose={() => setShareResult(null)}
        />
      )}
    </div>
  )
}