import { NextRequest } from 'next/server'
import { createHealthCheckResponse } from '@/lib/middleware/database'

export async function GET(request: NextRequest) {
  return createHealthCheckResponse()
}