'use client'

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { User, AuthTokens } from '@/lib/auth'

interface AuthContextType {
  user: User | null
  tokens: AuthTokens | null
  isLoading: boolean
  isAuthenticated: boolean
  login: (username: string, password: string, rememberMe?: boolean, loginType?: 'personal' | 'organization', sessionCode?: string) => Promise<{ success: boolean; error?: string }>
  signup: (data: SignupData) => Promise<{ success: boolean; error?: string }>
  logout: () => Promise<void>
  refreshAuth: () => Promise<boolean>
}

interface SignupData {
  name: string
  email: string
  password: string
  confirmPassword: string
  organizationName?: string
  position?: string
  phone?: string
  preferences?: {
    language?: 'ko' | 'en'
    notifications?: boolean
    theme?: 'light' | 'dark' | 'system'
    testReminders?: boolean
  }
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [tokens, setTokens] = useState<AuthTokens | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const isAuthenticated = !!user && !!tokens

  // Check authentication status on mount
  useEffect(() => {
    checkAuthStatus()
  }, [])

  const checkAuthStatus = async () => {
    try {
      const response = await fetch('/api/auth/me', {
        credentials: 'include'
      })

      if (response.ok) {
        const data = await response.json()
        setUser(data.user)
        // Tokens are in httpOnly cookies, so we don't need to store them in state
        setTokens({ accessToken: '', refreshToken: '' })
      } else {
        // Try to refresh tokens
        await refreshAuth()
      }
    } catch (error) {
      console.error('Auth check failed:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const login = async (
    username: string, 
    password: string, 
    rememberMe = false, 
    loginType: 'personal' | 'organization' = 'personal',
    sessionCode?: string
  ) => {
    try {
      setIsLoading(true)
      
      const response = await fetch('/api/auth/simple-login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({ 
          username, 
          password, 
          rememberMe, 
          loginType,
          sessionCode: loginType === 'organization' ? sessionCode : undefined
        })
      })

      const data = await response.json()

      if (response.ok && data.success) {
        console.log('AuthContext: 로그인 성공, 사용자 상태 업데이트')
        setUser(data.user)
        setTokens(data.tokens)
        console.log('AuthContext: 사용자 설정 완료:', data.user.name)
        return { success: true }
      } else {
        console.log('AuthContext: 로그인 실패:', data.error)
        return { success: false, error: data.error || 'Login failed' }
      }
    } catch (error) {
      console.error('Login error:', error)
      return { success: false, error: 'Network error occurred' }
    } finally {
      setIsLoading(false)
    }
  }

  const signup = async (signupData: SignupData) => {
    try {
      setIsLoading(true)
      
      const response = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify(signupData)
      })

      const data = await response.json()

      if (response.ok && data.success) {
        setUser(data.user)
        setTokens(data.tokens)
        return { success: true }
      } else {
        return { success: false, error: data.error || 'Signup failed' }
      }
    } catch (error) {
      console.error('Signup error:', error)
      return { success: false, error: 'Network error occurred' }
    } finally {
      setIsLoading(false)
    }
  }

  const logout = async () => {
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include'
      })
    } catch (error) {
      console.error('Logout error:', error)
    } finally {
      setUser(null)
      setTokens(null)
    }
  }

  const refreshAuth = async (): Promise<boolean> => {
    try {
      const response = await fetch('/api/auth/refresh', {
        method: 'POST',
        credentials: 'include'
      })

      if (response.ok) {
        const data = await response.json()
        setUser(data.user)
        setTokens(data.tokens)
        return true
      } else {
        setUser(null)
        setTokens(null)
        return false
      }
    } catch (error) {
      console.error('Token refresh failed:', error)
      setUser(null)
      setTokens(null)
      return false
    }
  }

  const value: AuthContextType = {
    user,
    tokens,
    isLoading,
    isAuthenticated,
    login,
    signup,
    logout,
    refreshAuth
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}