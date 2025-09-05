/**
 * Responsive grid components for flexible layouts
 */

import React from 'react';
import { cn } from '@/lib/utils';
import { useResponsive, useResponsiveGrid } from '@/hooks/useResponsive';

export interface ResponsiveGridProps {
  children: React.ReactNode;
  className?: string;
  maxColumns?: number;
  gap?: 'sm' | 'md' | 'lg';
  minItemWidth?: string;
}

/**
 * Responsive grid container that adapts to screen size
 */
export function ResponsiveGrid({ 
  children, 
  className, 
  maxColumns = 4,
  gap = 'md',
  minItemWidth = '250px'
}: ResponsiveGridProps) {
  const { columns, breakpoint } = useResponsiveGrid(maxColumns);
  
  const gapClasses = {
    sm: 'gap-2 md:gap-4',
    md: 'gap-4 md:gap-6',
    lg: 'gap-6 md:gap-8',
  };
  
  return (
    <div 
      className={cn(
        'grid auto-fit-grid',
        gapClasses[gap],
        className
      )}
      style={{
        gridTemplateColumns: `repeat(auto-fit, minmax(${minItemWidth}, 1fr))`,
      }}
    >
      {children}
    </div>
  );
}

export interface ResponsiveContainerProps {
  children: React.ReactNode;
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  padding?: boolean;
}

/**
 * Responsive container with max-width constraints
 */
export function ResponsiveContainer({ 
  children, 
  className, 
  size = 'lg',
  padding = true 
}: ResponsiveContainerProps) {
  const { layoutConfig } = useResponsive();
  
  const sizeClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-4xl',
    xl: 'max-w-6xl',
    full: 'max-w-full',
  };
  
  return (
    <div 
      className={cn(
        'mx-auto w-full',
        sizeClasses[size],
        padding && 'px-4 sm:px-6 lg:px-8',
        className
      )}
    >
      {children}
    </div>
  );
}

export interface ResponsiveColumnsProps {
  children: React.ReactNode;
  className?: string;
  columns?: {
    xs?: number;
    sm?: number;
    md?: number;
    lg?: number;
    xl?: number;
  };
  gap?: 'sm' | 'md' | 'lg';
}

/**
 * Responsive columns with breakpoint-specific column counts
 */
export function ResponsiveColumns({ 
  children, 
  className,
  columns = { xs: 1, sm: 2, md: 3, lg: 4 },
  gap = 'md'
}: ResponsiveColumnsProps) {
  const gapClasses = {
    sm: 'gap-2',
    md: 'gap-4',
    lg: 'gap-6',
  };
  
  const columnClasses = Object.entries(columns)
    .map(([breakpoint, count]) => {
      const prefix = breakpoint === 'xs' ? '' : `${breakpoint}:`;
      return `${prefix}grid-cols-${count}`;
    })
    .join(' ');
  
  return (
    <div 
      className={cn(
        'grid',
        columnClasses,
        gapClasses[gap],
        className
      )}
    >
      {children}
    </div>
  );
}

export interface ResponsiveStackProps {
  children: React.ReactNode;
  className?: string;
  direction?: {
    xs?: 'row' | 'col';
    sm?: 'row' | 'col';
    md?: 'row' | 'col';
    lg?: 'row' | 'col';
  };
  gap?: 'sm' | 'md' | 'lg';
  align?: 'start' | 'center' | 'end' | 'stretch';
  justify?: 'start' | 'center' | 'end' | 'between' | 'around' | 'evenly';
}

/**
 * Responsive flex stack with direction changes at breakpoints
 */
export function ResponsiveStack({ 
  children, 
  className,
  direction = { xs: 'col', md: 'row' },
  gap = 'md',
  align = 'start',
  justify = 'start'
}: ResponsiveStackProps) {
  const gapClasses = {
    sm: 'gap-2',
    md: 'gap-4',
    lg: 'gap-6',
  };
  
  const alignClasses = {
    start: 'items-start',
    center: 'items-center',
    end: 'items-end',
    stretch: 'items-stretch',
  };
  
  const justifyClasses = {
    start: 'justify-start',
    center: 'justify-center',
    end: 'justify-end',
    between: 'justify-between',
    around: 'justify-around',
    evenly: 'justify-evenly',
  };
  
  const directionClasses = Object.entries(direction)
    .map(([breakpoint, dir]) => {
      const prefix = breakpoint === 'xs' ? '' : `${breakpoint}:`;
      return `${prefix}flex-${dir}`;
    })
    .join(' ');
  
  return (
    <div 
      className={cn(
        'flex',
        directionClasses,
        gapClasses[gap],
        alignClasses[align],
        justifyClasses[justify],
        className
      )}
    >
      {children}
    </div>
  );
}

