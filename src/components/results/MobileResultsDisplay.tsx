'use client'

import { useState } from 'react'
import { TestResult } from '@/types/result'
import { ResultsSummary } from './ResultsSummary'
import { DetailedAnalysis } from './DetailedAnalysis'
import { ShareResults } from './ShareResults'
import { Button } from '@/components/ui/button'
import { BarChart3, FileText, ArrowLeft } from 'lucide-react'

interface MobileResultsDisplayProps {
  result: TestResult
  onBack?: () => void
}

type ViewMode = 'summary' | 'detailed'

export function MobileResultsDisplay({ result, onBack }: MobileResultsDisplayProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('summary')
  const [showShareModal, setShowShareModal] = useState(false)

  const handleShare = () => {
    setShowShareModal(true)
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white border-b border-gray-200 px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            {onBack && (
              <Button variant="ghost" size="sm" onClick={onBack}>
                <ArrowLeft className="h-4 w-4" />
              </Button>
            )}
            <h1 className="text-lg font-semibold text-gray-900">테스트 결과</h1>
          </div>
          
          <div className="flex items-center space-x-2">
            <Button
              variant={viewMode === 'summary' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('summary')}
              className="flex items-center space-x-1"
            >
              <FileText className="h-4 w-4" />
              <span className="hidden sm:inline">요약</span>
            </Button>
            <Button
              variant={viewMode === 'detailed' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('detailed')}
              className="flex items-center space-x-1"
            >
              <BarChart3 className="h-4 w-4" />
              <span className="hidden sm:inline">상세</span>
            </Button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="pb-20">
        {viewMode === 'summary' ? (
          <ResultsSummary result={result} onShare={handleShare} />
        ) : (
          <DetailedAnalysis result={result} />
        )}
      </div>

      {/* Share Modal */}
      {showShareModal && (
        <ShareResults
          result={result}
          onClose={() => setShowShareModal(false)}
        />
      )}
    </div>
  )
}