'use client'

import { useEffect, useCallback, useState } from 'react'

interface AccessibilityState {
  isScreenReaderActive: boolean
  prefersReducedMotion: boolean
  prefersHighContrast: boolean
  fontSize: 'small' | 'medium' | 'large' | 'extra-large'
  isKeyboardNavigation: boolean
}

export function useAccessibility() {
  const [state, setState] = useState<AccessibilityState>({
    isScreenReaderActive: false,
    prefersReducedMotion: false,
    prefersHighContrast: false,
    fontSize: 'medium',
    isKeyboardNavigation: false
  })

  // Detect screen reader
  const detectScreenReader = useCallback(() => {
    if (typeof window === 'undefined') return false

    // Check for common screen reader indicators
    const indicators = [
      // NVDA, JAWS, etc.
      navigator.userAgent.includes('NVDA') || 
      navigator.userAgent.includes('JAWS') ||
      // VoiceOver on iOS/macOS
      /iPhone|iPad|iPod|Mac/.test(navigator.userAgent) && 'speechSynthesis' in window,
      // TalkBack on Android
      /Android/.test(navigator.userAgent) && 'speechSynthesis' in window,
      // Check for accessibility APIs
      'getComputedAccessibleNode' in document,
      // Check for high contrast mode (Windows)
      window.matchMedia('(prefers-contrast: high)').matches
    ]

    return indicators.some(Boolean)
  }, [])

  // Detect reduced motion preference
  const detectReducedMotion = useCallback(() => {
    if (typeof window === 'undefined') return false
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches
  }, [])

  // Detect high contrast preference
  const detectHighContrast = useCallback(() => {
    if (typeof window === 'undefined') return false
    return window.matchMedia('(prefers-contrast: high)').matches
  }, [])

  // Detect font size preference
  const detectFontSize = useCallback((): AccessibilityState['fontSize'] => {
    if (typeof window === 'undefined') return 'medium'

    const rootFontSize = parseFloat(getComputedStyle(document.documentElement).fontSize)
    
    if (rootFontSize >= 20) return 'extra-large'
    if (rootFontSize >= 18) return 'large'
    if (rootFontSize >= 14) return 'medium'
    return 'small'
  }, [])

  // Update accessibility state
  const updateAccessibilityState = useCallback(() => {
    setState({
      isScreenReaderActive: detectScreenReader(),
      prefersReducedMotion: detectReducedMotion(),
      prefersHighContrast: detectHighContrast(),
      fontSize: detectFontSize(),
      isKeyboardNavigation: false // Will be updated by keyboard events
    })
  }, [detectScreenReader, detectReducedMotion, detectHighContrast, detectFontSize])

  // Handle keyboard navigation detection
  useEffect(() => {
    let isUsingKeyboard = false

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key && (e.key === 'Tab' || e.key === 'Enter' || e.key === ' ' || e.key.startsWith('Arrow'))) {
        isUsingKeyboard = true
        setState(prev => ({ ...prev, isKeyboardNavigation: true }))
      }
    }

    const handleMouseDown = () => {
      if (isUsingKeyboard) {
        isUsingKeyboard = false
        setState(prev => ({ ...prev, isKeyboardNavigation: false }))
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    document.addEventListener('mousedown', handleMouseDown)

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.removeEventListener('mousedown', handleMouseDown)
    }
  }, [])

  // Listen for media query changes
  useEffect(() => {
    if (typeof window === 'undefined') return

    const reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
    const highContrastQuery = window.matchMedia('(prefers-contrast: high)')

    const handleMediaQueryChange = () => {
      updateAccessibilityState()
    }

    reducedMotionQuery.addEventListener('change', handleMediaQueryChange)
    highContrastQuery.addEventListener('change', handleMediaQueryChange)

    // Initial state
    updateAccessibilityState()

    return () => {
      reducedMotionQuery.removeEventListener('change', handleMediaQueryChange)
      highContrastQuery.removeEventListener('change', handleMediaQueryChange)
    }
  }, [updateAccessibilityState])

  return state
}

