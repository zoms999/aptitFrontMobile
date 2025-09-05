import React from 'react'
import { render, screen, fireEvent } from '@/../../__tests__/utils/test-utils'
import { MobileResultsDisplay } from '../MobileResultsDisplay'
import { mockResult } from '@/../../__tests__/utils/test-utils'

describe('MobileResultsDisplay', () => {
  const defaultProps = {
    result: mockResult,
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should render result summary', () => {
    render(<MobileResultsDisplay {...defaultProps} />)

    expect(screen.getByText('100')).toBeInTheDocument() // score
    expect(screen.getByText('95%')).toBeInTheDocument() // percentile
  })

  it('should render analysis sections', () => {
    render(<MobileResultsDisplay {...defaultProps} />)

    expect(screen.getByText('강점')).toBeInTheDocument()
    expect(screen.getByText('Mathematical reasoning')).toBeInTheDocument()
    expect(screen.getByText('추천사항')).toBeInTheDocument()
    expect(screen.getByText('Continue practicing')).toBeInTheDocument()
  })

  it('should render category scores', () => {
    render(<MobileResultsDisplay {...defaultProps} />)

    expect(screen.getByText('math')).toBeInTheDocument()
    expect(screen.getByText('100점')).toBeInTheDocument()
  })

  it('should expand and collapse sections', () => {
    render(<MobileResultsDisplay {...defaultProps} />)

    const analysisButton = screen.getByRole('button', { name: /상세 분석/ })
    fireEvent.click(analysisButton)

    expect(screen.getByText('Mathematical reasoning')).toBeVisible()

    fireEvent.click(analysisButton)
    expect(screen.getByText('Mathematical reasoning')).not.toBeVisible()
  })

  it('should show share button', () => {
    render(<MobileResultsDisplay {...defaultProps} />)

    const shareButton = screen.getByRole('button', { name: /공유/ })
    expect(shareButton).toBeInTheDocument()
  })

  it('should handle share functionality', () => {
    // Mock Web Share API
    const mockShare = jest.fn()
    Object.defineProperty(navigator, 'share', {
      value: mockShare,
      writable: true,
    })

    render(<MobileResultsDisplay {...defaultProps} />)

    const shareButton = screen.getByRole('button', { name: /공유/ })
    fireEvent.click(shareButton)

    expect(mockShare).toHaveBeenCalledWith({
      title: '테스트 결과',
      text: '점수: 100점 (상위 95%)',
      url: expect.any(String),
    })
  })

  it('should fallback to clipboard when Web Share API is not available', async () => {
    // Mock clipboard API
    const mockWriteText = jest.fn()
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText: mockWriteText },
      writable: true,
    })

    render(<MobileResultsDisplay {...defaultProps} />)

    const shareButton = screen.getByRole('button', { name: /공유/ })
    fireEvent.click(shareButton)

    expect(mockWriteText).toHaveBeenCalledWith(expect.stringContaining('점수: 100점'))
  })

  it('should be responsive on different screen sizes', () => {
    // Mock different viewport sizes
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 375, // iPhone width
    })

    render(<MobileResultsDisplay {...defaultProps} />)

    const container = screen.getByTestId('results-container')
    expect(container).toHaveClass('mobile-optimized')
  })

  it('should handle loading state', () => {
    render(<MobileResultsDisplay result={null} />)

    expect(screen.getByText('결과를 불러오는 중...')).toBeInTheDocument()
  })

  it('should handle error state', () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation()

    render(<MobileResultsDisplay result={undefined as any} />)

    expect(screen.getByText('결과를 불러올 수 없습니다.')).toBeInTheDocument()

    consoleSpy.mockRestore()
  })

  it('should be accessible with proper ARIA labels', () => {
    render(<MobileResultsDisplay {...defaultProps} />)

    const scoreSection = screen.getByRole('region', { name: /점수 정보/ })
    expect(scoreSection).toBeInTheDocument()

    const analysisSection = screen.getByRole('region', { name: /분석 결과/ })
    expect(analysisSection).toBeInTheDocument()
  })

  it('should support keyboard navigation', () => {
    render(<MobileResultsDisplay {...defaultProps} />)

    const analysisButton = screen.getByRole('button', { name: /상세 분석/ })
    
    analysisButton.focus()
    expect(analysisButton).toHaveFocus()

    fireEvent.keyDown(analysisButton, { key: 'Enter' })
    expect(screen.getByText('Mathematical reasoning')).toBeVisible()

    fireEvent.keyDown(analysisButton, { key: ' ' })
    expect(screen.getByText('Mathematical reasoning')).not.toBeVisible()
  })

  it('should format completion time correctly', () => {
    render(<MobileResultsDisplay {...defaultProps} />)

    expect(screen.getByText('소요 시간: 30초')).toBeInTheDocument()
  })

  it('should show device information when available', () => {
    render(<MobileResultsDisplay {...defaultProps} />)

    expect(screen.getByText(/화면 크기: 375x812/)).toBeInTheDocument()
  })
})