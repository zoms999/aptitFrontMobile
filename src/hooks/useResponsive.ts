/**
 * Hook for responsive design and layout management
 */

import { useState, useEffect, useCallback } from 'react';
import { 
  getCurrentBreakpoint, 
  matchesBreakpoint, 
  getLayoutConfig,
  getResponsiveValue,
  responsiveUtils,
  type Breakpoint,
  type ResponsiveConfig,
  type LayoutConfig
} from '@/lib/responsive';

export interface UseResponsiveReturn {
  breakpoint: Breakpoint;
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  orientation: 'portrait' | 'landscape';
  layoutConfig: LayoutConfig;
  matchesBreakpoint: (bp: Breakpoint) => boolean;
  getResponsiveValue: <T>(config: ResponsiveConfig & { default?: T }) => T;
}

/**
 * Hook for responsive design utilities
 */
export function useResponsive(): UseResponsiveReturn {
  const [breakpoint, setBreakpoint] = useState<Breakpoint>('md');
  const [orientation, setOrientation] = useState<'portrait' | 'landscape'>('portrait');
  const [layoutConfig, setLayoutConfig] = useState<LayoutConfig>(() => getLayoutConfig());

  const updateLayout = useCallback(() => {
    const newBreakpoint = getCurrentBreakpoint();
    const newOrientation = window.innerWidth > window.innerHeight ? 'landscape' : 'portrait';
    const newLayoutConfig = getLayoutConfig();

    setBreakpoint(newBreakpoint);
    setOrientation(newOrientation);
    setLayoutConfig(newLayoutConfig);
  }, []);

  useEffect(() => {
    // Initial setup
    updateLayout();

    // Add resize listener
    const handleResize = () => {
      updateLayout();
    };

    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleResize);
    };
  }, [updateLayout]);

  return {
    breakpoint,
    isMobile: responsiveUtils.isMobile(),
    isTablet: responsiveUtils.isTablet(),
    isDesktop: responsiveUtils.isDesktop(),
    orientation,
    layoutConfig,
    matchesBreakpoint,
    getResponsiveValue,
  };
}

/**
 * Hook for responsive grid configuration
 */
export function useResponsiveGrid(maxColumns?: number) {
  const { breakpoint } = useResponsive();
  
  const columns = responsiveUtils.getOptimalColumns(maxColumns);
  const gridClass = `grid grid-cols-${columns} gap-4 md:gap-6`;
  
  return {
    columns,
    gridClass,
    breakpoint,
  };
}

/**
 * Hook for responsive spacing
 */
export function useResponsiveSpacing() {
  const { breakpoint } = useResponsive();
  
  const getSpacing = useCallback((size: 'sm' | 'md' | 'lg' = 'md') => {
    return responsiveUtils.getResponsivePadding(size);
  }, []);
  
  return {
    getSpacing,
    containerPadding: getSpacing('md'),
    cardPadding: getSpacing('sm'),
    sectionPadding: getSpacing('lg'),
  };
}

/**
 * Hook for responsive typography
 */
export function useResponsiveTypography() {
  const { breakpoint } = useResponsive();
  
  const getTypographyClass = useCallback((element: 'h1' | 'h2' | 'h3' | 'body' | 'small') => {
    const config: ResponsiveConfig = {
      xs: {
        h1: 'text-2xl font-bold',
        h2: 'text-xl font-semibold',
        h3: 'text-lg font-medium',
        body: 'text-base',
        small: 'text-sm',
      }[element],
      sm: {
        h1: 'text-3xl font-bold',
        h2: 'text-2xl font-semibold',
        h3: 'text-xl font-medium',
        body: 'text-base',
        small: 'text-sm',
      }[element],
      md: {
        h1: 'text-4xl font-bold',
        h2: 'text-3xl font-semibold',
        h3: 'text-2xl font-medium',
        body: 'text-lg',
        small: 'text-base',
      }[element],
      lg: {
        h1: 'text-5xl font-bold',
        h2: 'text-4xl font-semibold',
        h3: 'text-3xl font-medium',
        body: 'text-lg',
        small: 'text-base',
      }[element],
    };
    
    return getResponsiveValue(config);
  }, []);
  
  return {
    getTypographyClass,
    h1: getTypographyClass('h1'),
    h2: getTypographyClass('h2'),
    h3: getTypographyClass('h3'),
    body: getTypographyClass('body'),
    small: getTypographyClass('small'),
  };
}

/**
 * Hook for responsive image sizing
 */
export function useResponsiveImage() {
  const { breakpoint, isMobile } = useResponsive();
  
  const getImageSizes = useCallback((aspectRatio: 'square' | 'wide' | 'tall' = 'wide') => {
    if (isMobile) {
      return {
        width: aspectRatio === 'tall' ? 200 : 300,
        height: aspectRatio === 'square' ? 300 : aspectRatio === 'wide' ? 200 : 400,
        sizes: '100vw',
      };
    }
    
    return {
      width: aspectRatio === 'tall' ? 300 : 500,
      height: aspectRatio === 'square' ? 500 : aspectRatio === 'wide' ? 300 : 600,
      sizes: '(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw',
    };
  }, [isMobile]);
  
  return {
    getImageSizes,
    isMobile,
    breakpoint,
  };
}

/**
 * Hook for responsive navigation
 */
export function useResponsiveNavigation() {
  const { isMobile, isTablet, orientation } = useResponsive();
  
  const navigationStyle = isMobile 
    ? orientation === 'landscape' 
      ? 'side' 
      : 'bottom'
    : 'top';
    
  const showMobileMenu = isMobile;
  const showTabletMenu = isTablet;
  const showDesktopMenu = !isMobile && !isTablet;
  
  return {
    navigationStyle,
    showMobileMenu,
    showTabletMenu,
    showDesktopMenu,
    isMobile,
    isTablet,
    orientation,
  };
}

/**
 * Hook for responsive modal/dialog sizing
 */
export function useResponsiveModal() {
  const { isMobile, breakpoint } = useResponsive();
  
  const getModalClasses = useCallback((size: 'sm' | 'md' | 'lg' | 'xl' = 'md') => {
    if (isMobile) {
      return 'fixed inset-x-4 bottom-4 top-auto max-h-[80vh] rounded-t-lg';
    }
    
    const sizeClasses = {
      sm: 'max-w-sm',
      md: 'max-w-md',
      lg: 'max-w-lg',
      xl: 'max-w-xl',
    };
    
    return `fixed inset-0 m-auto ${sizeClasses[size]} max-h-[90vh] rounded-lg`;
  }, [isMobile]);
  
  return {
    getModalClasses,
    isMobile,
    isFullscreen: isMobile,
  };
}

/**
 * Hook for responsive form layouts
 */
export function useResponsiveForm() {
  const { isMobile, breakpoint } = useResponsive();
  
  const getFormClasses = useCallback(() => {
    if (isMobile) {
      return 'space-y-4';
    }
    
    return 'space-y-6 md:space-y-4 md:grid md:grid-cols-2 md:gap-6';
  }, [isMobile]);
  
  const getFieldClasses = useCallback((fullWidth = false) => {
    if (isMobile || fullWidth) {
      return 'col-span-full';
    }
    
    return 'col-span-1';
  }, [isMobile]);
  
  return {
    getFormClasses,
    getFieldClasses,
    isMobile,
    stackVertically: isMobile,
  };
}