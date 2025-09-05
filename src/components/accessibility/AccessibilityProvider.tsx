/**
 * Accessibility provider for global accessibility features
 */

'use client';

import React, { createContext, useContext, useEffect } from 'react';
import { useAccessibility } from '@/hooks/useAccessibility';
import { DefaultSkipLinks } from './SkipLink';
import { LiveRegion } from './LiveRegion';

interface AccessibilityContextType {
  isScreenReaderActive: boolean;
  prefersReducedMotion: boolean;
  prefersHighContrast: boolean;
  isKeyboardNavigation: boolean;
  announce: (message: string, priority?: 'polite' | 'assertive') => void;
}

const AccessibilityContext = createContext<AccessibilityContextType | null>(null);

export function useAccessibilityContext() {
  const context = useContext(AccessibilityContext);
  if (!context) {
    throw new Error('useAccessibilityContext must be used within AccessibilityProvider');
  }
  return context;
}

export interface AccessibilityProviderProps {
  children: React.ReactNode;
  enableSkipLinks?: boolean;
  enableLiveRegion?: boolean;
}

export function AccessibilityProvider({ 
  children, 
  enableSkipLinks = true,
  enableLiveRegion = true 
}: AccessibilityProviderProps) {
  const accessibility = useAccessibility();
  const [liveMessage, setLiveMessage] = React.useState('');
  const [livePriority, setLivePriority] = React.useState<'polite' | 'assertive'>('polite');

  const announce = React.useCallback((
    message: string, 
    priority: 'polite' | 'assertive' = 'polite'
  ) => {
    setLivePriority(priority);
    setLiveMessage(message);
  }, []);

  // Apply accessibility classes to body
  useEffect(() => {
    const body = document.body;
    
    body.classList.toggle('screen-reader-active', accessibility.isScreenReaderActive);
    body.classList.toggle('reduced-motion', accessibility.prefersReducedMotion);
    body.classList.toggle('high-contrast', accessibility.prefersHighContrast);
    body.classList.toggle('keyboard-navigation-active', accessibility.isKeyboardNavigation);
  }, [
    accessibility.isScreenReaderActive,
    accessibility.prefersReducedMotion,
    accessibility.prefersHighContrast,
    accessibility.isKeyboardNavigation
  ]);

  const contextValue: AccessibilityContextType = {
    isScreenReaderActive: accessibility.isScreenReaderActive,
    prefersReducedMotion: accessibility.prefersReducedMotion,
    prefersHighContrast: accessibility.prefersHighContrast,
    isKeyboardNavigation: accessibility.isKeyboardNavigation,
    announce,
  };

  return (
    <AccessibilityContext.Provider value={contextValue}>
      {enableSkipLinks && <DefaultSkipLinks />}
      {enableLiveRegion && (
        <LiveRegion 
          message={liveMessage} 
          priority={livePriority}
          id="global-live-region"
        />
      )}
      {children}
    </AccessibilityContext.Provider>
  );
}

/**
 * Hook for announcing messages to screen readers
 */
export function useAnnouncer() {
  const { announce } = useAccessibilityContext();
  
  const announceNavigation = React.useCallback((page: string) => {
    announce(`Navigated to ${page}`, 'polite');
  }, [announce]);

  const announceError = React.useCallback((error: string) => {
    announce(`Error: ${error}`, 'assertive');
  }, [announce]);

  const announceSuccess = React.useCallback((message: string) => {
    announce(`Success: ${message}`, 'polite');
  }, [announce]);

  const announceLoading = React.useCallback((message: string = 'Loading') => {
    announce(message, 'polite');
  }, [announce]);

  const announceLoadingComplete = React.useCallback((message: string = 'Loading complete') => {
    announce(message, 'polite');
  }, [announce]);

  return {
    announce,
    announceNavigation,
    announceError,
    announceSuccess,
    announceLoading,
    announceLoadingComplete,
  };
}