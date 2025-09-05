'use client'

import { useState, useEffect, useCallback } from 'react'

export type OrientationType = 'portrait' | 'landscape'

// Extended type definitions for screen orientation API
declare global {
  interface ScreenOrientation {
    lock?: (orientation: OrientationLockType) => Promise<void>;
    unlock?: () => void;
  }
}

type OrientationLockType = 
  | 'portrait-primary'
  | 'portrait-secondary' 
  | 'landscape-primary'
  | 'landscape-secondary'
  | 'portrait'
  | 'landscape';

interface OrientationState {
  orientation: OrientationType
  angle: number
  isSupported: boolean
}

export function useOrientation() {
  const [state, setState] = useState<OrientationState>({
    orientation: 'portrait',
    angle: 0,
    isSupported: false
  })

  const getOrientation = useCallback((): OrientationType => {
    if (typeof window === 'undefined') return 'portrait'
    
    // Check screen orientation API first
    if (screen.orientation) {
      return screen.orientation.type.includes('portrait') ? 'portrait' : 'landscape'
    }
    
    // Fallback to window dimensions
    return window.innerWidth > window.innerHeight ? 'landscape' : 'portrait'
  }, [])

  const getAngle = useCallback((): number => {
    if (typeof window === 'undefined') return 0
    
    // Check screen orientation API first
    if (screen.orientation) {
      return screen.orientation.angle
    }
    
    // Fallback to deprecated orientation property
    return (window as any).orientation || 0
  }, [])

  const updateOrientation = useCallback(() => {
    const orientation = getOrientation()
    const angle = getAngle()
    
    setState(prev => ({
      ...prev,
      orientation,
      angle
    }))
  }, [getOrientation, getAngle])

  useEffect(() => {
    if (typeof window === 'undefined') return

    // Check if orientation API is supported
    const isSupported = 'orientation' in screen || 'orientation' in window

    setState(prev => ({
      ...prev,
      isSupported,
      orientation: getOrientation(),
      angle: getAngle()
    }))

    // Listen for orientation changes
    const handleOrientationChange = () => {
      // Add a small delay to ensure the orientation has fully changed
      setTimeout(updateOrientation, 100)
    }

    // Listen for resize as a fallback
    const handleResize = () => {
      updateOrientation()
    }

    // Add event listeners
    if (screen.orientation) {
      screen.orientation.addEventListener('change', handleOrientationChange)
    } else {
      window.addEventListener('orientationchange', handleOrientationChange)
    }
    
    window.addEventListener('resize', handleResize)

    return () => {
      if (screen.orientation) {
        screen.orientation.removeEventListener('change', handleOrientationChange)
      } else {
        window.removeEventListener('orientationchange', handleOrientationChange)
      }
      
      window.removeEventListener('resize', handleResize)
    }
  }, [updateOrientation, getOrientation, getAngle])

  return state
}

// Hook for handling orientation-specific layouts
export function useOrientationLayout() {
  const { orientation } = useOrientation()
  
  const isPortrait = orientation === 'portrait'
  const isLandscape = orientation === 'landscape'
  
  // CSS classes for orientation-specific styling
  const orientationClasses = {
    container: isPortrait ? 'portrait-layout' : 'landscape-layout',
    content: isPortrait ? 'portrait-content' : 'landscape-content',
    navigation: isPortrait ? 'portrait-nav' : 'landscape-nav'
  }
  
  return {
    orientation,
    isPortrait,
    isLandscape,
    orientationClasses
  }
}

// Hook for locking orientation (if supported)
export function useOrientationLock() {
  const [isLocked, setIsLocked] = useState(false)
  const [lockError, setLockError] = useState<string | null>(null)

  const lockOrientation = useCallback(async (orientation: OrientationLockType) => {
    if (!screen.orientation || !screen.orientation.lock) {
      setLockError('Orientation lock not supported')
      return false
    }

    try {
      await screen.orientation.lock(orientation)
      setIsLocked(true)
      setLockError(null)
      return true
    } catch (error) {
      setLockError(error instanceof Error ? error.message : 'Failed to lock orientation')
      return false
    }
  }, [])

  const unlockOrientation = useCallback(() => {
    if (!screen.orientation || !screen.orientation.unlock) {
      setLockError('Orientation unlock not supported')
      return false
    }

    try {
      screen.orientation.unlock()
      setIsLocked(false)
      setLockError(null)
      return true
    } catch (error) {
      setLockError(error instanceof Error ? error.message : 'Failed to unlock orientation')
      return false
    }
  }, [])

  return {
    isLocked,
    lockError,
    lockOrientation,
    unlockOrientation,
    isSupported: !!(screen.orientation && screen.orientation.lock)
  }
}