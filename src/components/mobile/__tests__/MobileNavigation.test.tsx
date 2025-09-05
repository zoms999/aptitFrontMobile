import React from 'react'
import { render, screen, fireEvent } from '@/../../__tests__/utils/test-utils'
import { MobileNavigation } from '../MobileNavigation'

// Mock next/navigation
const mockPush = jest.fn()
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
  usePathname: () => '/dashboard',
}))

describe('MobileNavigation', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should render all navigation items', () => {
    render(<MobileNavigation />)

    expect(screen.getByText('대시보드')).toBeInTheDocument()
    expect(screen.getByText('테스트')).toBeInTheDocument()
    expect(screen.getByText('결과')).toBeInTheDocument()
    expect(screen.getByText('프로필')).toBeInTheDocument()
  })

  it('should highlight active navigation item', () => {
    render(<MobileNavigation />)

    const dashboardButton = screen.getByRole('button', { name: /대시보드/ })
    expect(dashboardButton).toHaveClass('text-blue-600')
  })

  it('should navigate when navigation item is clicked', () => {
    render(<MobileNavigation />)

    const testButton = screen.getByRole('button', { name: /테스트/ })
    fireEvent.click(testButton)

    expect(mockPush).toHaveBeenCalledWith('/test')
  })

  it('should have proper accessibility attributes', () => {
    render(<MobileNavigation />)

    const nav = screen.getByRole('navigation')
    expect(nav).toHaveAttribute('aria-label', '메인 네비게이션')

    const buttons = screen.getAllByRole('button')
    buttons.forEach(button => {
      expect(button).toHaveAttribute('aria-label')
    })
  })

  it('should have proper touch target sizes', () => {
    render(<MobileNavigation />)

    const buttons = screen.getAllByRole('button')
    buttons.forEach(button => {
      const styles = window.getComputedStyle(button)
      // Check minimum touch target size (44px)
      expect(parseInt(styles.minHeight)).toBeGreaterThanOrEqual(44)
    })
  })

  it('should handle keyboard navigation', () => {
    render(<MobileNavigation />)

    const firstButton = screen.getByRole('button', { name: /대시보드/ })
    const secondButton = screen.getByRole('button', { name: /테스트/ })

    firstButton.focus()
    expect(firstButton).toHaveFocus()

    fireEvent.keyDown(firstButton, { key: 'Tab' })
    expect(secondButton).toHaveFocus()
  })

  it('should show proper icons for each navigation item', () => {
    render(<MobileNavigation />)

    // Check that icons are present (assuming they have specific test ids or classes)
    const dashboardIcon = screen.getByTestId('dashboard-icon')
    const testIcon = screen.getByTestId('test-icon')
    const resultsIcon = screen.getByTestId('results-icon')
    const profileIcon = screen.getByTestId('profile-icon')

    expect(dashboardIcon).toBeInTheDocument()
    expect(testIcon).toBeInTheDocument()
    expect(resultsIcon).toBeInTheDocument()
    expect(profileIcon).toBeInTheDocument()
  })
})