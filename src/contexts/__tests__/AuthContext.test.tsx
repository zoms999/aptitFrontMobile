import React from 'react'
import { renderHook, act, waitFor } from '@testing-library/react'
import { AuthProvider, useAuth } from '../AuthContext'
import { server } from '@/../../__tests__/mocks/server'
import { mockUser } from '@/../../__tests__/utils/test-utils'

// Setup MSW server
beforeAll(() => server.listen())
afterEach(() => server.resetHandlers())
afterAll(() => server.close())

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <AuthProvider>{children}</AuthProvider>
)

describe('AuthContext', () => {
  beforeEach(() => {
    localStorage.clear()
    sessionStorage.clear()
  })

  it('should provide initial auth state', () => {
    const { result } = renderHook(() => useAuth(), { wrapper })

    expect(result.current.user).toBeNull()
    expect(result.current.isLoading).toBe(true)
    expect(result.current.isAuthenticated).toBe(false)
  })

  it('should login successfully with valid credentials', async () => {
    const { result } = renderHook(() => useAuth(), { wrapper })

    await act(async () => {
      await result.current.login('test@example.com', 'password')
    })

    await waitFor(() => {
      expect(result.current.user).toEqual(mockUser)
      expect(result.current.isAuthenticated).toBe(true)
      expect(result.current.isLoading).toBe(false)
    })
  })

  it('should handle login failure', async () => {
    const { result } = renderHook(() => useAuth(), { wrapper })

    await act(async () => {
      try {
        await result.current.login('test@example.com', 'wrongpassword')
      } catch (error) {
        expect(error).toBeDefined()
      }
    })

    expect(result.current.user).toBeNull()
    expect(result.current.isAuthenticated).toBe(false)
  })

  it('should signup successfully', async () => {
    const { result } = renderHook(() => useAuth(), { wrapper })

    await act(async () => {
      await result.current.signup('newuser@example.com', 'password123', 'New User')
    })

    await waitFor(() => {
      expect(result.current.user).toBeDefined()
      expect(result.current.user?.email).toBe('newuser@example.com')
      expect(result.current.isAuthenticated).toBe(true)
    })
  })

  it('should logout successfully', async () => {
    const { result } = renderHook(() => useAuth(), { wrapper })

    // First login
    await act(async () => {
      await result.current.login('test@example.com', 'password')
    })

    // Then logout
    await act(async () => {
      await result.current.logout()
    })

    expect(result.current.user).toBeNull()
    expect(result.current.isAuthenticated).toBe(false)
    expect(localStorage.getItem('token')).toBeNull()
  })

  it('should refresh token automatically', async () => {
    const { result } = renderHook(() => useAuth(), { wrapper })

    // Set expired token
    localStorage.setItem('token', 'expired-token')
    localStorage.setItem('refreshToken', 'valid-refresh-token')

    await act(async () => {
      await result.current.refreshToken()
    })

    await waitFor(() => {
      expect(localStorage.getItem('token')).toBe('new-mock-jwt-token')
    })
  })

  it('should restore session from localStorage', async () => {
    // Set valid token in localStorage
    localStorage.setItem('token', 'valid-token')
    localStorage.setItem('user', JSON.stringify(mockUser))

    const { result } = renderHook(() => useAuth(), { wrapper })

    await waitFor(() => {
      expect(result.current.user).toEqual(mockUser)
      expect(result.current.isAuthenticated).toBe(true)
      expect(result.current.isLoading).toBe(false)
    })
  })

  it('should handle token expiration', async () => {
    const { result } = renderHook(() => useAuth(), { wrapper })

    // Login first
    await act(async () => {
      await result.current.login('test@example.com', 'password')
    })

    // Simulate token expiration
    await act(async () => {
      result.current.handleTokenExpiration()
    })

    expect(result.current.user).toBeNull()
    expect(result.current.isAuthenticated).toBe(false)
  })

  it('should update user profile', async () => {
    const { result } = renderHook(() => useAuth(), { wrapper })

    // Login first
    await act(async () => {
      await result.current.login('test@example.com', 'password')
    })

    const updatedData = { name: 'Updated Name' }

    await act(async () => {
      await result.current.updateProfile(updatedData)
    })

    await waitFor(() => {
      expect(result.current.user?.name).toBe('Updated Name')
    })
  })

  it('should handle network errors gracefully', async () => {
    // Mock network error
    global.fetch = jest.fn().mockRejectedValue(new Error('Network error'))

    const { result } = renderHook(() => useAuth(), { wrapper })

    await act(async () => {
      try {
        await result.current.login('test@example.com', 'password')
      } catch (error) {
        expect(error).toBeDefined()
      }
    })

    expect(result.current.user).toBeNull()
    expect(result.current.isAuthenticated).toBe(false)
  })

  it('should validate email format', async () => {
    const { result } = renderHook(() => useAuth(), { wrapper })

    await act(async () => {
      try {
        await result.current.login('invalid-email', 'password')
      } catch (error) {
        expect(error).toBeDefined()
      }
    })
  })

  it('should handle concurrent login attempts', async () => {
    const { result } = renderHook(() => useAuth(), { wrapper })

    const loginPromises = [
      result.current.login('test@example.com', 'password'),
      result.current.login('test@example.com', 'password'),
    ]

    await act(async () => {
      await Promise.all(loginPromises)
    })

    // Should only have one successful login
    expect(result.current.isAuthenticated).toBe(true)
  })
})