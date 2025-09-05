/**
 * Focus management components and utilities
 */

'use client';

import React, { useEffect, useRef, useCallback } from 'react';
import { cn } from '@/lib/utils';

export interface FocusTrapProps {
  children: React.ReactNode;
  active?: boolean;
  restoreFocus?: boolean;
  className?: string;
}

/**
 * Focus trap component for modals and dialogs
 */
export function FocusTrap({ 
  children, 
  active = true, 
  restoreFocus = true, 
  className 
}: FocusTrapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!active || !containerRef.current) return;

    const container = containerRef.current;
    
    // Store the previously focused element
    if (restoreFocus) {
      previousFocusRef.current = document.activeElement as HTMLElement;
    }

    // Get all focusable elements
    const getFocusableElements = (): HTMLElement[] => {
      const focusableSelectors = [
        'a[href]',
        'button:not([disabled])',
        'textarea:not([disabled])',
        'input:not([disabled])',
        'select:not([disabled])',
        '[tabindex]:not([tabindex="-1"])',
        '[contenteditable="true"]',
      ];

      return Array.from(
        container.querySelectorAll(focusableSelectors.join(', '))
      ) as HTMLElement[];
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;

      const focusableElements = getFocusableElements();
      if (focusableElements.length === 0) return;

      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];

      if (e.shiftKey) {
        // Shift + Tab
        if (document.activeElement === firstElement) {
          e.preventDefault();
          lastElement.focus();
        }
      } else {
        // Tab
        if (document.activeElement === lastElement) {
          e.preventDefault();
          firstElement.focus();
        }
      }
    };

    // Focus the first focusable element
    const focusableElements = getFocusableElements();
    if (focusableElements.length > 0) {
      focusableElements[0].focus();
    }

    // Add event listener
    container.addEventListener('keydown', handleKeyDown);

    return () => {
      container.removeEventListener('keydown', handleKeyDown);
      
      // Restore focus to the previously focused element
      if (restoreFocus && previousFocusRef.current) {
        previousFocusRef.current.focus();
      }
    };
  }, [active, restoreFocus]);

  return (
    <div
      ref={containerRef}
      className={cn('focus-trap', className)}
      tabIndex={-1}
    >
      {children}
    </div>
  );
}

export interface FocusGuardProps {
  onFocus: () => void;
}

/**
 * Invisible focus guard for focus trapping
 */
export function FocusGuard({ onFocus }: FocusGuardProps) {
  return (
    <div
      tabIndex={0}
      onFocus={onFocus}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: 1,
        height: 1,
        opacity: 0,
        pointerEvents: 'none',
      }}
      aria-hidden="true"
    />
  );
}

export interface AutoFocusProps {
  children: React.ReactNode;
  delay?: number;
  selector?: string;
  className?: string;
}

/**
 * Component that automatically focuses its first focusable child or a specific element
 */
export function AutoFocus({ 
  children, 
  delay = 100, 
  selector, 
  className 
}: AutoFocusProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (!containerRef.current) return;

      let elementToFocus: HTMLElement | null = null;

      if (selector) {
        elementToFocus = containerRef.current.querySelector(selector) as HTMLElement;
      } else {
        // Find first focusable element
        const focusableSelectors = [
          'button:not([disabled])',
          'input:not([disabled])',
          'select:not([disabled])',
          'textarea:not([disabled])',
          'a[href]',
          '[tabindex]:not([tabindex="-1"])',
        ];

        for (const sel of focusableSelectors) {
          elementToFocus = containerRef.current.querySelector(sel) as HTMLElement;
          if (elementToFocus) break;
        }
      }

      if (elementToFocus) {
        elementToFocus.focus();
      }
    }, delay);

    return () => clearTimeout(timer);
  }, [delay, selector]);

  return (
    <div ref={containerRef} className={className}>
      {children}
    </div>
  );
}

/**
 * Hook for managing focus programmatically
 */
export function useFocusManager() {
  const focusElement = useCallback((element: HTMLElement | string) => {
    let targetElement: HTMLElement | null = null;

    if (typeof element === 'string') {
      targetElement = document.querySelector(element) as HTMLElement;
    } else {
      targetElement = element;
    }

    if (targetElement) {
      // Ensure element is focusable
      if (!targetElement.hasAttribute('tabindex') && 
          !targetElement.matches('a, button, input, select, textarea')) {
        targetElement.setAttribute('tabindex', '-1');
      }

      targetElement.focus();
      
      // Scroll into view if needed
      targetElement.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
        inline: 'nearest'
      });
    }
  }, []);

  const focusFirstElement = useCallback((container?: HTMLElement | string) => {
    let containerElement: HTMLElement | null = document.body;

    if (container) {
      if (typeof container === 'string') {
        containerElement = document.querySelector(container) as HTMLElement;
      } else {
        containerElement = container;
      }
    }

    if (!containerElement) return;

    const focusableSelectors = [
      'button:not([disabled])',
      'input:not([disabled])',
      'select:not([disabled])',
      'textarea:not([disabled])',
      'a[href]',
      '[tabindex]:not([tabindex="-1"])',
    ];

    for (const selector of focusableSelectors) {
      const element = containerElement.querySelector(selector) as HTMLElement;
      if (element) {
        focusElement(element);
        break;
      }
    }
  }, [focusElement]);

  const focusLastElement = useCallback((container?: HTMLElement | string) => {
    let containerElement: HTMLElement | null = document.body;

    if (container) {
      if (typeof container === 'string') {
        containerElement = document.querySelector(container) as HTMLElement;
      } else {
        containerElement = container;
      }
    }

    if (!containerElement) return;

    const focusableSelectors = [
      'button:not([disabled])',
      'input:not([disabled])',
      'select:not([disabled])',
      'textarea:not([disabled])',
      'a[href]',
      '[tabindex]:not([tabindex="-1"])',
    ];

    const allFocusable = containerElement.querySelectorAll(
      focusableSelectors.join(', ')
    ) as NodeListOf<HTMLElement>;

    if (allFocusable.length > 0) {
      focusElement(allFocusable[allFocusable.length - 1]);
    }
  }, [focusElement]);

  return {
    focusElement,
    focusFirstElement,
    focusLastElement,
  };
}

export interface FocusIndicatorProps {
  children: React.ReactNode;
  className?: string;
  visible?: boolean;
}

/**
 * Enhanced focus indicator for better visibility
 */
export function FocusIndicator({ children, className, visible }: FocusIndicatorProps) {
  return (
    <div
      className={cn(
        'relative',
        'focus-within:ring-2 focus-within:ring-primary focus-within:ring-offset-2',
        visible && 'ring-2 ring-primary ring-offset-2',
        className
      )}
    >
      {children}
    </div>
  );
}