/**
 * Hook for handling device orientation changes
 */

import { useState, useEffect, useCallback } from 'react';

export type Orientation = 'portrait' | 'landscape';

export interface OrientationState {
  orientation: Orientation;
  angle: number;
  isPortrait: boolean;
  isLandscape: boolean;
}

export interface UseOrientationChangeOptions {
  onOrientationChange?: (orientation: OrientationState) => void;
  debounceMs?: number;
}

/**
 * Hook for detecting and handling orientation changes
 */
export function useOrientationChange(options: UseOrientationChangeOptions = {}) {
  const { onOrientationChange, debounceMs = 100 } = options;
  
  const getOrientationState = useCallback((): OrientationState => {
    if (typeof window === 'undefined') {
      return {
        orientation: 'portrait',
        angle: 0,
        isPortrait: true,
        isLandscape: false,
      };
    }
    
    const angle = window.screen?.orientation?.angle ?? 0;
    const isLandscape = window.innerWidth > window.innerHeight;
    const orientation: Orientation = isLandscape ? 'landscape' : 'portrait';
    
    return {
      orientation,
      angle,
      isPortrait: !isLandscape,
      isLandscape,
    };
  }, []);
  
  const [orientationState, setOrientationState] = useState<OrientationState>(getOrientationState);
  
  useEffect(() => {
    let timeoutId: NodeJS.Timeout;
    
    const handleOrientationChange = () => {
      // Debounce orientation changes to avoid rapid updates
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        const newState = getOrientationState();
        setOrientationState(newState);
        onOrientationChange?.(newState);
      }, debounceMs);
    };
    
    // Listen for orientation change events
    window.addEventListener('orientationchange', handleOrientationChange);
    window.addEventListener('resize', handleOrientationChange);
    
    // Also listen for screen orientation API if available
    if (window.screen?.orientation) {
      window.screen.orientation.addEventListener('change', handleOrientationChange);
    }
    
    return () => {
      clearTimeout(timeoutId);
      window.removeEventListener('orientationchange', handleOrientationChange);
      window.removeEventListener('resize', handleOrientationChange);
      
      if (window.screen?.orientation) {
        window.screen.orientation.removeEventListener('change', handleOrientationChange);
      }
    };
  }, [getOrientationState, onOrientationChange, debounceMs]);
  
  return orientationState;
}

/**
 * Hook for orientation-specific layout classes
 */
export function useOrientationLayout() {
  const { orientation, isPortrait, isLandscape } = useOrientationChange();
  
  const getLayoutClasses = useCallback((config: {
    portrait?: string;
    landscape?: string;
    base?: string;
  }) => {
    const { portrait = '', landscape = '', base = '' } = config;
    
    let classes = base;
    
    if (isPortrait && portrait) {
      classes += ` ${portrait}`;
    }
    
    if (isLandscape && landscape) {
      classes += ` ${landscape}`;
    }
    
    return classes.trim();
  }, [isPortrait, isLandscape]);
  
  const getContainerClasses = useCallback(() => {
    return getLayoutClasses({
      base: 'flex',
      portrait: 'flex-col',
      landscape: 'flex-row',
    });
  }, [getLayoutClasses]);
  
  const getNavigationClasses = useCallback(() => {
    return getLayoutClasses({
      portrait: 'order-last w-full',
      landscape: 'order-first w-auto',
    });
  }, [getLayoutClasses]);
  
  const getContentClasses = useCallback(() => {
    return getLayoutClasses({
      base: 'flex-1',
      portrait: 'order-first',
      landscape: 'order-last',
    });
  }, [getLayoutClasses]);
  
  return {
    orientation,
    isPortrait,
    isLandscape,
    getLayoutClasses,
    getContainerClasses,
    getNavigationClasses,
    getContentClasses,
  };
}

/**
 * Hook for orientation-aware component sizing
 */
