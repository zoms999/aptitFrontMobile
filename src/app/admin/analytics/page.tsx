/**
 * Analytics Dashboard Page
 * Displays monitoring data and performance metrics
 */

'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/card';

interface AnalyticsSummary {
  totalUsers: number;
  activeUsers: number;
  totalTests: number;
  completedTests: number;
  averageScore: number;
  errorRate: number;
  averageLoadTime: number;
  pwaInstalls: number;
}

interface ErrorSummary {
  message: string;
  count: number;
  lastOccurred: string;
  affectedUsers: number;
}

interface PerformanceSummary {
  metric: string;
  average: number;
  p95: number;
  trend: 'up' | 'down' | 'stable';
}

export default function AnalyticsPage() {
  const [summary, setSummary] = useState<AnalyticsSummary | null>(null);
  const [errors, setErrors] = useState<ErrorSummary[]>([]);
  const [performance, setPerformance] = useState<PerformanceSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('7d');

  useEffect(() => {
    fetchAnalytics();
  }, [timeRange]);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      
      // Fetch summary data
      const summaryResponse = await fetch(`/api/admin/analytics/summary?range=${timeRange}`);
      if (summaryResponse.ok) {
        const summaryData = await summaryResponse.json();
        setSummary(summaryData);
      }

      // Fetch error data
      const errorsResponse = await fetch(`/api/admin/analytics/errors?range=${timeRange}`);
      if (errorsResponse.ok) {
        const errorsData = await errorsResponse.json();
        setErrors(errorsData);
      }

      // Fetch performance data
      const performanceResponse = await fetch(`/api/admin/analytics/performance?range=${timeRange}`);
      if (performanceResponse.ok) {
        const performanceData = await performanceResponse.json();
        setPerformance(performanceData);
      }
    } catch (error) {
      console.error('Failed to fetch analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-4">
        <div className="max-w-7xl mx-auto">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-32 bg-gray-200 rounded"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Analytics Dashboard</h1>
          
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md text-sm"
          >
            <option value="1d">Last 24 hours</option>
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
            <option value="90d">Last 90 days</option>
          </select>
        </div>

        {/* Summary Cards */}
        {summary && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">Total Users</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-gray-900">{summary.totalUsers.toLocaleString()}</div>
                <div className="text-sm text-green-600">
                  {summary.activeUsers} active
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">Tests Completed</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-gray-900">{summary.completedTests.toLocaleString()}</div>
                <div className="text-sm text-gray-600">
                  Avg Score: {summary.averageScore.toFixed(1)}%
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">Error Rate</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">{summary.errorRate.toFixed(2)}%</div>
                <div className="text-sm text-gray-600">
                  Load Time: {summary.averageLoadTime.toFixed(0)}ms
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">PWA Installs</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-600">{summary.pwaInstalls.toLocaleString()}</div>
                <div className="text-sm text-gray-600">
                  Mobile optimized
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Error Summary */}
          <Card>
            <CardHeader>
              <CardTitle>Top Errors</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {errors.length > 0 ? (
                  errors.map((error, index) => (
                    <div key={index} className="border-l-4 border-red-400 pl-4">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {error.message}
                          </p>
                          <p className="text-xs text-gray-600">
                            {error.count} occurrences • {error.affectedUsers} users affected
                          </p>
                        </div>
                        <span className="text-xs text-gray-500">
                          {new Date(error.lastOccurred).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-gray-500 text-center py-4">No errors in selected time range</p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Performance Metrics */}
          <Card>
            <CardHeader>
              <CardTitle>Performance Metrics</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {performance.length > 0 ? (
                  performance.map((metric, index) => (
                    <div key={index} className="flex justify-between items-center">
                      <div>
                        <p className="text-sm font-medium text-gray-900">{metric.metric}</p>
                        <p className="text-xs text-gray-600">
                          Avg: {metric.average.toFixed(1)}ms • P95: {metric.p95.toFixed(1)}ms
                        </p>
                      </div>
                      <div className="flex items-center">
                        {metric.trend === 'up' && (
                          <svg className="w-4 h-4 text-red-500" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M5.293 7.707a1 1 0 010-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 01-1.414 1.414L11 5.414V17a1 1 0 11-2 0V5.414L6.707 7.707a1 1 0 01-1.414 0z" clipRule="evenodd" />
                          </svg>
                        )}
                        {metric.trend === 'down' && (
                          <svg className="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M14.707 12.293a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 111.414-1.414L9 14.586V3a1 1 0 012 0v11.586l2.293-2.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        )}
                        {metric.trend === 'stable' && (
                          <svg className="w-4 h-4 text-gray-500" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M3 10a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
                          </svg>
                        )}
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-gray-500 text-center py-4">No performance data available</p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Actions */}
        <div className="mt-6 flex justify-end space-x-4">
          <button
            onClick={() => window.open('/api/admin/analytics/export', '_blank')}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            Export Data
          </button>
          
          <button
            onClick={fetchAnalytics}
            className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors"
          >
            Refresh
          </button>
        </div>
      </div>
    </div>
  );
}