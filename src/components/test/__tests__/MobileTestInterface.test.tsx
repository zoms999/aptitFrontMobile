import React from 'react'
import { render, screen, fireEvent, waitFor } from '@/../../__tests__/utils/test-utils'
import { MobileTestInterface } from '../MobileTestInterface'
import { mockTest } from '@/../../__tests__/utils/test-utils'

describe('MobileTestInterface', () => {
  const defaultProps = {
    test: mockTest,
    onComplete: jest.fn(),
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should render test question', () => {
    render(<MobileTestInterface {...defaultProps} />)

    expect(screen.getByText('What is 2 + 2?')).toBeInTheDocument()
  })

  it('should render answer options', () => {
    render(<MobileTestInterface {...defaultProps} />)

    expect(screen.getByText('3')).toBeInTheDocument()
    expect(screen.getByText('4')).toBeInTheDocument()
    expect(screen.getByText('5')).toBeInTheDocument()
  })

  it('should show progress indicator', () => {
    render(<MobileTestInterface {...defaultProps} />)

    expect(screen.getByText('1 / 1')).toBeInTheDocument()
  })

  it('should allow selecting an answer', () => {
    render(<MobileTestInterface {...defaultProps} />)

    const option = screen.getByLabelText('4')
    fireEvent.click(option)

    expect(option).toBeChecked()
  })

  it('should enable submit button after selecting answer', () => {
    render(<MobileTestInterface {...defaultProps} />)

    const submitButton = screen.getByRole('button', { name: /제출/ })
    expect(submitButton).toBeDisabled()

    const option = screen.getByLabelText('4')
    fireEvent.click(option)

    expect(submitButton).toBeEnabled()
  })

  it('should call onComplete when test is submitted', async () => {
    render(<MobileTestInterface {...defaultProps} />)

    const option = screen.getByLabelText('4')
    fireEvent.click(option)

    const submitButton = screen.getByRole('button', { name: /제출/ })
    fireEvent.click(submitButton)

    await waitFor(() => {
      expect(defaultProps.onComplete).toHaveBeenCalledWith([
        {
          questionId: 'q1',
          value: 'b',
          timeSpent: expect.any(Number),
        },
      ])
    })
  })

  it('should handle swipe gestures for navigation', () => {
    const multiQuestionTest = {
      ...mockTest,
      questions: [
        ...mockTest.questions,
        {
          id: 'q2',
          text: 'What is 3 + 3?',
          type: 'multiple-choice' as const,
          options: [
            { id: 'a', text: '5', value: 'a' },
            { id: 'b', text: '6', value: 'b' },
            { id: 'c', text: '7', value: 'c' },
          ],
          required: true,
          order: 2,
        },
      ],
    }

    render(<MobileTestInterface {...defaultProps} test={multiQuestionTest} />)

    const testContainer = screen.getByTestId('test-container')

    // Simulate swipe left (next question)
    fireEvent.touchStart(testContainer, {
      touches: [{ clientX: 200, clientY: 100 }],
    })
    fireEvent.touchEnd(testContainer, {
      changedTouches: [{ clientX: 100, clientY: 100 }],
    })

    expect(screen.getByText('What is 3 + 3?')).toBeInTheDocument()
  })

  it('should save progress automatically', async () => {
    render(<MobileTestInterface {...defaultProps} />)

    const option = screen.getByLabelText('4')
    fireEvent.click(option)

    // Wait for auto-save
    await waitFor(() => {
      expect(localStorage.setItem).toHaveBeenCalledWith(
        'test-progress-test-id',
        expect.stringContaining('"answers"')
      )
    })
  })

  it('should restore progress from localStorage', () => {
    const savedProgress = {
      currentQuestion: 0,
      answers: [{ questionId: 'q1', value: 'b', timeSpent: 30 }],
      timeSpent: 30,
    }

    localStorage.getItem = jest.fn().mockReturnValue(JSON.stringify(savedProgress))

    render(<MobileTestInterface {...defaultProps} />)

    const option = screen.getByLabelText('4')
    expect(option).toBeChecked()
  })

  it('should handle time limit display', () => {
    render(<MobileTestInterface {...defaultProps} />)

    expect(screen.getByText(/남은 시간:/)).toBeInTheDocument()
  })

  it('should be accessible with screen readers', () => {
    render(<MobileTestInterface {...defaultProps} />)

    const question = screen.getByRole('group', { name: /질문 1/ })
    expect(question).toBeInTheDocument()

    const options = screen.getAllByRole('radio')
    options.forEach(option => {
      expect(option).toHaveAttribute('aria-describedby')
    })
  })

  it('should handle touch interactions properly', () => {
    render(<MobileTestInterface {...defaultProps} />)

    const option = screen.getByLabelText('4')
    
    // Simulate touch interaction
    fireEvent.touchStart(option)
    fireEvent.touchEnd(option)

    expect(option).toBeChecked()
  })

  it('should provide haptic feedback on interactions', () => {
    // Mock navigator.vibrate
    const vibrateMock = jest.fn()
    Object.defineProperty(navigator, 'vibrate', {
      value: vibrateMock,
      writable: true,
    })

    render(<MobileTestInterface {...defaultProps} />)

    const option = screen.getByLabelText('4')
    fireEvent.click(option)

    expect(vibrateMock).toHaveBeenCalledWith(10)
  })
})