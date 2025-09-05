/**
 * Analytics Performance API Route
 * Provides performance metrics and trends
 */

import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const range = searchParams.get('range') || '7d';
    
    // Calculate date range
    const now = new Date();
    const daysBack = parseInt(range.replace('d', ''));
    const startDate = new Date(now.getTime() - (daysBack * 24 * 60 * 60 * 1000));
    const midDate = new Date(now.getTime() - (daysBack * 12 * 60 * 60 * 1000)); // Half the range for trend

    // Key performance metrics to track
    const metricsToTrack = [
      'lcp', // Largest Contentful Paint
      'fid', // First Input Delay
      'cls', // Cumulative Layout Shift
      'ttfb', // Time to First Byte
      'load-complete', // Page Load Complete
      'dom-content-loaded' // DOM Content Loaded
    ];

    const performanceSummaries = await Promise.all(
      metricsToTrack.map(async (metricName) => {
        // Get current period stats
        const currentStats = await prisma.performanceMetric.aggregate({
          where: {
            name: metricName,
            timestamp: {
              gte: startDate
            }
          },
          _avg: {
            value: true
          },
          _count: {
            id: true
          }
        });

        // Get previous period stats for trend
        const previousStats = await prisma.performanceMetric.aggregate({
          where: {
            name: metricName,
            timestamp: {
              gte: new Date(startDate.getTime() - (daysBack * 24 * 60 * 60 * 1000)),
              lt: startDate
            }
          },
          _avg: {
            value: true
          }
        });

        // Calculate P95 (95th percentile)
        const allValues = await prisma.performanceMetric.findMany({
          where: {
            name: metricName,
            timestamp: {
              gte: startDate
            }
          },
          select: {
            value: true
          },
          orderBy: {
            value: 'asc'
          }
        });

        let p95 = 0;
        if (allValues.length > 0) {
          const p95Index = Math.floor(allValues.length * 0.95);
          p95 = allValues[p95Index]?.value || 0;
        }

        // Determine trend
        let trend: 'up' | 'down' | 'stable' = 'stable';
        if (currentStats._avg.value && previousStats._avg.value) {
          const change = ((currentStats._avg.value - previousStats._avg.value) / previousStats._avg.value) * 100;
          if (Math.abs(change) > 5) { // 5% threshold for significant change
            trend = change > 0 ? 'up' : 'down';
          }
        }

        return {
          metric: getMetricDisplayName(metricName),
          average: currentStats._avg.value || 0,
          p95,
          trend,
          sampleSize: currentStats._count.id
        };
      })
    );

    // Filter out metrics with no data
    const validMetrics = performanceSummaries.filter(metric => metric.sampleSize > 0);

    return NextResponse.json(validMetrics);

  } catch (error) {
    console.error('Analytics performance error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch performance analytics' },
      { status: 500 }
    );
  }
}

function getMetricDisplayName(metricName: string): string {
  const displayNames: Record<string, string> = {
    'lcp': 'Largest Contentful Paint',
    'fid': 'First Input Delay',
    'cls': 'Cumulative Layout Shift',
    'ttfb': 'Time to First Byte',
    'load-complete': 'Page Load Complete',
    'dom-content-loaded': 'DOM Content Loaded'
  };
  
  return displayNames[metricName] || metricName;
}