export function useOrientationSizing() {
  const { orientation, isPortrait, isLandscape } = useOrientationChange();
  
  const getModalSize = useCallback(() => {
    if (isLandscape) {
      return {
        width: '80vw',
        height: '70vh',
        maxWidth: '800px',
        maxHeight: '600px',
      };
    }
    
    return {
      width: '90vw',
      height: '80vh',
      maxWidth: '400px',
      maxHeight: '700px',
    };
  }, [isLandscape]);
  
  const getImageAspectRatio = useCallback((defaultRatio: string = '16/9') => {
    if (isLandscape) {
      return defaultRatio;
    }
    
    // Adjust aspect ratio for portrait mode
    const [width, height] = defaultRatio.split('/').map(Number);
    return `${height}/${width}`;
  }, [isLandscape]);
  
  const getGridColumns = useCallback((maxColumns: number = 4) => {
    if (isLandscape) {
      return Math.min(maxColumns, 3);
    }
    
    return Math.min(maxColumns, 2);
  }, [isLandscape]);
  
  return {
    orientation,
    isPortrait,
    isLandscape,
    getModalSize,
    getImageAspectRatio,
    getGridColumns,
  };
}

/**
 * Hook for handling orientation lock
 */
export function useOrientationLock() {
  const [isLocked, setIsLocked] = useState(false);
  const [lockedOrientation, setLockedOrientation] = useState<OrientationType | null>(null);
  
  const lockOrientation = useCallback(async (orientation: OrientationType) => {
    if (!window.screen?.orientation?.lock) {
      console.warn('Screen orientation lock is not supported');
      return false;
    }
    
    try {
      await window.screen.orientation.lock(orientation);
      setIsLocked(true);
      setLockedOrientation(orientation);
      return true;
    } catch (error) {
      console.error('Failed to lock orientation:', error);
      return false;
    }
  }, []);
  
  const unlockOrientation = useCallback(() => {
    if (!window.screen?.orientation?.unlock) {
      console.warn('Screen orientation unlock is not supported');
      return;
    }
    
    try {
      window.screen.orientation.unlock();
      setIsLocked(false);
      setLockedOrientation(null);
    } catch (error) {
      console.error('Failed to unlock orientation:', error);
    }
  }, []);
  
  const lockPortrait = useCallback(() => lockOrientation('portrait-primary'), [lockOrientation]);
  const lockLandscape = useCallback(() => lockOrientation('landscape-primary'), [lockOrientation]);
  
  return {
    isLocked,
    lockedOrientation,
    lockOrientation,
    unlockOrientation,
    lockPortrait,
    lockLandscape,
    isSupported: typeof window !== 'undefined' && !!window.screen?.orientation,
  };
}

/**
 * Component for orientation-specific rendering
 */
export interface OrientationProviderProps {
  children: React.ReactNode;
  portraitComponent?: React.ComponentType<any>;
  landscapeComponent?: React.ComponentType<any>;
  fallbackComponent?: React.ComponentType<any>;
}

export function OrientationProvider({
  children,
  portraitComponent: PortraitComponent,
  landscapeComponent: LandscapeComponent,
  fallbackComponent: FallbackComponent,
}: OrientationProviderProps) {
  const { isPortrait, isLandscape } = useOrientationChange();
  
  if (PortraitComponent && isPortrait) {
    return React.createElement(PortraitComponent, {}, children);
  }
  
  if (LandscapeComponent && isLandscape) {
    return React.createElement(LandscapeComponent, {}, children);
  }
  
  if (FallbackComponent) {
    return React.createElement(FallbackComponent, {}, children);
  }
  
  return React.createElement(React.Fragment, {}, children);
}

// Type definitions for screen orientation API
declare global {
  interface Screen {
    orientation?: {
      angle: number;
      type: OrientationType;
      lock: (orientation: OrientationType) => Promise<void>;
      unlock: () => void;
      addEventListener: (type: 'change', listener: () => void) => void;
      removeEventListener: (type: 'change', listener: () => void) => void;
    };
  }
}

type OrientationType = 
  | 'portrait-primary'
  | 'portrait-secondary' 
  | 'landscape-primary'
  | 'landscape-secondary';