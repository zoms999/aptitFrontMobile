'use client';

/**
 * Client-side minification utilities for performance optimization
 */

// Minify CSS by removing unnecessary whitespace and comments
export function minifyCSS(css: string): string {
  return css
    // Remove comments
    .replace(/\/\*[\s\S]*?\*\//g, '')
    // Remove unnecessary whitespace
    .replace(/\s+/g, ' ')
    // Remove whitespace around specific characters
    .replace(/\s*([{}:;,>+~])\s*/g, '$1')
    // Remove trailing semicolons
    .replace(/;}/g, '}')
    // Remove leading/trailing whitespace
    .trim();
}

// Minify JavaScript by removing comments and unnecessary whitespace
export function minifyJS(js: string): string {
  return js
    // Remove single-line comments (but preserve URLs)
    .replace(/(?<!:)\/\/.*$/gm, '')
    // Remove multi-line comments
    .replace(/\/\*[\s\S]*?\*\//g, '')
    // Remove unnecessary whitespace
    .replace(/\s+/g, ' ')
    // Remove whitespace around operators and punctuation
    .replace(/\s*([{}();,=+\-*/<>!&|])\s*/g, '$1')
    // Remove leading/trailing whitespace
    .trim();
}

// Minify HTML by removing unnecessary whitespace
export function minifyHTML(html: string): string {
  return html
    // Remove HTML comments (but preserve conditional comments)
    .replace(/<!--(?!\[if)[\s\S]*?-->/g, '')
    // Remove whitespace between tags
    .replace(/>\s+</g, '><')
    // Remove leading/trailing whitespace in text nodes
    .replace(/\s+/g, ' ')
    // Remove whitespace around specific tags
    .replace(/\s*(<\/?(?:br|hr|img|input|meta|link)(?:\s[^>]*)?>)\s*/gi, '$1')
    .trim();
}

// Minify JSON by removing unnecessary whitespace
export function minifyJSON(json: string): string {
  try {
    return JSON.stringify(JSON.parse(json));
  } catch (error) {
    console.warn('Invalid JSON, returning original:', error);
    return json;
  }
}

// Remove unused CSS rules based on DOM content
export function removeUnusedCSS(css: string, htmlContent: string): string {
  const usedSelectors = new Set<string>();
  
  // Extract all class names and IDs from HTML
  const classMatches = htmlContent.match(/class="([^"]*)"/g) || [];
  const idMatches = htmlContent.match(/id="([^"]*)"/g) || [];
  const tagMatches = htmlContent.match(/<(\w+)/g) || [];
  
  // Collect used selectors
  classMatches.forEach(match => {
    const classes = match.replace(/class="([^"]*)"/, '$1').split(/\s+/);
    classes.forEach(cls => cls && usedSelectors.add(`.${cls}`));
  });
  
  idMatches.forEach(match => {
    const id = match.replace(/id="([^"]*)"/, '$1');
    id && usedSelectors.add(`#${id}`);
  });
  
  tagMatches.forEach(match => {
    const tag = match.replace(/<(\w+)/, '$1').toLowerCase();
    usedSelectors.add(tag);
  });
  
  // Filter CSS rules
  const cssRules = css.split('}');
  const filteredRules = cssRules.filter(rule => {
    if (!rule.trim()) return false;
    
    const selector = rule.split('{')[0]?.trim();
    if (!selector) return false;
    
    // Keep @rules (media queries, keyframes, etc.)
    if (selector.startsWith('@')) return true;
    
    // Check if any part of the selector is used
    const selectorParts = selector.split(',').map(s => s.trim());
    return selectorParts.some(part => {
      // Simple selector matching (can be improved)
      const cleanSelector = part.replace(/::?[\w-]+/g, '').trim();
      return Array.from(usedSelectors).some(used => 
        cleanSelector.includes(used) || used.includes(cleanSelector)
      );
    });
  });
  
  return filteredRules.join('}');
}

// Optimize images by reducing quality and size
export async function optimizeImageData(
  imageData: string,
  options: {
    maxWidth?: number;
    maxHeight?: number;
    quality?: number;
    format?: 'jpeg' | 'webp' | 'png';
  } = {}
): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    const {
      maxWidth = 1920,
      maxHeight = 1080,
      quality = 0.8,
      format = 'jpeg'
    } = options;
    
    img.onload = () => {
      let { width, height } = img;
      
      // Calculate new dimensions
      if (width > maxWidth || height > maxHeight) {
        const ratio = Math.min(maxWidth / width, maxHeight / height);
        width *= ratio;
        height *= ratio;
      }
      
      canvas.width = width;
      canvas.height = height;
      
      // Draw and optimize
      ctx?.drawImage(img, 0, 0, width, height);
      
      const mimeType = format === 'png' ? 'image/png' : 
                      format === 'webp' ? 'image/webp' : 'image/jpeg';
      
      const optimizedData = canvas.toDataURL(mimeType, quality);
      resolve(optimizedData);
    };
    
    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = imageData;
  });
}

