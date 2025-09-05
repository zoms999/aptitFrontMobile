'use client';

/**
 * Compression utilities for mobile performance optimization
 */

// Gzip compression for text data
export async function compressText(text: string): Promise<Uint8Array> {
  if (typeof CompressionStream !== 'undefined') {
    const stream = new CompressionStream('gzip');
    const writer = stream.writable.getWriter();
    const reader = stream.readable.getReader();
    
    const encoder = new TextEncoder();
    const chunks: Uint8Array[] = [];
    
    // Start reading compressed data
    const readPromise = (async () => {
      let result;
      while (!(result = await reader.read()).done) {
        chunks.push(result.value);
      }
    })();
    
    // Write data to compress
    await writer.write(encoder.encode(text));
    await writer.close();
    
    // Wait for compression to complete
    await readPromise;
    
    // Combine chunks
    const totalLength = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
    const compressed = new Uint8Array(totalLength);
    let offset = 0;
    
    for (const chunk of chunks) {
      compressed.set(chunk, offset);
      offset += chunk.length;
    }
    
    return compressed;
  } else {
    // Fallback: return original text as bytes
    return new TextEncoder().encode(text);
  }
}

// Decompress gzipped data
export async function decompressText(compressed: Uint8Array): Promise<string> {
  if (typeof DecompressionStream !== 'undefined') {
    const stream = new DecompressionStream('gzip');
    const writer = stream.writable.getWriter();
    const reader = stream.readable.getReader();
    
    const decoder = new TextDecoder();
    const chunks: string[] = [];
    
    // Start reading decompressed data
    const readPromise = (async () => {
      let result;
      while (!(result = await reader.read()).done) {
        chunks.push(decoder.decode(result.value, { stream: true }));
      }
      chunks.push(decoder.decode()); // Final chunk
    })();
    
    // Write compressed data
    await writer.write(compressed);
    await writer.close();
    
    // Wait for decompression to complete
    await readPromise;
    
    return chunks.join('');
  } else {
    // Fallback: assume uncompressed
    return new TextDecoder().decode(compressed);
  }
}

// Compress JSON data
export async function compressJSON(data: any): Promise<Uint8Array> {
  const jsonString = JSON.stringify(data);
  return compressText(jsonString);
}

// Decompress JSON data
export async function decompressJSON(compressed: Uint8Array): Promise<any> {
  const jsonString = await decompressText(compressed);
  return JSON.parse(jsonString);
}

// Image compression utilities
export function compressImage(
  file: File,
  maxWidth: number = 1920,
  maxHeight: number = 1080,
  quality: number = 0.8
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();
    
    img.onload = () => {
      // Calculate new dimensions
      let { width, height } = img;
      
      if (width > maxWidth || height > maxHeight) {
        const ratio = Math.min(maxWidth / width, maxHeight / height);
        width *= ratio;
        height *= ratio;
      }
      
      // Set canvas size
      canvas.width = width;
      canvas.height = height;
      
      // Draw and compress
      ctx?.drawImage(img, 0, 0, width, height);
      
      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error('Failed to compress image'));
          }
        },
        'image/jpeg',
        quality
      );
    };
    
    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = URL.createObjectURL(file);
  });
}

// Convert image to WebP format
export function convertToWebP(
  file: File,
  quality: number = 0.8
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();
    
    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      
      ctx?.drawImage(img, 0, 0);
      
      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error('Failed to convert to WebP'));
          }
        },
        'image/webp',
        quality
      );
    };
    
    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = URL.createObjectURL(file);
  });
}

// Batch compression for multiple files
export async function compressBatch(
  files: File[],
  options: {
    maxWidth?: number;
    maxHeight?: number;
    quality?: number;
    format?: 'jpeg' | 'webp';
  } = {}
): Promise<Blob[]> {
  const {
    maxWidth = 1920,
    maxHeight = 1080,
    quality = 0.8,
    format = 'jpeg'
  } = options;
  
  const compressionPromises = files.map(file => {
    if (format === 'webp') {
      return convertToWebP(file, quality);
    } else {
      return compressImage(file, maxWidth, maxHeight, quality);
    }
  });
  
  return Promise.all(compressionPromises);
}

// Calculate compression ratio
export function getCompressionRatio(originalSize: number, compressedSize: number): number {
  return ((originalSize - compressedSize) / originalSize) * 100;
}

// Check if compression is beneficial
export function shouldCompress(data: string | Uint8Array, threshold: number = 1024): boolean {
  const size = typeof data === 'string' ? new TextEncoder().encode(data).length : data.length;
  return size > threshold;
}

// Adaptive compression based on network conditions
export async function adaptiveCompress(
  data: any,
  networkInfo?: { effectiveType: string; saveData: boolean }
): Promise<{ data: any; compressed: boolean }> {
  const jsonString = JSON.stringify(data);
  const originalSize = new TextEncoder().encode(jsonString).length;
  
  // Don't compress small data
  if (originalSize < 1024) {
    return { data, compressed: false };
  }
  
  // Always compress on slow networks or data saver mode
  const shouldCompress = 
    networkInfo?.saveData ||
    networkInfo?.effectiveType === 'slow-2g' ||
    networkInfo?.effectiveType === '2g' ||
    originalSize > 5120; // Always compress if > 5KB
  
  if (shouldCompress) {
    try {
      const compressed = await compressJSON(data);
      return { data: compressed, compressed: true };
    } catch (error) {
      console.warn('Compression failed, using original data:', error);
      return { data, compressed: false };
    }
  }
  
  return { data, compressed: false };
}

// Preload and compress critical resources
export async function preloadAndCompress(urls: string[]): Promise<Map<string, Uint8Array>> {
  const cache = new Map<string, Uint8Array>();
  
  const loadPromises = urls.map(async (url) => {
    try {
      const response = await fetch(url);
      const text = await response.text();
      
      if (shouldCompress(text)) {
        const compressed = await compressText(text);
        cache.set(url, compressed);
      }
    } catch (error) {
      console.warn(`Failed to preload and compress ${url}:`, error);
    }
  });
  
  await Promise.allSettled(loadPromises);
  return cache;
}