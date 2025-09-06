# Database Connection Middleware

This middleware provides robust database connection management for API routes with automatic validation, retry logic, and connection recovery mechanisms.

## Features

- **Connection Validation**: Validates database connections before processing API requests
- **Automatic Retry**: Retries failed operations with exponential backoff
- **Connection Recovery**: Automatically recovers from connection failures
- **Connection Monitoring**: Tracks connection health and performance metrics
- **Request-level Validation**: Validates connections for each individual request

## Usage

### Basic Usage

```typescript
import { withDatabase } from '@/lib/middleware/database'
import { NextRequest } from 'next/server'

export const GET = withDatabase(async (req: NextRequest, prisma) => {
  const tests = await prisma.mwd_test.findMany({
    take: 10
  })
  
  return { tests }
})
```

### Advanced Usage with Options

```typescript
import { databaseMiddleware } from '@/lib/middleware/database'
import { NextRequest } from 'next/server'

export const GET = databaseMiddleware.withDatabaseConnection(
  async (req: NextRequest, prisma) => {
    const tests = await prisma.mwd_test.findMany({
      take: 10
    })
    
    return { tests }
  },
  {
    validateConnection: true,
    retryOnFailure: true,
    maxRetries: 3,
    retryDelay: 1000,
    timeout: 10000
  }
)
```

## Configuration Options

- `validateConnection` (boolean): Whether to validate the database connection before processing (default: true)
- `retryOnFailure` (boolean): Whether to retry on connection failures (default: true)
- `maxRetries` (number): Maximum number of retry attempts (default: 2)
- `retryDelay` (number): Base delay between retries in milliseconds (default: 1000)
- `timeout` (number): Connection validation timeout in milliseconds (default: 10000)

## Connection Monitoring

The middleware includes built-in connection monitoring:

```typescript
import { ConnectionMonitor, getDetailedConnectionState } from '@/lib/middleware/database'

// Get connection statistics
const monitor = ConnectionMonitor.getInstance()
const stats = monitor.getConnectionStats()

// Get detailed connection state
const state = await getDetailedConnectionState()
```

## Health Check

```typescript
import { databaseMiddleware } from '@/lib/middleware/database'

const healthCheck = await databaseMiddleware.healthCheck()
console.log('Database healthy:', healthCheck.isHealthy)
```

## Request-level Validation

```typescript
import { validateRequestConnection } from '@/lib/middleware/database'

const validation = await validateRequestConnection('/api/tests')
if (!validation.isValid) {
  console.error('Connection validation failed:', validation.error)
}
```

## Error Handling

The middleware automatically handles various types of database errors:

- Connection timeouts
- Prisma client initialization errors
- Query execution failures
- Network connectivity issues

All errors are properly logged and return structured error responses to the client.

## Requirements Satisfied

This implementation satisfies the following requirements:

- **1.3**: Database connections are validated before API processing
- **3.2**: Consistent error handling patterns across all endpoints
- **6.2**: Connection state management and recovery mechanisms

The middleware ensures reliable database connectivity throughout user sessions and provides comprehensive error handling for database-related issues.