export interface ResponsiveCardProps {
  children: React.ReactNode;
  className?: string;
  padding?: 'sm' | 'md' | 'lg';
  hover?: boolean;
}

/**
 * Responsive card component with adaptive padding
 */
export function ResponsiveCard({ 
  children, 
  className,
  padding = 'md',
  hover = false
}: ResponsiveCardProps) {
  const { isMobile } = useResponsive();
  
  const paddingClasses = {
    sm: isMobile ? 'p-3' : 'p-4',
    md: isMobile ? 'p-4' : 'p-6',
    lg: isMobile ? 'p-6' : 'p-8',
  };
  
  return (
    <div 
      className={cn(
        'bg-card text-card-foreground rounded-lg border shadow-sm',
        paddingClasses[padding],
        hover && 'transition-shadow hover:shadow-md',
        className
      )}
    >
      {children}
    </div>
  );
}

export interface ResponsiveTextProps {
  children: React.ReactNode;
  className?: string;
  variant?: 'h1' | 'h2' | 'h3' | 'h4' | 'body' | 'small' | 'caption';
  responsive?: boolean;
}

/**
 * Responsive text component with adaptive sizing
 */
export function ResponsiveText({ 
  children, 
  className,
  variant = 'body',
  responsive = true
}: ResponsiveTextProps) {
  const { isMobile } = useResponsive();
  
  const getVariantClasses = () => {
    if (!responsive) {
      const staticClasses = {
        h1: 'text-4xl font-bold',
        h2: 'text-3xl font-semibold',
        h3: 'text-2xl font-medium',
        h4: 'text-xl font-medium',
        body: 'text-base',
        small: 'text-sm',
        caption: 'text-xs',
      };
      return staticClasses[variant];
    }
    
    const responsiveClasses = {
      h1: isMobile ? 'text-2xl font-bold' : 'text-4xl font-bold md:text-5xl',
      h2: isMobile ? 'text-xl font-semibold' : 'text-3xl font-semibold md:text-4xl',
      h3: isMobile ? 'text-lg font-medium' : 'text-2xl font-medium md:text-3xl',
      h4: isMobile ? 'text-base font-medium' : 'text-xl font-medium md:text-2xl',
      body: isMobile ? 'text-sm' : 'text-base md:text-lg',
      small: isMobile ? 'text-xs' : 'text-sm',
      caption: 'text-xs',
    };
    
    return responsiveClasses[variant];
  };
  
  const Component = variant.startsWith('h') ? variant as keyof JSX.IntrinsicElements : 'p';
  
  return (
    <Component className={cn(getVariantClasses(), className)}>
      {children}
    </Component>
  );
}

export interface ResponsiveImageProps {
  src: string;
  alt: string;
  className?: string;
  aspectRatio?: 'square' | 'video' | 'wide' | 'tall';
  sizes?: string;
  priority?: boolean;
}

/**
 * Responsive image component with adaptive sizing
 */
export function ResponsiveImage({ 
  src, 
  alt, 
  className,
  aspectRatio = 'wide',
  sizes,
  priority = false
}: ResponsiveImageProps) {
  const { isMobile } = useResponsive();
  
  const aspectRatioClasses = {
    square: 'aspect-square',
    video: 'aspect-video',
    wide: 'aspect-[16/9]',
    tall: 'aspect-[3/4]',
  };
  
  const defaultSizes = isMobile 
    ? '100vw'
    : '(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw';
  
  return (
    <div className={cn('relative overflow-hidden rounded-lg', aspectRatioClasses[aspectRatio], className)}>
      <img
        src={src}
        alt={alt}
        className="absolute inset-0 h-full w-full object-cover"
        sizes={sizes || defaultSizes}
        loading={priority ? 'eager' : 'lazy'}
      />
    </div>
  );
}

/**
 * Responsive spacer component
 */
export interface ResponsiveSpacerProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

export function ResponsiveSpacer({ size = 'md', className }: ResponsiveSpacerProps) {
  const { isMobile } = useResponsive();
  
  const sizeClasses = {
    sm: isMobile ? 'h-4' : 'h-6',
    md: isMobile ? 'h-6' : 'h-8',
    lg: isMobile ? 'h-8' : 'h-12',
    xl: isMobile ? 'h-12' : 'h-16',
  };
  
  return <div className={cn(sizeClasses[size], className)} />;
}