// Hook for managing focus
export function useFocusManagement() {
  const [focusedElement, setFocusedElement] = useState<Element | null>(null)

  const focusElement = useCallback((selector: string) => {
    const element = document.querySelector(selector)
    if (element && element instanceof HTMLElement) {
      element.focus()
      setFocusedElement(element)
    }
  }, [])

  const focusFirstInteractive = useCallback(() => {
    const interactiveSelectors = [
      'button:not([disabled])',
      'input:not([disabled])',
      'select:not([disabled])',
      'textarea:not([disabled])',
      'a[href]',
      '[tabindex]:not([tabindex="-1"])'
    ]
    
    for (const selector of interactiveSelectors) {
      const element = document.querySelector(selector)
      if (element && element instanceof HTMLElement) {
        element.focus()
        setFocusedElement(element)
        break
      }
    }
  }, [])

  const trapFocus = useCallback((containerSelector: string) => {
    const container = document.querySelector(containerSelector)
    if (!container) return

    const focusableElements = container.querySelectorAll(
      'button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])'
    )

    const firstElement = focusableElements[0] as HTMLElement
    const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement

    const handleKeyDown = (e: Event) => {
      const keyboardEvent = e as KeyboardEvent;
      if (keyboardEvent.key === 'Tab') {
        if (keyboardEvent.shiftKey) {
          if (document.activeElement === firstElement) {
            keyboardEvent.preventDefault()
            lastElement.focus()
          }
        } else {
          if (document.activeElement === lastElement) {
            keyboardEvent.preventDefault()
            firstElement.focus()
          }
        }
      }
    }

    container.addEventListener('keydown', handleKeyDown)
    
    // Focus first element
    if (firstElement) {
      firstElement.focus()
    }

    return () => {
      container.removeEventListener('keydown', handleKeyDown)
    }
  }, [])

  return {
    focusedElement,
    focusElement,
    focusFirstInteractive,
    trapFocus
  }
}

// Hook for screen reader announcements
export function useScreenReaderAnnouncements() {
  const [announcements, setAnnouncements] = useState<string[]>([])

  const announce = useCallback((message: string, priority: 'polite' | 'assertive' = 'polite') => {
    // Create or update live region
    let liveRegion = document.getElementById('screen-reader-announcements')
    
    if (!liveRegion) {
      liveRegion = document.createElement('div')
      liveRegion.id = 'screen-reader-announcements'
      liveRegion.setAttribute('aria-live', priority)
      liveRegion.setAttribute('aria-atomic', 'true')
      liveRegion.style.position = 'absolute'
      liveRegion.style.left = '-10000px'
      liveRegion.style.width = '1px'
      liveRegion.style.height = '1px'
      liveRegion.style.overflow = 'hidden'
      document.body.appendChild(liveRegion)
    }

    // Update the live region
    liveRegion.textContent = message
    liveRegion.setAttribute('aria-live', priority)

    // Keep track of announcements
    setAnnouncements(prev => [...prev, message].slice(-10)) // Keep last 10 announcements

    // Clear the announcement after a delay
    setTimeout(() => {
      if (liveRegion && liveRegion.textContent === message) {
        liveRegion.textContent = ''
      }
    }, 1000)
  }, [])

  const announceNavigation = useCallback((destination: string) => {
    announce(`페이지 이동: ${destination}`, 'polite')
  }, [announce])

  const announceError = useCallback((error: string) => {
    announce(`오류: ${error}`, 'assertive')
  }, [announce])

  const announceSuccess = useCallback((message: string) => {
    announce(`성공: ${message}`, 'polite')
  }, [announce])

  return {
    announce,
    announceNavigation,
    announceError,
    announceSuccess,
    announcements
  }
}

// Hook for accessible form validation
export function useAccessibleValidation() {
  const { announce } = useScreenReaderAnnouncements()

  const announceValidationError = useCallback((fieldName: string, error: string) => {
    announce(`${fieldName} 필드 오류: ${error}`, 'assertive')
  }, [announce])

  const announceValidationSuccess = useCallback((fieldName: string) => {
    announce(`${fieldName} 필드 유효성 검사 통과`, 'polite')
  }, [announce])

  const setFieldError = useCallback((fieldId: string, error: string) => {
    const field = document.getElementById(fieldId)
    if (field) {
      field.setAttribute('aria-invalid', 'true')
      field.setAttribute('aria-describedby', `${fieldId}-error`)
      
      // Create or update error message
      let errorElement = document.getElementById(`${fieldId}-error`)
      if (!errorElement) {
        errorElement = document.createElement('div')
        errorElement.id = `${fieldId}-error`
        errorElement.setAttribute('role', 'alert')
        errorElement.className = 'sr-only' // Screen reader only
        field.parentNode?.appendChild(errorElement)
      }
      
      errorElement.textContent = error
      announceValidationError(field.getAttribute('aria-label') || fieldId, error)
    }
  }, [announceValidationError])

  const clearFieldError = useCallback((fieldId: string) => {
    const field = document.getElementById(fieldId)
    if (field) {
      field.removeAttribute('aria-invalid')
      field.removeAttribute('aria-describedby')
      
      const errorElement = document.getElementById(`${fieldId}-error`)
      if (errorElement) {
        errorElement.remove()
      }
    }
  }, [])

  return {
    setFieldError,
    clearFieldError,
    announceValidationError,
    announceValidationSuccess
  }
}