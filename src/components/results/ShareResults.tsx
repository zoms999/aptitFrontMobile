'use client'

import { useState } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { TestResult, ShareableResult } from '@/types/result'
import { 
  Share2, 
  Copy, 
  Download, 
  MessageCircle, 
  Mail, 
  Facebook, 
  Twitter,
  Check,
  X
} from 'lucide-react'

interface ShareResultsProps {
  result: TestResult
  onClose?: () => void
}

export function ShareResults({ result, onClose }: ShareResultsProps) {
  const [copied, setCopied] = useState(false)
  const [isGeneratingLink, setIsGeneratingLink] = useState(false)

  const shareableResult: ShareableResult = {
    testTitle: result.test.title,
    score: result.score,
    percentile: result.percentile,
    completedAt: result.completedAt,
    highlights: [
      ...result.analysis.strengths.slice(0, 2),
      `상위 ${result.percentile}% 성과 달성`
    ]
  }

  const generateShareText = () => {
    return `${shareableResult.testTitle} 테스트 완료! 
점수: ${shareableResult.score}점 (상위 ${shareableResult.percentile}%)
주요 강점: ${shareableResult.highlights.slice(0, 2).join(', ')}
#적성검사 #Aptit`
  }

  const generateShareUrl = async () => {
    setIsGeneratingLink(true)
    try {
      // In a real app, this would call an API to generate a shareable link
      const shareUrl = `${window.location.origin}/shared-result/${result.id}`
      return shareUrl
    } catch (error) {
      console.error('Failed to generate share URL:', error)
      return null
    } finally {
      setIsGeneratingLink(false)
    }
  }

  const copyToClipboard = async () => {
    try {
      const shareUrl = await generateShareUrl()
      const shareText = generateShareText()
      const fullText = shareUrl ? `${shareText}\n\n${shareUrl}` : shareText
      
      await navigator.clipboard.writeText(fullText)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (error) {
      console.error('Failed to copy to clipboard:', error)
    }
  }

  const shareViaWebShare = async () => {
    if (navigator.share) {
      try {
        const shareUrl = await generateShareUrl()
        await navigator.share({
          title: `${shareableResult.testTitle} 결과`,
          text: generateShareText(),
          url: shareUrl || undefined
        })
      } catch (error) {
        console.error('Web Share failed:', error)
      }
    }
  }

  const shareViaKakao = async () => {
    const shareUrl = await generateShareUrl()
    const shareText = generateShareText()
    
    // KakaoTalk sharing would require Kakao SDK integration
    // For now, we'll use a generic sharing approach
    if (navigator.share) {
      shareViaWebShare()
    } else {
      copyToClipboard()
    }
  }

  const shareViaEmail = async () => {
    const shareUrl = await generateShareUrl()
    const shareText = generateShareText()
    const subject = encodeURIComponent(`${shareableResult.testTitle} 테스트 결과`)
    const body = encodeURIComponent(`${shareText}\n\n${shareUrl || ''}`)
    
    window.location.href = `mailto:?subject=${subject}&body=${body}`
  }

  const shareViaSMS = async () => {
    const shareText = generateShareText()
    const shareUrl = await generateShareUrl()
    const message = encodeURIComponent(`${shareText}\n\n${shareUrl || ''}`)
    
    window.location.href = `sms:?body=${message}`
  }

  const downloadResults = () => {
    const resultData = {
      test: shareableResult.testTitle,
      score: shareableResult.score,
      percentile: shareableResult.percentile,
      completedAt: shareableResult.completedAt,
      strengths: result.analysis.strengths,
      weaknesses: result.analysis.weaknesses,
      recommendations: result.analysis.recommendations,
      categoryScores: result.analysis.categoryScores
    }

    const dataStr = JSON.stringify(resultData, null, 2)
    const dataBlob = new Blob([dataStr], { type: 'application/json' })
    const url = URL.createObjectURL(dataBlob)
    
    const link = document.createElement('a')
    link.href = url
    link.download = `aptit-result-${result.id}.json`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-end justify-center z-50">
      <Card className="w-full max-w-md mx-4 mb-4 p-6 rounded-t-2xl">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-gray-900">결과 공유하기</h2>
          {onClose && (
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>

        {/* Result Preview */}
        <div className="mb-6 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg">
          <h3 className="font-semibold text-gray-900 mb-2">{shareableResult.testTitle}</h3>
          <div className="flex justify-between items-center mb-2">
            <span className="text-2xl font-bold text-blue-600">{shareableResult.score}점</span>
            <span className="text-sm text-gray-600">상위 {shareableResult.percentile}%</span>
          </div>
          <div className="text-xs text-gray-600">
            {new Date(shareableResult.completedAt).toLocaleDateString('ko-KR')}
          </div>
        </div>

        {/* Share Options */}
        <div className="space-y-3">
          {/* Native Web Share */}
          {navigator.share && (
            <Button
              onClick={shareViaWebShare}
              className="w-full flex items-center justify-center space-x-2"
              disabled={isGeneratingLink}
            >
              <Share2 className="h-4 w-4" />
              <span>공유하기</span>
            </Button>
          )}

          {/* Copy Link */}
          <Button
            onClick={copyToClipboard}
            variant="outline"
            className="w-full flex items-center justify-center space-x-2"
            disabled={isGeneratingLink}
          >
            {copied ? (
              <>
                <Check className="h-4 w-4 text-green-600" />
                <span className="text-green-600">복사됨!</span>
              </>
            ) : (
              <>
                <Copy className="h-4 w-4" />
                <span>링크 복사</span>
              </>
            )}
          </Button>

          {/* Share via Apps */}
          <div className="grid grid-cols-2 gap-3">
            <Button
              onClick={shareViaKakao}
              variant="outline"
              className="flex items-center justify-center space-x-2"
              disabled={isGeneratingLink}
            >
              <MessageCircle className="h-4 w-4" />
              <span>카카오톡</span>
            </Button>

            <Button
              onClick={shareViaSMS}
              variant="outline"
              className="flex items-center justify-center space-x-2"
              disabled={isGeneratingLink}
            >
              <MessageCircle className="h-4 w-4" />
              <span>문자</span>
            </Button>

            <Button
              onClick={shareViaEmail}
              variant="outline"
              className="flex items-center justify-center space-x-2"
              disabled={isGeneratingLink}
            >
              <Mail className="h-4 w-4" />
              <span>이메일</span>
            </Button>

            <Button
              onClick={downloadResults}
              variant="outline"
              className="flex items-center justify-center space-x-2"
            >
              <Download className="h-4 w-4" />
              <span>다운로드</span>
            </Button>
          </div>
        </div>

        {/* Privacy Notice */}
        <div className="mt-6 p-3 bg-yellow-50 rounded-lg">
          <p className="text-xs text-yellow-800">
            공유된 결과는 개인정보를 제외한 점수와 분석 내용만 포함됩니다.
          </p>
        </div>
      </Card>
    </div>
  )
}