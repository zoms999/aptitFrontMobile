'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { TestResult } from '@/types/result'
import { 
  Search, 
  Filter, 
  Calendar, 
  Trophy, 
  TrendingUp, 
  TrendingDown,
  ChevronDown,
  ChevronUp,
  MoreVertical,
  Eye,
  Share2,
  Download
} from 'lucide-react'

interface ResultsHistoryProps {
  results: TestResult[]
  onResultSelect?: (result: TestResult) => void
  onResultShare?: (result: TestResult) => void
  onLoadMore?: () => void
  hasMore?: boolean
  isLoading?: boolean
}

type SortOption = 'date-desc' | 'date-asc' | 'score-desc' | 'score-asc'
type FilterOption = 'all' | 'excellent' | 'good' | 'average' | 'needs-improvement'

export function ResultsHistory({
  results,
  onResultSelect,
  onResultShare,
  onLoadMore,
  hasMore = false,
  isLoading = false
}: ResultsHistoryProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [sortBy, setSortBy] = useState<SortOption>('date-desc')
  const [filterBy, setFilterBy] = useState<FilterOption>('all')
  const [expandedResult, setExpandedResult] = useState<string | null>(null)
  const [displayedResults, setDisplayedResults] = useState<TestResult[]>([])

  const filterAndSortResults = useCallback(() => {
    let filtered = results

    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(result =>
        result.test.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        result.test.category.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    // Apply rating filter
    if (filterBy !== 'all') {
      filtered = filtered.filter(result => result.analysis.overallRating === filterBy)
    }

    // Apply sorting
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'date-desc':
          return new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime()
        case 'date-asc':
          return new Date(a.completedAt).getTime() - new Date(b.completedAt).getTime()
        case 'score-desc':
          return b.score - a.score
        case 'score-asc':
          return a.score - b.score
        default:
          return 0
      }
    })

    setDisplayedResults(filtered)
  }, [results, searchTerm, sortBy, filterBy])

  useEffect(() => {
    filterAndSortResults()
  }, [filterAndSortResults])

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600'
    if (score >= 60) return 'text-yellow-600'
    return 'text-red-600'
  }

  const getScoreBadgeColor = (rating: string) => {
    switch (rating) {
      case 'excellent': return 'bg-green-100 text-green-800'
      case 'good': return 'bg-blue-100 text-blue-800'
      case 'average': return 'bg-yellow-100 text-yellow-800'
      case 'needs-improvement': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getRatingLabel = (rating: string) => {
    switch (rating) {
      case 'excellent': return '우수'
      case 'good': return '양호'
      case 'average': return '보통'
      case 'needs-improvement': return '개선 필요'
      default: return rating
    }
  }

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    return `${minutes}분 ${remainingSeconds}초`
  }

  const toggleExpanded = (resultId: string) => {
    setExpandedResult(expandedResult === resultId ? null : resultId)
  }

  return (
    <div className="space-y-4 p-4">
      {/* Search and Filters */}
      <Card className="p-4">
        <div className="space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="테스트 제목이나 카테고리로 검색..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Sort and Filter Controls */}
          <div className="flex flex-wrap gap-2">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortOption)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
            >
              <option value="date-desc">최신순</option>
              <option value="date-asc">오래된순</option>
              <option value="score-desc">높은 점수순</option>
              <option value="score-asc">낮은 점수순</option>
            </select>

            <select
              value={filterBy}
              onChange={(e) => setFilterBy(e.target.value as FilterOption)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">모든 등급</option>
              <option value="excellent">우수</option>
              <option value="good">양호</option>
              <option value="average">보통</option>
              <option value="needs-improvement">개선 필요</option>
            </select>
          </div>

          {/* Results Count */}
          <div className="text-sm text-gray-600">
            총 {displayedResults.length}개의 결과
          </div>
        </div>
      </Card>

      {/* Results List */}
      <div className="space-y-3">
        {displayedResults.map((result) => (
          <Card key={result.id} className="overflow-hidden">
            <div className="p-4">
              {/* Header */}
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900 mb-1">
                    {result.test.title}
                  </h3>
                  <div className="flex items-center space-x-2 text-sm text-gray-600">
                    <Calendar className="h-3 w-3" />
                    <span>{formatDate(result.completedAt)}</span>
                    <span>•</span>
                    <span>{result.test.category}</span>
                  </div>
                </div>
                
                <div className="flex items-center space-x-2">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getScoreBadgeColor(result.analysis.overallRating)}`}>
                    {getRatingLabel(result.analysis.overallRating)}
                  </span>
                  <button
                    onClick={() => toggleExpanded(result.id)}
                    className="p-1 hover:bg-gray-100 rounded"
                  >
                    {expandedResult === result.id ? (
                      <ChevronUp className="h-4 w-4 text-gray-500" />
                    ) : (
                      <ChevronDown className="h-4 w-4 text-gray-500" />
                    )}
                  </button>
                </div>
              </div>

              {/* Score Summary */}
              <div className="grid grid-cols-3 gap-4 mb-3">
                <div className="text-center">
                  <div className={`text-xl font-bold ${getScoreColor(result.score)}`}>
                    {result.score}
                  </div>
                  <div className="text-xs text-gray-600">점수</div>
                </div>
                <div className="text-center">
                  <div className="text-xl font-bold text-blue-600">
                    {result.percentile}%
                  </div>
                  <div className="text-xs text-gray-600">상위</div>
                </div>
                <div className="text-center">
                  <div className="text-xl font-bold text-gray-600">
                    {formatTime(result.timeSpent)}
                  </div>
                  <div className="text-xs text-gray-600">소요시간</div>
                </div>
              </div>

              {/* Expanded Content */}
              {expandedResult === result.id && (
                <div className="border-t pt-3 space-y-3">
                  {/* Category Scores */}
                  <div>
                    <h4 className="text-sm font-medium text-gray-900 mb-2">영역별 점수</h4>
                    <div className="space-y-2">
                      {result.analysis.categoryScores.slice(0, 3).map((category, index) => (
                        <div key={index} className="flex justify-between items-center text-sm">
                          <span className="text-gray-700">{category.category}</span>
                          <span className="font-medium">
                            {category.score}/{category.maxScore}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Top Strengths */}
                  <div>
                    <h4 className="text-sm font-medium text-gray-900 mb-2">주요 강점</h4>
                    <div className="space-y-1">
                      {result.analysis.strengths.slice(0, 2).map((strength, index) => (
                        <div key={index} className="flex items-start space-x-2">
                          <div className="w-1.5 h-1.5 bg-green-500 rounded-full mt-2 flex-shrink-0" />
                          <p className="text-sm text-gray-700">{strength}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex space-x-2 pt-2">
                    <Button
                      size="sm"
                      onClick={() => onResultSelect?.(result)}
                      className="flex items-center space-x-1"
                    >
                      <Eye className="h-3 w-3" />
                      <span>상세보기</span>
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => onResultShare?.(result)}
                      className="flex items-center space-x-1"
                    >
                      <Share2 className="h-3 w-3" />
                      <span>공유</span>
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </Card>
        ))}
      </div>

      {/* Load More */}
      {hasMore && (
        <div className="text-center py-4">
          <Button
            onClick={onLoadMore}
            disabled={isLoading}
            variant="outline"
            className="w-full"
          >
            {isLoading ? '로딩 중...' : '더 보기'}
          </Button>
        </div>
      )}

      {/* Empty State */}
      {displayedResults.length === 0 && !isLoading && (
        <Card className="p-8 text-center">
          <Trophy className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            결과가 없습니다
          </h3>
          <p className="text-gray-600">
            {searchTerm || filterBy !== 'all' 
              ? '검색 조건을 변경해보세요' 
              : '첫 번째 테스트를 완료해보세요'}
          </p>
        </Card>
      )}
    </div>
  )
}