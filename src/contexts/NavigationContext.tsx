'use client'

import React, { createContext, useContext, useState, useCallback } from 'react'

interface NavigationContextType {
  showNavigation: boolean
  setShowNavigation: (show: boolean) => void
  headerTitle: string | undefined
  setHeaderTitle: (title: string | undefined) => void
  showBackButton: boolean
  setShowBackButton: (show: boolean) => void
  headerActions: React.ReactNode
  setHeaderActions: (actions: React.ReactNode) => void
}

const NavigationContext = createContext<NavigationContextType | undefined>(undefined)

export function NavigationProvider({ children }: { children: React.ReactNode }) {
  const [showNavigation, setShowNavigation] = useState(true)
  const [headerTitle, setHeaderTitle] = useState<string | undefined>(undefined)
  const [showBackButton, setShowBackButton] = useState(false)
  const [headerActions, setHeaderActions] = useState<React.ReactNode>(null)

  const contextValue: NavigationContextType = {
    showNavigation,
    setShowNavigation,
    headerTitle,
    setHeaderTitle,
    showBackButton,
    setShowBackButton,
    headerActions,
    setHeaderActions
  }

  return (
    <NavigationContext.Provider value={contextValue}>
      {children}
    </NavigationContext.Provider>
  )
}

export function useNavigationContext() {
  const context = useContext(NavigationContext)
  if (context === undefined) {
    throw new Error('useNavigationContext must be used within a NavigationProvider')
  }
  return context
}

// Hook for pages to configure navigation
export function useNavigationConfig() {
  const context = useNavigationContext()
  
  const configureNavigation = useCallback((config: {
    showNavigation?: boolean
    headerTitle?: string
    showBackButton?: boolean
    headerActions?: React.ReactNode
  }) => {
    if (config.showNavigation !== undefined) {
      context.setShowNavigation(config.showNavigation)
    }
    if (config.headerTitle !== undefined) {
      context.setHeaderTitle(config.headerTitle)
    }
    if (config.showBackButton !== undefined) {
      context.setShowBackButton(config.showBackButton)
    }
    if (config.headerActions !== undefined) {
      context.setHeaderActions(config.headerActions)
    }
  }, [context])

  return { configureNavigation }
}