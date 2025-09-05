/**
 * Analytics Summary API Route
 * Provides aggregated analytics data for the dashboard
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

    // Get total users
    const totalUsers = await prisma.user.count({
      where: {
        isActive: true
      }
    });

    // Get active users (users who have activity in the time range)
    const activeUsers = await prisma.user.count({
      where: {
        isActive: true,
        OR: [
          {
            testResults: {
              some: {
                completedAt: {
                  gte: startDate
                }
              }
            }
          },
          {
            testSessions: {
              some: {
                lastActivity: {
                  gte: startDate
                }
              }
            }
          }
        ]
      }
    });

    // Get test statistics
    const testStats = await prisma.testResult.aggregate({
      where: {
        completedAt: {
          gte: startDate
        },
        isCompleted: true
      },
      _count: {
        id: true
      },
      _avg: {
        score: true
      }
    });

    const totalTests = await prisma.test.count({
      where: {
        isActive: true
      }
    });

    // Get error rate
    const totalErrors = await prisma.errorLog.count({
      where: {
        timestamp: {
          gte: startDate
        }
      }
    });

    const totalPageViews = await prisma.analyticsEvent.count({
      where: {
        event: 'page_view',
        timestamp: {
          gte: startDate
        }
      }
    });

    const errorRate = totalPageViews > 0 ? (totalErrors / totalPageViews) * 100 : 0;

    // Get average load time
    const loadTimeMetrics = await prisma.performanceMetric.aggregate({
      where: {
        name: 'load-complete',
        timestamp: {
          gte: startDate
        }
      },
      _avg: {
        value: true
      }
    });

    // Get PWA installs
    const pwaInstalls = await prisma.analyticsEvent.count({
      where: {
        event: 'pwa_install',
        timestamp: {
          gte: startDate
        }
      }
    });

    const summary = {
      totalUsers,
      activeUsers,
      totalTests,
      completedTests: testStats._count.id || 0,
      averageScore: testStats._avg.score || 0,
      errorRate,
      averageLoadTime: loadTimeMetrics._avg.value || 0,
      pwaInstalls
    };

    return NextResponse.json(summary);

  } catch (error) {
    console.error('Analytics summary error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch analytics summary' },
      { status: 500 }
    );
  }
}