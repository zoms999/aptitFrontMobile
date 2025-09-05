/**
 * Skip link component for keyboard navigation
 */

'use client';

import React from 'react';
import { cn } from '@/lib/utils';

export interface SkipLinkProps {
  href: string;
  children: React.ReactNode;
  className?: string;
}

export function SkipLink({ href, children, className }: SkipLinkProps) {
  return (
    <a
      href={href}
      className={cn(
        // Hidden by default, visible on focus
        'absolute -top-10 left-4 z-50',
        'bg-primary text-primary-foreground',
        'px-4 py-2 rounded-md',
        'text-sm font-medium',
        'transition-all duration-200',
        'focus:top-4 focus:outline-none focus:ring-2 focus:ring-ring',
        'skip-link',
        className
      )}
      onFocus={(e) => {
        // Ensure the skip link is visible when focused
        e.currentTarget.style.top = '1rem';
      }}
      onBlur={(e) => {
        // Hide the skip link when focus is lost
        e.currentTarget.style.top = '-2.5rem';
      }}
    >
      {children}
    </a>
  );
}

export interface SkipLinksProps {
  links: Array<{
    href: string;
    label: string;
  }>;
  className?: string;
}

/**
 * Collection of skip links for main navigation
 */
export function SkipLinks({ links, className }: SkipLinksProps) {
  return (
    <nav
      className={cn('skip-links-container', className)}
      aria-label="Skip navigation links"
    >
      {links.map((link, index) => (
        <SkipLink key={index} href={link.href}>
          {link.label}
        </SkipLink>
      ))}
    </nav>
  );
}

/**
 * Default skip links for the application
 */
export function DefaultSkipLinks() {
  const defaultLinks = [
    { href: '#main-content', label: 'Skip to main content' },
    { href: '#navigation', label: 'Skip to navigation' },
    { href: '#footer', label: 'Skip to footer' },
  ];

  return <SkipLinks links={defaultLinks} />;
}