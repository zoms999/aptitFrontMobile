/**
 * Live region component for screen reader announcements
 */

'use client';

import React, { useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';

export interface LiveRegionProps {
  message?: string;
  priority?: 'polite' | 'assertive' | 'off';
  atomic?: boolean;
  relevant?: 'additions' | 'removals' | 'text' | 'all';
  className?: string;
  id?: string;
}

export function LiveRegion({
  message = '',
  priority = 'polite',
  atomic = true,
  relevant = 'all',
  className,
  id = 'live-region',
}: LiveRegionProps) {
  const regionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (regionRef.current && message) {
      // Clear and set message to ensure it's announced
      regionRef.current.textContent = '';
      setTimeout(() => {
        if (regionRef.current) {
          regionRef.current.textContent = message;
        }
      }, 100);

      // Clear message after announcement
      const timeout = setTimeout(() => {
        if (regionRef.current) {
          regionRef.current.textContent = '';
        }
      }, 3000);

      return () => clearTimeout(timeout);
    }
  }, [message]);

  return (
    <div
      ref={regionRef}
      id={id}
      aria-live={priority}
      aria-atomic={atomic}
      aria-relevant={relevant}
      className={cn('sr-only', className)}
      role="status"
    />
  );
}

/**
 * Hook for managing live region announcements
 */
export function useLiveRegion() {
  const [message, setMessage] = React.useState('');
  const [priority, setPriority] = React.useState<'polite' | 'assertive'>('polite');

  const announce = React.useCallback((
    newMessage: string, 
    newPriority: 'polite' | 'assertive' = 'polite'
  ) => {
    setPriority(newPriority);
    setMessage(newMessage);
  }, []);

  const clear = React.useCallback(() => {
    setMessage('');
  }, []);

  return {
    message,
    priority,
    announce,
    clear,
    LiveRegion: (props: Omit<LiveRegionProps, 'message' | 'priority'>) => (
      <LiveRegion {...props} message={message} priority={priority} />
    ),
  };
}

/**
 * Status announcer component for form validation and other status updates
 */
export interface StatusAnnouncerProps {
  status?: 'success' | 'error' | 'warning' | 'info';
  message?: string;
  className?: string;
}

export function StatusAnnouncer({ status, message, className }: StatusAnnouncerProps) {
  const priority = status === 'error' ? 'assertive' : 'polite';
  
  const statusIcon = {
    success: '✓',
    error: '✗',
    warning: '⚠',
    info: 'ℹ',
  }[status || 'info'];

  const fullMessage = message ? `${statusIcon} ${message}` : '';

  return (
    <LiveRegion
      message={fullMessage}
      priority={priority}
      className={cn('status-announcer', className)}
    />
  );
}

/**
 * Navigation announcer for route changes
 */
export interface NavigationAnnouncerProps {
  currentPage?: string;
  className?: string;
}

export function NavigationAnnouncer({ currentPage, className }: NavigationAnnouncerProps) {
  const message = currentPage ? `Navigated to ${currentPage}` : '';

  return (
    <LiveRegion
      message={message}
      priority="polite"
      className={cn('navigation-announcer', className)}
    />
  );
}