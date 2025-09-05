'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { useAuth } from '@/contexts/AuthContext'
import { useTheme } from '@/contexts/ThemeContext'
import { useLocalization } from '@/contexts/LocalizationContext'
import { UserPreferences } from '@/lib/auth'

interface SettingsModalProps {
  onClose: () => void
  onSuccess: () => void
}

export function SettingsModal({ onClose, onSuccess }: SettingsModalProps) {
  const { user, refreshAuth } = useAuth()
  const { setTheme } = useTheme()
  const { t, setLanguage } = useLocalization()
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
    
    // Apply changes immediately
    if (key === 'theme') {
      setTheme(value)
    } else if (key === 'language') {
      setLanguage(value)
    }
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
        setTimeout(() => {
          onSuccess()
          onClose()
        }, 1500)
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
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <Card className="w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold">{t('settings.title')}</h2>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="space-y-6">
            {/* Language Settings */}
            <div>
              <h3 className="text-lg font-medium mb-3">{t('settings.language')}</h3>
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
                    {t('language.korean')}
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
                    {t('language.english')}
                  </Label>
                </div>
              </div>
            </div>

            {/* Theme Settings */}
            <div>
              <h3 className="text-lg font-medium mb-3">{t('settings.theme')}</h3>
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
                    {t('theme.light')}
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
                    {t('theme.dark')}
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
                    {t('theme.system')}
                  </Label>
                </div>
              </div>
            </div>

            {/* Notification Settings */}
            <div>
              <h3 className="text-lg font-medium mb-3">{t('settings.notifications')}</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <Label htmlFor="notifications" className="text-sm font-medium">
                      {t('notifications.push')}
                    </Label>
                    <p className="text-xs text-gray-500 mt-1">
                      {t('notifications.pushDesc')}
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
                    <Label htmlFor="testReminders" className="text-sm font-medium">
                      {t('notifications.reminders')}
                    </Label>
                    <p className="text-xs text-gray-500 mt-1">
                      {t('notifications.remindersDesc')}
                    </p>
                  </div>
                  <Checkbox
                    id="testReminders"
                    checked={preferences.testReminders}
                    onCheckedChange={(checked) => handlePreferenceChange('testReminders', checked)}
                  />
                </div>
              </div>
            </div>

            {/* Mobile Settings */}
            <div>
              <h3 className="text-lg font-medium mb-3">{t('settings.mobile')}</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <Label htmlFor="hapticFeedback" className="text-sm font-medium">
                      {t('mobile.haptic')}
                    </Label>
                    <p className="text-xs text-gray-500 mt-1">
                      {t('mobile.hapticDesc')}
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
                    <Label htmlFor="autoSave" className="text-sm font-medium">
                      {t('mobile.autoSave')}
                    </Label>
                    <p className="text-xs text-gray-500 mt-1">
                      {t('mobile.autoSaveDesc')}
                    </p>
                  </div>
                  <Checkbox
                    id="autoSave"
                    checked={preferences.autoSave}
                    onCheckedChange={(checked) => handlePreferenceChange('autoSave', checked)}
                  />
                </div>
              </div>
            </div>

            {/* Error/Success Messages */}
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}
            
            {success && (
              <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                <p className="text-sm text-green-600">{success}</p>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex space-x-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                className="flex-1"
                disabled={isLoading}
              >
                {t('common.cancel')}
              </Button>
              <Button
                type="button"
                onClick={handleSave}
                className="flex-1"
                disabled={isLoading}
              >
                {isLoading ? t('settings.saving') : t('common.save')}
              </Button>
            </div>
          </div>
        </div>
      </Card>
    </div>
  )
}