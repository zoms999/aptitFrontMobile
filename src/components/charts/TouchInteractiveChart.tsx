'use client'

import { useRef, useEffect, useState } from 'react'
import { MobileChart } from './MobileChart'
import { CategoryScore } from '@/types/result'

interface TouchInteractiveChartProps {
  data: CategoryScore[]
  type: 'bar' | 'line' | 'radar' | 'doughnut'
  title?: string
  enableZoom?: boolean
  enablePan?: boolean
}

export function TouchInteractiveChart({
  data,
  type,
  title,
  enableZoom = true,
  enablePan = true
}: TouchInteractiveChartProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [scale, setScale] = useState(1)
  const [position, setPosition] = useState({ x: 0, y: 0 })
  const [isDragging, setIsDragging] = useState(false)
  const [lastTouch, setLastTouch] = useState({ x: 0, y: 0 })
  const [lastDistance, setLastDistance] = useState(0)

  const handleTouchStart = (e: React.TouchEvent) => {
    e.preventDefault()
    
    if (e.touches.length === 1) {
      // Single touch - start panning
      if (enablePan) {
        setIsDragging(true)
        setLastTouch({
          x: e.touches[0].clientX,
          y: e.touches[0].clientY
        })
      }
    } else if (e.touches.length === 2) {
      // Two touches - start zooming
      if (enableZoom) {
        const touch1 = e.touches[0]
        const touch2 = e.touches[1]
        const distance = Math.sqrt(
          Math.pow(touch2.clientX - touch1.clientX, 2) +
          Math.pow(touch2.clientY - touch1.clientY, 2)
        )
        setLastDistance(distance)
        setIsDragging(false)
      }
    }
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    e.preventDefault()

    if (e.touches.length === 1 && isDragging && enablePan) {
      // Single touch - panning
      const deltaX = e.touches[0].clientX - lastTouch.x
      const deltaY = e.touches[0].clientY - lastTouch.y

      setPosition(prev => ({
        x: prev.x + deltaX,
        y: prev.y + deltaY
      }))

      setLastTouch({
        x: e.touches[0].clientX,
        y: e.touches[0].clientY
      })
    } else if (e.touches.length === 2 && enableZoom) {
      // Two touches - zooming
      const touch1 = e.touches[0]
      const touch2 = e.touches[1]
      const distance = Math.sqrt(
        Math.pow(touch2.clientX - touch1.clientX, 2) +
        Math.pow(touch2.clientY - touch1.clientY, 2)
      )

      if (lastDistance > 0) {
        const scaleChange = distance / lastDistance
        const newScale = Math.max(0.5, Math.min(3, scale * scaleChange))
        setScale(newScale)
      }

      setLastDistance(distance)
    }
  }

  const handleTouchEnd = (e: React.TouchEvent) => {
    e.preventDefault()
    setIsDragging(false)
    setLastDistance(0)
  }

  const resetTransform = () => {
    setScale(1)
    setPosition({ x: 0, y: 0 })
  }

  const handleDoubleClick = () => {
    if (scale === 1) {
      setScale(2)
    } else {
      resetTransform()
    }
  }

  // Constrain position to prevent chart from going too far off screen
  useEffect(() => {
    if (containerRef.current) {
      const container = containerRef.current
      const maxX = container.clientWidth * (scale - 1) / 2
      const maxY = container.clientHeight * (scale - 1) / 2

      setPosition(prev => ({
        x: Math.max(-maxX, Math.min(maxX, prev.x)),
        y: Math.max(-maxY, Math.min(maxY, prev.y))
      }))
    }
  }, [scale])

  return (
    <div className="relative w-full">
      {/* Controls */}
      {(enableZoom || enablePan) && (
        <div className="absolute top-2 right-2 z-10 flex space-x-2">
          {enableZoom && (
            <>
              <button
                onClick={() => setScale(prev => Math.min(3, prev * 1.2))}
                className="w-8 h-8 bg-white bg-opacity-80 rounded-full flex items-center justify-center text-gray-700 shadow-md hover:bg-opacity-100 transition-all"
                aria-label="확대"
              >
                +
              </button>
              <button
                onClick={() => setScale(prev => Math.max(0.5, prev / 1.2))}
                className="w-8 h-8 bg-white bg-opacity-80 rounded-full flex items-center justify-center text-gray-700 shadow-md hover:bg-opacity-100 transition-all"
                aria-label="축소"
              >
                −
              </button>
            </>
          )}
          <button
            onClick={resetTransform}
            className="w-8 h-8 bg-white bg-opacity-80 rounded-full flex items-center justify-center text-gray-700 shadow-md hover:bg-opacity-100 transition-all text-xs"
            aria-label="초기화"
          >
            ⌂
          </button>
        </div>
      )}

      {/* Chart Container */}
      <div
        ref={containerRef}
        className="relative overflow-hidden touch-none"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onDoubleClick={handleDoubleClick}
        style={{
          cursor: isDragging ? 'grabbing' : 'grab'
        }}
      >
        <div
          className="transition-transform duration-100 ease-out"
          style={{
            transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
            transformOrigin: 'center center'
          }}
        >
          <MobileChart
            data={data}
            type={type}
            title={title}
            responsive={true}
            height={300}
          />
        </div>
      </div>

      {/* Scale Indicator */}
      {scale !== 1 && (
        <div className="absolute bottom-2 left-2 bg-black bg-opacity-60 text-white text-xs px-2 py-1 rounded">
          {Math.round(scale * 100)}%
        </div>
      )}

      {/* Instructions */}
      {(enableZoom || enablePan) && (
        <div className="mt-2 text-xs text-gray-500 text-center">
          {enablePan && enableZoom && '드래그로 이동, 핀치로 확대/축소, 더블탭으로 리셋'}
          {enablePan && !enableZoom && '드래그로 이동'}
          {!enablePan && enableZoom && '핀치로 확대/축소, 더블탭으로 리셋'}
        </div>
      )}
    </div>
  )
}