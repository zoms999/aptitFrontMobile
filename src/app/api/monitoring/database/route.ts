import { NextRequest, NextResponse } from 'next/server'
import { 
  getDatabaseMetrics, 
  getDatabaseEventLog, 
  getDatabasePerformanceSummary,
  performDatabaseHealthCheck,
  getDatabaseConnectionState
} from '@/lib/db'
import { APIErrorHandler } from '@/lib/api-error-handler'

// GET /api/monitoring/database - Get database monitoring information
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type') || 'summary'
    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : undefined

    switch (type) {
      case 'health':
        const healthCheck = await performDatabaseHealthCheck()
        return APIErrorHandler.createSuccessResponse(healthCheck, '/api/monitoring/database?type=health')

      case 'metrics':
        const metrics = getDatabaseMetrics()
        return APIErrorHandler.createSuccessResponse(metrics, '/api/monitoring/database?type=metrics')

      case 'events':
        const events = getDatabaseEventLog(limit)
        return APIErrorHandler.createSuccessResponse({
          events,
          total: events.length,
          limit
        }, '/api/monitoring/database?type=events')

      case 'performance':
        const performance = getDatabasePerformanceSummary()
        return APIErrorHandler.createSuccessResponse(performance, '/api/monitoring/database?type=performance')

      case 'connection':
        const connectionState = getDatabaseConnectionState()
        return APIErrorHandler.createSuccessResponse(connectionState, '/api/monitoring/database?type=connection')

      case 'summary':
      default:
        const summary = {
          health: await performDatabaseHealthCheck(),
          performance: getDatabasePerformanceSummary(),
          connectionState: getDatabaseConnectionState(),
          recentEvents: getDatabaseEventLog(10)
        }
        return APIErrorHandler.createSuccessResponse(summary, '/api/monitoring/database?type=summary')
    }
  } catch (error) {
    return APIErrorHandler.handleGenericError(error as Error, '/api/monitoring/database')
  }
}

// POST /api/monitoring/database/reset - Reset monitoring metrics (development only)
export async function POST(request: NextRequest) {
  try {
    if (process.env.NODE_ENV !== 'development') {
      return NextResponse.json({
        success: false,
        error: {
          message: 'Metrics reset is only available in development mode',
          code: 'FORBIDDEN'
        }
      }, { status: 403 })
    }

    const { databaseMonitor } = await import('@/lib/database-monitor')
    databaseMonitor.resetMetrics()

    return APIErrorHandler.createSuccessResponse({
      message: 'Database monitoring metrics have been reset'
    }, '/api/monitoring/database/reset')
  } catch (error) {
    return APIErrorHandler.handleGenericError(error as Error, '/api/monitoring/database/reset')
  }
}