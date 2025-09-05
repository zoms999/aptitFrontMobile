/**
 * Monitoring API Route
 * Handles error reports, performance metrics, and analytics events
 */

import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { validateRequest } from '../../../security/input-validation';

const prisma = new PrismaClient();

interface MonitoringBatch {
  errors: ErrorReport[];
  metrics: PerformanceMetric[];
  analytics: AnalyticsEvent[];
}

interface ErrorReport {
  message: string;
  stack?: string;
  url: string;
  userAgent: string;
  timestamp: number;
  userId?: string;
  sessionId: string;
  additionalData?: Record<string, any>;
}

interface PerformanceMetric {
  name: string;
  value: number;
  timestamp: number;
  url: string;
  userId?: string;
  sessionId: string;
  additionalData?: Record<string, any>;
}

interface AnalyticsEvent {
  event: string;
  properties: Record<string, any>;
  timestamp: number;
  userId?: string;
  sessionId: string;
  url: string;
}

// Rate limiting for monitoring endpoint
const rateLimitMap = new Map();
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
const RATE_LIMIT_MAX = 100; // 100 requests per minute per IP

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const windowStart = now - RATE_LIMIT_WINDOW;
  
  // Clean old entries
  for (const [key, data] of rateLimitMap.entries()) {
    if (data.timestamp < windowStart) {
      rateLimitMap.delete(key);
    }
  }
  
  const current = rateLimitMap.get(ip) || { count: 0, timestamp: now };
  
  if (current.timestamp < windowStart) {
    current.count = 1;
    current.timestamp = now;
  } else {
    current.count++;
  }
  
  rateLimitMap.set(ip, current);
  
  return current.count <= RATE_LIMIT_MAX;
}

async function saveErrorReport(error: ErrorReport): Promise<void> {
  try {
    await prisma.errorLog.create({
      data: {
        message: error.message.substring(0, 1000), // Limit message length
        stack: error.stack?.substring(0, 5000), // Limit stack trace length
        url: error.url.substring(0, 500),
        userAgent: error.userAgent.substring(0, 500),
        timestamp: new Date(error.timestamp),
        userId: error.userId,
        sessionId: error.sessionId,
        additionalData: error.additionalData ? JSON.stringify(error.additionalData) : null
      }
    });
  } catch (dbError) {
    console.error('Failed to save error report:', dbError);
  }
}

async function savePerformanceMetric(metric: PerformanceMetric): Promise<void> {
  try {
    await prisma.performanceMetric.create({
      data: {
        name: metric.name.substring(0, 100),
        value: metric.value,
        timestamp: new Date(metric.timestamp),
        url: metric.url.substring(0, 500),
        userId: metric.userId,
        sessionId: metric.sessionId,
        additionalData: metric.additionalData ? JSON.stringify(metric.additionalData) : null
      }
    });
  } catch (dbError) {
    console.error('Failed to save performance metric:', dbError);
  }
}

async function saveAnalyticsEvent(event: AnalyticsEvent): Promise<void> {
  try {
    await prisma.analyticsEvent.create({
      data: {
        event: event.event.substring(0, 100),
        properties: JSON.stringify(event.properties),
        timestamp: new Date(event.timestamp),
        userId: event.userId,
        sessionId: event.sessionId,
        url: event.url.substring(0, 500)
      }
    });
  } catch (dbError) {
    console.error('Failed to save analytics event:', dbError);
  }
}

export async function POST(request: NextRequest) {
  try {
    // Check rate limiting
    const ip = request.ip || request.headers.get('x-forwarded-for') || 'unknown';
    if (!checkRateLimit(ip)) {
      return NextResponse.json(
        { error: 'Rate limit exceeded' },
        { status: 429 }
      );
    }

    // Parse request body
    const batch: MonitoringBatch = await request.json();

    // Validate batch structure
    if (!batch || typeof batch !== 'object') {
      return NextResponse.json(
        { error: 'Invalid batch format' },
        { status: 400 }
      );
    }

    const { errors = [], metrics = [], analytics = [] } = batch;

    // Validate array limits
    if (errors.length > 50 || metrics.length > 50 || analytics.length > 50) {
      return NextResponse.json(
        { error: 'Batch size too large' },
        { status: 400 }
      );
    }

    // Process errors
    const errorPromises = errors.map(async (error) => {
      if (validateErrorReport(error)) {
        await saveErrorReport(error);
      }
    });

    // Process metrics
    const metricPromises = metrics.map(async (metric) => {
      if (validatePerformanceMetric(metric)) {
        await savePerformanceMetric(metric);
      }
    });

    // Process analytics events
    const analyticsPromises = analytics.map(async (event) => {
      if (validateAnalyticsEvent(event)) {
        await saveAnalyticsEvent(event);
      }
    });

    // Wait for all operations to complete
    await Promise.allSettled([
      ...errorPromises,
      ...metricPromises,
      ...analyticsPromises
    ]);

    return NextResponse.json({ 
      success: true,
      processed: {
        errors: errors.length,
        metrics: metrics.length,
        analytics: analytics.length
      }
    });

  } catch (error) {
    console.error('Monitoring API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

function validateErrorReport(error: any): boolean {
  return (
    error &&
    typeof error.message === 'string' &&
    typeof error.url === 'string' &&
    typeof error.userAgent === 'string' &&
    typeof error.timestamp === 'number' &&
    typeof error.sessionId === 'string' &&
    error.timestamp > 0 &&
    error.timestamp <= Date.now() + 60000 // Allow 1 minute clock skew
  );
}

function validatePerformanceMetric(metric: any): boolean {
  return (
    metric &&
    typeof metric.name === 'string' &&
    typeof metric.value === 'number' &&
    typeof metric.url === 'string' &&
    typeof metric.timestamp === 'number' &&
    typeof metric.sessionId === 'string' &&
    metric.timestamp > 0 &&
    metric.timestamp <= Date.now() + 60000 &&
    metric.value >= 0 &&
    metric.value < 1000000 // Reasonable upper limit
  );
}

function validateAnalyticsEvent(event: any): boolean {
  return (
    event &&
    typeof event.event === 'string' &&
    typeof event.properties === 'object' &&
    typeof event.timestamp === 'number' &&
    typeof event.sessionId === 'string' &&
    typeof event.url === 'string' &&
    event.timestamp > 0 &&
    event.timestamp <= Date.now() + 60000
  );
}

// Health check endpoint
export async function GET() {
  try {
    // Simple database connectivity check
    await prisma.$queryRaw`SELECT 1`;
    
    return NextResponse.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      service: 'monitoring'
    });
  } catch (error) {
    return NextResponse.json(
      { 
        status: 'unhealthy',
        error: 'Database connection failed',
        timestamp: new Date().toISOString()
      },
      { status: 503 }
    );
  }
}