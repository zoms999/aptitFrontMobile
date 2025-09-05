'use client'

import { useEffect, useRef, useState } from 'react'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  RadialLinearScale,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js'
import { Bar, Line, Radar, Doughnut } from 'react-chartjs-2'
import { CategoryScore } from '@/types/result'

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  RadialLinearScale,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
)

interface MobileChartProps {
  data: CategoryScore[]
  type: 'bar' | 'line' | 'radar' | 'doughnut'
  title?: string
  responsive?: boolean
  height?: number
}

export function MobileChart({ 
  data, 
  type, 
  title, 
  responsive = true, 
  height = 300 
}: MobileChartProps) {
  const chartRef = useRef<any>(null)
  const [chartSize, setChartSize] = useState({ width: 0, height: 0 })

  useEffect(() => {
    const updateSize = () => {
      if (chartRef.current) {
        const container = chartRef.current.canvas?.parentElement
        if (container) {
          setChartSize({
            width: container.clientWidth,
            height: height
          })
        }
      }
    }

    updateSize()
    window.addEventListener('resize', updateSize)
    window.addEventListener('orientationchange', updateSize)

    return () => {
      window.removeEventListener('resize', updateSize)
      window.removeEventListener('orientationchange', updateSize)
    }
  }, [height])

  const labels = data.map(item => item.category)
  const scores = data.map(item => item.score)
  const maxScores = data.map(item => item.maxScore)
  const percentiles = data.map(item => item.percentile)

  const colors = [
    'rgba(59, 130, 246, 0.8)',   // blue
    'rgba(16, 185, 129, 0.8)',   // green
    'rgba(245, 158, 11, 0.8)',   // yellow
    'rgba(239, 68, 68, 0.8)',    // red
    'rgba(139, 92, 246, 0.8)',   // purple
    'rgba(236, 72, 153, 0.8)',   // pink
  ]

  const borderColors = [
    'rgba(59, 130, 246, 1)',
    'rgba(16, 185, 129, 1)',
    'rgba(245, 158, 11, 1)',
    'rgba(239, 68, 68, 1)',
    'rgba(139, 92, 246, 1)',
    'rgba(236, 72, 153, 1)',
  ]

  const commonOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom' as const,
        labels: {
          padding: 20,
          usePointStyle: true,
          font: {
            size: 12
          }
        }
      },
      tooltip: {
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        titleColor: 'white',
        bodyColor: 'white',
        borderColor: 'rgba(255, 255, 255, 0.2)',
        borderWidth: 1,
        cornerRadius: 8,
        displayColors: true,
        callbacks: {
          label: (context: any) => {
            const dataIndex = context.dataIndex
            const score = scores[dataIndex]
            const maxScore = maxScores[dataIndex]
            const percentile = percentiles[dataIndex]
            return [
              `점수: ${score}/${maxScore}`,
              `상위 ${percentile}%`
            ]
          }
        }
      }
    },
    interaction: {
      intersect: false,
      mode: 'index' as const
    },
    onHover: (event: any, elements: any[]) => {
      if (event.native?.target) {
        event.native.target.style.cursor = elements.length > 0 ? 'pointer' : 'default'
      }
    }
  }

  const getChartData = () => {
    switch (type) {
      case 'bar':
        return {
          labels,
          datasets: [
            {
              label: '획득 점수',
              data: scores,
              backgroundColor: colors,
              borderColor: borderColors,
              borderWidth: 2,
              borderRadius: 4,
              borderSkipped: false,
            },
            {
              label: '만점',
              data: maxScores,
              backgroundColor: 'rgba(229, 231, 235, 0.5)',
              borderColor: 'rgba(156, 163, 175, 1)',
              borderWidth: 1,
              borderRadius: 4,
              borderSkipped: false,
            }
          ]
        }

      case 'line':
        return {
          labels,
          datasets: [
            {
              label: '점수 추이',
              data: scores,
              borderColor: 'rgba(59, 130, 246, 1)',
              backgroundColor: 'rgba(59, 130, 246, 0.1)',
              borderWidth: 3,
              fill: true,
              tension: 0.4,
              pointBackgroundColor: 'rgba(59, 130, 246, 1)',
              pointBorderColor: 'white',
              pointBorderWidth: 2,
              pointRadius: 6,
              pointHoverRadius: 8,
            }
          ]
        }

      case 'radar':
        return {
          labels,
          datasets: [
            {
              label: '현재 점수',
              data: scores,
              borderColor: 'rgba(59, 130, 246, 1)',
              backgroundColor: 'rgba(59, 130, 246, 0.2)',
              borderWidth: 2,
              pointBackgroundColor: 'rgba(59, 130, 246, 1)',
              pointBorderColor: 'white',
              pointBorderWidth: 2,
              pointRadius: 4,
            },
            {
              label: '만점',
              data: maxScores,
              borderColor: 'rgba(229, 231, 235, 1)',
              backgroundColor: 'rgba(229, 231, 235, 0.1)',
              borderWidth: 1,
              pointBackgroundColor: 'rgba(156, 163, 175, 1)',
              pointBorderColor: 'white',
              pointBorderWidth: 1,
              pointRadius: 2,
            }
          ]
        }

      case 'doughnut':
        return {
          labels,
          datasets: [
            {
              data: scores,
              backgroundColor: colors,
              borderColor: borderColors,
              borderWidth: 2,
              hoverOffset: 4,
            }
          ]
        }

      default:
        return { labels: [], datasets: [] }
    }
  }

  const getChartOptions = () => {
    switch (type) {
      case 'bar':
        return {
          ...commonOptions,
          scales: {
            x: {
              grid: {
                display: false
              },
              ticks: {
                font: {
                  size: 10
                },
                maxRotation: 45
              }
            },
            y: {
              beginAtZero: true,
              grid: {
                color: 'rgba(229, 231, 235, 0.5)'
              },
              ticks: {
                font: {
                  size: 10
                }
              }
            }
          }
        }

      case 'line':
        return {
          ...commonOptions,
          scales: {
            x: {
              grid: {
                color: 'rgba(229, 231, 235, 0.5)'
              },
              ticks: {
                font: {
                  size: 10
                }
              }
            },
            y: {
              beginAtZero: true,
              grid: {
                color: 'rgba(229, 231, 235, 0.5)'
              },
              ticks: {
                font: {
                  size: 10
                }
              }
            }
          }
        }

      case 'radar':
        return {
          ...commonOptions,
          scales: {
            r: {
              beginAtZero: true,
              grid: {
                color: 'rgba(229, 231, 235, 0.5)'
              },
              pointLabels: {
                font: {
                  size: 10
                }
              },
              ticks: {
                font: {
                  size: 8
                },
                stepSize: Math.max(...maxScores) / 4
              }
            }
          }
        }

      case 'doughnut':
        return {
          ...commonOptions,
          cutout: '60%',
          plugins: {
            ...commonOptions.plugins,
            legend: {
              ...commonOptions.plugins.legend,
              position: 'right' as const
            }
          }
        }

      default:
        return commonOptions
    }
  }

  const renderChart = () => {
    const chartData = getChartData()
    const chartOptions = getChartOptions()

    switch (type) {
      case 'bar':
        return <Bar ref={chartRef} data={chartData} options={chartOptions} />
      case 'line':
        return <Line ref={chartRef} data={chartData} options={chartOptions} />
      case 'radar':
        return <Radar ref={chartRef} data={chartData} options={chartOptions} />
      case 'doughnut':
        return <Doughnut ref={chartRef} data={chartData} options={chartOptions} />
      default:
        return null
    }
  }

  return (
    <div className="w-full">
      {title && (
        <h3 className="text-lg font-semibold text-gray-900 mb-4 text-center">
          {title}
        </h3>
      )}
      <div 
        className="relative w-full"
        style={{ height: `${height}px` }}
      >
        {renderChart()}
      </div>
    </div>
  )
}