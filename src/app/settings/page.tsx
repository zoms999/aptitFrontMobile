'use client'

import { useEffect, useState } from 'react'
import { useNavigationConfig } from '@/contexts/NavigationContext'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { UserPreferences } from '@/lib/auth'

export default function SettingsPage() {
  const { configureNavigation } = useNavigationConfig()
  const { user, refreshAuth } = useAuth()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  
  const [preferences, setPreferences] = useState<UserPreferences>({
    language: 'ko',
    notifications: true,
    theme: 'system',
    testReminders: true,
    hapticFeedback: true,
    autoSave: true,
    ...user?.preferences
  })

  useEffect(() => {
    configureNavigation({
      showNavigation: true,
      headerTitle: '설정',
      showBackButton: true
    })
  }, [configureNavigation])

  useEffect(() => {
    if (user?.preferences) {
      setPreferences({
        language: 'ko',
        notifications: true,
        theme: 'system',
        testReminders: true,
        hapticFeedback: true,
        autoSave: true,
        ...user.preferences
      })
    }
  }, [user])

  const handlePreferenceChange = (key: keyof UserPreferences, value: any) => {
    setPreferences(prev => ({
      ...prev,
      [key]: value
    }))
    setError(null)
    setSuccess(null)
  }

  const handleSave = async () => {
    setIsLoading(true)
    setError(null)
    
    try {
      const response = await fetch('/api/profile/preferences', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({ preferences })
      })
      
      const data = await response.json()
      
      if (response.ok && data.success) {
        setSuccess('설정이 성공적으로 저장되었습니다.')
        await refreshAuth() // Refresh user data
        setTimeout(() => setSuccess(null), 3000)
      } else {
        setError(data.error || '설정 저장에 실패했습니다.')
      }
    } catch (error) {
      console.error('Settings save error:', error)
      setError('네트워크 오류가 발생했습니다.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="p-4 space-y-6">
      {/* Messages */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}
      
      {success && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-3">
          <p className="text-sm text-green-600">{success}</p>
        </div>
      )}

      {/* Language Settings */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">언어 설정</h3>
        <div className="space-y-3">
          <div className="flex items-center space-x-3">
            <input
              type="radio"
              id="lang-ko"
              name="language"
              value="ko"
              checked={preferences.language === 'ko'}
              onChange={(e) => handlePreferenceChange('language', e.target.value)}
              className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 focus:ring-blue-500"
            />
            <Label htmlFor="lang-ko" className="flex-1 cursor-pointer">
              한국어
            </Label>
          </div>
          
          <div className="flex items-center space-x-3">
            <input
              type="radio"
              id="lang-en"
              name="language"
              value="en"
              checked={preferences.language === 'en'}
              onChange={(e) => handlePreferenceChange('language', e.target.value)}
              className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 focus:ring-blue-500"
            />
            <Label htmlFor="lang-en" className="flex-1 cursor-pointer">
              English
            </Label>
          </div>
        </div>
      </Card>

      {/* Theme Settings */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">테마 설정</h3>
        <div className="space-y-3">
          <div className="flex items-center space-x-3">
            <input
              type="radio"
              id="theme-light"
              name="theme"
              value="light"
              checked={preferences.theme === 'light'}
              onChange={(e) => handlePreferenceChange('theme', e.target.value)}
              className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 focus:ring-blue-500"
            />
            <Label htmlFor="theme-light" className="flex-1 cursor-pointer">
              라이트 모드
            </Label>
          </div>
          
          <div className="flex items-center space-x-3">
            <input
              type="radio"
              id="theme-dark"
              name="theme"
              value="dark"
              checked={preferences.theme === 'dark'}
              onChange={(e) => handlePreferenceChange('theme', e.target.value)}
              className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 focus:ring-blue-500"
            />
            <Label htmlFor="theme-dark" className="flex-1 cursor-pointer">
              다크 모드
            </Label>
          </div>
          
          <div className="flex items-center space-x-3">
            <input
              type="radio"
              id="theme-system"
              name="theme"
              value="system"
              checked={preferences.theme === 'system'}
              onChange={(e) => handlePreferenceChange('theme', e.target.value)}
              className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 focus:ring-blue-500"
            />
            <Label htmlFor="theme-system" className="flex-1 cursor-pointer">
              시스템 설정 따르기
            </Label>
          </div>
        </div>
      </Card>

      {/* Notification Settings */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">알림 설정</h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <Label htmlFor="notifications" className="text-base">
                푸시 알림
              </Label>
              <p className="text-sm text-gray-500 mt-1">
                새로운 테스트 및 결과 알림을 받습니다
              </p>
            </div>
            <Checkbox
              id="notifications"
              checked={preferences.notifications}
              onCheckedChange={(checked) => handlePreferenceChange('notifications', checked)}
            />
          </div>
          
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <Label htmlFor="testReminders" className="text-base">
                테스트 리마인더
              </Label>
              <p className="text-sm text-gray-500 mt-1">
                정기적인 테스트 참여 알림을 받습니다
              </p>
            </div>
            <Checkbox
              id="testReminders"
              checked={preferences.testReminders}
              onCheckedChange={(checked) => handlePreferenceChange('testReminders', checked)}
            />
          </div>
        </div>
      </Card>

      {/* Mobile Settings */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">모바일 설정</h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <Label htmlFor="hapticFeedback" className="text-base">
                햅틱 피드백
              </Label>
              <p className="text-sm text-gray-500 mt-1">
                터치 시 진동 피드백을 제공합니다
              </p>
            </div>
            <Checkbox
              id="hapticFeedback"
              checked={preferences.hapticFeedback}
              onCheckedChange={(checked) => handlePreferenceChange('hapticFeedback', checked)}
            />
          </div>
          
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <Label htmlFor="autoSave" className="text-base">
                자동 저장
              </Label>
              <p className="text-sm text-gray-500 mt-1">
                테스트 진행 중 자동으로 답변을 저장합니다
              </p>
            </div>
            <Checkbox
              id="autoSave"
              checked={preferences.autoSave}
              onCheckedChange={(checked) => handlePreferenceChange('autoSave', checked)}
            />
          </div>
        </div>
      </Card>

      {/* Save Button */}
      <div className="sticky bottom-4">
        <Button
          onClick={handleSave}
          disabled={isLoading}
          className="w-full h-12 text-base"
        >
          {isLoading ? '저장 중...' : '설정 저장'}
        </Button>
      </div>
    </div>
  )
}