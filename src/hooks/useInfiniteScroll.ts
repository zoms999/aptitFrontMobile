'use client'

import { useState, useEffect, useCallback, useRef } from 'react'

interface UseInfiniteScrollOptions {
  threshold?: number
  rootMargin?: string
  enabled?: boolean
}

interface UseInfiniteScrollReturn {
  isFetching: boolean
  setIsFetching: (isFetching: boolean) => void
  lastElementRef: (node: HTMLElement | null) => void
}

export function useInfiniteScroll(
  fetchMore: () => Promise<void> | void,
  hasMore: boolean,
  options: UseInfiniteScrollOptions = {}
): UseInfiniteScrollReturn {
  const {
    threshold = 1.0,
    rootMargin = '0px',
    enabled = true
  } = options

  const [isFetching, setIsFetching] = useState(false)
  const observer = useRef<IntersectionObserver | null>(null)

  const lastElementRef = useCallback(
    (node: HTMLElement | null) => {
      if (isFetching || !enabled || !hasMore) return
      
      if (observer.current) observer.current.disconnect()
      
      observer.current = new IntersectionObserver(
        (entries) => {
          if (entries[0].isIntersecting && hasMore && !isFetching) {
            setIsFetching(true)
            Promise.resolve(fetchMore()).finally(() => {
              setIsFetching(false)
            })
          }
        },
        {
          threshold,
          rootMargin
        }
      )
      
      if (node) observer.current.observe(node)
    },
    [isFetching, hasMore, enabled, fetchMore, threshold, rootMargin]
  )

  useEffect(() => {
    return () => {
      if (observer.current) {
        observer.current.disconnect()
      }
    }
  }, [])

  return {
    isFetching,
    setIsFetching,
    lastElementRef
  }
}