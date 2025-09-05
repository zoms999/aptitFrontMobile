/**
 * Responsive design utilities and breakpoint management
 */

export const breakpoints = {
  xs: 320,
  sm: 480,
  md: 768,
  lg: 1024,
  xl: 1280,
  '2xl': 1536,
} as const;

export type Breakpoint = keyof typeof breakpoints;

export interface ResponsiveConfig {
  xs?: any;
  sm?: any;
  md?: any;
  lg?: any;
  xl?: any;
  '2xl'?: any;
}

/**
 * Get current breakpoint based on window width
 */
export function getCurrentBreakpoint(): Breakpoint {
  if (typeof window === 'undefined') return 'md';
  
  const width = window.innerWidth;
  
  if (width >= breakpoints['2xl']) return '2xl';
  if (width >= breakpoints.xl) return 'xl';
  if (width >= breakpoints.lg) return 'lg';
  if (width >= breakpoints.md) return 'md';
  if (width >= breakpoints.sm) return 'sm';
  return 'xs';
}

/**
 * Check if current viewport matches breakpoint
 */
export function matchesBreakpoint(breakpoint: Breakpoint): boolean {
  if (typeof window === 'undefined') return false;
  return window.innerWidth >= breakpoints[breakpoint];
}

/**
 * Get responsive value based on current breakpoint
 */
export function getResponsiveValue<T>(config: ResponsiveConfig & { default?: T }): T {
  const currentBreakpoint = getCurrentBreakpoint();
  
  // Check from largest to smallest breakpoint
  const orderedBreakpoints: Breakpoint[] = ['2xl', 'xl', 'lg', 'md', 'sm', 'xs'];
  const currentIndex = orderedBreakpoints.indexOf(currentBreakpoint);
  
  for (let i = currentIndex; i < orderedBreakpoints.length; i++) {
    const bp = orderedBreakpoints[i];
    if (config[bp] !== undefined) {
      return config[bp];
    }
  }
  
  return config.default as T;
}

/**
 * Generate responsive class names
 */
export function generateResponsiveClasses(
  baseClass: string,
  config: ResponsiveConfig
): string {
  const classes: string[] = [];
  
  Object.entries(config).forEach(([breakpoint, value]) => {
    if (value) {
      const prefix = breakpoint === 'xs' ? '' : `${breakpoint}:`;
      classes.push(`${prefix}${baseClass}-${value}`);
    }
  });
  
  return classes.join(' ');
}

/**
 * Container sizes for different breakpoints
 */
export const containerSizes = {
  xs: '100%',
  sm: '100%',
  md: '768px',
  lg: '1024px',
  xl: '1280px',
  '2xl': '1536px',
} as const;

/**
 * Grid column configurations for different breakpoints
 */
export const gridConfigs = {
  xs: { cols: 1, gap: 4 },
  sm: { cols: 2, gap: 4 },
  md: { cols: 3, gap: 6 },
  lg: { cols: 4, gap: 6 },
  xl: { cols: 5, gap: 8 },
  '2xl': { cols: 6, gap: 8 },
} as const;

/**
 * Typography scales for different breakpoints
 */
export const typographyScales = {
  xs: {
    h1: 'text-2xl',
    h2: 'text-xl',
    h3: 'text-lg',
    body: 'text-base',
    small: 'text-sm',
  },
  sm: {
    h1: 'text-3xl',
    h2: 'text-2xl',
    h3: 'text-xl',
    body: 'text-base',
    small: 'text-sm',
  },
  md: {
    h1: 'text-4xl',
    h2: 'text-3xl',
    h3: 'text-2xl',
    body: 'text-lg',
    small: 'text-base',
  },
  lg: {
    h1: 'text-5xl',
    h2: 'text-4xl',
    h3: 'text-3xl',
    body: 'text-lg',
    small: 'text-base',
  },
  xl: {
    h1: 'text-6xl',
    h2: 'text-5xl',
    h3: 'text-4xl',
    body: 'text-xl',
    small: 'text-lg',
  },
  '2xl': {
    h1: 'text-7xl',
    h2: 'text-6xl',
    h3: 'text-5xl',
    body: 'text-xl',
    small: 'text-lg',
  },
} as const;

/**
 * Spacing configurations for different breakpoints
 */
