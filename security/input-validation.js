/**
 * Input Validation and Sanitization for Security
 * Prevents XSS, SQL injection, and other security vulnerabilities
 */

const DOMPurify = require('isomorphic-dompurify');
const validator = require('validator');

/**
 * Sanitize HTML content to prevent XSS attacks
 */
function sanitizeHtml(input) {
  if (typeof input !== 'string') {
    return input;
  }
  
  return DOMPurify.sanitize(input, {
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'p', 'br'],
    ALLOWED_ATTR: []
  });
}

/**
 * Sanitize user input for database operations
 */
function sanitizeInput(input) {
  if (typeof input !== 'string') {
    return input;
  }
  
  // Remove null bytes and control characters
  let sanitized = input.replace(/\0/g, '');
  
  // Trim whitespace
  sanitized = sanitized.trim();
  
  // Escape HTML entities
  sanitized = validator.escape(sanitized);
  
  return sanitized;
}

/**
 * Validate email address
 */
function validateEmail(email) {
  if (!email || typeof email !== 'string') {
    return { isValid: false, error: 'Email is required' };
  }
  
  if (!validator.isEmail(email)) {
    return { isValid: false, error: 'Invalid email format' };
  }
  
  if (email.length > 254) {
    return { isValid: false, error: 'Email is too long' };
  }
  
  return { isValid: true };
}

/**
 * Validate password strength
 */
function validatePassword(password) {
  if (!password || typeof password !== 'string') {
    return { isValid: false, error: 'Password is required' };
  }
  
  if (password.length < 8) {
    return { isValid: false, error: 'Password must be at least 8 characters long' };
  }
  
  if (password.length > 128) {
    return { isValid: false, error: 'Password is too long' };
  }
  
  if (!/(?=.*[a-z])/.test(password)) {
    return { isValid: false, error: 'Password must contain at least one lowercase letter' };
  }
  
  if (!/(?=.*[A-Z])/.test(password)) {
    return { isValid: false, error: 'Password must contain at least one uppercase letter' };
  }
  
  if (!/(?=.*\d)/.test(password)) {
    return { isValid: false, error: 'Password must contain at least one number' };
  }
  
  if (!/(?=.*[@$!%*?&])/.test(password)) {
    return { isValid: false, error: 'Password must contain at least one special character' };
  }
  
  return { isValid: true };
}

/**
 * Validate UUID format
 */
function validateUUID(uuid) {
  if (!uuid || typeof uuid !== 'string') {
    return { isValid: false, error: 'UUID is required' };
  }
  
  if (!validator.isUUID(uuid)) {
    return { isValid: false, error: 'Invalid UUID format' };
  }
  
  return { isValid: true };
}

/**
 * Validate and sanitize user name
 */