// Bundle and minify multiple CSS files
export function bundleAndMinifyCSS(cssFiles: string[]): string {
  const combined = cssFiles.join('\n');
  return minifyCSS(combined);
}

// Bundle and minify multiple JS files
export function bundleAndMinifyJS(jsFiles: string[]): string {
  const combined = jsFiles.join(';\n');
  return minifyJS(combined);
}

// Calculate size reduction
export function calculateSizeReduction(original: string, minified: string): {
  originalSize: number;
  minifiedSize: number;
  reduction: number;
  percentage: number;
} {
  const originalSize = new TextEncoder().encode(original).length;
  const minifiedSize = new TextEncoder().encode(minified).length;
  const reduction = originalSize - minifiedSize;
  const percentage = (reduction / originalSize) * 100;
  
  return {
    originalSize,
    minifiedSize,
    reduction,
    percentage
  };
}

// Optimize SVG by removing unnecessary elements
export function optimizeSVG(svg: string): string {
  return svg
    // Remove XML declaration and DOCTYPE
    .replace(/<\?xml[^>]*\?>/g, '')
    .replace(/<!DOCTYPE[^>]*>/g, '')
    // Remove comments
    .replace(/<!--[\s\S]*?-->/g, '')
    // Remove unnecessary attributes
    .replace(/\s+(xmlns:[\w-]+="[^"]*")/g, '')
    .replace(/\s+version="[^"]*"/g, '')
    // Remove empty groups
    .replace(/<g[^>]*>\s*<\/g>/g, '')
    // Remove unnecessary whitespace
    .replace(/\s+/g, ' ')
    .replace(/>\s+</g, '><')
    .trim();
}

// Preprocess and optimize resources
export interface OptimizationResult {
  css: string;
  js: string;
  html: string;
  images: Map<string, string>;
  totalSavings: number;
}

export async function optimizeResources(resources: {
  css?: string[];
  js?: string[];
  html?: string;
  images?: Map<string, string>;
}): Promise<OptimizationResult> {
  const result: OptimizationResult = {
    css: '',
    js: '',
    html: '',
    images: new Map(),
    totalSavings: 0
  };
  
  let totalOriginalSize = 0;
  let totalOptimizedSize = 0;
  
  // Optimize CSS
  if (resources.css?.length) {
    const originalCSS = resources.css.join('\n');
    result.css = bundleAndMinifyCSS(resources.css);
    
    if (resources.html) {
      result.css = removeUnusedCSS(result.css, resources.html);
    }
    
    const cssStats = calculateSizeReduction(originalCSS, result.css);
    totalOriginalSize += cssStats.originalSize;
    totalOptimizedSize += cssStats.minifiedSize;
  }
  
  // Optimize JavaScript
  if (resources.js?.length) {
    const originalJS = resources.js.join('\n');
    result.js = bundleAndMinifyJS(resources.js);
    
    const jsStats = calculateSizeReduction(originalJS, result.js);
    totalOriginalSize += jsStats.originalSize;
    totalOptimizedSize += jsStats.minifiedSize;
  }
  
  // Optimize HTML
  if (resources.html) {
    result.html = minifyHTML(resources.html);
    
    const htmlStats = calculateSizeReduction(resources.html, result.html);
    totalOriginalSize += htmlStats.originalSize;
    totalOptimizedSize += htmlStats.minifiedSize;
  }
  
  // Optimize images
  if (resources.images?.size) {
    for (const [key, imageData] of resources.images) {
      try {
        const optimized = await optimizeImageData(imageData, {
          maxWidth: 1920,
          maxHeight: 1080,
          quality: 0.8,
          format: 'webp'
        });
        
        result.images.set(key, optimized);
        
        totalOriginalSize += imageData.length;
        totalOptimizedSize += optimized.length;
      } catch (error) {
        console.warn(`Failed to optimize image ${key}:`, error);
        result.images.set(key, imageData);
      }
    }
  }
  
  result.totalSavings = ((totalOriginalSize - totalOptimizedSize) / totalOriginalSize) * 100;
  
  return result;
}