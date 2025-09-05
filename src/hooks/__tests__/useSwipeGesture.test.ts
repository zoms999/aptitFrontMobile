import { renderHook, act } from '@testing-library/react'
import { useSwipeGesture } from '../useSwipeGesture'

describe('useSwipeGesture', () => {
  let mockElement: HTMLElement

  beforeEach(() => {
    mockElement = document.createElement('div')
    document.body.appendChild(mockElement)
  })

  afterEach(() => {
    document.body.removeChild(mockElement)
  })

  it('should detect swipe left', () => {
    const onSwipeLeft = jest.fn()
    const onSwipeRight = jest.fn()

    renderHook(() => 
      useSwipeGesture(mockElement, {
        onSwipeLeft,
        onSwipeRight,
        threshold: 50,
      })
    )

    // Simulate touch start
    act(() => {
      const touchStart = new TouchEvent('touchstart', {
        touches: [{ clientX: 200, clientY: 100 } as Touch],
      })
      mockElement.dispatchEvent(touchStart)
    })

    // Simulate touch end (swipe left)
    act(() => {
      const touchEnd = new TouchEvent('touchend', {
        changedTouches: [{ clientX: 100, clientY: 100 } as Touch],
      })
      mockElement.dispatchEvent(touchEnd)
    })

    expect(onSwipeLeft).toHaveBeenCalled()
    expect(onSwipeRight).not.toHaveBeenCalled()
  })

  it('should detect swipe right', () => {
    const onSwipeLeft = jest.fn()
    const onSwipeRight = jest.fn()

    renderHook(() => 
      useSwipeGesture(mockElement, {
        onSwipeLeft,
        onSwipeRight,
        threshold: 50,
      })
    )

    // Simulate touch start
    act(() => {
      const touchStart = new TouchEvent('touchstart', {
        touches: [{ clientX: 100, clientY: 100 } as Touch],
      })
      mockElement.dispatchEvent(touchStart)
    })

    // Simulate touch end (swipe right)
    act(() => {
      const touchEnd = new TouchEvent('touchend', {
        changedTouches: [{ clientX: 200, clientY: 100 } as Touch],
      })
      mockElement.dispatchEvent(touchEnd)
    })

    expect(onSwipeRight).toHaveBeenCalled()
    expect(onSwipeLeft).not.toHaveBeenCalled()
  })

  it('should not trigger swipe when distance is below threshold', () => {
    const onSwipeLeft = jest.fn()
    const onSwipeRight = jest.fn()

    renderHook(() => 
      useSwipeGesture(mockElement, {
        onSwipeLeft,
        onSwipeRight,
        threshold: 100,
      })
    )

    // Simulate touch start
    act(() => {
      const touchStart = new TouchEvent('touchstart', {
        touches: [{ clientX: 150, clientY: 100 } as Touch],
      })
      mockElement.dispatchEvent(touchStart)
    })

    // Simulate touch end (small movement)
    act(() => {
      const touchEnd = new TouchEvent('touchend', {
        changedTouches: [{ clientX: 120, clientY: 100 } as Touch],
      })
      mockElement.dispatchEvent(touchEnd)
    })

    expect(onSwipeLeft).not.toHaveBeenCalled()
    expect(onSwipeRight).not.toHaveBeenCalled()
  })

  it('should not trigger swipe when vertical movement is too large', () => {
    const onSwipeLeft = jest.fn()
    const onSwipeRight = jest.fn()

    renderHook(() => 
      useSwipeGesture(mockElement, {
        onSwipeLeft,
        onSwipeRight,
        threshold: 50,
      })
    )

    // Simulate touch start
    act(() => {
      const touchStart = new TouchEvent('touchstart', {
        touches: [{ clientX: 200, clientY: 100 } as Touch],
      })
      mockElement.dispatchEvent(touchStart)
    })

    // Simulate touch end (large vertical movement)
    act(() => {
      const touchEnd = new TouchEvent('touchend', {
        changedTouches: [{ clientX: 100, clientY: 200 } as Touch],
      })
      mockElement.dispatchEvent(touchEnd)
    })

    expect(onSwipeLeft).not.toHaveBeenCalled()
    expect(onSwipeRight).not.toHaveBeenCalled()
  })

  it('should handle missing element gracefully', () => {
    const onSwipeLeft = jest.fn()

    expect(() => {
      renderHook(() => 
        useSwipeGesture(null, {
          onSwipeLeft,
          threshold: 50,
        })
      )
    }).not.toThrow()
  })

  it('should cleanup event listeners on unmount', () => {
    const removeEventListenerSpy = jest.spyOn(mockElement, 'removeEventListener')
    
    const { unmount } = renderHook(() => 
      useSwipeGesture(mockElement, {
        onSwipeLeft: jest.fn(),
        threshold: 50,
      })
    )

    unmount()

    expect(removeEventListenerSpy).toHaveBeenCalledWith('touchstart', expect.any(Function))
    expect(removeEventListenerSpy).toHaveBeenCalledWith('touchend', expect.any(Function))
  })
})