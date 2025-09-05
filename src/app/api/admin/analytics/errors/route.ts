/**
 * Analytics Errors API Route
 * Provides error statistics and summaries
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

    // Get top errors by frequency
    const errorGroups = await prisma.errorLog.groupBy({
      by: ['message'],
      where: {
        timestamp: {
          gte: startDate
        }
      },
      _count: {
        id: true
      },
      _max: {
        timestamp: true
      },
      orderBy: {
        _count: {
          id: 'desc'
        }
      },
      take: 10
    });

    // Get affected users count for each error
    const errorSummaries = await Promise.all(
      errorGroups.map(async (group) => {
        const affectedUsers = await prisma.errorLog.findMany({
          where: {
            message: group.message,
            timestamp: {
              gte: startDate
            },
            userId: {
              not: null
            }
          },
          select: {
            userId: true
          },
          distinct: ['userId']
        });

        return {
          message: group.message,
          count: group._count.id,
          lastOccurred: group._max.timestamp?.toISOString() || '',
          affectedUsers: affectedUsers.length
        };
      })
    );

    return NextResponse.json(errorSummaries);

  } catch (error) {
    console.error('Analytics errors error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch error analytics' },
      { status: 500 }
    );
  }
}