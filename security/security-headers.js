/**
 * Security Headers Configuration for Production
 * Implements security best practices for mobile PWA
 */

const securityHeaders = [
  // Prevent clickjacking attacks
  {
    key: 'X-Frame-Options',
    value: 'DENY'
  },
  
  // Prevent MIME type sniffing
  {
    key: 'X-Content-Type-Options',
    value: 'nosniff'
  },
  
  // Control referrer information
  {
    key: 'Referrer-Policy',
    value: 'origin-when-cross-origin'
  },
  
  // Enable DNS prefetching
  {
    key: 'X-DNS-Prefetch-Control',
    value: 'on'
  },
  
  // Force HTTPS connections
  {
    key: 'Strict-Transport-Security',
    value: 'max-age=31536000; includeSubDomains; preload'
  },
  
  // Control browser permissions
  {
    key: 'Permissions-Policy',
    value: [
      'camera=()',
      'microphone=()',
      'geolocation=()',
      'payment=()',
      'usb=()',
      'magnetometer=()',
      'gyroscope=()',
      'accelerometer=()',
      'ambient-light-sensor=()',
      'autoplay=()',
      'encrypted-media=()',
      'fullscreen=(self)',
      'picture-in-picture=()'
    ].join(', ')
  },
  
  // Content Security Policy for PWA
  {
    key: 'Content-Security-Policy',
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-eval' 'unsafe-inline'", // Required for Next.js
      "style-src 'self' 'unsafe-inline'", // Required for Tailwind CSS
      "img-src 'self' data: blob: https:",
      "font-src 'self' data:",
      "connect-src 'self' https:",
      "manifest-src 'self'",
      "worker-src 'self'",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'"
    ].join('; ')
  }
];

// Environment-specific CSP adjustments
const getCSPForEnvironment = (env) => {
  const baseCSP = securityHeaders.find(header => header.key === 'Content-Security-Policy').value;
  
  if (env === 'development') {
    // Allow webpack dev server and hot reload
    return baseCSP
      .replace("script-src 'self' 'unsafe-eval' 'unsafe-inline'", 
               "script-src 'self' 'unsafe-eval' 'unsafe-inline' localhost:* ws:")
      .replace("connect-src 'self' https:", 
               "connect-src 'self' https: ws: localhost:*");
  }
  
  return baseCSP;
};

// Rate limiting configuration
const rateLimitConfig = {
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: {
    error: 'Too many requests from this IP, please try again later.',
    retryAfter: 900 // 15 minutes in seconds
  },
  standardHeaders: true,
  legacyHeaders: false,
  // Skip rate limiting for health checks
  skip: (req) => req.url === '/api/health'
};

// API-specific rate limits
const apiRateLimits = {
  auth: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // 5 login attempts per 15 minutes
    message: 'Too many authentication attempts, please try again later.'
  },
  
  general: {
    windowMs: 1 * 60 * 1000, // 1 minute
    max: 60, // 60 requests per minute
    message: 'Rate limit exceeded, please slow down.'
  },
  
  upload: {
    windowMs: 5 * 60 * 1000, // 5 minutes
    max: 10, // 10 uploads per 5 minutes
    message: 'Upload rate limit exceeded.'
  }
};

// CORS configuration
const corsConfig = {
  origin: function (origin, callback) {
    const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'];
    
    // Allow requests with no origin (mobile apps, Postman, etc.)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  maxAge: 86400 // 24 hours
};

// Input validation schemas
const validationSchemas = {
  email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  password: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/,
  uuid: /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
  alphanumeric: /^[a-zA-Z0-9]+$/,
  phoneNumber: /^\+?[\d\s\-\(\)]+$/
};

// Security middleware configuration
const securityMiddleware = {
  // Helmet.js configuration
  helmet: {
    contentSecurityPolicy: false, // We handle CSP manually
    crossOriginEmbedderPolicy: false, // Can interfere with PWA
    hsts: {
      maxAge: 31536000,
      includeSubDomains: true,
      preload: true
    }
  },
  
  // Session security
  session: {
    name: 'aptit.sid',
    secret: process.env.SESSION_SECRET || process.env.NEXTAUTH_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === 'production',
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
      sameSite: 'strict'
    }
  }
};

module.exports = {
  securityHeaders,
  getCSPForEnvironment,
  rateLimitConfig,
  apiRateLimits,
  corsConfig,
  validationSchemas,
  securityMiddleware
};