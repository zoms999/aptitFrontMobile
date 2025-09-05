// Haptic feedback utilities for mobile devices

export type HapticFeedbackType = 'light' | 'medium' | 'heavy' | 'selection' | 'success' | 'warning' | 'error'

interface HapticFeedback {
  vibrate: (pattern?: number | number[]) => void
  impact: (style?: 'light' | 'medium' | 'heavy') => void
  selection: () => void
  notification: (type?: 'success' | 'warning' | 'error') => void
}

class HapticManager implements HapticFeedback {
  private isSupported: boolean

  constructor() {
    this.isSupported = typeof window !== 'undefined' && 'vibrate' in navigator
  }

  vibrate(pattern: number | number[] = 50): void {
    if (this.isSupported) {
      navigator.vibrate(pattern)
    }
  }

  impact(style: 'light' | 'medium' | 'heavy' = 'light'): void {
    const patterns = {
      light: 10,
      medium: 20,
      heavy: 30
    }
    this.vibrate(patterns[style])
  }

  selection(): void {
    this.vibrate(5)
  }

  notification(type: 'success' | 'warning' | 'error' = 'success'): void {
    const patterns = {
      success: [50, 50, 50],
      warning: [100, 50, 100],
      error: [200, 100, 200]
    }
    this.vibrate(patterns[type])
  }
}

export const haptics = new HapticManager()

// Convenience function for triggering haptic feedback
export function triggerHapticFeedback(type: HapticFeedbackType): void {
  switch (type) {
    case 'light':
      haptics.impact('light')
      break
    case 'medium':
      haptics.impact('medium')
      break
    case 'heavy':
      haptics.impact('heavy')
      break
    case 'selection':
      haptics.selection()
      break
    case 'success':
      haptics.notification('success')
      break
    case 'warning':
      haptics.notification('warning')
      break
    case 'error':
      haptics.notification('error')
      break
    default:
      haptics.impact('light')
  }
}

// React hook for haptic feedback
export function useHaptics() {
  return {
    impact: haptics.impact.bind(haptics),
    selection: haptics.selection.bind(haptics),
    notification: haptics.notification.bind(haptics),
    vibrate: haptics.vibrate.bind(haptics),
    trigger: triggerHapticFeedback
  }
}