function validateName(name) {
  if (!name || typeof name !== 'string') {
    return { isValid: false, error: 'Name is required' };
  }
  
  const sanitized = sanitizeInput(name);
  
  if (sanitized.length < 1) {
    return { isValid: false, error: 'Name cannot be empty' };
  }
  
  if (sanitized.length > 100) {
    return { isValid: false, error: 'Name is too long' };
  }
  
  // Allow letters, spaces, hyphens, and apostrophes
  if (!/^[a-zA-Z\s\-']+$/.test(sanitized)) {
    return { isValid: false, error: 'Name contains invalid characters' };
  }
  
  return { isValid: true, sanitized };
}

/**
 * Validate phone number
 */
function validatePhoneNumber(phone) {
  if (!phone || typeof phone !== 'string') {
    return { isValid: false, error: 'Phone number is required' };
  }
  
  // Remove all non-digit characters for validation
  const digitsOnly = phone.replace(/\D/g, '');
  
  if (digitsOnly.length < 10 || digitsOnly.length > 15) {
    return { isValid: false, error: 'Invalid phone number length' };
  }
  
  if (!validator.isMobilePhone(phone, 'any', { strictMode: false })) {
    return { isValid: false, error: 'Invalid phone number format' };
  }
  
  return { isValid: true, sanitized: phone };
}

/**
 * Validate test answer input
 */
function validateTestAnswer(answer) {
  if (answer === null || answer === undefined) {
    return { isValid: false, error: 'Answer is required' };
  }
  
  // Handle different answer types
  if (typeof answer === 'string') {
    const sanitized = sanitizeInput(answer);
    
    if (sanitized.length > 1000) {
      return { isValid: false, error: 'Answer is too long' };
    }
    
    return { isValid: true, sanitized };
  }
  
  if (typeof answer === 'number') {
    if (!Number.isFinite(answer)) {
      return { isValid: false, error: 'Invalid number' };
    }
    
    if (answer < -1000000 || answer > 1000000) {
      return { isValid: false, error: 'Number out of range' };
    }
    
    return { isValid: true, sanitized: answer };
  }
  
  if (typeof answer === 'boolean') {
    return { isValid: true, sanitized: answer };
  }
  
  if (Array.isArray(answer)) {
    if (answer.length > 50) {
      return { isValid: false, error: 'Too many answer options' };
    }
    
    const sanitizedArray = answer.map(item => {
      if (typeof item === 'string') {
        return sanitizeInput(item);
      }
      return item;
    });
    
    return { isValid: true, sanitized: sanitizedArray };
  }
  
  return { isValid: false, error: 'Invalid answer format' };
}

/**
 * Validate file upload
 */
function validateFileUpload(file, options = {}) {
  const {
    maxSize = 5 * 1024 * 1024, // 5MB default
    allowedTypes = ['image/jpeg', 'image/png', 'image/webp'],
    allowedExtensions = ['.jpg', '.jpeg', '.png', '.webp']
  } = options;
  
  if (!file) {
    return { isValid: false, error: 'File is required' };
  }
  
  if (file.size > maxSize) {
    return { isValid: false, error: `File size exceeds ${maxSize / 1024 / 1024}MB limit` };
  }
  
  if (!allowedTypes.includes(file.type)) {
    return { isValid: false, error: 'File type not allowed' };
  }
  
  const extension = '.' + file.name.split('.').pop().toLowerCase();
  if (!allowedExtensions.includes(extension)) {
    return { isValid: false, error: 'File extension not allowed' };
  }
  
  return { isValid: true };
}

/**
 * Rate limiting validation
 */
function validateRateLimit(identifier, limit, windowMs, storage = new Map()) {
  const now = Date.now();
  const windowStart = now - windowMs;
  
  // Clean old entries
  for (const [key, data] of storage.entries()) {
    if (data.timestamp < windowStart) {
      storage.delete(key);
    }
  }
  
  // Check current rate
  const current = storage.get(identifier) || { count: 0, timestamp: now };
  
  if (current.timestamp < windowStart) {
    // Reset counter for new window
    current.count = 1;
    current.timestamp = now;
  } else {
    current.count++;
  }
  
  storage.set(identifier, current);
  
  if (current.count > limit) {
    const resetTime = current.timestamp + windowMs;
    return {
      isValid: false,
      error: 'Rate limit exceeded',
      retryAfter: Math.ceil((resetTime - now) / 1000)
    };
  }
  
  return { isValid: true, remaining: limit - current.count };
}

/**
 * Comprehensive request validation middleware
 */
function validateRequest(schema) {
  return (req, res, next) => {
    const errors = [];
    
    // Validate each field according to schema
    for (const [field, rules] of Object.entries(schema)) {
      const value = req.body[field];
      
      if (rules.required && (value === undefined || value === null || value === '')) {
        errors.push(`${field} is required`);
        continue;
      }
      
      if (value !== undefined && value !== null && value !== '') {
        if (rules.type && typeof value !== rules.type) {
          errors.push(`${field} must be of type ${rules.type}`);
          continue;
        }
        
        if (rules.validator) {
          const result = rules.validator(value);
          if (!result.isValid) {
            errors.push(`${field}: ${result.error}`);
            continue;
          }
          
          if (result.sanitized !== undefined) {
            req.body[field] = result.sanitized;
          }
        }
      }
    }
    
    if (errors.length > 0) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors
      });
    }
    
    next();
  };
}

module.exports = {
  sanitizeHtml,
  sanitizeInput,
  validateEmail,
  validatePassword,
  validateUUID,
  validateName,
  validatePhoneNumber,
  validateTestAnswer,
  validateFileUpload,
  validateRateLimit,
  validateRequest
};