export const spacingConfigs = {
  xs: {
    container: 'px-4 py-2',
    section: 'py-4',
    card: 'p-4',
    button: 'px-4 py-2',
  },
  sm: {
    container: 'px-6 py-3',
    section: 'py-6',
    card: 'p-6',
    button: 'px-6 py-3',
  },
  md: {
    container: 'px-8 py-4',
    section: 'py-8',
    card: 'p-6',
    button: 'px-6 py-3',
  },
  lg: {
    container: 'px-12 py-6',
    section: 'py-12',
    card: 'p-8',
    button: 'px-8 py-4',
  },
  xl: {
    container: 'px-16 py-8',
    section: 'py-16',
    card: 'p-10',
    button: 'px-10 py-4',
  },
  '2xl': {
    container: 'px-20 py-10',
    section: 'py-20',
    card: 'p-12',
    button: 'px-12 py-5',
  },
} as const;

/**
 * Layout configurations for different screen orientations
 */
export interface LayoutConfig {
  orientation: 'portrait' | 'landscape';
  breakpoint: Breakpoint;
  containerClass: string;
  gridClass: string;
  spacingClass: string;
}

export function getLayoutConfig(): LayoutConfig {
  const breakpoint = getCurrentBreakpoint();
  const isLandscape = typeof window !== 'undefined' && window.innerWidth > window.innerHeight;
  const orientation = isLandscape ? 'landscape' : 'portrait';
  
  const gridConfig = gridConfigs[breakpoint];
  const spacingConfig = spacingConfigs[breakpoint];
  
  return {
    orientation,
    breakpoint,
    containerClass: `max-w-${containerSizes[breakpoint]} mx-auto ${spacingConfig.container}`,
    gridClass: `grid grid-cols-${gridConfig.cols} gap-${gridConfig.gap}`,
    spacingClass: spacingConfig.section,
  };
}

/**
 * Responsive image sizes
 */
export const imageSizes = {
  xs: '(max-width: 480px) 100vw',
  sm: '(max-width: 768px) 100vw',
  md: '(max-width: 1024px) 50vw',
  lg: '(max-width: 1280px) 33vw',
  xl: '25vw',
} as const;

export function getImageSizes(config?: Partial<typeof imageSizes>): string {
  const sizes = { ...imageSizes, ...config };
  return Object.values(sizes).join(', ');
}

/**
 * Touch target utilities
 */
export const touchTargets = {
  minimum: 'min-h-[44px] min-w-[44px]', // WCAG AA minimum
  recommended: 'min-h-[48px] min-w-[48px]', // Recommended size
  comfortable: 'min-h-[56px] min-w-[56px]', // Comfortable size
} as const;

/**
 * Safe area utilities for mobile devices
 */
export const safeAreaClasses = {
  top: 'pt-[env(safe-area-inset-top)]',
  bottom: 'pb-[env(safe-area-inset-bottom)]',
  left: 'pl-[env(safe-area-inset-left)]',
  right: 'pr-[env(safe-area-inset-right)]',
  all: 'p-[env(safe-area-inset-top)_env(safe-area-inset-right)_env(safe-area-inset-bottom)_env(safe-area-inset-left)]',
} as const;

/**
 * Responsive utility functions
 */
export const responsiveUtils = {
  /**
   * Check if device is mobile
   */
  isMobile: (): boolean => {
    return matchesBreakpoint('md') === false;
  },
  
  /**
   * Check if device is tablet
   */
  isTablet: (): boolean => {
    return matchesBreakpoint('md') && !matchesBreakpoint('lg');
  },
  
  /**
   * Check if device is desktop
   */
  isDesktop: (): boolean => {
    return matchesBreakpoint('lg');
  },
  
  /**
   * Get optimal column count for current breakpoint
   */
  getOptimalColumns: (maxColumns: number = 6): number => {
    const breakpoint = getCurrentBreakpoint();
    const config = gridConfigs[breakpoint];
    return Math.min(config.cols, maxColumns);
  },
  
  /**
   * Get responsive padding class
   */
  getResponsivePadding: (size: 'sm' | 'md' | 'lg' = 'md'): string => {
    const breakpoint = getCurrentBreakpoint();
    const multiplier = size === 'sm' ? 0.5 : size === 'lg' ? 1.5 : 1;
    
    switch (breakpoint) {
      case 'xs':
      case 'sm':
        return `p-${Math.round(4 * multiplier)}`;
      case 'md':
        return `p-${Math.round(6 * multiplier)}`;
      case 'lg':
      case 'xl':
      case '2xl':
        return `p-${Math.round(8 * multiplier)}`;
      default:
        return `p-${Math.round(6 * multiplier)}`;
    }
  },
};